'use client';

import { ContractApi, ContractDto, PaymentContractDetailsDto, PaymentDto, useSessionStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';

interface PaymentContractDetailsTabProps {
    formData: PaymentDto;
    onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
    isCreateMode: boolean;
    isReadOnly?: boolean;
    approvalComparison?: {
        original: PaymentContractDetailsDto[];
        pending: PaymentContractDetailsDto[];
    };
}

export default function PaymentContractDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isReadOnly = false,
    approvalComparison,
}: PaymentContractDetailsTabProps) {
    const [showContractModal, setShowContractModal] = useState(false);
    const [pendingContracts, setPendingContracts] = useState<ContractDto[]>([]);
    const [isLoadingContracts, setIsLoadingContracts] = useState(false);
    const [selectedContracts, setSelectedContracts] = useState<ContractDto[]>([]);
    const amountInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
    const [editingAmounts, setEditingAmounts] = useState<Map<number, string>>(new Map());
    // Store contract details for display (contractId -> ContractDto)
    const [contractDetailsMap, setContractDetailsMap] = useState<Map<string, ContractDto>>(new Map());

    const { setFlashNotification } = useSessionStore();

    const isApprovalView = Boolean(approvalComparison && isReadOnly);
    const originalDetails = approvalComparison?.original || [];
    const pendingDetails = approvalComparison?.pending || [];

    type ApprovalRowStatus = 'added' | 'modified' | 'removed' | 'unchanged';
    const isContractDetailEqual = (a: PaymentContractDetailsDto, b: PaymentContractDetailsDto) =>
        a.amountApplied === b.amountApplied;

    const approvalRows = (() => {
        if (!isApprovalView) return [] as Array<{ detail: PaymentContractDetailsDto; status: ApprovalRowStatus }>;

        const rows: Array<{ detail: PaymentContractDetailsDto; status: ApprovalRowStatus }> = [];
        const originalById = new Map(originalDetails.map((detail) => [detail.contractId, detail]));
        const pendingById = new Map(pendingDetails.map((detail) => [detail.contractId, detail]));

        pendingDetails.forEach((detail) => {
            const originalDetail = originalById.get(detail.contractId);
            if (!originalDetail) {
                rows.push({ detail, status: 'added' });
                return;
            }
            if (!isContractDetailEqual(originalDetail, detail)) {
                rows.push({ detail, status: 'modified' });
                return;
            }
            rows.push({ detail, status: 'unchanged' });
        });

        originalDetails.forEach((detail) => {
            if (!pendingById.has(detail.contractId)) {
                rows.push({ detail, status: 'removed' });
            }
        });

        return rows;
    })();

    const rowsToRender = isApprovalView
        ? approvalRows
        : (formData.paymentContractDetails || []).map((detail) => ({
              detail,
              status: 'unchanged' as ApprovalRowStatus,
          }));

    const showLegend = isApprovalView && approvalRows.some((row) => row.status !== 'unchanged');

    const getRowClasses = (status: ApprovalRowStatus) => {
        switch (status) {
            case 'added':
                return 'bg-green-50';
            case 'modified':
                return 'bg-blue-50';
            case 'removed':
                return 'bg-red-50';
            default:
                return 'bg-white';
        }
    };

    const getStatusLabel = (status: ApprovalRowStatus) => {
        switch (status) {
            case 'added':
                return 'ADDED';
            case 'modified':
                return 'MODIFIED';
            case 'removed':
                return 'REMOVED';
            default:
                return '';
        }
    };

    // Load contract details for display when paymentContractDetails change
    useEffect(() => {
        const loadContractDetails = async () => {
            const details = formData.paymentContractDetails || [];
            const approvalDetails = isApprovalView ? [...originalDetails, ...pendingDetails] : [];
            const allDetails = [...details, ...approvalDetails];

            if (allDetails.length === 0) return;

            const newMap = new Map(contractDetailsMap);
            const idsToFetch = allDetails.map((d) => d.contractId).filter((id) => id && !newMap.has(id));

            const uniqueIds = [...new Set(idsToFetch)];

            for (const contractId of uniqueIds) {
                try {
                    const contract = await ContractApi.getContractById(contractId);
                    newMap.set(contractId, contract);
                } catch (error) {
                    console.error(`Error fetching contract ${contractId}:`, error);
                }
            }

            if (uniqueIds.length > 0) {
                setContractDetailsMap(newMap);
            }
        };

        loadContractDetails();
    }, [formData.paymentContractDetails, isApprovalView]);

    // Load pending contracts for selection
    const loadPendingContracts = async () => {
        if (!formData.customerId) {
            setFlashNotification({
                title: 'Warning',
                message: 'Please select a customer first.',
                alertType: 'error',
            });
            return;
        }

        setIsLoadingContracts(true);
        try {
            const contracts = await ContractApi.getPendingPaymentContracts(formData.customerId);
            setPendingContracts(contracts);
            setShowContractModal(true);
        } catch (error) {
            console.error('Error loading pending contracts:', error);
            setFlashNotification({
                title: 'Error',
                message: 'Failed to load pending contracts. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoadingContracts(false);
        }
    };

    // Apply selected contracts with proportional distribution
    const handleApplySelectedContracts = () => {
        if (selectedContracts.length === 0) return;

        const paymentAmount = formData.paymentAmount || 0;
        const existingApplied = getTotalAppliedAmount();
        const remainingPaymentAmount = paymentAmount - existingApplied;

        // Calculate proportional distribution based on remaining balance of each contract
        const totalRemainingBalance = selectedContracts.reduce((sum, contract) => {
            const contractAmount = contract.contractAmount || 0;
            const totalPaid = contract.totalAmountPaid || 0;
            return sum + Math.max(0, contractAmount - totalPaid);
        }, 0);

        const newContractDetails: PaymentContractDetailsDto[] = selectedContracts.map((contract) => {
            const contractAmount = contract.contractAmount || 0;
            const totalPaid = contract.totalAmountPaid || 0;
            const remainingBalance = Math.max(0, contractAmount - totalPaid);

            let appliedAmount = 0;
            if (totalRemainingBalance > 0) {
                const proportion = remainingBalance / totalRemainingBalance;
                appliedAmount = Math.min(Math.round(proportion * remainingPaymentAmount * 100) / 100, remainingBalance);
            }

            return {
                paymentContractId: '',
                contractId: contract.contractId,
                contractNo: contract.contractNo || '',
                contractName: contract.contractName || '',
                amountApplied: appliedAmount,
                paymentId: formData.paymentId || '',
                dateCreated: new Date().toISOString(),
            };
        });

        // Also store the contract details in the map for display
        const newMap = new Map(contractDetailsMap);
        selectedContracts.forEach((contract) => {
            newMap.set(contract.contractId, contract);
        });
        setContractDetailsMap(newMap);

        const updatedDetails = [...(formData.paymentContractDetails || []), ...newContractDetails];
        onFormDataChange({ paymentContractDetails: updatedDetails });

        setShowContractModal(false);
        setSelectedContracts([]);
    };

    // Delete a contract detail
    const handleDeleteContractDetail = (index: number) => {
        const updatedDetails = [...(formData.paymentContractDetails || [])];
        updatedDetails.splice(index, 1);
        onFormDataChange({ paymentContractDetails: updatedDetails });
    };

    // Update applied amount for a contract detail
    const handleUpdateAppliedAmount = (index: number, amount: number, skipValidation = false) => {
        const validAmount = Math.max(0, amount);
        const updatedDetails = [...(formData.paymentContractDetails || [])];
        updatedDetails[index] = { ...updatedDetails[index], amountApplied: validAmount };

        if (!skipValidation) {
            const totalApplied = updatedDetails.reduce((sum, d) => sum + (d.amountApplied || 0), 0);
            const paymentAmount = formData.paymentAmount || 0;
            if (totalApplied > paymentAmount) {
                setFlashNotification({
                    title: 'Warning',
                    message: `Total applied amount (₱${totalApplied.toFixed(
                        2
                    )}) exceeds payment amount (₱${paymentAmount.toFixed(2)}).`,
                    alertType: 'error',
                });
            }
        }

        onFormDataChange({ paymentContractDetails: updatedDetails });
    };

    // Validation helpers
    const getTotalAppliedAmount = () => {
        return (formData.paymentContractDetails || []).reduce((sum, d) => sum + (d.amountApplied || 0), 0);
    };

    const getRemainingAmount = () => {
        return (formData.paymentAmount || 0) - getTotalAppliedAmount();
    };

    const getTotalMismatchError = () => {
        const paymentAmount = formData.paymentAmount || 0;
        const totalApplied = getTotalAppliedAmount();
        if (paymentAmount > 0 && totalApplied > 0 && totalApplied > paymentAmount) {
            return `Total applied amount (₱${totalApplied.toFixed(2)}) exceeds payment amount (₱${paymentAmount.toFixed(
                2
            )}).`;
        }
        return null;
    };

    return (
        <div className="space-y-4 mt-6">
            {/* Header Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-purple-600">Contract Payment Details</h3>
                    </div>
                    {!isReadOnly && (
                        <button
                            type="button"
                            onClick={loadPendingContracts}
                            disabled={!formData.customerId}
                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                formData.customerId
                                    ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            Search Contracts
                        </button>
                    )}
                </div>

                {/* Approval Legend */}
                {showLegend && (
                    <div className="flex flex-wrap gap-4 mb-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-green-200 border border-green-400"></span>
                            Added
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400"></span>
                            Modified
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-red-200 border border-red-400"></span>
                            Removed
                        </span>
                    </div>
                )}

                {/* Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider m-0 mb-1">
                            Total Payment Amount
                        </p>
                        <p className="text-lg font-bold text-gray-900 m-0">
                            ₱{(formData.paymentAmount || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider m-0 mb-1">
                            Applied Amount
                        </p>
                        <p className="text-lg font-bold text-purple-600 m-0">₱{getTotalAppliedAmount().toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider m-0 mb-1">
                            Remaining Amount
                        </p>
                        <p
                            className={`text-lg font-bold m-0 ${
                                getRemainingAmount() < 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                        >
                            ₱{getRemainingAmount().toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Mismatch Error */}
                {getTotalMismatchError() && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 flex items-center gap-3">
                        <svg
                            className="h-5 w-5 text-red-600 flex-shrink-0"
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
                        <span className="text-sm font-semibold text-red-700">{getTotalMismatchError()}</span>
                    </div>
                )}

                {/* Contract Details Table */}
                {rowsToRender.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Contract No
                                        </th>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Contract Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Applied Amount
                                        </th>
                                        {!isReadOnly && (
                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                Actions
                                            </th>
                                        )}
                                        {isReadOnly && isApprovalView && (
                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                Status
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rowsToRender.map(({ detail, status }, index) => {
                                        const contract = contractDetailsMap.get(detail.contractId);
                                        const contractAmount = contract ? contract.contractAmount || 0 : 0;
                                        const contractNo =
                                            detail.contractNo || contract?.contractNo || detail.contractId;

                                        return (
                                            <tr
                                                key={index}
                                                className={`transition-all duration-200 hover:bg-gray-50 ${getRowClasses(
                                                    status
                                                )}`}
                                            >
                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                    {contractNo}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    ₱{contractAmount.toFixed(2)}
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
                                                                    setEditingAmounts((prev) => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.set(index, rawValue);
                                                                        return newMap;
                                                                    });

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
                                                                        );
                                                                    } else if (rawValue === '' || rawValue === '.') {
                                                                        handleUpdateAppliedAmount(index, 0, true);
                                                                    }
                                                                }}
                                                                onFocus={() => {
                                                                    const rawValue = detail.amountApplied.toString();
                                                                    setEditingAmounts((prev) => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.set(index, rawValue);
                                                                        return newMap;
                                                                    });
                                                                }}
                                                                onBlur={(e) => {
                                                                    const rawValue = e.target.value.replace(/,/g, '');
                                                                    const numValue = parseFloat(rawValue) || 0;
                                                                    handleUpdateAppliedAmount(index, numValue);

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
                                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500'
                                                                }`}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className="px-6 py-5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteContractDetail(index)}
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
                                                {isReadOnly && isApprovalView && (
                                                    <td className="px-6 py-5 text-xs font-semibold text-gray-500">
                                                        {getStatusLabel(status)}
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
                            No contracts applied yet. Click &quot;Search Contracts&quot; to get started.
                        </div>
                    </div>
                )}
            </div>

            {/* Contract Selection Modal */}
            {showContractModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-lg bg-purple-600 p-2 text-white shadow-sm">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-purple-600 m-0">Select Contracts to Apply</h3>
                        </div>

                        {isLoadingContracts ? (
                            <div className="text-center py-10">
                                <div className="text-gray-500">Loading contracts...</div>
                            </div>
                        ) : pendingContracts.length > 0 ? (
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
                                                        Contract No
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Contract Name
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Contract Amount
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Total Paid
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                        Remaining Balance
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {pendingContracts.map((contract, index) => {
                                                    const isSelected = selectedContracts.some(
                                                        (selected) => selected.contractId === contract.contractId
                                                    );
                                                    const isAlreadyApplied = formData.paymentContractDetails?.some(
                                                        (detail) => detail.contractId === contract.contractId
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
                                                                            setSelectedContracts((prev) =>
                                                                                prev.filter(
                                                                                    (selected) =>
                                                                                        selected.contractId !==
                                                                                        contract.contractId
                                                                                )
                                                                            );
                                                                        } else {
                                                                            setSelectedContracts((prev) => [
                                                                                ...prev,
                                                                                contract,
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
                                                                {contract.contractNo}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                {contract.contractName}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱{(contract.contractAmount || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱{(contract.totalAmountPaid || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                ₱
                                                                {(
                                                                    (contract.contractAmount || 0) -
                                                                    (contract.totalAmountPaid || 0)
                                                                ).toFixed(2)}
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
                                    No pending payment contracts found for this customer
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowContractModal(false);
                                    setSelectedContracts([]);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplySelectedContracts}
                                disabled={selectedContracts.length === 0}
                                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    selectedContracts.length > 0
                                        ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                        : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Apply Selected ({selectedContracts.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
