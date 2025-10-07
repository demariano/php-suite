'use client';

import { ProductApi, ProductDealDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { DealHeader, DealModal, DealTable, DeleteConfirmationModal } from './components';

export default function ProductDealsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deals, setDeals] = useState<ProductDealDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Modal and form state
  const [selectedDeal, setSelectedDeal] = useState<ProductDealDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchDeals();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchDeals();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Fetch deals from API
  const fetchDeals = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // Use custom page size if provided, otherwise use state page size
      const currentPageSize = customPageSize ?? pageSize;
      
      // If search term exists, use search API, otherwise use regular pagination API
      if (searchTerm && searchTerm.trim() !== '') {
        response = await ProductApi.getProductDealsByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductDeals(
          currentPageSize, 
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of deals
        if (Array.isArray(response.data)) {
          setDeals(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setDeals([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setDeals([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      // Note: currentCursor is not used in this implementation
    } catch {
      setError('Failed to load deals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Status badge component
  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-800";
    }

    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  // Handle row click - use index to get original deal data
  const handleRowClick = (deal: ProductDealDto, index?: number) => {
    // Get the original deal data from the deals array instead of the transformed tableData
    const originalDeal = typeof index === 'number' ? deals[index] : deal;
    setSelectedDeal(originalDeal);
    setIsCreateMode(false);
    
    // Check if this is a pending record that needs admin approval
    if ((originalDeal.status === StatusEnum.FOR_APPROVAL || originalDeal.status === StatusEnum.NEW_RECORD || originalDeal.status === StatusEnum.FOR_DELETION) && isAdminUser) {
      setActiveTab('approval');
    } else {
      setActiveTab('details');
    }
    
    setShowEditModal(true);
  };

  // Handle create new deal
  const handleCreateDeal = () => {
    setSelectedDeal(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedDeal(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedDeal: ProductDealDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new deal
        await ProductApi.createProductDeal({
          productDealName: updatedDeal.productDealName,
          minQty: updatedDeal.minQty,
          additionalQty: updatedDeal.additionalQty,
          status: updatedDeal.status
        }, userRole);
        
        // Refetch the deals to get the most up-to-date data
        await fetchDeals();
        
        // Close modal after creation
        handleCloseModal();
      } else {
        // Update existing deal
        const updatedRecord = await ProductApi.updateProductDeal(updatedDeal.productDealId, {
          productDealId: updatedDeal.productDealId,
          productDealName: updatedDeal.productDealName,
          minQty: updatedDeal.minQty,
          additionalQty: updatedDeal.additionalQty,
          status: updatedDeal.status
        }, userRole);
        
        // Refetch the deals to get the most up-to-date data
        await fetchDeals();
        
        // Update the selected deal with the latest data
        setSelectedDeal(updatedRecord);
        
        // Close modal after successful update for all users
        handleCloseModal();
      }
    } catch {
      setError('Failed to save deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeal) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductDeal(selectedDeal, userRole);
      
      // Refetch the deals to get the most up-to-date data
      await fetchDeals();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch {
      setError('Failed to delete deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchDeals(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedDeal) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductDeal(selectedDeal.productDealId, userRole);
      
      // Refresh the deals list - use await to ensure it completes before closing modal
      await fetchDeals();
      
      // Close the modal
      handleCloseModal();
    } catch {
      setError('Failed to approve deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedDeal) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProductDeal(selectedDeal.productDealId, userRole);
      
      // Refresh the deals list - use await to ensure it completes before closing modal
      await fetchDeals();
      
      // Close the modal
      handleCloseModal();
    } catch {
      setError('Failed to deny deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = deals?.map(deal => {
    return {
      ...deal,
      status: getStatusBadge(deal.status || StatusEnum.ACTIVE)
    };
  }) || [];

  const headers = [
    { key: 'productDealName', label: 'DEAL NAME' },
    { key: 'minQty', label: 'MIN QTY' },
    { key: 'additionalQty', label: 'ADDITIONAL QTY' },
    { key: 'status', label: 'STATUS' }
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Deals</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <DealHeader 
          searchTerm={searchTerm}
          onSearchChange={(value: string) => {
            setSearchTerm(value);
            // Reset pagination when search term changes
            setNextCursor(undefined);
            setPrevCursor(undefined);
          }}
          onRefresh={() => {
            setSearchTerm('');
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchDeals();
          }}
          onCreateClick={handleCreateDeal}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <DealTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchDeals('prev', prevCursor)}
          onNext={() => fetchDeals('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <DealModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedDeal={selectedDeal}
        activeTab={activeTab}
        successMessage={successMessage}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        onClose={handleCloseModal}
        onTabChange={setActiveTab}
        onSave={handleSaveChanges}
        onDelete={handleDeleteClick}
        onApprove={handleApproveRecord}
        onDeny={handleDenyRecord}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteConfirm}
        productDeal={selectedDeal}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
