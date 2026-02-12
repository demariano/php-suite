'use client';

import {
    ContractProductDealDto,
    CustomerProductDealDto,
    InvoiceDetailTypeEnum,
    InvoiceDto,
    PrintStatusEnum,
    StatusEnum,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useState } from 'react';
import InvoiceDetailsTab from './InvoiceDetailsTab';
import PaymentsTab from './PaymentsTab';
import RecordDetailsTab from './RecordDetailsTab';

interface InvoiceFormProps {
    isCreateMode: boolean;
    selectedInvoice: InvoiceDto | null;
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'logs' | 'payments';
    onTabChange: (tab: 'details' | 'logs' | 'payments') => void;
    onSave: (invoice: InvoiceDto) => void;
    onDelete: () => void;
    onApprove: () => void;
    onDeny: () => void;
    onCancel: () => void;
    onAutoSave?: (invoice: InvoiceDto, invoiceId?: string) => Promise<string | void>;
    currentInvoiceId?: string;
    onSubmitDraft?: () => void;
    onSaveToDraft?: () => void;
}

export default function InvoiceForm({
    isCreateMode,
    selectedInvoice,
    successMessage,
    isAdminUser,
    isLoading,
    activeTab,
    onTabChange,
    onSave,
    onDelete,
    onApprove,
    onDeny,
    onCancel,
    onAutoSave,
    currentInvoiceId,
    onSubmitDraft,
    onSaveToDraft,
}: InvoiceFormProps) {
    const [formData, setFormData] = useState<InvoiceDto>({
        invoiceId: '',
        docno: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        customerId: '',
        customerName: '',
        areaId: '',
        areaName: '',
        territoryManagerId: '',
        territoryManagerName: '',
        salesTypeId: '',
        salesTypeName: '',
        finalAmount: 0,
        invoiceAmount: 0,
        taxAmount: 0,
        totalAmountPaid: 0,
        contractId: '',
        contractName: '',
        termsId: '',
        termsName: '',
        productPriceTypeId: '',
        productPriceTypeName: '',
        status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
        paymentStatus: 'PENDING' as any,
        printStatus: PrintStatusEnum.PENDING,
        invoiceDetails: [],
        activityLogs: [],
        forApprovalVersion: {},
        contractSales: false,
    });

    // State for customer deals
    const [customerDeals, setCustomerDeals] = useState<CustomerProductDealDto[]>([]);

    // State for contract product deals
    const [contractProductDeals, setContractProductDeals] = useState<ContractProductDealDto[] | null>(null);

    // Toast notification hook
    const { setFlashNotification } = useSessionStore();

    // Initialize form data when selectedInvoice changes
    useEffect(() => {
        if (selectedInvoice) {
            setFormData({
                ...selectedInvoice,
                invoiceDetails: selectedInvoice.invoiceDetails || [],
            });
        } else if (isCreateMode) {
            // Reset to default values for create mode
            setFormData({
                invoiceId: '',
                docno: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                customerId: '',
                customerName: '',
                areaId: '',
                areaName: '',
                territoryManagerId: '',
                territoryManagerName: '',
                salesTypeId: '',
                salesTypeName: '',
                finalAmount: 0,
                invoiceAmount: 0,
                taxAmount: 0,
                contractId: '',
                contractName: '',
                termsId: '',
                termsName: '',
                productPriceTypeId: '',
                productPriceTypeName: '',
                status: StatusEnum.NEW_RECORD,
                paymentStatus: 'PENDING' as any,
                printStatus: PrintStatusEnum.PENDING,
                invoiceDetails: [],
                activityLogs: [],
                forApprovalVersion: {},
                contractSales: false,
            });
        }
    }, [selectedInvoice, isCreateMode]);

    // Validation function for invoice data
    const validateInvoice = (invoice: InvoiceDto): string | null => {
        // Rule 1: Customer must be selected
        if (!invoice.customerId || invoice.customerId.trim() === '') {
            return 'Please select a customer before saving the invoice.';
        }

        // Rule 2: Invoice details must not be empty
        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            return 'Please add at least one item to the invoice.';
        }

        // Rule 3: Invoice details cannot contain all free items
        const hasRegularItem = invoice.invoiceDetails.some(
            (detail) => detail.invoiceDetailType === InvoiceDetailTypeEnum.REGULAR_ITEM
        );
        if (!hasRegularItem) {
            return 'Invoice must contain at least one regular item (not all free items).';
        }

        // Rule 4: Invoice amount cannot be zero
        if (!invoice.invoiceAmount || invoice.invoiceAmount <= 0) {
            return 'Invoice amount must be greater than zero.';
        }

        // Rule 5: Final amount cannot be zero
        if (!invoice.finalAmount || invoice.finalAmount <= 0) {
            return 'Final amount must be greater than zero.';
        }

        // Rule 6: Change reason required for non-admin users editing existing invoices
        if (!isCreateMode && !isAdminUser) {
            if (!invoice.changeReason || invoice.changeReason.trim() === '') {
                return 'Change reason is required when modifying an invoice.';
            }
            if (invoice.changeReason.trim().length < 10) {
                return 'Change reason must be at least 10 characters when modifying an invoice.';
            }
        }

        return null; // All validations passed
    };

    const handleSave = () => {
        const validationError = validateInvoice(formData);
        if (validationError) {
            setFlashNotification({
                title: 'Validation Error',
                message: validationError,
                alertType: 'error',
            });
            return;
        }
        onSave(formData);
    };

    const handleFormDataChange = (updatedData: Partial<InvoiceDto>) => {
        setFormData((prev) => ({
            ...prev,
            ...updatedData,
        }));
    };

    const handleCustomerDealsChange = (deals: CustomerProductDealDto[]) => {
        setCustomerDeals(deals);
    };

    const handleContractProductDealsChange = (productDeals: ContractProductDealDto[] | null) => {
        setContractProductDeals(productDeals);
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

    const showApprovalView =
        !isCreateMode &&
        selectedInvoice &&
        [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
            selectedInvoice.status as StatusEnum
        );

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-6xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                <div className="flex gap-2 flex-nowrap">
                    <button
                        onClick={() => onTabChange('details')}
                        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                            selectedInvoice?.status || StatusEnum.ACTIVE,
                            activeTab === 'details'
                        )}`}
                        title={
                            !isCreateMode && selectedInvoice?.status !== StatusEnum.ACTIVE
                                ? 'View original invoice details (read-only)'
                                : 'View and edit invoice details'
                        }
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
                            Invoice Information
                            {selectedInvoice && (
                                <>
                                    <span className="mx-1">-</span>
                                    <span>{getStatusText(selectedInvoice.status || StatusEnum.ACTIVE)}</span>
                                </>
                            )}
                        </span>
                    </button>

                    {!isCreateMode && (
                        <button
                            onClick={() => onTabChange('logs')}
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
                    )}

                    {!isCreateMode && (
                        <button
                            onClick={() => onTabChange('payments')}
                            className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                activeTab === 'payments'
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
                                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                Payments
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white p-4 sm:p-6">
                {/* Details Tab */}
                {activeTab === 'details' && (
                    <div>
                        {showApprovalView &&
                            !isCreateMode &&
                            selectedInvoice &&
                            (() => {
                                // Merge original invoice data with forApprovalVersion changes
                                const approvalVersionData: InvoiceDto = {
                                    ...selectedInvoice,
                                    ...selectedInvoice.forApprovalVersion,
                                };

                                return (
                                    <div>
                                        <div className="mb-5">
                                            {(selectedInvoice.status === StatusEnum.FOR_APPROVAL ||
                                                selectedInvoice.status === StatusEnum.NEW_RECORD) && (
                                                <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                                                    <span className="text-base text-yellow-600">ℹ️</span>
                                                    <span className="text-sm text-yellow-800">
                                                        These are the proposed changes awaiting approval
                                                    </span>
                                                </div>
                                            )}

                                            {/* Change Reason - Highlighted field */}
                                            {selectedInvoice?.changeReason && (
                                                <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                                                    <div className="mb-4 flex items-center gap-3">
                                                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                                                            <svg
                                                                className="h-5 w-5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <h3 className="m-0 text-base font-bold text-blue-600">
                                                            Change Reason
                                                        </h3>
                                                    </div>
                                                    <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium leading-relaxed text-gray-500 shadow-sm whitespace-pre-wrap font-mono cursor-not-allowed">
                                                        {selectedInvoice.changeReason}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Use the same components as Details tab but with merged data and read-only */}
                                        <RecordDetailsTab
                                            formData={approvalVersionData}
                                            onFormDataChange={() => {}} // No-op since read-only
                                            isCreateMode={false}
                                            isAdminUser={isAdminUser}
                                            onCustomerDealsChange={() => {}} // No-op since read-only
                                            isReadOnly={true}
                                        />
                                        <InvoiceDetailsTab
                                            formData={approvalVersionData}
                                            onFormDataChange={() => {}} // No-op since read-only
                                            isCreateMode={false}
                                            customerDeals={[]} // Not needed for read-only display
                                            isReadOnly={true}
                                            approvalComparison={{
                                                original: selectedInvoice.invoiceDetails || [],
                                                pending: approvalVersionData.invoiceDetails || [],
                                            }}
                                        />

                                        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                            {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                                            {isAdminUser &&
                                            (selectedInvoice?.status === StatusEnum.FOR_APPROVAL ||
                                                selectedInvoice?.status === StatusEnum.NEW_RECORD ||
                                                selectedInvoice?.status === StatusEnum.FOR_DELETION) ? (
                                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={onDeny}
                                                        disabled={isLoading}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
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
                                                        onClick={onApprove}
                                                        disabled={isLoading}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
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

                                            {/* Cancel button */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={onCancel}
                                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                                                >
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
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
                            })()}
                        {!showApprovalView && (
                            <>
                                <RecordDetailsTab
                                    formData={formData}
                                    onFormDataChange={handleFormDataChange}
                                    isCreateMode={isCreateMode}
                                    isAdminUser={isAdminUser}
                                    onCustomerDealsChange={handleCustomerDealsChange}
                                    onContractProductDealsChange={handleContractProductDealsChange}
                                    isReadOnly={
                                        !isCreateMode &&
                                        selectedInvoice?.status !== StatusEnum.ACTIVE &&
                                        selectedInvoice?.status !== StatusEnum.DRAFT
                                    }
                                />
                                <InvoiceDetailsTab
                                    formData={formData}
                                    onFormDataChange={handleFormDataChange}
                                    isCreateMode={isCreateMode}
                                    customerDeals={customerDeals}
                                    contractProductDeals={contractProductDeals}
                                    contractSales={formData.contractSales}
                                    isReadOnly={
                                        !isCreateMode &&
                                        selectedInvoice?.status !== StatusEnum.ACTIVE &&
                                        selectedInvoice?.status !== StatusEnum.DRAFT
                                    }
                                    onAutoSave={onAutoSave}
                                    currentInvoiceId={currentInvoiceId}
                                />

                                {/* Action Buttons for Details Tab */}
                                <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                    {!isCreateMode && selectedInvoice?.status === StatusEnum.ACTIVE ? (
                                        <button
                                            type="button"
                                            onClick={onDelete}
                                            disabled={isLoading}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                                        >
                                            <svg
                                                className="h-5 w-5"
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
                                            {isLoading ? 'Processing...' : 'Delete'}
                                        </button>
                                    ) : (
                                        <div className="hidden sm:block" />
                                    )}

                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                        {/* Submit Draft Button - only for DRAFT status */}
                                        {!isCreateMode &&
                                            selectedInvoice?.status === StatusEnum.DRAFT &&
                                            formData.invoiceDetails &&
                                            formData.invoiceDetails.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={onSubmitDraft}
                                                    disabled={isLoading}
                                                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    <svg
                                                        className="h-5 w-5"
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
                                                    {isLoading ? 'Submitting...' : 'Submit Invoice'}
                                                </button>
                                            )}

                                        {/* Save to Draft Button - for create mode or DRAFT status */}
                                        {(isCreateMode || selectedInvoice?.status === StatusEnum.DRAFT) && (
                                            <button
                                                type="button"
                                                onClick={onSaveToDraft}
                                                disabled={isLoading || (formData.invoiceDetails?.length ?? 0) === 0}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-gray-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                                    />
                                                </svg>
                                                Save to Draft
                                            </button>
                                        )}

                                        {/* Save/Create Button - for create mode or ACTIVE status */}
                                        {(isCreateMode || selectedInvoice?.status === StatusEnum.ACTIVE) && (
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={
                                                    isLoading ||
                                                    (!isCreateMode && selectedInvoice?.status !== StatusEnum.ACTIVE)
                                                }
                                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                                {isLoading
                                                    ? 'Saving...'
                                                    : isCreateMode
                                                    ? 'Create Invoice'
                                                    : 'Save Changes'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={onCancel}
                                            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
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
                            </>
                        )}
                    </div>
                )}

                {/* Activity Logs Tab */}
                {activeTab === 'logs' && !isCreateMode && selectedInvoice && (
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

                            {renderActivityLogsTable(selectedInvoice?.activityLogs)}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="hidden sm:block" />
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                {isAdminUser &&
                                    selectedInvoice &&
                                    [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                        selectedInvoice.status as StatusEnum
                                    ) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onDeny}
                                                disabled={isLoading}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                                {isLoading ? 'Processing...' : 'Deny'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onApprove}
                                                disabled={isLoading}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                                {isLoading ? 'Processing...' : 'Approve'}
                                            </button>
                                        </>
                                    )}
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
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
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && !isCreateMode && selectedInvoice && (
                    <div className="space-y-6 animate-fadeIn">
                        <PaymentsTab formData={formData} />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end border-t-2 border-gray-200 pt-6">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
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
                )}
            </div>
        </div>
    );
}
