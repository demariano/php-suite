'use client';

import {
    extractErrorMessage,
    InvoiceApi,
    ReturnGoodSoldApi,
    ReturnGoodSoldDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import ReturnGoodSoldForm from './components/ReturnGoodSoldForm';

interface EditReturnGoodSoldPageProps {
    params: {
        id: string;
    };
}

export default function EditReturnGoodSoldPage({ params }: EditReturnGoodSoldPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ReturnGoodSoldDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch return good sold record details on component mount
    useEffect(() => {
        const fetchRecord = async () => {
            try {
                setIsLoading(true);

                const record = await ReturnGoodSoldApi.getReturnGoodSoldById(params.id);

                // Fetch invoice details to populate product price type for adding stock items
                if (record.invoiceId) {
                    try {
                        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
                        const invoice = await (InvoiceApi as any).getInvoiceById(record.invoiceId, userRole);

                        // Update the record with invoice product price type data
                        const enrichedRecord = {
                            ...record,
                            productPriceTypeId: invoice.productPriceTypeId,
                            productPriceTypeName: invoice.productPriceTypeName,
                        };

                        setSelectedRecord(enrichedRecord);
                    } catch (invoiceError) {
                        console.error('Error fetching invoice details:', invoiceError);
                        // Don't fail the whole load if invoice fetch fails
                        // User can still view the return-good-sold record
                        setSelectedRecord(record);
                    }
                } else {
                    setSelectedRecord(record);
                }

                // Always default to details tab (inline diff pattern used instead of separate approval tab)
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching return good sold record:', err);
                const errorMessage = extractErrorMessage(
                    err,
                    'Failed to load return good sold details. Please try again.'
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
            fetchRecord();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (record: ReturnGoodSoldDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing return good sold record
            const updatedRecord = await ReturnGoodSoldApi.updateReturnGoodSold(
                params.id,
                {
                    invoiceId: record.invoiceId,
                    customerId: record.customerId,
                    customerName: record.customerName,
                    docno: (record as any).docno,
                    dateReturned: record.dateReturned,
                    originalInvoiceDetails: record.originalInvoiceDetails,
                    modifiedInvoiceDetails: record.modifiedInvoiceDetails,
                    status: record.status,
                    activityLogs: record.activityLogs,
                    forApprovalVersion: record.forApprovalVersion,
                    changeReason: record.changeReason,
                } as any,
                userRole
            );

            setSelectedRecord(updatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Return good sold record updated successfully!',
                alertType: 'success',
            });

            // Navigate back to return good sold list after a short delay
            setTimeout(() => {
                router.push('/invoicing/return-good-sold');
            }, 1500);
        } catch (error) {
            console.error('Error updating return good sold:', error);
            const errorMessage = extractErrorMessage(
                error,
                'Failed to update return good sold record. Please try again.'
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
        if (!selectedRecord) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedRecord) {
            return;
        }

        setShowDeleteModal(false);

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (ReturnGoodSoldApi as any).deleteReturnGoodSold(selectedRecord, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Return good sold record deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to return good sold list immediately - notification will persist
            router.push('/invoicing/return-good-sold');
        } catch (error) {
            console.error('Error deleting return good sold:', error);
            const errorMessage = extractErrorMessage(
                error,
                'Failed to delete return good sold record. Please try again.'
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
        if (!selectedRecord) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedRecord = await ReturnGoodSoldApi.approveReturnGoodSold(
                selectedRecord.returnGoodSoldId,
                userRole
            );
            setSelectedRecord(approvedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Return good sold record approved successfully!',
                alertType: 'success',
            });

            // Navigate back to return good sold list immediately - notification will persist
            router.push('/invoicing/return-good-sold');
        } catch (err) {
            console.error('Error approving return good sold:', err);
            const errorMessage = extractErrorMessage(
                err,
                'Failed to approve return good sold record. Please try again.'
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
        if (!selectedRecord) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedRecord = await ReturnGoodSoldApi.denyReturnGoodSold(
                selectedRecord.returnGoodSoldId,
                approverMessage,
                userRole
            );
            setSelectedRecord(deniedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Return good sold changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to return good sold list immediately - notification will persist
            router.push('/invoicing/return-good-sold');
        } catch (err) {
            console.error('Error denying return good sold:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny return good sold record. Please try again.');
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
        router.push('/invoicing/return-good-sold');
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

    if (!selectedRecord && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Return good sold record not found</span>
                </div>
            </div>
        );
    }

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
                        href="/invoicing"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Invoicing
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing/return-good-sold"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Return Good Sold
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedRecord && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading return good sold details...</div>
                </div>
            )}

            {/* Return Good Sold Form with Tabs */}
            {selectedRecord && (
                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                                        selectedRecord.status || StatusEnum.ACTIVE,
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
                                        Return Good Sold Information
                                        {selectedRecord && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>{getStatusText(selectedRecord.status || StatusEnum.ACTIVE)}</span>
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
                            <ReturnGoodSoldForm
                                isCreateMode={false}
                                selectedRecord={selectedRecord}
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
                        </div>
                    </div>
                </div>
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                returnGoodSold={selectedRecord}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                returnGoodSold={selectedRecord}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
}
