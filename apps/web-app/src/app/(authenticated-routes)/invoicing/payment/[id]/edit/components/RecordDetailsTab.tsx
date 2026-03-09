'use client';

import {
    CollectionReceiptRangeApi,
    CustomerDto,
    PaymentDto,
    PaymentTypeEnum,
    useSessionStore,
} from '@data-access/index';
import { useState } from 'react';
import { ChangeReasonField } from '../../../../../components/ChangeReasonField';
import DatePicker from '../../../../../components/DatePicker';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';

interface RecordDetailsTabProps {
    formData: PaymentDto;
    onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
    isCreateMode: boolean;
    isAdminUser: boolean;
    isReadOnly?: boolean;
    onReceiptNumberError?: (error: string | null) => void;
    onCustomerSelected?: (customer: CustomerDto) => void;
    customerCreditBalance?: number;
}

export default function RecordDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isAdminUser,
    isReadOnly = false,
    onReceiptNumberError,
    onCustomerSelected,
    customerCreditBalance,
}: RecordDetailsTabProps) {
    // State management for modals
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // State for receipt number fetching
    const [isFetchingReceiptNumber, setIsFetchingReceiptNumber] = useState(false);
    const [receiptNumberError, setReceiptNumberError] = useState<string | null>(null);

    // Toast notification hook
    const { setFlashNotification } = useSessionStore();

    // Handle customer selection
    const handleCustomerSelect = async (customer: CustomerDto) => {
        try {
            // Notify parent of customer selection (for credit balance tracking)
            onCustomerSelected?.(customer);

            // Update form data with customer info
            onFormDataChange({
                customerId: customer.customerId,
                customerName: customer.customerName,
                areaId: customer.areaId || '',
                areaName: customer.areaName || '',
            });

            // Clear contract selection when customer changes
            onFormDataChange({
                contractId: '',
                contractName: '',
                contractNo: '',
            });

            // Clear previous receipt number error
            setReceiptNumberError(null);
            onReceiptNumberError?.(null);

            // Auto-populate receipt number if customer has areaId and we're in create mode
            if (isCreateMode && customer.areaId && !formData.receiptNo) {
                setIsFetchingReceiptNumber(true);
                try {
                    const nextReceiptNumber = await CollectionReceiptRangeApi.getNextAvailableReceiptNumber(
                        customer.areaId
                    );
                    onFormDataChange({
                        receiptNo: nextReceiptNumber.toString(),
                    });
                    setReceiptNumberError(null);
                    onReceiptNumberError?.(null);
                } catch (error: any) {
                    console.error('Error fetching next receipt number:', error);
                    const errorMessage =
                        error?.response?.data?.message ||
                        error?.message ||
                        'Unable to fetch receipt number. Please contact an administrator.';

                    // Set error state
                    setReceiptNumberError(errorMessage);
                    onReceiptNumberError?.(errorMessage);

                    // Clear receipt number
                    onFormDataChange({
                        receiptNo: '',
                    });

                    // Show notification
                    setFlashNotification({
                        title: 'Receipt Number Unavailable',
                        message: errorMessage,
                        alertType: 'error',
                    });
                } finally {
                    setIsFetchingReceiptNumber(false);
                }
            } else if (isCreateMode && !customer.areaId) {
                // Customer has no areaId - allow manual entry
                setReceiptNumberError(null);
                onReceiptNumberError?.(null);
            }
        } catch (error) {
            console.error('Error processing customer selection:', error);
        }
    };

    return (
        <div className="space-y-6">
            {!isCreateMode && !isAdminUser && (
                <ChangeReasonField
                    value={formData.changeReason || ''}
                    onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
                    disabled={isReadOnly}
                />
            )}

            {/* Payment Details Section */}
            <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600">Payment Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Selection */}
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Customer Name *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.customerName || ''}
                                    readOnly
                                    onClick={() => isCreateMode && !isReadOnly && setShowCustomerModal(true)}
                                    disabled={!isCreateMode || isReadOnly}
                                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                        !isCreateMode || isReadOnly
                                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 pr-4'
                                            : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 pr-10'
                                    }`}
                                    placeholder={
                                        !isCreateMode || isReadOnly
                                            ? 'Customer cannot be changed'
                                            : 'Click to select customer'
                                    }
                                />

                                {formData.customerName && isCreateMode && !isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onFormDataChange({
                                                customerId: '',
                                                customerName: '',
                                                areaId: '',
                                                areaName: '',
                                                receiptNo: '', // Clear receipt number when customer is cleared
                                            });
                                            // Clear receipt number error
                                            setReceiptNumberError(null);
                                            onReceiptNumberError?.(null);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg cursor-pointer text-gray-600 p-1 rounded transition-all duration-200 hover:bg-gray-100 hover:text-red-600"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Payment Date */}
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Area Name
                            </label>
                            <input
                                type="text"
                                value={formData.areaName || ''}
                                readOnly
                                disabled
                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                                placeholder="Auto-populated from customer"
                            />
                        </div>

                        {/* Payment Date */}
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Payment Date *
                            </label>
                            <DatePicker
                                value={formData.paymentDate || ''}
                                onChange={(date) => onFormDataChange({ paymentDate: date })}
                                disabled={isReadOnly}
                                placeholder="Select payment date"
                            />
                        </div>

                        {/* Receipt Number */}
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Receipt Number *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.receiptNo || ''}
                                    onChange={(e) => {
                                        onFormDataChange({ receiptNo: e.target.value });
                                        // Clear error when user manually enters receipt number
                                        if (e.target.value && receiptNumberError) {
                                            setReceiptNumberError(null);
                                            onReceiptNumberError?.(null);
                                        }
                                    }}
                                    placeholder={
                                        isFetchingReceiptNumber ? 'Fetching receipt number...' : 'Enter receipt number'
                                    }
                                    disabled={isReadOnly || !isCreateMode || receiptNumberError !== null}
                                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                        isReadOnly || !isCreateMode || receiptNumberError !== null
                                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                                            : receiptNumberError
                                            ? 'border-red-300 bg-red-50 text-gray-700'
                                            : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                    }`}
                                />
                                {isFetchingReceiptNumber && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg
                                            className="animate-spin h-5 w-5 text-blue-600"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {receiptNumberError && (
                                <div className="mt-2 flex items-start gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
                                    <svg
                                        className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
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
                                    <p className="text-sm text-red-700 m-0">{receiptNumberError}</p>
                                </div>
                            )}
                        </div>

                        {/* Payment Amount (Read-only) */}
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Payment Amount
                            </label>
                            <input
                                type="text"
                                value={formData.paymentAmount ? `₱${formData.paymentAmount.toFixed(2)}` : '₱0.00'}
                                readOnly
                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500">Calculated from payment details</p>
                        </div>

                        {/* Contract Payment Checkbox */}
                        <div className="col-span-1 md:col-span-2">
                            <label
                                className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${
                                    isReadOnly || formData.customerCreditPayment ? 'cursor-default' : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.contractPayment || false}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            // Turn off customerCreditPayment when enabling contractPayment
                                            onFormDataChange({
                                                contractPayment: true,
                                                customerCreditPayment: false,
                                                paymentDetails: [],
                                                paymentInvoiceDetails: [],
                                                contractId: '',
                                                contractName: '',
                                                contractNo: '',
                                                paymentContractDetails: [],
                                            });
                                        } else {
                                            onFormDataChange({
                                                contractPayment: false,
                                                contractId: '',
                                                contractName: '',
                                                contractNo: '',
                                                paymentContractDetails: [],
                                            });
                                        }
                                    }}
                                    disabled={isReadOnly || formData.customerCreditPayment}
                                    className={`w-4 h-4 ${
                                        isReadOnly || formData.customerCreditPayment
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}
                                />
                                Contract Payment
                            </label>
                        </div>

                        {/* Customer Credit Payment Checkbox */}
                        <div className="col-span-1 md:col-span-2">
                            <label
                                className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${
                                    isReadOnly || !formData.customerId || formData.contractPayment
                                        ? 'cursor-default'
                                        : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.customerCreditPayment || false}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const today = new Date().toISOString().split('T')[0];
                                            // Turn off contractPayment, clear contract fields, auto-create CUSTOMER_CREDIT detail
                                            onFormDataChange({
                                                customerCreditPayment: true,
                                                contractPayment: false,
                                                contractId: '',
                                                contractName: '',
                                                contractNo: '',
                                                paymentDetails: [
                                                    {
                                                        paymentType: PaymentTypeEnum.CUSTOMER_CREDIT,
                                                        customerCreditPayment: true,
                                                        amount: 0,
                                                        chequeNo: '',
                                                        chequeDate: '',
                                                        bankName: '',
                                                        bankAccountNo: '',
                                                        paymentCreditDate: today,
                                                    },
                                                ],
                                                paymentInvoiceDetails: [],
                                            });
                                        } else {
                                            // Clear credit payment and reset details
                                            onFormDataChange({
                                                customerCreditPayment: false,
                                                paymentDetails: [],
                                                paymentInvoiceDetails: [],
                                            });
                                        }
                                    }}
                                    disabled={isReadOnly || !formData.customerId || formData.contractPayment}
                                    className={`w-4 h-4 ${
                                        isReadOnly || !formData.customerId || formData.contractPayment
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}
                                />
                                Customer Credit Payment
                            </label>
                            {!formData.customerId && !isReadOnly && (
                                <p className="ml-6 mt-1 text-xs text-gray-400">Select a customer first</p>
                            )}
                        </div>

                        {/* Customer Credit Balance Display */}
                        {formData.customerCreditPayment && (
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4">
                                    <svg
                                        className="h-5 w-5 text-green-600 flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-bold text-green-700 m-0">
                                            Available Customer Credit: ₱{(customerCreditBalance ?? 0).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1 m-0">
                                            Payment amount must not exceed the available credit balance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Selection Modal */}
            <CustomerSearchableSelectionModal
                show={showCustomerModal}
                title="Select Customer"
                selectedValue={formData.customerId || null}
                onSelect={handleCustomerSelect}
                onClose={() => setShowCustomerModal(false)}
            />
        </div>
    );
}
