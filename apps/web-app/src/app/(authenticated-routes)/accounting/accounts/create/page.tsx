'use client';

import { AccountApi, AccountsDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AccountForm from '../components/AccountForm';

export default function CreateAccountPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();

  const [isLoading, setIsLoading] = useState(false);
  const userRoleParam = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (account: AccountsDto) => {
    try {
      setIsLoading(true);
      await AccountApi.createAccount(
        {
          accountName: account.accountName,
          accountType: account.accountType,
          subAccounts: account.subAccounts,
          changeReason: account.changeReason,
          status: account.status,
        },
        userRoleParam
      );
      setFlashNotification({
        title: 'Account created',
        message: 'New account was added successfully.',
        alertType: 'success',
      });
      router.push('/accounting/accounts');
    } catch (error) {
      console.error('Error creating account', error);
      setFlashNotification({
        title: 'Create failed',
        message: 'Please review the form and try again.',
        alertType: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => router.push('/accounting/accounts');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm">
          <a href="/dashboard" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/accounting" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Accounting
          </a>
          <span className="text-gray-400">/</span>
          <a href="/accounting/accounts" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Accounts
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 font-medium">Create</span>
        </nav>
      </div>

      <div className="flex justify-center">
        <div className="w-full rounded-xl border border-gray-200 bg-white shadow-xl sm:max-w-4xl">
          <div className="overflow-x-auto border-b-2 border-blue-200 bg-gray-50 p-2">
            <div className="flex flex-nowrap gap-2">
              <button className="flex-shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm">
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Account Information
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6">
            <AccountForm
              isCreateMode
              selectedAccount={null}
              successMessage={null}
              onSave={handleSave}
              onDelete={() => {}}
              onCancel={handleCancel}
              isAdminUser={isAdminUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
