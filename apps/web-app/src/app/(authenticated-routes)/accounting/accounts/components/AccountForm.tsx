'use client';

import { AccountTypeEnum, AccountsDto, StatusEnum } from '@data-access/index';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField } from '../../../components';

interface AccountFormProps {
    isCreateMode: boolean;
    selectedAccount: AccountsDto | null;
    successMessage: string | null;
    onSave: (account: AccountsDto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser: boolean;
    isReadOnly?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
}

const initialFormState = {
    accountName: '',
    accountType: '' as AccountTypeEnum | '',
    changeReason: '',
    subAccounts: [] as string[],
    status: '' as StatusEnum | '',
};

export default function AccountForm({
    isCreateMode,
    selectedAccount,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    isAdminUser,
    isReadOnly = false,
}: AccountFormProps) {
    const [formData, setFormData] = useState(initialFormState);
    const [newSubAccount, setNewSubAccount] = useState('');
    const [subAccountError, setSubAccountError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [userHasInteracted, setUserHasInteracted] = useState(false);

    // CRITICAL: INACTIVE records cannot have fields edited (only reactivation allowed)
    // See ACCOUNTS_MODULE_REFERENCE.md - Form Field State for INACTIVE Records
    const canEditFields = !isReadOnly && (isCreateMode || selectedAccount?.status === StatusEnum.ACTIVE);
    const requiresChangeReason = !isCreateMode && !isAdminUser && selectedAccount?.status === StatusEnum.ACTIVE;

    useEffect(() => {
        if (isCreateMode) {
            setFormData(initialFormState);
            setUserHasInteracted(false);
            return;
        }

        if (selectedAccount && !userHasInteracted) {
            setFormData({
                accountName: selectedAccount.accountName || '',
                accountType: (selectedAccount.accountType as AccountTypeEnum) || '',
                changeReason: selectedAccount.changeReason || '',
                subAccounts: selectedAccount.subAccounts || [],
                status: selectedAccount.status || '',
            });
        }
    }, [isCreateMode, selectedAccount]);

    const updateField = (key: keyof typeof formData, value: string | string[]) => {
        setUserHasInteracted(true);
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleAddSubAccount = () => {
        const value = newSubAccount.trim();
        if (!value) {
            setSubAccountError('Sub-account name cannot be empty.');
            return;
        }

        const exists = formData.subAccounts.some((name) => name.toLowerCase() === value.toLowerCase());
        if (exists) {
            setSubAccountError(`Sub-account "${value}" already exists.`);
            return;
        }

        setSubAccountError(null);
        updateField('subAccounts', [...formData.subAccounts, value]);
        setNewSubAccount('');
    };

    const handleRemoveSubAccount = (index: number) => {
        const updated = formData.subAccounts.filter((_, idx) => idx !== index);
        updateField('subAccounts', updated);
    };

    const validateForm = () => {
        const errors: string[] = [];

        if (!formData.accountName?.trim()) {
            errors.push('Account name is required.');
        }

        if (!formData.accountType) {
            errors.push('Account type is required.');
        }

        if (requiresChangeReason && !formData.changeReason?.trim()) {
            errors.push('Change reason is required when updating this account.');
        }

        if (subAccountError) {
            errors.push(subAccountError);
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm()) return;

        const changeReasonValue = formData.changeReason?.trim();
        const payload: AccountsDto = {
            accountingId: selectedAccount?.accountingId || '',
            accountName: formData.accountName?.trim(),
            accountType: formData.accountType as AccountTypeEnum,
            subAccounts: formData.subAccounts,
            status: isCreateMode
                ? isAdminUser
                    ? StatusEnum.ACTIVE
                    : StatusEnum.NEW_RECORD
                : formData.status || selectedAccount?.status,
            changeReason: changeReasonValue ? changeReasonValue : undefined,
            activityLogs: selectedAccount?.activityLogs,
            forApprovalVersion: selectedAccount?.forApprovalVersion,
        };

        onSave(payload);
    };

    // Save button disabled for INACTIVE records (only reactivation allowed)
    const saveDisabled = !isCreateMode && (!canEditFields || selectedAccount?.status === StatusEnum.INACTIVE);
    const subAccountList = useMemo(() => formData.subAccounts, [formData.subAccounts]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 shadow-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white"></span>
                    <span>{successMessage}</span>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-red-700">
                        <span className="text-lg"></span>
                        <p className="m-0 font-semibold">Please fix the following issues</p>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                        {validationErrors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Warning banner for pending records */}
            {!isCreateMode &&
                selectedAccount &&
                [StatusEnum.FOR_APPROVAL, StatusEnum.FOR_DEACTIVATION, StatusEnum.NEW_RECORD].includes(
                    selectedAccount.status as StatusEnum
                ) && (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <span className="text-lg">⚠️</span>
                            <p className="m-0 font-semibold">This record has pending changes that require approval.</p>
                        </div>
                    </div>
                )}

            {/* Change Reason Field - First component when displayed */}
            {!isCreateMode && !isAdminUser && !isReadOnly && (
                <ChangeReasonField
                    value={formData.changeReason}
                    onChange={(e) => updateField('changeReason', e.target.value)}
                    disabled={!canEditFields}
                />
            )}

            <section className="space-y-4">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <header className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-blue-600">Account Information</h3>
                    </header>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Account Name
                            </label>
                            <input
                                value={formData.accountName}
                                onChange={(event) => updateField('accountName', event.target.value)}
                                disabled={!canEditFields}
                                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="Enter account name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Account Type
                            </label>
                            <select
                                value={formData.accountType}
                                onChange={(event) => updateField('accountType', event.target.value as AccountTypeEnum)}
                                disabled={!canEditFields}
                                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="">Select account type</option>
                                <option value={AccountTypeEnum.AREA}>Area</option>
                                <option value={AccountTypeEnum.CUSTOMER}>Customer</option>
                                <option value={AccountTypeEnum.OTHERS}>Others</option>
                            </select>
                        </div>
                        {/* Status Selector for Admin Reactivation */}
                        {isAdminUser && !isCreateMode && selectedAccount?.status === StatusEnum.INACTIVE && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Reactivate Account
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(event) => updateField('status', event.target.value as StatusEnum)}
                                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={StatusEnum.INACTIVE}>Inactive (Current)</option>
                                    <option value={StatusEnum.ACTIVE}>Active (Reactivate)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Change status to Active to reactivate this account
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <header className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 13h6m-3-3v6m8 4H5a2 2 0 01-2-2V7a2 2 0 012-2h6l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-blue-600">Sub Accounts</h3>
                    </header>

                    <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                value={newSubAccount}
                                onChange={(event) => {
                                    setSubAccountError(null);
                                    setNewSubAccount(event.target.value);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleAddSubAccount();
                                    }
                                }}
                                disabled={!canEditFields}
                                placeholder="Enter sub-account name"
                                className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddSubAccount}
                                disabled={!canEditFields || !newSubAccount.trim()}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Add
                            </button>
                        </div>
                        {subAccountError && <p className="m-0 text-sm font-medium text-red-600">{subAccountError}</p>}
                    </div>

                    {subAccountList.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                            No sub-accounts added yet.
                        </div>
                    ) : (
                        <>
                            <div className="mt-6 hidden overflow-x-auto sm:block">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {subAccountList.map((name, index) => (
                                            <tr key={`${name}-${index}`} className="bg-white">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSubAccount(index)}
                                                        disabled={!canEditFields}
                                                        className="inline-flex items-center justify-center rounded-lg bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
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
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 space-y-3 sm:hidden">
                                {subAccountList.map((name, index) => (
                                    <div
                                        key={`${name}-${index}`}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSubAccount(index)}
                                            disabled={!canEditFields}
                                            className="mt-3 flex w-full items-center justify-center rounded-lg bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
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
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {isCreateMode ? (
                    <div className="hidden sm:block" />
                ) : selectedAccount?.status === StatusEnum.INACTIVE && isAdminUser ? (
                    <button
                        type="button"
                        onClick={onReactivate}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Reactivate Account
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={!canEditFields}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Delete
                    </button>
                )}

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <button
                        type="submit"
                        disabled={saveDisabled}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isCreateMode ? 'Create Account' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </form>
    );
}
