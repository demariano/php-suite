'use client';

import { DenyReasonDialog } from '@components-web';
import {
    AccountApi,
    AccountsDto,
    extractErrorMessage,
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
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDenyDialog, setShowDenyDialog] = useState(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const userRoleParam = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                setIsLoading(true);
                const account = await AccountApi.getAccountById(params.id, userRoleParam);
                setSelectedAccount(account);
                setActiveTab('details');
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
            router.push('/accounting/accounts');
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

    const handleReactivate = async () => {
        if (!selectedAccount) return;
        try {
            setIsLoading(true);
            // Update the account with status set to ACTIVE
            const reactivatedAccount: AccountsDto = {
                ...selectedAccount,
                status: StatusEnum.ACTIVE,
            };
            await AccountApi.updateAccount(selectedAccount.accountingId, reactivatedAccount, userRoleParam);
            setFlashNotification({
                title: 'Account reactivated',
                message: 'The account has been reactivated successfully.',
                alertType: 'success',
            });
            router.push('/accounting/accounts');
        } catch (error) {
            console.error('Error reactivating account', error);
            setFlashNotification({
                title: 'Reactivation failed',
                message: 'We were unable to reactivate this account.',
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

    const handleDeny = () => {
        setShowDenyDialog(true);
    };

    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selectedAccount) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedAccount = await (AccountApi as any).denyAccount(
                selectedAccount.accountingId,
                approverMessage,
                userRole
            );
            setSelectedAccount(deniedAccount);
            setFlashNotification({
                title: 'Success!',
                message: 'Account changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to accounts list immediately - notification will persist
            router.push('/accounting/accounts');
        } catch (err) {
            console.error('Error denying account:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny account. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDenyCancel = () => {
        setShowDenyDialog(false);
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
                    onReactivate={handleReactivate}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onCancel={handleCancel}
                />
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedAccount}
                recordDisplayName={selectedAccount?.accountName || 'Account'}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />
        </div>
    );
}
