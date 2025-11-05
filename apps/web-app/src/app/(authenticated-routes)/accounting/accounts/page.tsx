'use client';

import { AccountApi, AccountsDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { AccountHeader, AccountModal, AccountTable, DeleteConfirmationModal } from './components';

export default function AccountsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<AccountsDto[]>([]);
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
  const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch accounts from API
  const fetchAccounts = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
        response = await AccountApi.getAccountByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await AccountApi.getAccountsPagination(
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of accounts
        if (Array.isArray(response.data)) {
          setAccounts(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setAccounts([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setAccounts([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch {
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchAccounts();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchAccounts();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'accountName', label: 'NAME' },
    { key: 'accountType', label: 'ACCOUNT TYPE' },
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

  const handleRowClick = async (account: AccountsDto) => {
    // Ensure we have a valid account object
    if (!account || !account.accountingId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the account from the API
      const latestAccount = await AccountApi.getAccountById(
        account.accountingId,
        userRole
      );
      
      setSelectedAccount(latestAccount);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestAccount.status === StatusEnum.FOR_APPROVAL || latestAccount.status === StatusEnum.NEW_RECORD || latestAccount.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch {
      setError('Failed to load account details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedAccount(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedAccount(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedAccount: AccountsDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new account
        await AccountApi.createAccount({
          accountName: updatedAccount.accountName,
          accountType: updatedAccount.accountType,
          changeReason: updatedAccount.changeReason,
          subAccounts: updatedAccount.subAccounts,
          status: updatedAccount.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Account created successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list for new records
        handleCloseModal();
        await fetchAccounts();
      } else {
        // Update existing account
        const updatedRecord = await AccountApi.updateAccount(updatedAccount.accountingId, {
          accountingId: updatedAccount.accountingId,
          accountName: updatedAccount.accountName,
          accountType: updatedAccount.accountType,
          changeReason: updatedAccount.changeReason,
          subAccounts: updatedAccount.subAccounts,
          status: updatedAccount.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Account updated successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list after successful update
        handleCloseModal();
        await fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to save account. Please try again.',
        alertType: 'error'
      });
      setError('Failed to save account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAccount) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await AccountApi.deleteAccount(selectedAccount.accountingId, selectedAccount, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Account deleted successfully!',
        alertType: 'success'
      });
      
      setShowDeleteConfirm(false);
      handleCloseModal();
      await fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to delete account. Please try again.',
        alertType: 'error'
      });
      setError('Failed to delete account. Please try again.');
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
    fetchAccounts(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedAccount) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await AccountApi.approveAccount(selectedAccount.accountingId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Account approved successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchAccounts();
    } catch (error) {
      console.error('Error approving account:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to approve account. Please try again.',
        alertType: 'error'
      });
      setError('Failed to approve account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedAccount) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await AccountApi.denyAccount(selectedAccount.accountingId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Account denied successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchAccounts();
    } catch (error) {
      console.error('Error denying account:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to deny account. Please try again.',
        alertType: 'error'
      });
      setError('Failed to deny account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = accounts?.map(account => {
    return {
      ...account,
      status: getStatusBadge(account.status || StatusEnum.ACTIVE)
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
          <a href="/accounting" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Accounting
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Accounts</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <AccountHeader
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
            fetchAccounts();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <AccountTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchAccounts('prev', prevCursor)}
          onNext={() => fetchAccounts('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <AccountModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedAccount={selectedAccount}
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
        account={selectedAccount}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

