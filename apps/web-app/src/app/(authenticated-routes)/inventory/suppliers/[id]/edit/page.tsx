'use client';

import {
    StatusEnum,
    SupplierApi,
    SupplierDto,
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import SupplierForm from '../../components/SupplierForm';

interface EditSupplierPageProps {
    params: {
        id: string;
    };
}

export default function EditSupplierPage({ params }: EditSupplierPageProps) {
    const router = useRouter();
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchSupplier = async () => {
            if (!params.id) return;

            try {
                setIsLoading(true);
                setError(null);

                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
                const supplier = await SupplierApi.getSupplierById(params.id, userRole);
                setSelectedSupplier(supplier);
                setActiveTab('details');
            } catch (err: any) {
                console.error('Failed to fetch supplier:', err);
                setError(err.message || 'Failed to load supplier details. Please try again.');
                setFlashNotification({
                    title: 'Error!',
                    message: err.message || 'Failed to load supplier details. Please try again.',
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupplier();
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

    const handleSave = async (supplier: SupplierDto) => {
        if (!selectedSupplier) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const updatedRecord = await SupplierApi.updateSupplier(
                supplier.supplierId!,
                {
                    ...supplier,
                    status: supplier.status,
                },
                userRole
            );

            setSelectedSupplier(updatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Supplier updated successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/suppliers');
        } catch (err: any) {
            console.error('Failed to save supplier:', err);
            setError(err.message || 'Failed to save supplier. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to save supplier. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedSupplier) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await SupplierApi.deleteSupplier(selectedSupplier, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Supplier deleted successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/suppliers');
        } catch (err: any) {
            console.error('Failed to delete supplier:', err);
            setError(err.message || 'Failed to delete supplier. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to delete supplier. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
    };

    const handleApproveRecord = async () => {
        if (!selectedSupplier) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await SupplierApi.approveSupplier(selectedSupplier.supplierId!, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Supplier approved successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/suppliers');
        } catch (err: any) {
            console.error('Failed to approve supplier:', err);
            setError(err.message || 'Failed to approve supplier. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to approve supplier. Please try again.',
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
        if (!selectedSupplier) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedSupplier = await SupplierApi.denySupplier(
                selectedSupplier.supplierId!,
                approverMessage,
                userRole
            );
            setSelectedSupplier(deniedSupplier);
            setFlashNotification({
                title: 'Success!',
                message: 'Supplier changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to supplier list immediately - notification will persist
            router.push('/inventory/suppliers');
        } catch (err) {
            console.error('Error denying supplier:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny supplier. Please try again.');
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

    const handleCancel = () => {
        router.replace('/inventory/suppliers');
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

    const renderLogsTab = () => {
        if (!selectedSupplier) return null;

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

                    {renderActivityLogsTable(selectedSupplier?.activityLogs)}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block" />
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {isAdminUser &&
                            selectedSupplier &&
                            [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                selectedSupplier.status as StatusEnum
                            ) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDeny}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
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
            </div>
        );
    };

    if (isLoading && !selectedSupplier) {
        return (
            <div className="flex min-h-96 items-center justify-center">
                <div className="text-gray-600">Loading supplier details...</div>
            </div>
        );
    }

    if (!selectedSupplier && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Supplier not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <DeleteConfirmationModal
                show={showDeleteConfirm}
                supplier={selectedSupplier}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
            <DenyReasonDialog
                show={showDenyDialog}
                supplier={selectedSupplier}
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
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/suppliers"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Suppliers
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {selectedSupplier && (
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                            <div className="flex flex-nowrap gap-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${getTabColorClasses(
                                        selectedSupplier.status || StatusEnum.ACTIVE,
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
                                        Supplier Information
                                        {selectedSupplier && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>
                                                    {getStatusText(selectedSupplier.status || StatusEnum.ACTIVE)}
                                                </span>
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
                                <SupplierForm
                                    isCreateMode={false}
                                    selectedSupplier={selectedSupplier}
                                    successMessage={null}
                                    onSave={handleSave}
                                    onDelete={handleDeleteClick}
                                    onCancel={handleCancel}
                                    isAdminUser={isAdminUser}
                                    onApprove={handleApproveRecord}
                                    onDeny={handleDeny}
                                />
                            )}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
