'use client';

import { ProductApi, ProductPriceTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { DeleteConfirmationModal, PriceTypeHeader, PriceTypeModal, PriceTypeTable } from './components/index';

export default function ProductPriceTypesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceTypes, setPriceTypes] = useState<ProductPriceTypeDto[]>([]);
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
  const [selectedPriceType, setSelectedPriceType] = useState<ProductPriceTypeDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch price types from API
  const fetchPriceTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
        response = await ProductApi.getProductPriceTypesByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductPriceTypes(
          currentPageSize, 
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of price types
        if (Array.isArray(response.data)) {
          setPriceTypes(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setPriceTypes([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setPriceTypes([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
    } catch (error) {
      console.error('Error fetching price types:', error);
      setError('Failed to load price types. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchPriceTypes();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchPriceTypes();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productPriceTypeName', label: 'NAME' },
    { key: 'status', label: 'STATUS' }
  ];

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
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  const handleRowClick = async (priceType: ProductPriceTypeDto) => {
    // Ensure we have a valid price type object
    if (!priceType || !priceType.productPriceTypeId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the price type from the API
      const latestPriceType = await ProductApi.getProductPriceTypeById(
        priceType.productPriceTypeId,
        userRole
      );
      
      setSelectedPriceType(latestPriceType);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestPriceType.status === StatusEnum.FOR_APPROVAL || latestPriceType.status === StatusEnum.NEW_RECORD || latestPriceType.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading price type details:', error);
      setError('Failed to load price type details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedPriceType(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedPriceType(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedPriceType: ProductPriceTypeDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new price type
        await ProductApi.createProductPriceType({
          productPriceTypeName: updatedPriceType.productPriceTypeName,
          status: updatedPriceType.status
        }, userRole);
        
        // Refetch the price types to get the most up-to-date data
        await fetchPriceTypes();
        
        // Close modal after creation
        handleCloseModal();
      } else {
        // Update existing price type
        const updatedRecord = await ProductApi.updateProductPriceType(updatedPriceType.productPriceTypeId, {
          productPriceTypeId: updatedPriceType.productPriceTypeId,
          productPriceTypeName: updatedPriceType.productPriceTypeName,
          status: updatedPriceType.status
        }, userRole);
        
        // Refetch the price types to get the most up-to-date data
        await fetchPriceTypes();
        
        // Update the selected price type with the latest data
        setSelectedPriceType(updatedRecord);
        
        // For regular users, keep the modal open to show the updated record
        // For admin users, close the modal
        if (isAdminUser) {
          handleCloseModal();
        } else if (updatedRecord.status === StatusEnum.FOR_APPROVAL) {
          // Show success message for regular users when changes are pending approval
          setSuccessMessage('Your changes have been submitted for approval.');
        }
      }
    } catch (error) {
      console.error('Error saving price type:', error);
      setError('Failed to save price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPriceType) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductPriceType(selectedPriceType, userRole);
      
      // Refetch the price types to get the most up-to-date data
      await fetchPriceTypes();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      console.error('Error deleting price type:', error);
      setError('Failed to delete price type. Please try again.');
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
    fetchPriceTypes(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedPriceType) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductPriceType(selectedPriceType.productPriceTypeId, userRole);
      
      // Refresh the price types list - use await to ensure it completes before closing modal
      await fetchPriceTypes();
      
      // Close the modal
      handleCloseModal();
    } catch (error) {
      console.error('Error approving price type:', error);
      setError('Failed to approve price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedPriceType) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProductPriceType(selectedPriceType.productPriceTypeId, userRole);
      
      // Refresh the price types list - use await to ensure it completes before closing modal
      await fetchPriceTypes();
      
      // Close the modal
      handleCloseModal();
    } catch (error) {
      console.error('Error denying price type:', error);
      setError('Failed to deny price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = priceTypes?.map(priceType => {
    return {
      ...priceType,
      status: getStatusBadge(priceType.status || StatusEnum.ACTIVE)
    };
  }) || [];

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
          <span className="text-gray-800 text-sm font-medium">Price Types</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <PriceTypeHeader
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
            fetchPriceTypes();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <PriceTypeTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchPriceTypes('prev', prevCursor)}
          onNext={() => fetchPriceTypes('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <PriceTypeModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedPriceType={selectedPriceType}
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
        priceType={selectedPriceType}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
