'use client';

import {
    ContractApi,
    ContractTypeEnum,
    CustomerDto,
    PaymentDto,
    PaymentTypeEnum,
    StatusEnum,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useState } from 'react';
import PaymentDetailsTab from './PaymentDetailsTab';
import PaymentInvoiceDetailsTab from './PaymentInvoiceDetailsTab';
import RecordDetailsTab from './RecordDetailsTab';

interface PaymentFormProps {
    isCreateMode: boolean;
    selectedPayment: PaymentDto | null;
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'logs';
    onTabChange: (tab: 'details' | 'logs') => void;
    onSave: (payment: PaymentDto) => void;
    onDelete: () => void;
    onApprove: () => void;
    onDeny: () => void;
    onCancel: () => void;
}

export default function PaymentForm({
    isCreateMode,
    selectedPayment,
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
}: PaymentFormProps) {
    const [formData, setFormData] = useState<PaymentDto>({
        paymentId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentAmount: 0,
        customerId: '',
        customerName: '',
        areaId: '',
        areaName: '',
        receiptNo: '',
        activityLogs: [],
        forApprovalVersion: {},
        contractPayment: false,
        customerCreditPayment: false,
        status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
        contractId: '',
        contractName: '',
        contractNo: '',
        changeReason: '',
        chequeClearStatus: 'PENDING' as any,
        paymentDetails: [],
        paymentInvoiceDetails: [],
    });

    // Toast notification hook
    const { setFlashNotification } = useSessionStore();

    // State for receipt number error
    const [receiptNumberError, setReceiptNumberError] = useState<string | null>(null);

    // State for contract type (for validation)
    const [contractType, setContractType] = useState<ContractTypeEnum | null>(null);

    // State for selected customer (for credit balance display)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

    // Fetch contract type when contractId is available
    useEffect(() => {
        const fetchContractType = async () => {
            if (formData.contractPayment && formData.contractId) {
                try {
                    const contract = await ContractApi.getContractById(formData.contractId);
                    setContractType(contract.contractType || null);
                } catch (error) {
                    console.error('Error fetching contract details:', error);
                    setContractType(null);
                }
            } else {
                setContractType(null);
            }
        };

        fetchContractType();
    }, [formData.contractPayment, formData.contractId]);

    // Initialize form data when selectedPayment changes
    useEffect(() => {
        if (selectedPayment) {
            setFormData({
                ...selectedPayment,
                paymentDetails: selectedPayment.paymentDetails || [],
                paymentInvoiceDetails: selectedPayment.paymentInvoiceDetails || [],
            });
        } else if (isCreateMode) {
            // Reset to default values for create mode
            setFormData({
                paymentId: '',
                paymentDate: new Date().toISOString().split('T')[0],
                paymentAmount: 0,
                customerId: '',
                customerName: '',
                areaId: '',
                areaName: '',
                receiptNo: '',
                activityLogs: [],
                forApprovalVersion: {},
                contractPayment: false,
                customerCreditPayment: false,
                status: StatusEnum.NEW_RECORD,
                contractId: '',
                contractName: '',
                contractNo: '',
                changeReason: '',
                chequeClearStatus: 'PENDING' as any,
                paymentDetails: [],
                paymentInvoiceDetails: [],
            });
        }
    }, [selectedPayment, isCreateMode]);

    // Validation function for payment data
    const validatePayment = (payment: PaymentDto): string | null => {
        // Rule 1: Receipt number is required
        if (!payment.receiptNo || payment.receiptNo.trim() === '') {
            if (receiptNumberError) {
                return receiptNumberError;
            }
            return 'Receipt number is required and cannot be empty.';
        }

        // Rule 1a: If there's a receipt number error, prevent saving
        if (receiptNumberError) {
            return receiptNumberError;
        }

        // Rule 2: Customer must be selected
        if (!payment.customerId || payment.customerId.trim() === '') {
            return 'Please select a customer before saving the payment.';
        }

        // Rule 3: Payment date is required
        if (!payment.paymentDate || payment.paymentDate.trim() === '') {
            return 'Payment date is required.';
        }

        // Rule 4: Payment amount must be greater than zero
        if (!payment.paymentAmount || payment.paymentAmount <= 0) {
            return 'Payment amount must be greater than zero.';
        }

        // Rule 4a: Customer credit payment validations
        if (payment.customerCreditPayment) {
            // Must have exactly 1 invoice detail
            if (!payment.paymentInvoiceDetails || payment.paymentInvoiceDetails.length !== 1) {
                return 'Customer credit payment must be applied to exactly one invoice.';
            }

            // All payment details must be CUSTOMER_CREDIT type
            const hasNonCreditType = payment.paymentDetails?.some(
                (detail) => detail.paymentType !== PaymentTypeEnum.CUSTOMER_CREDIT
            );
            if (hasNonCreditType) {
                return 'Customer credit payment can only have CUSTOMER_CREDIT payment type.';
            }

            // No banking details allowed
            const hasBankingDetails = payment.paymentDetails?.some(
                (detail) => detail.chequeNo || detail.bankName || detail.bankAccountNo || detail.chequeDate
            );
            if (hasBankingDetails) {
                return 'Customer credit payment cannot have banking details.';
            }

            // Amount must not exceed available credit
            if (selectedCustomer && selectedCustomer.customerCredit !== undefined) {
                if (payment.paymentAmount > selectedCustomer.customerCredit) {
                    return `Payment amount (₱${payment.paymentAmount.toFixed(
                        2
                    )}) exceeds available customer credit (₱${selectedCustomer.customerCredit.toFixed(2)}).`;
                }
            }
        }

        // Rule 5: Payment amount must equal sum of payment details amounts
        const paymentDetailsSum = payment.paymentDetails?.reduce((sum, detail) => sum + (detail.amount || 0), 0) || 0;
        if (Math.abs(payment.paymentAmount - paymentDetailsSum) > 0.01) {
            return 'Payment amount must equal the sum of all payment details amounts.';
        }

        // Rule 6: Payment amount must equal sum of applied invoice amounts
        // Validate for all payments with invoice details, EXCEPT REGULAR contract payments
        // For REGULAR contract payments: skip validation (no invoices allowed)
        // If contractType is null/unknown, still validate to be safe
        const isRegularContract = payment.contractPayment && contractType === ContractTypeEnum.REGULAR;
        const shouldValidateInvoices = !isRegularContract;

        // Always validate if there are invoice details (unless it's a confirmed REGULAR contract)
        if (payment.paymentInvoiceDetails && payment.paymentInvoiceDetails.length > 0) {
            if (shouldValidateInvoices) {
                const appliedAmountSum = payment.paymentInvoiceDetails.reduce((sum, detail) => {
                    const amount = detail.amountApplied || 0;
                    return sum + amount;
                }, 0);

                const paymentAmount = payment.paymentAmount || 0;

                // First check if applied amount exceeds payment amount
                if (appliedAmountSum > paymentAmount) {
                    return `Total applied amount (₱${appliedAmountSum.toFixed(
                        2
                    )}) cannot exceed payment amount (₱${paymentAmount.toFixed(2)}).`;
                }

                // Then check if amounts match (within tolerance)
                if (Math.abs(paymentAmount - appliedAmountSum) > 0.01) {
                    return `Payment amount (₱${paymentAmount.toFixed(
                        2
                    )}) must equal the sum of all applied invoice amounts (₱${appliedAmountSum.toFixed(2)}).`;
                }
            }
            // For REGULAR contract payments, skip validation (but invoices shouldn't be there anyway)
        }

        // Rule 7: Change reason required for non-admin users editing existing payments
        if (!isCreateMode && !isAdminUser) {
            if (!payment.changeReason || payment.changeReason.trim() === '') {
                return 'Change reason is required when modifying a payment.';
            }
            if (payment.changeReason.trim().length < 10) {
                return 'Change reason must be at least 10 characters when modifying a payment.';
            }
        }

        return null; // All validations passed
    };

    const handleSave = () => {
        // Force blur on all active input elements to commit their values
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            activeElement.blur();
        }

        // Read current values directly from DOM inputs to get the latest values
        // This ensures we validate with what the user actually sees, not stale formData
        const currentFormData = { ...formData };
        if (currentFormData.paymentInvoiceDetails && currentFormData.paymentInvoiceDetails.length > 0) {
            // Find all applied amount input fields and read their current values
            const appliedAmountInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder="0.00"]');

            appliedAmountInputs.forEach((input, idx) => {
                if (idx < currentFormData.paymentInvoiceDetails.length) {
                    const rawValue = input.value.replace(/,/g, '');
                    const numValue = parseFloat(rawValue) || 0;
                    currentFormData.paymentInvoiceDetails[idx].amountApplied = numValue;
                }
            });
        }

        // Validate with the current (potentially updated) formData
        const validationError = validatePayment(currentFormData);
        if (validationError) {
            setFlashNotification({
                title: 'Validation Error',
                message: validationError,
                alertType: 'error',
            });
            return; // Prevent save if validation fails
        }

        // Double-check: Calculate applied amount sum directly
        const appliedAmountSum =
            currentFormData.paymentInvoiceDetails?.reduce((sum, detail) => {
                return sum + (detail.amountApplied || 0);
            }, 0) || 0;

        const paymentAmount = currentFormData.paymentAmount || 0;
        const isRegularContract = currentFormData.contractPayment && contractType === ContractTypeEnum.REGULAR;

        // Additional safety check for applied amounts
        if (
            !isRegularContract &&
            currentFormData.paymentInvoiceDetails &&
            currentFormData.paymentInvoiceDetails.length > 0
        ) {
            if (appliedAmountSum > paymentAmount) {
                setFlashNotification({
                    title: 'Validation Error',
                    message: `Cannot save: Total applied amount (₱${appliedAmountSum.toFixed(
                        2
                    )}) exceeds payment amount (₱${paymentAmount.toFixed(2)}). Please adjust the applied amounts.`,
                    alertType: 'error',
                });
                return;
            }

            if (Math.abs(paymentAmount - appliedAmountSum) > 0.01) {
                setFlashNotification({
                    title: 'Validation Error',
                    message: `Cannot save: Payment amount (₱${paymentAmount.toFixed(
                        2
                    )}) must equal the sum of all applied invoice amounts (₱${appliedAmountSum.toFixed(2)}).`,
                    alertType: 'error',
                });
                return;
            }
        }

        // Update formData with the current values before saving
        setFormData(currentFormData);

        // Only call onSave if all validations pass
        onSave(currentFormData);
    };

    const handleFormDataChange = (updatedData: Partial<PaymentDto>) => {
        setFormData((prev) => ({
            ...prev,
            ...updatedData,
        }));
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

    const showApprovalView =
        !isCreateMode &&
        selectedPayment &&
        [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
            selectedPayment.status as StatusEnum
        );

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                <div className="flex gap-2 flex-nowrap">
                    <button
                        onClick={() => onTabChange('details')}
                        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                            selectedPayment?.status || StatusEnum.ACTIVE,
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
                            Payment Information
                            {selectedPayment && (
                                <>
                                    <span className="mx-1">-</span>
                                    <span>{getStatusText(selectedPayment.status || StatusEnum.ACTIVE)}</span>
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
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 bg-white">
                {/* Details Tab */}
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        {showApprovalView &&
                            !isCreateMode &&
                            selectedPayment &&
                            (() => {
                                // Handle FOR_DELETION status - show deletion message instead of approval version
                                if (selectedPayment.status === StatusEnum.FOR_DELETION) {
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
                                                        <h3 className="text-lg font-bold text-red-800">
                                                            Record Marked for Deletion
                                                        </h3>
                                                        <p className="mt-1 text-sm text-red-700">
                                                            This record has been marked for deletion and is awaiting
                                                            approval.
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedPayment.changeReason && (
                                                    <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            Deletion Reason:
                                                        </p>
                                                        <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                                                            {selectedPayment.changeReason}
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
                                                            onClick={onDeny}
                                                            disabled={isLoading}
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                            {isLoading ? 'Processing...' : 'Deny Deletion'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={onApprove}
                                                            disabled={isLoading}
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                            {isLoading ? 'Processing...' : 'Approve Deletion'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="hidden sm:block" />
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={onCancel}
                                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
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
                                    );
                                }

                                // For FOR_APPROVAL and NEW_RECORD, show approval version
                                if (!selectedPayment.forApprovalVersion) return null;

                                // Merge original payment data with forApprovalVersion changes
                                const approvalVersionData: PaymentDto = {
                                    ...selectedPayment,
                                    ...selectedPayment.forApprovalVersion,
                                };

                                return (
                                    <div>
                                        {(selectedPayment.status === StatusEnum.FOR_APPROVAL ||
                                            selectedPayment.status === StatusEnum.NEW_RECORD) && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                                                <span className="text-yellow-600 text-base">ℹ️</span>
                                                <span className="text-yellow-800 text-sm">
                                                    These are the proposed changes awaiting approval
                                                </span>
                                            </div>
                                        )}

                                        {/* Change Reason - Highlighted field */}
                                        {selectedPayment?.changeReason && (
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
                                                    <h4 className="m-0 text-base font-bold text-blue-600">
                                                        Change Reason and Modification Made
                                                    </h4>
                                                </div>
                                                <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm cursor-not-allowed whitespace-pre-wrap leading-relaxed">
                                                    {selectedPayment.changeReason}
                                                </div>
                                            </div>
                                        )}

                                        {/* Use the same components as Details tab but with merged data and read-only */}
                                        <RecordDetailsTab
                                            formData={approvalVersionData}
                                            onFormDataChange={() => {}} // No-op since read-only
                                            isCreateMode={false}
                                            isAdminUser={isAdminUser}
                                            isReadOnly={true}
                                        />
                                        <PaymentDetailsTab
                                            formData={approvalVersionData}
                                            onFormDataChange={() => {}} // No-op since read-only
                                            isCreateMode={false}
                                            isReadOnly={true}
                                            approvalComparison={{
                                                original: selectedPayment.paymentDetails || [],
                                                pending: approvalVersionData.paymentDetails || [],
                                            }}
                                        />
                                        <PaymentInvoiceDetailsTab
                                            formData={approvalVersionData}
                                            onFormDataChange={() => {}} // No-op since read-only
                                            isCreateMode={false}
                                            isReadOnly={true}
                                            approvalComparison={{
                                                original: selectedPayment.paymentInvoiceDetails || [],
                                                pending: approvalVersionData.paymentInvoiceDetails || [],
                                            }}
                                        />

                                        {/* Action Buttons */}
                                        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                            {isAdminUser &&
                                            (selectedPayment?.status === StatusEnum.FOR_APPROVAL ||
                                                selectedPayment?.status === StatusEnum.NEW_RECORD) ? (
                                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={onDeny}
                                                        disabled={isLoading}
                                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                                            <button
                                                type="button"
                                                onClick={onCancel}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
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
                                );
                            })()}
                        {!showApprovalView && (
                            <>
                                {/* Show receipt number error banner */}
                                {isCreateMode && receiptNumberError && (
                                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                <svg
                                                    className="h-6 w-6 text-red-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-red-800 m-0 mb-1">
                                                    Cannot Create Payment
                                                </h4>
                                                <p className="text-sm text-red-700 m-0 leading-relaxed">
                                                    {receiptNumberError}
                                                </p>
                                                <p className="text-xs text-red-600 mt-2 m-0">
                                                    Please contact an administrator to set up receipt number ranges for
                                                    this customer&apos;s area.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <RecordDetailsTab
                                    formData={formData}
                                    onFormDataChange={handleFormDataChange}
                                    isCreateMode={isCreateMode}
                                    isAdminUser={isAdminUser}
                                    isReadOnly={!isCreateMode && selectedPayment?.status !== StatusEnum.ACTIVE}
                                    onCustomerSelected={(customer) => setSelectedCustomer(customer)}
                                    customerCreditBalance={selectedCustomer?.customerCredit}
                                />

                                {/* Info banner for existing credit payments */}
                                {!isCreateMode &&
                                    selectedPayment?.customerCreditPayment &&
                                    selectedPayment?.status === StatusEnum.ACTIVE && (
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <svg
                                                    className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                <p className="text-sm text-blue-700 m-0">
                                                    Customer credit payments cannot be edited. To make changes, delete
                                                    this payment and create a new one.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                <PaymentDetailsTab
                                    formData={formData}
                                    onFormDataChange={handleFormDataChange}
                                    isCreateMode={isCreateMode}
                                    isReadOnly={
                                        (!isCreateMode && selectedPayment?.status !== StatusEnum.ACTIVE) ||
                                        (!isCreateMode && !!selectedPayment?.customerCreditPayment)
                                    }
                                />
                                <PaymentInvoiceDetailsTab
                                    formData={formData}
                                    onFormDataChange={handleFormDataChange}
                                    isCreateMode={isCreateMode}
                                    isReadOnly={
                                        (!isCreateMode && selectedPayment?.status !== StatusEnum.ACTIVE) ||
                                        (!isCreateMode && !!selectedPayment?.customerCreditPayment)
                                    }
                                />

                                {/* Action Buttons for Details Tab */}
                                <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                    {!isCreateMode && selectedPayment?.status === StatusEnum.ACTIVE ? (
                                        <button
                                            type="button"
                                            onClick={onDelete}
                                            disabled={isLoading}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
                                        {(isCreateMode || selectedPayment?.status === StatusEnum.ACTIVE) && (
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={
                                                    isLoading ||
                                                    (!isCreateMode && selectedPayment?.status !== StatusEnum.ACTIVE) ||
                                                    (isCreateMode && receiptNumberError !== null)
                                                }
                                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                title={
                                                    isCreateMode && receiptNumberError ? receiptNumberError : undefined
                                                }
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
                                                    ? 'Create Payment'
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
                {activeTab === 'logs' && !isCreateMode && (
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

                            {renderActivityLogsTable(selectedPayment?.activityLogs)}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="hidden sm:block" />
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                {isAdminUser &&
                                    selectedPayment &&
                                    [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                        selectedPayment.status as StatusEnum
                                    ) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onDeny}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
            </div>
        </div>
    );
}
