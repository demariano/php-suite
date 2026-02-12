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
import { useState } from 'react';
import InvoiceForm from '../[id]/edit/components/InvoiceForm';
import CancelConfirmationDialog from '../components/CancelConfirmationDialog';
import InvoiceCreatedDialog from '../components/InvoiceCreatedDialog';

export default function CreateInvoicePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [createdInvoice, setCreatedInvoice] = useState<InvoiceDto | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdDraftId, setCreatedDraftId] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const handleSave = async (invoice: InvoiceDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Validate invoice before proceeding
            const validationResult = await InvoiceApi.validateInvoice(invoice, 'create');

            if (!validationResult.valid) {
                // Show validation errors
                const errorMessages: string[] = [];

                if (validationResult.errors?.contractAmountExceeded) {
                    errorMessages.push(validationResult.errors.contractAmountExceeded.message);
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
                    title: 'Validation Error',
                    message: errorMessages.join('\n'),
                    alertType: 'error',
                });
                setIsLoading(false);
                return; // Stop here - draft is preserved
            }

            // Validation passed - now proceed with deletion and creation
            // Delete draft invoice first if it exists (to prevent duplicate invoices)
            if (createdDraftId && createdInvoice) {
                await (InvoiceApi as any).deleteInvoice(createdInvoice, userRole);
                // Clear draft state immediately after deletion
                setCreatedDraftId(null);
                setCreatedInvoice(null);
            }

            // Create new invoice (don't pass status - let backend determine it)
            const newInvoice = await InvoiceApi.createInvoice(
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
                    // Don't pass status - backend will determine based on user role and amount
                    paymentStatus: invoice.paymentStatus,
                    printStatus: invoice.printStatus,
                    invoiceDetails: invoice.invoiceDetails,
                    contractSales: invoice.contractSales,
                    changeReason: invoice.changeReason,
                } as any,
                userRole
            );

            // Store the created invoice
            setCreatedInvoice(newInvoice);
            setShowSuccessDialog(true);

            setFlashNotification({
                title: 'Success!',
                message: 'Invoice created successfully!',
                alertType: 'success',
            });
        } catch (error) {
            console.error('Error creating invoice:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to create invoice. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcknowledge = () => {
        setShowSuccessDialog(false);
        router.replace('/invoicing/invoice');
    };

    const handleSubmitDraft = async () => {
        if (!createdDraftId) {
            setFlashNotification({
                title: 'Error',
                message: 'No draft invoice to submit',
                alertType: 'error',
            });
            return;
        }

        try {
            setIsLoading(true);

            const invoice = createdInvoice;

            // Validate invoice before submitting
            if (invoice) {
                const validationResult = await InvoiceApi.validateInvoice(invoice, 'submitDraft');

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
            }

            // Validation passed - proceed with submission
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const submittedInvoice = await (InvoiceApi as any).submitDraft(createdDraftId, userRole);

            setFlashNotification({
                title: 'Success!',
                message: `Invoice #${submittedInvoice.docno} submitted successfully!`,
                alertType: 'success',
            });

            router.replace('/invoicing/invoice');
        } catch (error) {
            console.error('Error submitting draft:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to submit invoice. Please try again.');
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
        // Show dialog if there are invoice details OR if a draft exists
        // This includes cases where validation fails (e.g., contract amount exceeded)
        const hasInvoiceDetails =
            createdInvoice && createdInvoice.invoiceDetails && createdInvoice.invoiceDetails.length > 0;
        const hasDraft = !!createdDraftId;

        if (hasInvoiceDetails || hasDraft) {
            setShowCancelDialog(true);
        } else {
            // No draft or items, just navigate away
            router.push('/invoicing/invoice');
        }
    };

    const handleCancelConfirm = async () => {
        if (!createdDraftId || !createdInvoice) {
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
            await (InvoiceApi as any).deleteInvoice(createdInvoice, userRole);

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

    const handleDelete = () => {
        // Not applicable for create mode
    };

    const handleApprove = () => {
        // Not applicable for create mode
    };

    const handleDeny = () => {
        // Not applicable for create mode
    };

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
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            <div className="flex justify-center">
                <InvoiceForm
                    isCreateMode={true}
                    selectedInvoice={createdInvoice}
                    successMessage={null}
                    isAdminUser={isAdminUser}
                    isLoading={isLoading}
                    activeTab="details"
                    onTabChange={() => {}} // Not used in create mode
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onCancel={handleCancel}
                    onSaveToDraft={handleSaveToDraft}
                    onAutoSave={async (invoice, invoiceId) => {
                        try {
                            const userRole =
                                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                                    ? authedUser?.userRole
                                    : undefined;

                            if (!createdDraftId) {
                                // First save - create DRAFT invoice
                                const draftInvoice = await InvoiceApi.createInvoice(
                                    {
                                        ...invoice,
                                        status: StatusEnum.DRAFT,
                                    } as any,
                                    userRole
                                );

                                setCreatedDraftId(draftInvoice.invoiceId);
                                setCreatedInvoice(draftInvoice);
                                return draftInvoice.invoiceId;
                            } else {
                                // Update existing DRAFT
                                await InvoiceApi.updateInvoice(
                                    createdDraftId,
                                    {
                                        ...invoice,
                                        status: StatusEnum.DRAFT,
                                    },
                                    userRole
                                );
                                // Don't show toast here - InvoiceDetailsTab will show it
                            }
                        } catch (error) {
                            console.error('Error auto-saving draft:', error);
                            setFlashNotification({
                                title: 'Auto-save Failed',
                                message: 'Failed to save draft invoice',
                                alertType: 'error',
                            });
                        }
                    }}
                    currentInvoiceId={createdDraftId || undefined}
                    onSubmitDraft={handleSubmitDraft}
                />
            </div>

            {/* Success Dialog */}
            <InvoiceCreatedDialog show={showSuccessDialog} invoice={createdInvoice} onAcknowledge={handleAcknowledge} />

            {/* Cancel Confirmation Dialog */}
            <CancelConfirmationDialog
                show={showCancelDialog}
                invoice={createdInvoice}
                onConfirm={handleCancelConfirm}
                onCancel={handleCancelCancel}
            />
        </div>
    );
}
