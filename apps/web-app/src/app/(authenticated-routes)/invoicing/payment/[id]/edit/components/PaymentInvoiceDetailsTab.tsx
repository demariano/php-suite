'use client';

import {
    ContractApi,
    ContractTypeEnum,
    InvoiceApi,
    InvoiceDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    useSessionStore,
} from '@data-access/index';
import { useEffect, useRef, useState } from 'react';

interface PaymentInvoiceDetailsTabProps {
    formData: PaymentDto;
    onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
    isCreateMode: boolean;
    isReadOnly?: boolean;
    onBeforeSave?: () => void;
}

export default function PaymentInvoiceDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isReadOnly = false,
}: PaymentInvoiceDetailsTabProps) {
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [pendingInvoices, setPendingInvoices] = useState<InvoiceDto[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<InvoiceDto[]>([]);
    const [contractType, setContractType] = useState<ContractTypeEnum | null>(null);
    const amountInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
    const [editingAmounts, setEditingAmounts] = useState<Map<number, string>>(new Map());
    // Store invoice details for display (invoiceId -> InvoiceDto)
    const [invoiceDetailsMap, setInvoiceDetailsMap] = useState<Map<string, InvoiceDto>>(new Map());

    const { setFlashNotification } = useSessionStore();

    // Load invoice details for existing paymentInvoiceDetails (when editing)
    useEffect(() => {
        const loadInvoiceDetails = async () => {
            if (formData.paymentInvoiceDetails && formData.paymentInvoiceDetails.length > 0) {
                const newInvoiceDetailsMap = new Map(invoiceDetailsMap);
                const promises = formData.paymentInvoiceDetails.map(async (detail) => {
                    // Only fetch if we don't already have it
                    if (!newInvoiceDetailsMap.has(detail.invoiceId)) {
                        try {
                            const invoice = await InvoiceApi.getInvoiceById(detail.invoiceId);
                            newInvoiceDetailsMap.set(detail.invoiceId, invoice);
                        } catch (error) {
                            console.error(`Error loading invoice ${detail.invoiceId}:`, error);
                        }
                    }
                });
                await Promise.all(promises);
                setInvoiceDetailsMap(newInvoiceDetailsMap);
            }
        };

        loadInvoiceDetails();
    }, [formData.paymentInvoiceDetails?.length]); // Only reload when the count changes

    // Fetch contract type when contractId is available
    useEffect(() => {
        const fetchContractType = async () => {
            if (formData.contractPayment && formData.contractId) {
                try {
                    const contract = await ContractApi.getContractById(formData.contractId);

                    // Debug: Log the full contract to see its structure
                    console.log('Full contract object:', contract);
                    console.log('Contract type from contract:', contract?.contractType);
                    console.log('All contract keys:', contract ? Object.keys(contract) : 'contract is null/undefined');

                    // Try to get contractType
                    let fetchedContractType: ContractTypeEnum | null = contract?.contractType || null;

                    // Convert string to enum if needed (in case API returns string instead of enum)
                    if (typeof fetchedContractType === 'string') {
                        if (fetchedContractType === 'REGULAR') {
                            fetchedContractType = ContractTypeEnum.REGULAR;
                        } else if (fetchedContractType === 'CONTRACT_PER_INVOICE') {
                            fetchedContractType = ContractTypeEnum.CONTRACT_PER_INVOICE;
                        } else {
                            fetchedContractType = null;
                        }
                    }

                    // Warn if contractType is missing (contracts should have this field set)
                    if (!fetchedContractType && contract) {
                        console.warn(
                            `Contract ${formData.contractId} (${
                                contract.contractNo || contract.contractName || 'Unknown'
                            }) does not have contractType set. ` +
                                `Defaulting to allowing invoice selection. Please set contractType in the database.`
                        );
                    }

                    setContractType(fetchedContractType || null);

                    // Debug: Log the contract type to verify it's being fetched correctly
                    console.log('Final contract type:', fetchedContractType, 'for contract:', formData.contractId);

                    // If it's a REGULAR contract, clear any existing invoice details
                    if (
                        fetchedContractType === ContractTypeEnum.REGULAR &&
                        formData.paymentInvoiceDetails &&
                        formData.paymentInvoiceDetails.length > 0
                    ) {
                        onFormDataChange({
                            paymentInvoiceDetails: [],
                        });
                    }
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

    // Determine if invoice selection should be allowed
    const shouldAllowInvoiceSelection = () => {
        // Non-contract payments: always allow
        if (!formData.contractPayment) {
            return true;
        }
        // Contract payment with CONTRACT_PER_INVOICE: allow
        if (formData.contractPayment && contractType === ContractTypeEnum.CONTRACT_PER_INVOICE) {
            return true;
        }
        // Contract payment with REGULAR: disallow
        return false;
    };

    // Hide entire section for REGULAR contract payments
    if (formData.contractPayment && contractType === ContractTypeEnum.REGULAR) {
        return null;
    }

    // Load pending payment invoices when modal opens
    const loadPendingInvoices = async () => {
        if (!formData.customerId) {
            setFlashNotification({
                title: 'Error',
                message: 'Please select a customer first',
                alertType: 'error',
            });
            return;
        }

        // Clear existing invoices at the start of search
        setPendingInvoices([]);

        try {
            setIsLoadingInvoices(true);

            // Determine filter parameters based on payment type
            let contractIdToFilter: string | undefined = undefined;
            let nonContractOnly: boolean = false;

            if (formData.contractPayment && contractType === ContractTypeEnum.CONTRACT_PER_INVOICE) {
                // For CONTRACT_PER_INVOICE payments: filter by contractId
                contractIdToFilter = formData.contractId;
            } else if (!formData.contractPayment) {
                // For non-contract payments: show only invoices without contracts
                nonContractOnly = true;
            }
            // For REGULAR contract payments: invoice search is hidden, so this won't be called

            // The backend already returns both PENDING and PARTIAL status invoices combined
            const invoices = await InvoiceApi.getPendingPaymentInvoices(
                formData.customerId,
                'ACTIVE',
                contractIdToFilter,
                nonContractOnly
            );

            // Add computed remainingBalance field to each invoice
            const invoicesWithRemainingBalance = (invoices || []).map((invoice) => ({
                ...invoice,
                remainingBalance: (invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0),
            }));

            setPendingInvoices(invoicesWithRemainingBalance);

            // Store invoice details in map for later display
            const newInvoiceDetailsMap = new Map(invoiceDetailsMap);
            invoicesWithRemainingBalance.forEach((invoice) => {
                newInvoiceDetailsMap.set(invoice.invoiceId, invoice);
            });
            setInvoiceDetailsMap(newInvoiceDetailsMap);
        } catch (error) {
            console.error('Error loading pending invoices:', error);
            // Clear invoices on error to ensure old data doesn't persist
            setPendingInvoices([]);
            setFlashNotification({
                title: 'Error',
                message: 'Failed to load pending payment invoices',
                alertType: 'error',
            });
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const handleSearchInvoices = () => {
        if (!formData.customerId) {
            setFlashNotification({
                title: 'Error',
                message: 'Please select a customer first',
                alertType: 'error',
            });
            return;
        }
        setSelectedInvoices([]);
        loadPendingInvoices();
        setShowInvoiceModal(true);
    };

    const handleApplySelectedInvoices = () => {
        if (selectedInvoices.length === 0) {
            setFlashNotification({
                title: 'Warning',
                message: 'Please select at least one invoice',
                alertType: 'warning',
            });
            return;
        }

        const currentAppliedAmount =
            formData.paymentInvoiceDetails?.reduce((sum, detail) => sum + detail.amountApplied, 0) || 0;
        const remainingPaymentAmount = formData.paymentAmount - currentAppliedAmount;

        const newInvoiceDetails: PaymentInvoiceDetailsDto[] = [];

        // Calculate total remaining balance of all selected invoices
        const totalInvoiceRemainingBalance = selectedInvoices.reduce((sum, invoice) => {
            return sum + ((invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0));
        }, 0);

        // Distribute the remaining payment amount proportionally among selected invoices
        // If remaining amount is 0 or negative, set initial applied amount to 0 (user can adjust manually)
        for (const invoice of selectedInvoices) {
            const invoiceRemainingBalance = (invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0);

            let amountToApply = 0;
            if (remainingPaymentAmount > 0 && totalInvoiceRemainingBalance > 0) {
                // Distribute proportionally based on each invoice's remaining balance
                const proportion = invoiceRemainingBalance / totalInvoiceRemainingBalance;
                amountToApply = Math.min(invoiceRemainingBalance, remainingPaymentAmount * proportion);
            }
            // If remainingPaymentAmount <= 0, amountToApply stays 0 (user can adjust manually)

            newInvoiceDetails.push({
                invoiceId: invoice.invoiceId,
                docno: invoice.docno || '',
                amountApplied: amountToApply,
                receiptNo: formData.receiptNo,
                paymentDate: formData.paymentDate,
                paymentId: parseInt(formData.paymentId) || 0,
            });

            // Store invoice details for display
            setInvoiceDetailsMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(invoice.invoiceId, invoice);
                return newMap;
            });
        }

        const updatedPaymentInvoiceDetails = [...(formData.paymentInvoiceDetails || []), ...newInvoiceDetails];
        onFormDataChange({
            paymentInvoiceDetails: updatedPaymentInvoiceDetails,
        });

        setSelectedInvoices([]);
        setShowInvoiceModal(false);

        const appliedCount = selectedInvoices.length;
        const message =
            remainingPaymentAmount <= 0
                ? `${appliedCount} invoice(s) added with ₱0.00 applied. Please adjust the applied amounts manually.`
                : `${appliedCount} invoice(s) applied successfully. You can adjust the applied amounts if needed.`;

        setFlashNotification({
            title: 'Success',
            message: message,
            alertType: 'success',
        });
    };

    const handleDeleteInvoiceDetail = (index: number) => {
        const updatedPaymentInvoiceDetails = formData.paymentInvoiceDetails?.filter((_, idx) => idx !== index) || [];
        onFormDataChange({
            paymentInvoiceDetails: updatedPaymentInvoiceDetails,
        });

        setFlashNotification({
            title: 'Success',
            message: 'Invoice application removed successfully',
            alertType: 'success',
        });
    };

    const handleUpdateAppliedAmount = (index: number, newAmount: number, skipValidation = false) => {
        if (!skipValidation && newAmount < 0) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Applied amount must be greater than or equal to zero',
                alertType: 'error',
            });
            return;
        }

        const updatedPaymentInvoiceDetails = [...(formData.paymentInvoiceDetails || [])];
        const otherAmountsTotal = updatedPaymentInvoiceDetails
            .filter((_, idx) => idx !== index)
            .reduce((sum, detail) => sum + detail.amountApplied, 0);

        const newTotal = otherAmountsTotal + newAmount;

        // Only validate total on blur, not while typing (to allow user to type freely)
        if (!skipValidation && newTotal > formData.paymentAmount) {
            setFlashNotification({
                title: 'Validation Error',
                message: `Total applied amount (₱${newTotal.toFixed(
                    2
                )}) cannot exceed payment amount (₱${formData.paymentAmount.toFixed(2)})`,
                alertType: 'error',
            });
            return;
        }

        updatedPaymentInvoiceDetails[index] = {
            ...updatedPaymentInvoiceDetails[index],
            amountApplied: newAmount,
        };

        onFormDataChange({
            paymentInvoiceDetails: updatedPaymentInvoiceDetails,
        });
    };

    const getTotalAppliedAmount = () => {
        return formData.paymentInvoiceDetails?.reduce((sum, detail) => sum + detail.amountApplied, 0) || 0;
    };

    const getRemainingAmount = () => {
        return formData.paymentAmount - getTotalAppliedAmount();
    };

    const getTotalMismatchError = () => {
        const totalApplied = getTotalAppliedAmount();
        const difference = Math.abs(formData.paymentAmount - totalApplied);
        if (difference > 0.01) {
            return `Total applied amount (₱${totalApplied.toFixed(
                2
            )}) does not match payment amount (₱${formData.paymentAmount.toFixed(2)})`;
        }
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Applied Invoices Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
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
                        <h3 className="text-base font-bold text-blue-600">Applied Invoices</h3>
                    </div>
                    {!isReadOnly && shouldAllowInvoiceSelection() && (
                        <button
                            type="button"
                            onClick={handleSearchInvoices}
                            disabled={!formData.customerId}
                            className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                                formData.customerId
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-500 cursor-not-allowed opacity-60'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            Search Invoices
                        </button>
                    )}
                    {!isReadOnly && formData.contractPayment && contractType === ContractTypeEnum.REGULAR && (
                        <div className="text-xs text-gray-500 italic">
                            Invoice selection is not available for REGULAR contract payments
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-gray-600 mb-1">Total Payment Amount</div>
                            <div className="text-lg font-semibold text-gray-900">
                                ₱{formData.paymentAmount.toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-600 mb-1">Applied Amount</div>
                            <div
                                className={`text-lg font-semibold ${
                                    getTotalMismatchError() ? 'text-red-600' : 'text-green-600'
                                }`}
                            >
                                ₱{getTotalAppliedAmount().toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-600 mb-1">Remaining Amount</div>
                            <div
                                className={`text-lg font-semibold ${
                                    getRemainingAmount() >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                ₱{getRemainingAmount().toFixed(2)}
                            </div>
                        </div>
                    </div>
                    {getTotalMismatchError() && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
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
                                <p className="text-sm text-red-700 m-0">{getTotalMismatchError()}</p>
                            </div>
                        </div>
                    )}
                </div>

                {formData.paymentInvoiceDetails && formData.paymentInvoiceDetails.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Invoice No
                                        </th>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Invoice Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Applied Amount
                                        </th>
                                        {!isReadOnly && (
                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.paymentInvoiceDetails.map((detail, index) => {
                                        // Get invoice details for display - use invoice amounts for CONTRACT_PER_INVOICE (same as non-contract)
                                        // For REGULAR contracts, this section is hidden anyway
                                        const invoice = invoiceDetailsMap.get(detail.invoiceId);
                                        const invoiceAmount = invoice ? invoice.finalAmount || 0 : 0;
                                        const invoiceTotalPaid = invoice ? invoice.totalAmountPaid || 0 : 0;
                                        const invoiceRemainingBalance = invoiceAmount - invoiceTotalPaid;

                                        return (
                                            <tr
                                                key={index}
                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                    {detail.docno}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    ₱{invoiceAmount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {isReadOnly ? (
                                                        <span className="text-sm font-medium text-gray-900">
                                                            ₱{detail.amountApplied.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <div className="w-full max-w-[150px]">
                                                            <input
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        amountInputRefs.current.set(index, el);
                                                                    } else {
                                                                        amountInputRefs.current.delete(index);
                                                                    }
                                                                }}
                                                                type="text"
                                                                value={
                                                                    editingAmounts.has(index)
                                                                        ? editingAmounts.get(index) || ''
                                                                        : detail.amountApplied.toLocaleString('en-US', {
                                                                              minimumFractionDigits: 2,
                                                                              maximumFractionDigits: 2,
                                                                          })
                                                                }
                                                                onChange={(e) => {
                                                                    const rawValue = e.target.value.replace(/,/g, '');
                                                                    // Allow user to type freely - store raw value in local state
                                                                    setEditingAmounts((prev) => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.set(index, rawValue);
                                                                        return newMap;
                                                                    });

                                                                    // Parse and update formData immediately (skip validation while typing)
                                                                    const numValue = parseFloat(rawValue);
                                                                    if (
                                                                        !isNaN(numValue) &&
                                                                        rawValue !== '' &&
                                                                        rawValue !== '.'
                                                                    ) {
                                                                        handleUpdateAppliedAmount(
                                                                            index,
                                                                            numValue,
                                                                            true
                                                                        ); // Skip validation while typing
                                                                    } else if (rawValue === '' || rawValue === '.') {
                                                                        // Allow empty or just decimal point while typing
                                                                        handleUpdateAppliedAmount(index, 0, true);
                                                                    }
                                                                }}
                                                                onFocus={(e) => {
                                                                    // When focused, show raw value for editing
                                                                    const rawValue = detail.amountApplied.toString();
                                                                    setEditingAmounts((prev) => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.set(index, rawValue);
                                                                        return newMap;
                                                                    });
                                                                }}
                                                                onBlur={(e) => {
                                                                    // On blur, parse final value and commit
                                                                    const rawValue = e.target.value.replace(/,/g, '');
                                                                    const numValue = parseFloat(rawValue) || 0;
                                                                    handleUpdateAppliedAmount(index, numValue);

                                                                    // Clear editing state to show formatted value
                                                                    setEditingAmounts((prev) => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.delete(index);
                                                                        return newMap;
                                                                    });
                                                                }}
                                                                placeholder="0.00"
                                                                className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 ${
                                                                    getTotalMismatchError()
                                                                        ? 'border-red-300 bg-red-50 text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500'
                                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                                                                }`}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className="px-6 py-5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteInvoiceDetail(index)}
                                                            className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-red-600 hover:bg-red-700"
                                                            title="Remove"
                                                        >
                                                            <svg
                                                                className="w-5 h-5"
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
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        <div className="p-10 text-center text-gray-500 text-base">
                            No invoices applied yet. Click &quot;Search Invoices&quot; to get started.
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Selection Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-blue-600 m-0">Select Invoices to Apply</h3>
                        </div>

                        {isLoadingInvoices ? (
                            <div className="text-center py-10">
                                <div className="text-gray-500">Loading invoices...</div>
                            </div>
                        ) : pendingInvoices.length > 0 ? (
                            <div className="mb-5">
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead className="bg-white border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Select
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Invoice No
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Total Amount Paid
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Final Amount
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Remaining Balance
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {pendingInvoices.map((invoice, index) => {
                                                    const isSelected = selectedInvoices.some(
                                                        (selected) => selected.invoiceId === invoice.invoiceId
                                                    );
                                                    const isAlreadyApplied = formData.paymentInvoiceDetails?.some(
                                                        (detail) => detail.invoiceId === invoice.invoiceId
                                                    );

                                                    return (
                                                        <tr
                                                            key={index}
                                                            className="transition-all duration-200 bg-white hover:bg-gray-50"
                                                        >
                                                            <td className="px-6 py-5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={isAlreadyApplied}
                                                                    onChange={() => {
                                                                        if (isSelected) {
                                                                            setSelectedInvoices((prev) =>
                                                                                prev.filter(
                                                                                    (selected) =>
                                                                                        selected.invoiceId !==
                                                                                        invoice.invoiceId
                                                                                )
                                                                            );
                                                                        } else {
                                                                            setSelectedInvoices((prev) => [
                                                                                ...prev,
                                                                                invoice,
                                                                            ]);
                                                                        }
                                                                    }}
                                                                    className={`w-4 h-4 ${
                                                                        isAlreadyApplied
                                                                            ? 'cursor-not-allowed'
                                                                            : 'cursor-pointer'
                                                                    }`}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                {invoice.docno}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱{(invoice.totalAmountPaid || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱{(invoice.finalAmount || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱
                                                                {(
                                                                    (invoice.finalAmount || 0) -
                                                                    (invoice.totalAmountPaid || 0)
                                                                ).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                {isAlreadyApplied ? (
                                                                    <span className="text-gray-500 italic">
                                                                        Already Applied
                                                                    </span>
                                                                ) : (
                                                                    invoice.paymentStatus
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                <div className="p-10 text-center text-gray-500 text-base">
                                    No pending payment invoices found
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInvoiceModal(false);
                                    setSelectedInvoices([]);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplySelectedInvoices}
                                disabled={selectedInvoices.length === 0}
                                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    selectedInvoices.length > 0
                                        ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Apply Selected ({selectedInvoices.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
