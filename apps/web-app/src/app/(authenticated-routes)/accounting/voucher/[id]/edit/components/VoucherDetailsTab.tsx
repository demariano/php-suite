'use client';

import { AccountApi, AccountsDto, VoucherDetailDto, VoucherDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';

interface VoucherDetailsTabProps {
    formData: VoucherDto;
    onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
    isCreateMode: boolean;
    isReadOnly?: boolean;
    selectedVoucher?: VoucherDto | null;
    hasArrayChanges?: (fieldName: string) => boolean;
}

export default function VoucherDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isReadOnly = false,
    selectedVoucher,
    hasArrayChanges,
}: VoucherDetailsTabProps) {
    const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
    const [selectedSubAccount, setSelectedSubAccount] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [isTypingAmount, setIsTypingAmount] = useState(false);
    const [editingAmounts, setEditingAmounts] = useState<{ [index: number]: string }>({});
    const [isTypingTableAmounts, setIsTypingTableAmounts] = useState<{ [index: number]: boolean }>({});

    const { setFlashNotification } = useSessionStore();

    // Number formatting utilities
    const formatNumberWithCommas = (value: string | number): string => {
        if (!value && value !== 0) return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const removeCommas = (value: string): string => {
        return value.replace(/,/g, '');
    };

    // Load account data when accountId changes
    useEffect(() => {
        const loadAccountData = async () => {
            if (formData.accountId) {
                try {
                    const account = await AccountApi.getAccountById(formData.accountId);
                    setSelectedAccount(account);
                } catch (error) {
                    console.error('Error loading account data:', error);
                }
            } else {
                setSelectedAccount(null);
            }
        };

        loadAccountData();
    }, [formData.accountId]);

    // Compute totalAmount whenever voucherDetails change
    useEffect(() => {
        if (formData.voucherDetails && formData.voucherDetails.length > 0) {
            const total = formData.voucherDetails.reduce((sum, detail) => sum + (detail.amount || 0), 0);
            onFormDataChange({ totalAmount: Math.round(total * 100) / 100 });
        } else {
            onFormDataChange({ totalAmount: 0 });
        }
    }, [formData.voucherDetails]);

    // Auto-format when user stops typing (using timeout) for add detail amount
    useEffect(() => {
        if (amount && isTypingAmount) {
            const timer = setTimeout(() => {
                const rawValue = removeCommas(amount);
                const numericValue = parseFloat(rawValue);
                if (!isNaN(numericValue)) {
                    const formatted = formatNumberWithCommas(numericValue);
                    setAmount(formatted);
                    setIsTypingAmount(false);
                }
            }, 500); // Format after 0.5 seconds of no typing

            return () => clearTimeout(timer);
        }
    }, [amount, isTypingAmount]);

    // Auto-format when user stops typing (using timeout) for table amount fields
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        Object.keys(isTypingTableAmounts).forEach((indexStr) => {
            const index = parseInt(indexStr);
            if (isTypingTableAmounts[index] && editingAmounts[index]) {
                const timer = setTimeout(() => {
                    const rawValue = removeCommas(editingAmounts[index]);
                    const numericValue = parseFloat(rawValue);
                    if (!isNaN(numericValue)) {
                        const formatted = formatNumberWithCommas(numericValue);
                        setEditingAmounts((prev) => ({ ...prev, [index]: formatted }));
                        setIsTypingTableAmounts((prev) => ({ ...prev, [index]: false }));

                        // Update the actual voucher detail
                        const updatedDetails = [...(formData.voucherDetails || [])];
                        updatedDetails[index] = {
                            ...updatedDetails[index],
                            amount: Math.round(numericValue * 100) / 100,
                        };
                        onFormDataChange({ voucherDetails: updatedDetails });
                    }
                }, 500);

                timers.push(timer);
            }
        });

        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, [editingAmounts, isTypingTableAmounts, formData.voucherDetails, onFormDataChange]);

    const handleAddDetailAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = removeCommas(e.target.value);
        // Only allow numbers and decimal point
        const numericValue = rawValue.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = numericValue.split('.');
        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

        setIsTypingAmount(true);
        setAmount(cleanValue);
    };

    const handleAddDetailAmountBlur = () => {
        const rawValue = removeCommas(amount);
        if (rawValue) {
            const numericValue = parseFloat(rawValue);
            if (!isNaN(numericValue)) {
                const formatted = formatNumberWithCommas(numericValue);
                setAmount(formatted);
            }
        }
        setIsTypingAmount(false);
    };

    const handleAddDetailAmountFocus = () => {
        if (amount) {
            const raw = removeCommas(amount);
            setAmount(raw);
        }
        setIsTypingAmount(true);
    };

    const getAddDetailAmountDisplayValue = () => {
        return amount;
    };

    const handleAddDetail = () => {
        if (!selectedSubAccount || selectedSubAccount.trim() === '') {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Please select a sub account before adding.',
                alertType: 'error',
            });
            return;
        }

        const rawValue = removeCommas(amount);
        const numericValue = parseFloat(rawValue);

        if (!numericValue || numericValue <= 0 || isNaN(numericValue)) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Please enter a valid amount greater than zero.',
                alertType: 'error',
            });
            return;
        }

        // Check for duplicate subAccount
        const hasDuplicate = (formData.voucherDetails || []).some((detail) => detail.subAccount === selectedSubAccount);

        if (hasDuplicate) {
            setFlashNotification({
                title: 'Duplicate Item',
                message: 'This sub account is already added. No duplication allowed.',
                alertType: 'warning',
            });
            return;
        }

        const newDetail: VoucherDetailDto = {
            subAccount: selectedSubAccount,
            amount: Math.round(numericValue * 100) / 100,
        };

        const updatedDetails = [...(formData.voucherDetails || []), newDetail];
        onFormDataChange({ voucherDetails: updatedDetails });

        // Reset form
        setSelectedSubAccount('');
        setAmount('');
        setIsTypingAmount(false);
    };

    const handleDeleteDetail = (index: number) => {
        const updatedDetails = [...(formData.voucherDetails || [])];
        updatedDetails.splice(index, 1);
        onFormDataChange({ voucherDetails: updatedDetails });

        // Clean up editing state for deleted item and adjust indices
        setEditingAmounts((prev) => {
            const newState: { [index: number]: string } = {};
            Object.keys(prev).forEach((key) => {
                const prevIndex = parseInt(key);
                if (prevIndex < index) {
                    newState[prevIndex] = prev[prevIndex];
                } else if (prevIndex > index) {
                    newState[prevIndex - 1] = prev[prevIndex];
                }
            });
            return newState;
        });

        setIsTypingTableAmounts((prev) => {
            const newState: { [index: number]: boolean } = {};
            Object.keys(prev).forEach((key) => {
                const prevIndex = parseInt(key);
                if (prevIndex < index) {
                    newState[prevIndex] = prev[prevIndex];
                } else if (prevIndex > index) {
                    newState[prevIndex - 1] = prev[prevIndex];
                }
            });
            return newState;
        });
    };

    const handleAmountChange = (index: number, newAmount: number) => {
        const updatedDetails = [...(formData.voucherDetails || [])];
        updatedDetails[index] = {
            ...updatedDetails[index],
            amount: Math.round(newAmount * 100) / 100,
        };
        onFormDataChange({ voucherDetails: updatedDetails });
    };

    const handleTableAmountChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = removeCommas(e.target.value);
        // Only allow numbers and decimal point
        const numericValue = rawValue.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = numericValue.split('.');
        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

        setEditingAmounts((prev) => ({ ...prev, [index]: cleanValue }));
        setIsTypingTableAmounts((prev) => ({ ...prev, [index]: true }));
    };

    const handleTableAmountBlur = (index: number) => {
        const rawValue = removeCommas(editingAmounts[index] || '');
        if (rawValue) {
            const numericValue = parseFloat(rawValue);
            if (!isNaN(numericValue)) {
                const formatted = formatNumberWithCommas(numericValue);
                setEditingAmounts((prev) => ({ ...prev, [index]: formatted }));

                // Update the actual voucher detail
                const updatedDetails = [...(formData.voucherDetails || [])];
                updatedDetails[index] = {
                    ...updatedDetails[index],
                    amount: Math.round(numericValue * 100) / 100,
                };
                onFormDataChange({ voucherDetails: updatedDetails });
            }
        }
        setIsTypingTableAmounts((prev) => ({ ...prev, [index]: false }));
    };

    const handleTableAmountFocus = (index: number) => {
        const detail = formData.voucherDetails?.[index];
        if (detail?.amount !== undefined) {
            const raw = detail.amount.toString();
            setEditingAmounts((prev) => ({ ...prev, [index]: raw }));
        }
        setIsTypingTableAmounts((prev) => ({ ...prev, [index]: true }));
    };

    const getTableAmountDisplayValue = (index: number) => {
        if (editingAmounts[index] !== undefined) {
            return editingAmounts[index];
        }
        const detail = formData.voucherDetails?.[index];
        if (detail?.amount !== undefined) {
            return formatNumberWithCommas(detail.amount);
        }
        return '';
    };

    const subAccounts = selectedAccount?.subAccounts || [];
    const availableSubAccounts = subAccounts.filter(
        (subAccount) => !(formData.voucherDetails || []).some((detail) => detail.subAccount === subAccount)
    );

    return (
        <div className="space-y-6">
            {/* Add Detail Section - Hidden when read-only */}
            {!isReadOnly && (
                <div className="mt-6 border-2 border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </div>
                        <h4 className="text-base font-bold text-blue-600">Add Voucher Detail</h4>
                    </div>

                    {!formData.accountId ? (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-yellow-900">
                            Please select an account first before adding voucher details.
                        </div>
                    ) : subAccounts.length === 0 ? (
                        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-xl text-red-900">
                            The selected account has no sub accounts available.
                        </div>
                    ) : availableSubAccounts.length === 0 ? (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-yellow-900">
                            All sub accounts have been added. No more items can be added.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Sub Account
                                </label>
                                <select
                                    value={selectedSubAccount}
                                    onChange={(e) => setSelectedSubAccount(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm bg-white text-gray-700 cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Select sub account</option>
                                    {availableSubAccounts.map((subAccount) => (
                                        <option key={subAccount} value={subAccount}>
                                            {subAccount}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Amount
                                </label>
                                <input
                                    type="text"
                                    value={getAddDetailAmountDisplayValue()}
                                    onChange={handleAddDetailAmountChange}
                                    onFocus={handleAddDetailAmountFocus}
                                    onBlur={handleAddDetailAmountBlur}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm text-gray-700 transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Enter amount"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddDetail}
                                disabled={!selectedSubAccount || !amount || parseFloat(removeCommas(amount)) <= 0}
                                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm transition-all duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                                Add Detail
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Voucher Details Table */}
            <div className="mt-6">
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </div>
                        <h4
                            className={`text-base font-bold ${
                                hasArrayChanges && hasArrayChanges('voucherDetails')
                                    ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                    : 'text-gray-700'
                            }`}
                        >
                            Voucher Details
                        </h4>
                    </div>

                    {formData.voucherDetails && formData.voucherDetails.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-white border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                Sub Account
                                            </th>
                                            <th className="px-6 py-4 text-right text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                Amount
                                            </th>
                                            {!isReadOnly && (
                                                <th className="px-6 py-4 text-center text-gray-700 font-semibold text-xs uppercase tracking-wider w-24">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {formData.voucherDetails.map((detail, index) => (
                                            <tr
                                                key={index}
                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                    {detail.subAccount}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600 text-right">
                                                    {isReadOnly ? (
                                                        <span>{formatNumberWithCommas(detail.amount || 0)}</span>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={getTableAmountDisplayValue(index)}
                                                            onChange={(e) => handleTableAmountChange(index, e)}
                                                            onFocus={() => handleTableAmountFocus(index)}
                                                            onBlur={() => handleTableAmountBlur(index)}
                                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-right font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                        />
                                                    )}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className="px-6 py-5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDetail(index)}
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
                                        ))}
                                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                {formatNumberWithCommas(formData.totalAmount || 0)}
                                            </td>
                                            {!isReadOnly && <td className="px-6 py-4"></td>}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-gray-500 text-base">No voucher details added yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
