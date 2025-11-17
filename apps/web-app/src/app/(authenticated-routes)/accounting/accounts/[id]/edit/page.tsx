'use client';

import {
  AccountApi,
  AccountsDto,
  StatusEnum,
  useEnv,
  useLocalStore,
  useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AccountFormWrapper from './components/AccountFormWrapper';

interface EditAccountPageProps {
  params: {
    id: string;
  };
}

export default function EditAccountPage({ params }: EditAccountPageProps) {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  const userRoleParam = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setIsLoading(true);
        const account = await AccountApi.getAccountById(params.id, userRoleParam);
        setSelectedAccount(account);

        if (
          isAdminUser &&
          account.status &&
          [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(account.status)
        ) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
      } catch (error) {
        console.error('Error fetching account details', error);
        setFlashNotification({
          title: 'Account not found',
          message: 'We were unable to load the requested account.',
          alertType: 'error',
        });
        router.push('/accounting/accounts');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchAccount();
    }
  }, [params.id, userRoleParam, isAdminUser, router, setFlashNotification]);

  const handleSave = async (account: AccountsDto) => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      const updated = await AccountApi.updateAccount(selectedAccount.accountingId, account, userRoleParam);
      setFlashNotification({
        title: 'Success',
        message: 'Account updated successfully.',
        alertType: 'success',
      });
      setTimeout(() => router.push('/accounting/accounts'), 1000);
      setSelectedAccount(updated);
    } catch (error) {
      console.error('Error updating account', error);
      setFlashNotification({
        title: 'Update failed',
        message: 'Please try saving the account again.',
        alertType: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      await AccountApi.deleteAccount(selectedAccount, userRoleParam);
      setFlashNotification({
        title: 'Account deleted',
        message: 'The account was removed successfully.',
        alertType: 'success',
      });
      router.push('/accounting/accounts');
    } catch (error) {
      console.error('Error deleting account', error);
      setFlashNotification({
        title: 'Delete failed',
        message: 'We were unable to delete this account.',
        alertType: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      await AccountApi.approveAccount(selectedAccount.accountingId, userRoleParam);
      setFlashNotification({
        title: 'Account approved',
        message: 'Changes were approved successfully.',
        alertType: 'success',
      });
      router.push('/accounting/accounts');
    } catch (error) {
      console.error('Error approving account', error);
      setFlashNotification({
        title: 'Approval failed',
        message: 'Please try again later.',
        alertType: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      await AccountApi.denyAccount(selectedAccount.accountingId, userRoleParam);
      setFlashNotification({
        title: 'Changes denied',
        message: 'Pending changes were denied successfully.',
        alertType: 'success',
      });
      router.push('/accounting/accounts');
    } catch (error) {
      console.error('Error denying account', error);
      setFlashNotification({
        title: 'Unable to deny changes',
        message: 'Please try again later.',
        alertType: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => router.push('/accounting/accounts');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <a href="/dashboard" className="text-blue-500 transition hover:text-blue-600">
          Home
        </a>
        <span className="text-gray-400">/</span>
        <a href="/accounting" className="text-blue-500 transition hover:text-blue-600">
          Accounting
        </a>
        <span className="text-gray-400">/</span>
        <a href="/accounting/accounts" className="text-blue-500 transition hover:text-blue-600">
          Accounts
        </a>
        <span className="text-gray-400">/</span>
        <span className="text-gray-800 font-medium">Edit</span>
      </nav>

      {isLoading && !selectedAccount ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
          Loading account details...
        </div>
      ) : null}

      {!isLoading && !selectedAccount ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 shadow-sm">
          Account not found.
        </div>
      ) : null}

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
