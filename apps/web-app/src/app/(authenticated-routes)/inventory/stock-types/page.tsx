'use client';

import { StockTypeApi, StockTypeDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { DeleteConfirmationModal, StockTypeHeader, StockTypeModal, StockTypeTable } from './components';

export default function StockTypePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockTypes, setStockTypes] = useState<StockTypeDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Modal and form state
  const [selectedStockType, setSelectedStockType] = useState<StockTypeDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch stock types from API
  const fetchStockTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
        response = await StockTypeApi.getStockTypesByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await StockTypeApi.getStockTypes(
          currentPageSize,
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of stock types
        if (Array.isArray(response.data)) {
          setStockTypes(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setStockTypes([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setStockTypes([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch {
      setError('Failed to load stock types. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchStockTypes();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchStockTypes();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'stockTypeName', label: 'NAME' },
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

  const handleRowClick = async (stockType: StockTypeDto) => {
    // Ensure we have a valid stock type object
    if (!stockType || !stockType.stockTypeId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the stock type from the API
      const latestStockType = await StockTypeApi.getStockTypeById(
        stockType.stockTypeId,
        userRole
      );
      
      setSelectedStockType(latestStockType);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestStockType.status === StatusEnum.FOR_APPROVAL || latestStockType.status === StatusEnum.NEW_RECORD || latestStockType.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch {
      setError('Failed to load stock type details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedStockType(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedStockType(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedStockType: StockTypeDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new stock type
        await StockTypeApi.createStockType({
          stockTypeName: updatedStockType.stockTypeName,
          status: updatedStockType.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Stock Type created successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list for new records
        handleCloseModal();
        await fetchStockTypes();
      } else {
        // Update existing stock type
        const updatedRecord = await StockTypeApi.updateStockType(updatedStockType.stockTypeId!, {
          stockTypeId: updatedStockType.stockTypeId,
          stockTypeName: updatedStockType.stockTypeName,
          status: updatedStockType.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Stock Type updated successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list after successful update
        handleCloseModal();
        await fetchStockTypes();
      }
    } catch (error) {
      console.error('Error saving stock type:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to save stock type. Please try again.',
        alertType: 'error'
      });
      setError('Failed to save stock type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStockType) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await StockTypeApi.deleteStockType(selectedStockType, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock Type deleted successfully!',
        alertType: 'success'
      });
      
      setShowDeleteConfirm(false);
      handleCloseModal();
      await fetchStockTypes();
    } catch (error) {
      console.error('Error deleting stock type:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to delete stock type. Please try again.',
        alertType: 'error'
      });
      setError('Failed to delete stock type. Please try again.');
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
    setCurrentCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchStockTypes(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedStockType) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await StockTypeApi.approveStockType(selectedStockType.stockTypeId!, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock Type approved successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchStockTypes();
    } catch (error) {
      console.error('Error approving stock type:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to approve stock type. Please try again.',
        alertType: 'error'
      });
      setError('Failed to approve stock type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedStockType) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await StockTypeApi.denyStockType(selectedStockType.stockTypeId!, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock Type denied successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchStockTypes();
    } catch (error) {
      console.error('Error denying stock type:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to deny stock type. Please try again.',
        alertType: 'error'
      });
      setError('Failed to deny stock type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = stockTypes?.map(stockType => {
    return {
      ...stockType,
      status: getStatusBadge(stockType.status || StatusEnum.ACTIVE)
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
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Stock Types</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <StockTypeHeader
          searchTerm={searchTerm}
          onSearchChange={(value: string) => {
            setSearchTerm(value);
            // Reset pagination when search term changes
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
          }}
          onRefresh={() => {
            setSearchTerm('');
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchStockTypes();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <StockTypeTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchStockTypes('prev', prevCursor)}
          onNext={() => fetchStockTypes('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <StockTypeModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedStockType={selectedStockType}
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
        stockType={selectedStockType}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
