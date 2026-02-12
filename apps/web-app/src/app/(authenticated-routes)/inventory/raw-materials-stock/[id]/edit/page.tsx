'use client';

import {
    extractErrorMessage,
    RawMaterialsStockApi,
    RawMaterialsStockDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../../stock/components/DeleteConfirmationModal';
import DenyReasonDialog from '../../../stock/components/DenyReasonDialog';
import { RawMaterialsStockForm } from '../../components';

interface EditRawMaterialsStockPageProps {
    params: {
        id: string;
    };
}

export default function EditRawMaterialsStockPage({ params }: EditRawMaterialsStockPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStock, setSelectedStock] = useState<RawMaterialsStockDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch stock details on component mount
    useEffect(() => {
        const fetchStock = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const stock = await (RawMaterialsStockApi as any).getRawMaterialsStockById(params.id, userRole);
                setSelectedStock(stock);

                // Always default to details tab
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching raw materials stock:', err);
                const errorMessage = extractErrorMessage(
                    err,
                    'Failed to load raw materials stock details. Please try again.'
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
            fetchStock();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (stock: RawMaterialsStockDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing stock
            const updatedStock = await RawMaterialsStockApi.updateRawMaterialsStock(
                params.id,
                {
                    rawMaterialsStockId: stock.rawMaterialsStockId,
                    lotNo: stock.lotNo,
                    rawMaterialId: stock.rawMaterialId,
                    rawMaterialName: stock.rawMaterialName,
                    rawMaterialSupplierId: stock.rawMaterialSupplierId,
                    rawMaterialSupplierName: stock.rawMaterialSupplierName,
                    rawMaterialsLocationId: stock.rawMaterialsLocationId,
                    rawMaterialsLocationName: stock.rawMaterialsLocationName,
                    qty: stock.qty,
                    status: stock.status,
                    changeReason: stock.changeReason,
                },
                userRole
            );

            setSelectedStock(updatedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw materials stock updated successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list after a short delay
            setTimeout(() => {
                router.push('/inventory/raw-materials-stock');
            }, 1500);
        } catch (error) {
            console.error('Error updating raw materials stock:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update raw materials stock. Please try again.');
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
        if (!selectedStock) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedStock) {
            return;
        }

        setShowDeleteModal(false);

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (RawMaterialsStockApi as any).deleteRawMaterialsStock(selectedStock, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Raw materials stock deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/raw-materials-stock');
        } catch (error) {
            console.error('Error deleting raw materials stock:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete raw materials stock. Please try again.');
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
        if (!selectedStock) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedStock = await RawMaterialsStockApi.approveRawMaterialsStock(
                selectedStock.rawMaterialsStockId!,
                userRole
            );
            setSelectedStock(approvedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw materials stock approved successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/raw-materials-stock');
        } catch (err) {
            console.error('Error approving raw materials stock:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve raw materials stock. Please try again.');
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
        if (!selectedStock) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedStock = await RawMaterialsStockApi.denyRawMaterialsStock(
                selectedStock.rawMaterialsStockId!,
                approverMessage,
                userRole
            );
            setSelectedStock(deniedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw materials stock changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/raw-materials-stock');
        } catch (err) {
            console.error('Error denying raw materials stock:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny raw materials stock. Please try again.');
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
        router.push('/inventory/raw-materials-stock');
    };

    // Helper function to get status text
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
            case StatusEnum.FOR_DELETION:
                return 'bg-red-600 text-white shadow-sm';
            case StatusEnum.NEW_RECORD:
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    if (!selectedStock && !isLoading) {
        return (
            <div className="min-h-screen bg-white p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>Raw materials stock not found</span>
                </div>
            </div>
        );
    }

    // Render logs tab content
    const renderLogsTab = () => {
        if (!selectedStock) return null;

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

                    {renderActivityLogsTable(selectedStock?.activityLogs)}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block" />
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {isAdminUser &&
                            selectedStock &&
                            [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                selectedStock.status as StatusEnum
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
                            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
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
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/raw-materials-stock"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Raw Materials Stock
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedStock && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading raw materials stock details...</div>
                </div>
            )}

            {/* Stock Form with Tabs */}
            {selectedStock && (
                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                                        selectedStock.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                            />
                                        </svg>
                                        Raw Materials Stock Information
                                        {selectedStock && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>{getStatusText(selectedStock.status || StatusEnum.ACTIVE)}</span>
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
                                <RawMaterialsStockForm
                                    isCreateMode={false}
                                    selectedStock={selectedStock}
                                    successMessage={null}
                                    isAdminUser={isAdminUser}
                                    activeTab="details"
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onCancel={handleCancel}
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
                stock={selectedStock}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                stock={selectedStock}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
}
