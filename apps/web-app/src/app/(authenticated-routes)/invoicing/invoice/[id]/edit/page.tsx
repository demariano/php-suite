'use client';

import {
    extractErrorMessage,
    InvoiceApi,
    InvoiceDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CancelConfirmationDialog from '../../components/CancelConfirmationDialog';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import InvoiceForm from './components/InvoiceForm';

interface EditInvoicePageProps {
    params: {
        id: string;
    };
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch invoice details on component mount
    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                // This prevents role parameter leakage when bypass auth is disabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const invoice = await InvoiceApi.getInvoiceById(params.id, userRole);
                setSelectedInvoice(invoice);

                // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
                if (
                    (invoice.status === StatusEnum.FOR_APPROVAL ||
                        invoice.status === StatusEnum.NEW_RECORD ||
                        invoice.status === StatusEnum.FOR_DELETION) &&
                    isAdminUser
                ) {
                    setActiveTab('approval');
                } else {
                    // Default to details tab
                    setActiveTab('details');
                }
            } catch (err) {
                console.error('Error fetching invoice:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load invoice details. Please try again.');
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
            fetchInvoice();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (invoice: InvoiceDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing invoice
            const updatedInvoice = await InvoiceApi.updateInvoice(
                params.id,
                {
                    docno: invoice.docno,
                    invoiceDate: invoice.invoiceDate,
                    customerId: invoice.customerId,
                    customerName: invoice.customerName,
                    areaId: invoice.areaId,
                    areaName: invoice.areaName,
                    territoryManagerId: invoice.territoryManagerId,
                    territoryManagerName: invoice.territoryManagerName,
                    salesTypeId: invoice.salesTypeId,
                    salesTypeName: invoice.salesTypeName,
                    finalAmount: invoice.finalAmount,
                    invoiceAmount: invoice.invoiceAmount,
                    taxAmount: invoice.taxAmount,
                    contractId: invoice.contractId,
                    contractName: invoice.contractName,
                    termsId: invoice.termsId,
                    termsName: invoice.termsName,
                    productPriceTypeId: invoice.productPriceTypeId,
                    productPriceTypeName: invoice.productPriceTypeName,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    printStatus: invoice.printStatus,
                    invoiceDetails: invoice.invoiceDetails,
                    contractSales: invoice.contractSales,
                    changeReason: invoice.changeReason,
                },
                userRole
            );

            setSelectedInvoice(updatedInvoice);
            setFlashNotification({
                title: 'Success!',
                message: 'Invoice updated successfully!',
                alertType: 'success',
            });

            // Navigate back to invoice list after a short delay
            setTimeout(() => {
                router.push('/invoicing/invoice');
            }, 1500);
        } catch (error) {
            console.error('Error updating invoice:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update invoice. Please try again.');
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
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedInvoice) {
            return;
        }

        try {
            setIsLoading(true);
            setShowDeleteDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await InvoiceApi.deleteInvoice(selectedInvoice, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Invoice deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to invoice list immediately - notification will persist
            router.push('/invoicing/invoice');
        } catch (error) {
            console.error('Error deleting invoice:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete invoice. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    const handleApprove = async () => {
        if (!selectedInvoice) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedInvoice = await InvoiceApi.approveInvoice(selectedInvoice.invoiceId, userRole);
            setSelectedInvoice(approvedInvoice);
            setFlashNotification({
                title: 'Success!',
                message: 'Invoice approved successfully!',
                alertType: 'success',
            });

            // Navigate back to invoice list immediately - notification will persist
            router.push('/invoicing/invoice');
        } catch (err) {
            console.error('Error approving invoice:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve invoice. Please try again.');
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
        if (!selectedInvoice) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedInvoice = await InvoiceApi.denyInvoice(selectedInvoice.invoiceId, approverMessage, userRole);
            setSelectedInvoice(deniedInvoice);
            setFlashNotification({
                title: 'Success!',
                message: 'Invoice changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to invoice list immediately - notification will persist
            router.push('/invoicing/invoice');
        } catch (err) {
            console.error('Error denying invoice:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny invoice. Please try again.');
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
        // Show dialog if there are invoice details OR if editing a draft
        // This includes cases where validation fails (e.g., contract amount exceeded)
        const hasInvoiceDetails =
            selectedInvoice && selectedInvoice.invoiceDetails && selectedInvoice.invoiceDetails.length > 0;
        const isDraft = selectedInvoice && selectedInvoice.status === StatusEnum.DRAFT;

        if (hasInvoiceDetails || isDraft) {
            setShowCancelDialog(true);
        } else {
            // No items and not a draft, just navigate away
            router.push('/invoicing/invoice');
        }
    };

    const handleCancelConfirm = async () => {
        if (!selectedInvoice) {
            router.push('/invoicing/invoice');
            return;
        }

        try {
            setIsLoading(true);
            setShowCancelDialog(false);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Delete the draft invoice (this will restore stock)
            await InvoiceApi.deleteInvoice(selectedInvoice, userRole);

            setFlashNotification({
                title: 'Draft Deleted',
                message: 'Draft invoice has been deleted and stock has been restored.',
                alertType: 'success',
            });

            router.push('/invoicing/invoice');
        } catch (error) {
            console.error('Error deleting draft:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete draft. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
            setIsLoading(false);
        }
    };

    const handleCancelCancel = () => {
        setShowCancelDialog(false);
    };

    const handleSaveToDraft = () => {
        // Just navigate to list - draft is already auto-saved
        setFlashNotification({
            title: 'Draft Saved',
            message: 'Your invoice has been saved as a draft. You can continue editing it later.',
            alertType: 'success',
        });
        router.push('/invoicing/invoice');
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

    if (!selectedInvoice && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Invoice not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div className="mb-6">
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
                        href="/invoicing/invoice"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Invoice
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedInvoice && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading invoice details...</div>
                </div>
            )}

            {/* Invoice Form */}
            {selectedInvoice && (
                <div className="flex justify-center">
                    <InvoiceForm
                        isCreateMode={false}
                        selectedInvoice={selectedInvoice}
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
                        onSaveToDraft={handleSaveToDraft}
                        onAutoSave={async (invoice, invoiceId) => {
                            if (selectedInvoice.status === StatusEnum.DRAFT) {
                                try {
                                    const userRole =
                                        env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                                            ? authedUser?.userRole
                                            : undefined;

                                    await InvoiceApi.updateInvoice(
                                        params.id,
                                        {
                                            ...invoice,
                                            status: StatusEnum.DRAFT,
                                        },
                                        userRole
                                    );

                                    // Don't show toast here - InvoiceDetailsTab will show it
                                } catch (error) {
                                    console.error('Error auto-saving draft:', error);
                                    setFlashNotification({
                                        title: 'Auto-save Failed',
                                        message: 'Failed to save draft invoice',
                                        alertType: 'error',
                                    });
                                }
                            }
                        }}
                        currentInvoiceId={params.id}
                        onSubmitDraft={async () => {
                            try {
                                setIsLoading(true);

                                // Validate invoice before submitting
                                const validationResult = await InvoiceApi.validateInvoice(
                                    selectedInvoice,
                                    'submitDraft'
                                );

                                if (!validationResult.valid) {
                                    // Show validation errors
                                    const errorMessages: string[] = [];

                                    if (validationResult.errors?.contractAmountExceeded) {
                                        errorMessages.push(validationResult.errors.contractAmountExceeded.message);
                                    }

                                    if (validationResult.errors?.stockInsufficient) {
                                        const invalidItemsList = validationResult.errors.stockInsufficient.invalidItems
                                            .map(
                                                (item) =>
                                                    `• ${item.productName}: requested ${item.requested}, only ${item.available} available`
                                            )
                                            .join('\n');
                                        errorMessages.push(`Insufficient stock:\n${invalidItemsList}`);
                                    }

                                    if (validationResult.errors?.missingFields) {
                                        errorMessages.push(...validationResult.errors.missingFields);
                                    }

                                    if (validationResult.errors?.configurationError) {
                                        errorMessages.push(validationResult.errors.configurationError);
                                    }

                                    if (validationResult.errors?.general) {
                                        errorMessages.push(validationResult.errors.general);
                                    }

                                    setFlashNotification({
                                        title: 'Cannot Submit Invoice',
                                        message: errorMessages.join('\n'),
                                        alertType: 'error',
                                    });
                                    setIsLoading(false);
                                    return; // Stop here - draft is preserved
                                }

                                // Validation passed - proceed with submission
                                const userRole =
                                    env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                                        ? authedUser?.userRole
                                        : undefined;

                                const submittedInvoice = await InvoiceApi.submitDraft(params.id, userRole);

                                setFlashNotification({
                                    title: 'Success!',
                                    message: `Invoice #${submittedInvoice.docno} submitted successfully!`,
                                    alertType: 'success',
                                });

                                router.replace('/invoicing/invoice');
                            } catch (error) {
                                console.error('Error submitting draft:', error);
                                const errorMessage = extractErrorMessage(
                                    error,
                                    'Failed to submit invoice. Please try again.'
                                );
                                setFlashNotification({
                                    title: 'Error',
                                    message: errorMessage,
                                    alertType: 'error',
                                });
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                    />
                </div>
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                invoice={selectedInvoice}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationDialog
                show={showDeleteDialog}
                invoice={selectedInvoice}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />

            <CancelConfirmationDialog
                show={showCancelDialog}
                invoice={selectedInvoice}
                onConfirm={handleCancelConfirm}
                onCancel={handleCancelCancel}
            />
        </div>
    );
}
