'use client';

import { ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog } from '@components-web';
import {
    extractErrorMessage,
    StatusEnum,
    TermsApi,
    TermsDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TermsForm from '../../components/TermsForm';

interface EditTermsPageProps {
    params: {
        id: string;
    };
}

export default function EditTermsPage({ params }: EditTermsPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTerms, setSelectedTerms] = useState<TermsDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                setIsLoading(true);

                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const terms = await TermsApi.getTermsById(params.id, userRole);
                setSelectedTerms(terms);
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching terms:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load terms details. Please try again.');
                setFlashNotification({
                    title: 'Error',
                    message: errorMessage,
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchTerms();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole]);

    const handleSave = async (terms: TermsDto) => {
        try {
            setIsLoading(true);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const updatedTerms = await TermsApi.updateTerms(
                params.id,
                {
                    termsId: terms.termsId,
                    termsName: terms.termsName,
                    days: terms.days,
                    status: terms.status,
                    changeReason: terms.changeReason,
                },
                userRole
            );

            setSelectedTerms(updatedTerms);
            setFlashNotification({
                title: 'Success!',
                message: 'Terms updated successfully!',
                alertType: 'success',
            });
            router.push('/customers/terms');
        } catch (error) {
            console.error('Error updating terms:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update terms. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = () => {
        if (!selectedTerms) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async (deletionReason: string) => {
        if (!selectedTerms) {
            return;
        }

        try {
            setIsLoading(true);
            setShowDeleteModal(false);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await TermsApi.deleteTerms(selectedTerms.termsId, deletionReason, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Terms deleted successfully!',
                alertType: 'success',
            });
            router.push('/customers/terms');
        } catch (error) {
            console.error('Error deleting terms:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete terms. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedTerms) return;

        try {
            setIsLoading(true);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const approvedTerms = await TermsApi.approveTerms(selectedTerms.termsId, userRole);
            setSelectedTerms(approvedTerms);
            setFlashNotification({
                title: 'Success!',
                message: 'Terms approved successfully!',
                alertType: 'success',
            });
            router.push('/customers/terms');
        } catch (err) {
            console.error('Error approving terms:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve terms. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
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
        if (!selectedTerms) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const deniedTerms = await TermsApi.denyTerms(selectedTerms.termsId, approverMessage, userRole);
            setSelectedTerms(deniedTerms);
            setFlashNotification({
                title: 'Success!',
                message: 'Terms changes denied successfully!',
                alertType: 'success',
            });
            router.push('/customers/terms');
        } catch (err) {
            console.error('Error denying terms:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny terms. Please try again.');
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

    const handleReactivate = () => {
        setShowReactivateModal(true);
    };

    const handleReactivateConfirm = async () => {
        if (!selectedTerms) return;

        try {
            setIsLoading(true);
            setShowReactivateModal(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const reactivatedTerms: TermsDto = {
                termsId: selectedTerms.termsId,
                termsName: selectedTerms.termsName,
                days: selectedTerms.days,
                status: StatusEnum.ACTIVE,
                changeReason: selectedTerms.changeReason,
            };

            const updatedTerms = await TermsApi.updateTerms(params.id, reactivatedTerms, userRole);
            setSelectedTerms(updatedTerms);
            setFlashNotification({
                title: 'Success!',
                message: 'Terms reactivated successfully!',
                alertType: 'success',
            });
            router.push('/customers/terms');
        } catch (err) {
            console.error('Error reactivating terms:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to reactivate terms. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivateCancel = () => {
        setShowReactivateModal(false);
    };

    const handleCancel = () => {
        router.push('/customers/terms');
    };

    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.NEW_RECORD:
                return 'New Record';
            default:
                return status;
        }
    };

    const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
        if (!isActive) {
            return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
        }

        switch (status) {
            case StatusEnum.ACTIVE:
                return 'bg-green-600 text-white shadow-sm';
            case StatusEnum.FOR_APPROVAL:
                return 'bg-yellow-500 text-white shadow-sm';
            case StatusEnum.FOR_DELETION:
                return 'bg-red-600 text-white shadow-sm';
            case StatusEnum.NEW_RECORD:
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    if (!selectedTerms && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Terms not found</span>
                </div>
            </div>
        );
    }

    const renderLogsTab = () => {
        if (!selectedTerms) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-700">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedTerms?.activityLogs)}
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedTerms}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedTerms}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/customers"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Customers
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/customers/terms"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Terms
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !selectedTerms && (
                <div className="flex min-h-96 items-center justify-center">
                    <div className="text-gray-600">Loading terms details...</div>
                </div>
            )}

            {selectedTerms && (
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                            <div className="flex flex-nowrap gap-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${getTabColorClasses(
                                        selectedTerms.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Terms Information
                                        {selectedTerms && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>{getStatusText(selectedTerms.status || StatusEnum.ACTIVE)}</span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6">
                            {activeTab === 'details' && (
                                <TermsForm
                                    isCreateMode={false}
                                    selectedTerms={selectedTerms}
                                    successMessage={null}
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onCancel={handleCancel}
                                    isAdminUser={isAdminUser}
                                    onReactivate={handleReactivate}
                                    isLoading={isLoading}
                                    onApprove={handleApprove}
                                    onDeny={handleDeny}
                                />
                            )}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                show={showReactivateModal}
                record={selectedTerms}
                variant="reactivate"
                recordDisplayName={selectedTerms?.termsName}
                onConfirm={handleReactivateConfirm}
                onCancel={handleReactivateCancel}
            />
        </div>
    );
}
