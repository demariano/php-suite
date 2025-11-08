'use client';

import { AccountApi, AccountsDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AccountFormWrapper from '../[id]/edit/components/AccountFormWrapper';

export default function CreateAccountPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (account: AccountsDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new account
      await AccountApi.createAccount({
        accountName: account.accountName,
        accountType: account.accountType,
        changeReason: account.changeReason,
        subAccounts: account.subAccounts,
        status: account.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Account created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to accounts list after a short delay
      setTimeout(() => {
        router.push('/accounting/accounts');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating account:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to create account. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/accounting/accounts');
  };

  const handleDelete = () => {
    // Not applicable for create mode
  };

  const handleApprove = () => {
    // Not applicable for create mode
  };

  const handleDeny = () => {
    // Not applicable for create mode
  };

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
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Account Form */}
      <AccountFormWrapper
        isCreateMode={true}
        selectedAccount={null}
        successMessage={null}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        activeTab="details"
        onTabChange={() => {}} // Not used in create mode
        onSave={handleSave}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onCancel={handleCancel}
      />
    </div>
  );
}

