'use client';

import { ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog, StatusBadge } from '@components-web';
import {
    CustomerClassificationApi,
    CustomerClassificationDto,
    extractErrorMessage,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CustomerClassificationForm from '../../components/CustomerClassificationForm';

interface EditCustomerClassificationPageProps {
    params: {
        id: string;
    };
}

export default function EditCustomerClassificationPage({ params }: EditCustomerClassificationPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCustomerClassification, setSelectedCustomerClassification] =
        useState<CustomerClassificationDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch customer classification details on component mount
    useEffect(() => {
        const fetchCustomerClassification = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                // This prevents role parameter leakage when bypass auth is disabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const customerClassification = await CustomerClassificationApi.getCustomerClassificationById(
                    params.id,
                    userRole
                );
                setSelectedCustomerClassification(customerClassification);

                // Always default to details tab
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching customer classification:', err);
                const errorMessage = extractErrorMessage(
                    err,
                    'Failed to load customer classification details. Please try again.'
                );
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
            fetchCustomerClassification();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (customerClassification: CustomerClassificationDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing customer classification
            const updatedCustomerClassification = await CustomerClassificationApi.updateCustomerClassification(
                params.id,
                {
                    customerClassificationId: customerClassification.customerClassificationId,
                    customerClassificationName: customerClassification.customerClassificationName,
                    status: customerClassification.status,
                    changeReason: customerClassification.changeReason,
                },
                userRole
            );

            setSelectedCustomerClassification(updatedCustomerClassification);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer Classification updated successfully!',
                alertType: 'success',
            });
            router.push('/customers/classifications');
        } catch (error) {
            console.error('Error updating customer classification:', error);
            const errorMessage = extractErrorMessage(
                error,
                'Failed to update customer classification. Please try again.'
            );
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
        if (!selectedCustomerClassification) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async (reason: string) => {
        if (!selectedCustomerClassification) {
            return;
        }

        try {
            setIsLoading(true);
            setShowDeleteModal(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await CustomerClassificationApi.deleteCustomerClassification(
                selectedCustomerClassification.customerClassificationId,
                reason,
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Customer Classification marked for deletion successfully!',
                alertType: 'success',
            });
            router.push('/customers/classifications');
        } catch (error) {
            console.error('Error deleting customer classification:', error);
            const errorMessage = extractErrorMessage(
                error,
                'Failed to delete customer classification. Please try again.'
            );
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
        if (!selectedCustomerClassification) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedCustomerClassification = await CustomerClassificationApi.approveCustomerClassification(
                selectedCustomerClassification.customerClassificationId,
                userRole
            );
            setSelectedCustomerClassification(approvedCustomerClassification);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer Classification approved successfully!',
                alertType: 'success',
            });
            router.push('/customers/classifications');
        } catch (err) {
            console.error('Error approving customer classification:', err);
            const errorMessage = extractErrorMessage(
                err,
                'Failed to approve customer classification. Please try again.'
            );
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
        if (!selectedCustomerClassification) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record
            const deniedCustomerClassification = await CustomerClassificationApi.denyCustomerClassification(
                selectedCustomerClassification.customerClassificationId,
                approverMessage,
                userRole
            );
            setSelectedCustomerClassification(deniedCustomerClassification);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer Classification changes denied successfully!',
                alertType: 'success',
            });
            router.push('/customers/classifications');
        } catch (err) {
            console.error('Error denying customer classification:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny customer classification. Please try again.');
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
        if (!selectedCustomerClassification) return;

        try {
            setIsLoading(true);
            setShowReactivateModal(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const reactivatedClassification = await CustomerClassificationApi.updateCustomerClassification(
                params.id,
                {
                    customerClassificationId: selectedCustomerClassification.customerClassificationId,
                    customerClassificationName: selectedCustomerClassification.customerClassificationName,
                    status: StatusEnum.ACTIVE,
                    changeReason: selectedCustomerClassification.changeReason,
                },
                userRole
            );

            setSelectedCustomerClassification(reactivatedClassification);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer Classification reactivated successfully!',
                alertType: 'success',
            });

            router.push('/customers/classifications');
        } catch (error) {
            console.error('Error reactivating customer classification:', error);
            const errorMessage = extractErrorMessage(
                error,
                'Failed to reactivate customer classification. Please try again.'
            );
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/customers/classifications');
    };

    // Helper function to get tab color based on status
    const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
        if (!isActive) {
            return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
        }

        switch (status) {
            case StatusEnum.ACTIVE:
                return 'bg-green-600 text-white shadow-sm';
            case StatusEnum.FOR_APPROVAL:
                return 'bg-yellow-500 text-white shadow-sm';
            case StatusEnum.FOR_DEACTIVATION:
                return 'bg-orange-500 text-white shadow-sm';
            case StatusEnum.INACTIVE:
                return 'bg-gray-500 text-white shadow-sm';
            case StatusEnum.NEW_RECORD:
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    if (!selectedCustomerClassification && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Customer Classification not found</span>
                </div>
            </div>
        );
    }

    // Render logs tab content
    const renderLogsTab = () => {
        if (!selectedCustomerClassification) return null;

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

                    {renderActivityLogsTable(selectedCustomerClassification?.activityLogs)}
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                record={selectedCustomerClassification}
                recordDisplayName={
                    selectedCustomerClassification?.customerClassificationName || 'this customer classification'
                }
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedCustomerClassification}
                recordDisplayName={
                    selectedCustomerClassification?.customerClassificationName || 'this customer classification'
                }
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            {/* Breadcrumbs */}
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
                        href="/customers/classifications"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Classifications
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedCustomerClassification && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading customer classification details...</div>
                </div>
            )}

            {/* Customer Classification Form with Tabs */}
            {selectedCustomerClassification && (
                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                                        selectedCustomerClassification.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Classification Information
                                        {selectedCustomerClassification && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <StatusBadge
                                                    status={selectedCustomerClassification.status || StatusEnum.ACTIVE}
                                                />
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                        {/* Tab Content */}
                        <div className="bg-white p-4 sm:p-6">
                            {activeTab === 'details' && (
                                <CustomerClassificationForm
                                    isCreateMode={false}
                                    selectedCustomerClassification={selectedCustomerClassification}
                                    successMessage={null}
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onReactivate={handleReactivate}
                                    onCancel={handleCancel}
                                    isAdminUser={isAdminUser}
                                    onApprove={handleApprove}
                                    onDeny={handleDeny}
                                />
                            )}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedCustomerClassification}
                recordDisplayName={selectedCustomerClassification?.customerClassificationName}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedCustomerClassification}
                recordDisplayName={selectedCustomerClassification?.customerClassificationName}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            <ConfirmationModal
                show={showReactivateModal}
                record={selectedCustomerClassification}
                variant="reactivate"
                recordDisplayName={selectedCustomerClassification?.customerClassificationName}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={() => setShowReactivateModal(false)}
            />
        </div>
    );
}
