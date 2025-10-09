'use client';

import { CustomerApi, CustomerDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { CustomerHeader, CustomerModal, CustomerTable, DeleteConfirmationModal } from './components';


export default function CustomersMainPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  const [nextCursor, setNextCursor] = useState<any>(undefined);
  const [prevCursor, setPrevCursor] = useState<any>(undefined);
  const [currentCursor, setCurrentCursor] = useState<any>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Modal and form state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch customers from API
  const fetchCustomers = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
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
        response = await CustomerApi.getCustomersByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await CustomerApi.getCustomers(
          currentPageSize, 
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of customers
        if (Array.isArray(response.data)) {
          setCustomers(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setCustomers([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setCustomers([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchCustomers();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'contactNo', label: 'CONTACT NO' },
    { key: 'customerTypeName', label: 'CUSTOMER TYPE' },
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

  const handleRowClick = async (customer: CustomerDto) => {
    // Ensure we have a valid customer object
    if (!customer || !customer.customerId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the customer from the API
      const latestCustomer = await CustomerApi.getCustomerById(
        customer.customerId,
        userRole
      );
      
      setSelectedCustomer(latestCustomer);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestCustomer.status === StatusEnum.FOR_APPROVAL || latestCustomer.status === StatusEnum.NEW_RECORD || latestCustomer.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load customer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedCustomer(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedCustomer(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedCustomer: CustomerDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new customer
        const newCustomer = await CustomerApi.createCustomer({
          customerName: updatedCustomer.customerName,
          email: updatedCustomer.email,
          address1: updatedCustomer.address1,
          address2: updatedCustomer.address2,
          balance: updatedCustomer.balance,
          contactNo: updatedCustomer.contactNo,
          contactPerson: updatedCustomer.contactPerson,
          townId: updatedCustomer.townId,
          townName: updatedCustomer.townName,
          creditLimit: updatedCustomer.creditLimit,
          customerCredit: updatedCustomer.customerCredit,
          tinNumber: updatedCustomer.tinNumber,
          areaId: updatedCustomer.areaId,
          areaName: updatedCustomer.areaName,
          customerClassificationId: updatedCustomer.customerClassificationId,
          customerClassificationName: updatedCustomer.customerClassificationName,
          customerTypeId: updatedCustomer.customerTypeId,
          customerTypeName: updatedCustomer.customerTypeName,
          changeReason: updatedCustomer.changeReason,
          customerTerms: updatedCustomer.customerTerms,
          customerDeals: updatedCustomer.customerDeals
        }, userRole);
        
        // Refetch the customers to get the most up-to-date data
        await fetchCustomers();
        
        // Close modal after creation
        handleCloseModal();
      } else {
        // Update existing customer
        const updatedRecord = await CustomerApi.updateCustomer(updatedCustomer.customerId, {
          customerId: updatedCustomer.customerId,
          customerName: updatedCustomer.customerName,
          email: updatedCustomer.email,
          address1: updatedCustomer.address1,
          address2: updatedCustomer.address2,
          balance: updatedCustomer.balance,
          contactNo: updatedCustomer.contactNo,
          contactPerson: updatedCustomer.contactPerson,
          townId: updatedCustomer.townId,
          townName: updatedCustomer.townName,
          creditLimit: updatedCustomer.creditLimit,
          customerCredit: updatedCustomer.customerCredit,
          tinNumber: updatedCustomer.tinNumber,
          areaId: updatedCustomer.areaId,
          areaName: updatedCustomer.areaName,
          customerClassificationId: updatedCustomer.customerClassificationId,
          customerClassificationName: updatedCustomer.customerClassificationName,
          customerTypeId: updatedCustomer.customerTypeId,
          customerTypeName: updatedCustomer.customerTypeName,
          status: updatedCustomer.status,
          changeReason: updatedCustomer.changeReason,
          customerTerms: updatedCustomer.customerTerms,
          customerDeals: updatedCustomer.customerDeals
        }, userRole);
        
        // Refetch the customers to get the most up-to-date data
        await fetchCustomers();
        
        // Update the selected customer with the latest data
        setSelectedCustomer(updatedRecord);
        
        // Close modal after successful update for all users
        handleCloseModal();
      }
    } catch (error) {
      setError('Failed to save customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await CustomerApi.deleteCustomer(selectedCustomer, userRole);
      
      // Refetch the customers to get the most up-to-date data
      await fetchCustomers();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete customer. Please try again.');
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
    fetchCustomers(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedCustomer) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await CustomerApi.approveCustomer(selectedCustomer.customerId, userRole);
      
      // Refresh the customers list - use await to ensure it completes before closing modal
      await fetchCustomers();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
      setError('Failed to approve customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedCustomer) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await CustomerApi.denyCustomer(selectedCustomer.customerId, userRole);
      
      // Refresh the customers list - use await to ensure it completes before closing modal
      await fetchCustomers();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
      setError('Failed to deny customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = customers?.map(customer => {
    return {
      ...customer,
      status: getStatusBadge(customer.status || StatusEnum.ACTIVE)
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
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Customers</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <CustomerHeader
          searchTerm={searchTerm}
          onSearchChange={(value) => {
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
            fetchCustomers();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <CustomerTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchCustomers('prev', prevCursor)}
          onNext={() => fetchCustomers('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <CustomerModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedCustomer={selectedCustomer}
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
        customer={selectedCustomer}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
