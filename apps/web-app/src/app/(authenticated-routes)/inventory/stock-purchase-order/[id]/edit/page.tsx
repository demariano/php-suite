'use client';

import { DeleteConfirmationModal } from '@components-web';
import { StockPurchaseOrderApi } from '@data-access/api/stock-purchase-order.api';
import { useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApprovalTab, DeliveriesTab, DenyReasonDialog, LogsTab, PurchaseOrderDetailsTab } from './components';

type TabType = 'details' | 'deliveries' | 'logs';

export default function EditStockPurchaseOrderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();

    const [activeTab, setActiveTab] = useState<TabType>('details');
    const [purchaseOrderData, setPurchaseOrderData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        fetchPurchaseOrder();
    }, [id]);

    useEffect(() => {
        if (purchaseOrderData) {
            setActiveTab('details');
        }
    }, [purchaseOrderData]);

    const fetchPurchaseOrder = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await StockPurchaseOrderApi.getStockPurchaseOrder(id);
            setPurchaseOrderData(response);
        } catch (error: any) {
            console.error('Failed to fetch purchase order:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load purchase order.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateDetails = async (formData: any) => {
        setIsSubmitting(true);
        try {
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (StockPurchaseOrderApi as any).updateStockPurchaseOrder(id, formData, userRole);
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order updated successfully!',
                alertType: 'success',
            });
            router.push('/inventory/stock-purchase-order');
        } catch (error: any) {
            console.error('Failed to update purchase order:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to update purchase order.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransitionToPending = async () => {
        setIsSubmitting(true);
        try {
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (StockPurchaseOrderApi as any).transitionSystemGeneratedToPending(id, userRole);
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order status updated to PENDING!',
                alertType: 'success',
            });
            await fetchPurchaseOrder();
        } catch (error: any) {
            console.error('Failed to transition status:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to update status.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddDelivery = async (deliveryData: any) => {
        setIsSubmitting(true);
        try {
            await StockPurchaseOrderApi.addIncomingDelivery(id, deliveryData);
            setFlashNotification({
                title: 'Success',
                message: 'Delivery recorded successfully!',
                alertType: 'success',
            });
            await fetchPurchaseOrder();
        } catch (error: any) {
            console.error('Failed to add delivery:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to record delivery.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDelivery = async (delivery: any) => {
        setIsSubmitting(true);
        try {
            await StockPurchaseOrderApi.deleteDelivery(id, delivery);
            setFlashNotification({
                title: 'Success',
                message: 'Delivery deleted successfully!',
                alertType: 'success',
            });
            await fetchPurchaseOrder();
        } catch (error: any) {
            console.error('Failed to delete delivery:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to delete delivery.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await StockPurchaseOrderApi.approveStockPurchaseOrder(id);
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order approved successfully!',
                alertType: 'success',
            });
            router.push('/inventory/stock-purchase-order');
        } catch (error: any) {
            console.error('Failed to approve purchase order:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to approve purchase order.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeny = () => {
        setIsDenyDialogOpen(true);
    };

    const handleDenySubmit = async (approverMessage: string) => {
        setIsSubmitting(true);
        try {
            await StockPurchaseOrderApi.denyStockPurchaseOrder(id, { approverMessage });
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order denied successfully!',
                alertType: 'success',
            });
            router.push('/inventory/stock-purchase-order');
        } catch (error: any) {
            console.error('Failed to deny purchase order:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to deny purchase order.',
                alertType: 'error',
            });
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async (record: any, reason: string) => {
        setIsSubmitting(true);
        try {
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await StockPurchaseOrderApi.deleteStockPurchaseOrder(id, { changeReason: reason }, userRole);
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order deleted successfully!',
                alertType: 'success',
            });
            router.push('/inventory/stock-purchase-order');
        } catch (error: any) {
            console.error('Failed to delete purchase order:', error);
            setFlashNotification({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to delete purchase order.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
    };

    const handleCancel = () => {
        router.push('/inventory/stock-purchase-order');
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
            FOR_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'For Approval' },
            FOR_DELETION: { bg: 'bg-red-100', text: 'text-red-700', label: 'For Deletion' },
            NEW_RECORD: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New Record' },
        };

        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

        return (
            <span
                className={`inline-flex items-center rounded-full ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}
            >
                {badge.label}
            </span>
        );
    };

    const getPoStatusBadge = (poStatus: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            SYSTEM_GENERATED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'System Generated' },
            PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
            PARTIAL: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial' },
            COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
        };

        const badge = badges[poStatus] || { bg: 'bg-gray-100', text: 'text-gray-700', label: poStatus };

        return (
            <span
                className={`inline-flex items-center rounded-full ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}
            >
                {badge.label}
            </span>
        );
    };

    const hasDeliveries = purchaseOrderData
        ? (purchaseOrderData.deliveredPurchaseOrderDetails || []).length > 0
        : false;

    const getStatusText = (status: string): string => {
        const statusMap: Record<string, string> = {
            ACTIVE: 'Active',
            FOR_APPROVAL: 'For Approval',
            FOR_DELETION: 'For Deletion',
            NEW_RECORD: 'New Record',
        };
        return statusMap[status] || status;
    };

    const getTabColorClasses = (status: string, isActive: boolean): string => {
        if (!isActive) {
            return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
        }

        switch (status) {
            case 'ACTIVE':
                return 'bg-green-600 text-white shadow-sm';
            case 'FOR_APPROVAL':
                return 'bg-yellow-500 text-white shadow-sm';
            case 'FOR_DELETION':
                return 'bg-red-600 text-white shadow-sm';
            case 'NEW_RECORD':
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    const showApprovalView =
        purchaseOrderData && ['FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'].includes(purchaseOrderData.status);

    if (!purchaseOrderData && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Purchase order not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
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
                        href="/inventory/stock-purchase-order"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Stock Purchase Orders
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !purchaseOrderData && (
                <div className="flex min-h-96 items-center justify-center">
                    <div className="text-gray-600">Loading purchase order details...</div>
                </div>
            )}

            {purchaseOrderData && (
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                            <div className="flex flex-nowrap gap-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${getTabColorClasses(
                                        purchaseOrderData.status || 'ACTIVE',
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
                                        Purchase Order Information
                                        {purchaseOrderData && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>{getStatusText(purchaseOrderData.status || 'ACTIVE')}</span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('deliveries')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                                        activeTab === 'deliveries'
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
                                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                            />
                                        </svg>
                                        Deliveries
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
                            {activeTab === 'details' &&
                                (showApprovalView ? (
                                    <ApprovalTab
                                        purchaseOrderData={purchaseOrderData}
                                        status={purchaseOrderData.status}
                                        onApprove={handleApprove}
                                        onDeny={handleDeny}
                                        isSubmitting={isSubmitting}
                                    />
                                ) : (
                                    <PurchaseOrderDetailsTab
                                        purchaseOrderData={purchaseOrderData}
                                        hasDeliveries={hasDeliveries}
                                        status={purchaseOrderData.status}
                                        poStatus={purchaseOrderData.poStatus}
                                        isAdminUser={isAdminUser}
                                        onUpdate={handleUpdateDetails}
                                        onDelete={handleDelete}
                                        onCancel={handleCancel}
                                        onTransitionToPending={handleTransitionToPending}
                                        isSubmitting={isSubmitting}
                                    />
                                ))}

                            {activeTab === 'deliveries' && (
                                <DeliveriesTab
                                    purchaseOrderData={purchaseOrderData}
                                    status={purchaseOrderData.status}
                                    onAddDelivery={handleAddDelivery}
                                    onDeleteDelivery={handleDeleteDelivery}
                                    isSubmitting={isSubmitting}
                                />
                            )}

                            {activeTab === 'logs' && (
                                <div className="space-y-6">
                                    <LogsTab
                                        activities={(purchaseOrderData.activityLogs || []).map((log: string) => {
                                            const parsed = parseActivityLog(log);
                                            return {
                                                timestamp: parsed.date,
                                                activity: parsed.activity,
                                            };
                                        })}
                                    />

                                    <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="hidden sm:block" />
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                            {isAdminUser &&
                                                purchaseOrderData &&
                                                ['FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'].includes(
                                                    purchaseOrderData.status
                                                ) && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={handleDeny}
                                                            disabled={isSubmitting}
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Deny
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleApprove}
                                                            disabled={isSubmitting}
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                    </>
                                                )}
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DenyReasonDialog
                isOpen={isDenyDialogOpen}
                onClose={() => setIsDenyDialogOpen(false)}
                onSubmit={handleDenySubmit}
                isSubmitting={isSubmitting}
                purchaseOrderData={purchaseOrderData}
            />

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                record={purchaseOrderData}
                recordDisplayName={purchaseOrderData?.docNo}
                onConfirm={(reason) => handleDeleteConfirm(purchaseOrderData, reason)}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
}
