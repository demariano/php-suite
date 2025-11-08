'use client';

import { AccountApi, AccountsDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AccountFormWrapper from './components/AccountFormWrapper';

interface EditAccountPageProps {
  params: {
    id: string;
  };
}

export default function EditAccountPage({ params }: EditAccountPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch account details on component mount
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const account = await AccountApi.getAccountById(params.id, userRole);
        setSelectedAccount(account);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((account.status === StatusEnum.FOR_APPROVAL || account.status === StatusEnum.NEW_RECORD || account.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching account:', err);
        setFlashNotification({
          title: 'Error',
          message: 'Failed to load account details. Please try again.',
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchAccount();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

  const handleSave = async (account: AccountsDto) => {
    if (!selectedAccount) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing account
      const updatedAccount = await AccountApi.updateAccount(selectedAccount.accountingId, {
        accountingId: selectedAccount.accountingId,
        accountName: account.accountName,
        accountType: account.accountType,
        changeReason: account.changeReason,
        subAccounts: account.subAccounts,
        status: account.status
      }, userRole);
      
      setSelectedAccount(updatedAccount);
      setFlashNotification({
        title: 'Success!',
        message: 'Account updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to accounts list after a short delay
      setTimeout(() => {
        router.push('/accounting/accounts');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating account:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to update account. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
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
      
      // Navigate back to accounts list after a short delay
      setTimeout(() => {
        router.push('/accounting/accounts');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to delete account. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedAccount) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedAccount = await AccountApi.approveAccount(selectedAccount.accountingId, userRole);
      setSelectedAccount(approvedAccount);
      setFlashNotification({
        title: 'Success!',
        message: 'Account approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to accounts list after a short delay
      setTimeout(() => {
        router.push('/accounting/accounts');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving account:', err);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to approve account. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = async () => {
    if (!selectedAccount) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedAccount = await AccountApi.denyAccount(selectedAccount.accountingId, userRole);
      setSelectedAccount(deniedAccount);
      setFlashNotification({
        title: 'Success!',
        message: 'Account changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to accounts list after a short delay
      setTimeout(() => {
        router.push('/accounting/accounts');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying account:', err);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to deny account. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/accounting/accounts');
  };

  if (!selectedAccount && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Account not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
          <a href="/accounting/accounts" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Accounts
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedAccount && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading account details...</div>
        </div>
      )}

      {/* Account Form */}
      {selectedAccount && (
        <AccountFormWrapper
          isCreateMode={false}
          selectedAccount={selectedAccount}
          successMessage={null}
          isAdminUser={isAdminUser}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={handleSave}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

