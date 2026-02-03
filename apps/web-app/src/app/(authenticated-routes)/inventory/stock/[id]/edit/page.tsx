'use client';

import {
    extractErrorMessage,
    StatusEnum,
    StockApi,
    StockDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createFieldChangeDetector } from '../../../../utils/fieldChangeDetection';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import StockForm from '../../components/StockForm';

interface EditStockPageProps {
    params: {
        id: string;
    };
}

export default function EditStockPage({ params }: EditStockPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
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

                const stock = await StockApi.getStockById(params.id, userRole);
                setSelectedStock(stock);

                // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
                if (
                    (stock.status === StatusEnum.FOR_APPROVAL ||
                        stock.status === StatusEnum.NEW_RECORD ||
                        stock.status === StatusEnum.FOR_DELETION) &&
                    isAdminUser
                ) {
                    setActiveTab('approval');
                } else {
                    setActiveTab('details');
                }
            } catch (err) {
                console.error('Error fetching stock:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load stock details. Please try again.');
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

    const handleSave = async (stock: StockDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing stock
            const updatedStock = await StockApi.updateStock(
                params.id,
                {
                    stockId: stock.stockId,
                    lotNo: stock.lotNo,
                    productId: stock.productId,
                    productName: stock.productName,
                    totalQuantity: stock.totalQuantity,
                    productUnitId: stock.productUnitId,
                    productUnitName: stock.productUnitName,
                    expirationDate: stock.expirationDate,
                    stockTypeId: stock.stockTypeId,
                    stockTypeName: stock.stockTypeName,
                    status: stock.status,
                    changeReason: stock.changeReason,
                },
                userRole
            );

            setSelectedStock(updatedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Stock updated successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list after a short delay
            setTimeout(() => {
                router.push('/inventory/stock');
            }, 1500);
        } catch (error) {
            console.error('Error updating stock:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update stock. Please try again.');
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

            await StockApi.deleteStock(selectedStock, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Stock deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/stock');
        } catch (error) {
            console.error('Error deleting stock:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete stock. Please try again.');
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
            const approvedStock = await StockApi.approveStock(selectedStock.stockId!, userRole);
            setSelectedStock(approvedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Stock approved successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/stock');
        } catch (err) {
            console.error('Error approving stock:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve stock. Please try again.');
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
            const deniedStock = await StockApi.denyStock(selectedStock.stockId!, approverMessage, userRole);
            setSelectedStock(deniedStock);
            setFlashNotification({
                title: 'Success!',
                message: 'Stock changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to stock list immediately - notification will persist
            router.push('/inventory/stock');
        } catch (err) {
            console.error('Error denying stock:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny stock. Please try again.');
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
        router.push('/inventory/stock');
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
                    <span>Stock not found</span>
                </div>
            </div>
        );
    }

    // Render approval tab content
    const renderApprovalTab = () => {
        if (!selectedStock) return null;

        // If status is FOR_DELETION, show deletion message
        if (selectedStock.status === StatusEnum.FOR_DELETION) {
            return (
                <div className="space-y-6 animate-fadeIn">
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                                <svg
                                    className="h-6 w-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                                <p className="mt-1 text-sm text-red-700">
                                    This record has been marked for deletion and is awaiting approval.
                                </p>
                            </div>
                        </div>
                        {selectedStock.changeReason && (
                            <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                                <p className="text-sm font-semibold text-gray-700">Deletion Reason:</p>
                                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                                    {selectedStock.changeReason}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        {isAdminUser ? (
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleDeny}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    {isLoading ? 'Processing...' : 'Deny Deletion'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {isLoading ? 'Processing...' : 'Approve Deletion'}
                                </button>
                            </div>
                        ) : (
                            <div className="hidden sm:block" />
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
            );
        }

        // For FOR_APPROVAL and NEW_RECORD, show approval version
        if (!selectedStock.forApprovalVersion) return null;

        const approvalData = selectedStock.forApprovalVersion;

        // Use shared field change detection utility
        const isFieldChanged = createFieldChangeDetector(
            selectedStock as Record<string, unknown>,
            selectedStock.forApprovalVersion as Record<string, unknown> | undefined
        );

        // Helper function to format display value
        const formatValue = (value: any): string => {
            if (value === null || value === undefined) return '-';
            if (typeof value === 'boolean') return value ? 'Yes' : 'No';
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        };

        // Helper function to render read-only field with highlighting
        const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
            const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

            return (
                <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                        {label}
                    </label>
                    <div
                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                            fieldChanged
                                ? 'border-blue-500 bg-blue-50 text-gray-700'
                                : 'border-gray-200 bg-white text-gray-500'
                        }`}
                    >
                        {formatValue(value)}
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
                {/* Change Reason */}
                {selectedStock?.changeReason && (
                    <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </div>
                            <h4 className="m-0 text-base font-bold text-blue-600">
                                Change Reason and Modification Made
                            </h4>
                        </div>
                        <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm">
                            {selectedStock.changeReason}
                        </div>
                    </div>
                )}

                {/* Basic Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Basic Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderReadOnlyField('Lot Number', approvalData.lotNo, 'bg-blue-500', 'lotNo')}
                            {renderReadOnlyField(
                                'Expiration Date',
                                approvalData.expirationDate,
                                'bg-blue-500',
                                'expirationDate'
                            )}
                        </div>
                    </div>
                </div>

                {/* Product & Type Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Product & Type</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {renderReadOnlyField('Product', approvalData.productName, 'bg-blue-500', 'productName')}
                            {renderReadOnlyField(
                                'Product Unit',
                                approvalData.productUnitName,
                                'bg-blue-500',
                                'productUnitName'
                            )}
                            {renderReadOnlyField(
                                'Stock Type',
                                approvalData.stockTypeName,
                                'bg-blue-500',
                                'stockTypeName'
                            )}
                        </div>
                    </div>
                </div>

                {/* Quantity Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Quantity Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderReadOnlyField(
                                'Total Quantity',
                                approvalData.totalQuantity,
                                'bg-blue-500',
                                'totalQuantity'
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    {isAdminUser &&
                    (selectedStock?.status === StatusEnum.FOR_APPROVAL ||
                        selectedStock?.status === StatusEnum.NEW_RECORD ||
                        selectedStock?.status === StatusEnum.FOR_DELETION) ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                onClick={handleDeny}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                {isLoading ? 'Processing...' : 'Deny Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                {isLoading ? 'Processing...' : 'Approve Changes'}
                            </button>
                        </div>
                    ) : (
                        <div className="hidden sm:block" />
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
        );
    };

    // Render logs tab content
    const renderLogsTab = () => {
        if (!selectedStock) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-blue-600">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedStock?.activityLogs)}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
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
                        href="/inventory/stock"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Stock
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedStock && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading stock details...</div>
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
                                        Stock Information
                                        {selectedStock && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>{getStatusText(selectedStock.status || StatusEnum.ACTIVE)}</span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                {selectedStock.status !== StatusEnum.ACTIVE && (
                                    <button
                                        onClick={() => setActiveTab('approval')}
                                        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                            activeTab === 'approval'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            Pending Changes
                                        </span>
                                    </button>
                                )}

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
                                <StockForm
                                    isCreateMode={false}
                                    selectedStock={selectedStock}
                                    successMessage={null}
                                    isAdminUser={isAdminUser}
                                    activeTab="details"
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onCancel={handleCancel}
                                />
                            )}

                            {activeTab === 'approval' && renderApprovalTab()}

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
