'use client';

import { ConfirmationModal, DeleteConfirmationModal } from '@components-web';
import { AccountsDto, StatusEnum } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useState } from 'react';
import { ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import { AccountForm } from '../../../components';

interface AccountFormWrapperProps {
    isCreateMode: boolean;
    selectedAccount: AccountsDto | null;
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'logs';
    onTabChange: (tab: 'details' | 'logs') => void;
    onSave: (account: AccountsDto) => void;
    onDelete: () => void;
    onReactivate: () => void;
    onApprove: () => void;
    onDeny: () => void;
    onCancel: () => void;
}

const getStatusText = (status?: StatusEnum) => {
    switch (status) {
        case StatusEnum.ACTIVE:
            return 'Active';
        case StatusEnum.FOR_APPROVAL:
            return 'For Approval';
        case StatusEnum.FOR_DELETION:
            return 'For Deletion';
        case StatusEnum.FOR_DEACTIVATION:
            return 'For Deactivation';
        case StatusEnum.INACTIVE:
            return 'Inactive';
        case StatusEnum.NEW_RECORD:
            return 'New Record';
        default:
            return 'Inactive';
    }
};

const getTabColorClasses = (status: StatusEnum, isActive: boolean) => {
    if (!isActive) {
        return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }
    const base = 'text-white shadow-sm';
    switch (status) {
        case StatusEnum.ACTIVE:
            return `bg-green-600 ${base}`;
        case StatusEnum.FOR_APPROVAL:
            return `bg-yellow-500 ${base}`;
        case StatusEnum.FOR_DELETION:
            return `bg-red-600 ${base}`;
        case StatusEnum.FOR_DEACTIVATION:
            return `bg-orange-500 ${base}`;
        case StatusEnum.INACTIVE:
            return `bg-gray-500 ${base}`;
        case StatusEnum.NEW_RECORD:
            return `bg-blue-600 ${base}`;
        default:
            return `bg-gray-500 ${base}`;
    }
};

const secondaryTabClasses = (isActive: boolean) =>
    isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600';

const DetailsIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

const LogsIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        return value.join(', ');
    }
    return String(value);
};

export default function AccountFormWrapper({
    isCreateMode,
    selectedAccount,
    successMessage,
    isAdminUser,
    isLoading,
    activeTab,
    onTabChange,
    onSave,
    onDelete,
    onReactivate,
    onApprove,
    onDeny,
    onCancel,
}: AccountFormWrapperProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const status = selectedAccount?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = (selectedAccount?.forApprovalVersion as Partial<AccountsDto>) || {};

    // Approval state detection (same pattern as Products)
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(status);
    const showApprovalUI = isApprovalState && !isCreateMode;
    const showDeletionCard = status === StatusEnum.FOR_DELETION || status === StatusEnum.FOR_DEACTIVATION;

    // Field change detection
    const isFieldChanged = createFieldChangeDetector(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        selectedAccount as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selectedAccount?.forApprovalVersion as any) ?? undefined
    );

    // Before → After inline diff rendering (matches Products pattern)
    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentValue: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingValue: any
    ) => {
        const hasChange = isFieldChanged(fieldName);

        if (showApprovalUI && hasChange) {
            return (
                <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {label}
                    </label>
                    <div className="w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium">
                        <span className="line-through text-gray-500">{formatValue(currentValue)}</span>
                        <span className="mx-2 text-blue-600">&rarr;</span>
                        <span className="font-semibold text-blue-700">{formatValue(pendingValue)}</span>
                    </div>
                </div>
            );
        }

        // Normal read-only display
        const isNewRecord = status === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return (
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {label}
                </label>
                <div
                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm ${
                        isFieldChanged(fieldName)
                            ? 'border-blue-500 bg-blue-50 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                    {formatValue(displayValue)}
                </div>
            </div>
        );
    };

    // Sub-account change detection with per-row status
    const hasSubAccountChanges = () => {
        if (pendingVersion.subAccounts === undefined) return false;
        const current = selectedAccount?.subAccounts || [];
        const pending = Array.isArray(pendingVersion.subAccounts) ? pendingVersion.subAccounts : [];
        if (!current.length && !pending.length) return false;
        const normalizeList = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));
        return JSON.stringify(normalizeList(current)) !== JSON.stringify(normalizeList(pending));
    };

    const renderSubAccountChanges = () => {
        if (!showApprovalUI || pendingVersion.subAccounts === undefined) return null;
        const changed = hasSubAccountChanges();
        const original = selectedAccount?.subAccounts || [];
        const pending = Array.isArray(pendingVersion.subAccounts) ? pendingVersion.subAccounts : [];

        // Calculate per-row status
        const originalLower = new Set(original.map((n) => n.toLowerCase()));
        const pendingLower = new Set(pending.map((n) => n.toLowerCase()));

        const rows: Array<{
            name: string;
            status: 'added' | 'removed' | 'unchanged';
        }> = [];

        pending.forEach((name) => {
            rows.push({
                name,
                status: originalLower.has(name.toLowerCase()) ? 'unchanged' : 'added',
            });
        });

        original.forEach((name) => {
            if (!pendingLower.has(name.toLowerCase())) {
                rows.push({ name, status: 'removed' });
            }
        });

        return (
            <div className="space-y-4">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
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
                        <h3
                            className={`text-base font-bold ${
                                changed
                                    ? 'rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-1 text-blue-700'
                                    : 'text-blue-600'
                            }`}
                        >
                            Sub Accounts
                        </h3>
                    </div>

                    {/* Legend for sub-account changes */}
                    {changed && (
                        <div className="mb-3 flex flex-wrap gap-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded border border-green-300 bg-green-100" />
                                <span>Added</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
                                <span>Removed</span>
                            </span>
                        </div>
                    )}

                    {rows.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                            No sub account changes.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Name</th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((row, index) => (
                                        <tr
                                            key={`${row.name}-${index}`}
                                            className={
                                                row.status === 'added'
                                                    ? 'bg-green-50'
                                                    : row.status === 'removed'
                                                    ? 'bg-red-50'
                                                    : ''
                                            }
                                        >
                                            <td
                                                className={`px-4 py-3 font-medium ${
                                                    row.status === 'removed'
                                                        ? 'line-through text-gray-500'
                                                        : 'text-gray-900'
                                                }`}
                                            >
                                                {row.name}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {row.status === 'added' && (
                                                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                                                        ➕ ADDED
                                                    </span>
                                                )}
                                                {row.status === 'removed' && (
                                                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                                                        ➖ REMOVED
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDetailsTab = () => (
        <div className="space-y-6">
            {/* Change Reason Read-Only for approval states */}
            {showApprovalUI && selectedAccount?.changeReason && (
                <ChangeReasonReadOnly value={selectedAccount.changeReason} />
            )}

            {/* Deletion/Deactivation Card */}
            {showDeletionCard && (
                <div
                    className={`rounded-xl border-2 p-4 shadow-sm sm:p-8 space-y-4 ${
                        status === StatusEnum.FOR_DELETION
                            ? 'border-red-300 bg-red-50'
                            : 'border-orange-300 bg-orange-50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-white text-lg ${
                                status === StatusEnum.FOR_DELETION ? 'bg-red-600' : 'bg-orange-600'
                            }`}
                        >
                            🗑️
                        </div>
                        <div>
                            <h3
                                className={`text-lg font-bold m-0 ${
                                    status === StatusEnum.FOR_DELETION ? 'text-red-800' : 'text-orange-800'
                                }`}
                            >
                                {status === StatusEnum.FOR_DELETION
                                    ? 'Record Marked for Deletion'
                                    : 'Record Marked for Deactivation'}
                            </h3>
                            <p
                                className={`text-sm ${
                                    status === StatusEnum.FOR_DELETION ? 'text-red-700' : 'text-orange-700'
                                }`}
                            >
                                This record has been marked for{' '}
                                {status === StatusEnum.FOR_DELETION ? 'deletion' : 'deactivation'} and is awaiting
                                approval.
                            </p>
                        </div>
                    </div>
                    {selectedAccount?.changeReason && (
                        <div className="space-y-2">
                            <p
                                className={`text-sm font-semibold ${
                                    status === StatusEnum.FOR_DELETION ? 'text-red-700' : 'text-orange-700'
                                }`}
                            >
                                {status === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                            </p>
                            <div
                                className={`rounded-lg border-2 bg-white p-4 text-sm text-gray-700 whitespace-pre-wrap ${
                                    status === StatusEnum.FOR_DELETION ? 'border-red-200' : 'border-orange-200'
                                }`}
                            >
                                {selectedAccount.changeReason}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Account Information Section — inline diff when showApprovalUI */}
            <div
                className={`rounded-xl border-2 p-4 shadow-sm sm:p-6 ${
                    showApprovalUI ? 'border-green-400 bg-white' : 'border-gray-200'
                }`}
            >
                <div className="mb-4 flex items-center gap-3">
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
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {renderFieldWithInlineDiff(
                        'Account Name',
                        'accountName',
                        selectedAccount?.accountName,
                        pendingVersion.accountName
                    )}
                    {renderFieldWithInlineDiff(
                        'Account Type',
                        'accountType',
                        selectedAccount?.accountType,
                        pendingVersion.accountType
                    )}
                </div>
            </div>

            {/* Sub Account Changes (with legends + per-row status) */}
            {renderSubAccountChanges()}
        </div>
    );

    const renderLogsTab = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                        <LogsIcon />
                    </div>
                    <h3 className="m-0 text-base font-bold text-gray-700">Activity Logs</h3>
                </div>
                {renderActivityLogsTable(selectedAccount?.activityLogs, 'No activity logs available.')}
            </div>
        </div>
    );

    // Only 2 tabs: Details + Activity Logs (no separate approval tab — matches Products)
    const tabs = [
        {
            key: 'details' as const,
            label: `Account Information - ${getStatusText(status)}`,
            show: true,
            className: getTabColorClasses(status, activeTab === 'details'),
            icon: <DetailsIcon />,
        },
        {
            key: 'logs' as const,
            label: 'Activity Logs',
            show: !isCreateMode && !!selectedAccount,
            className: secondaryTabClasses(activeTab === 'logs'),
            icon: <LogsIcon />,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="mx-auto w-full sm:max-w-4xl">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="overflow-x-auto border-b-2 border-blue-200 bg-gray-50 p-2">
                        <div className="flex gap-2 flex-nowrap">
                            {tabs
                                .filter((tab) => tab.show)
                                .map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors duration-200 ${tab.className}`}
                                        onClick={() => onTabChange(tab.key)}
                                    >
                                        <span className="flex items-center gap-2">
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                        </span>
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-6">
                        {activeTab === 'details' && (
                            <>
                                {showApprovalUI || showDeletionCard ? (
                                    renderDetailsTab()
                                ) : (
                                    <AccountForm
                                        isCreateMode={isCreateMode}
                                        selectedAccount={selectedAccount}
                                        successMessage={successMessage}
                                        onSave={onSave}
                                        onDelete={() => setShowDeleteModal(true)}
                                        onReactivate={() => setShowReactivateModal(true)}
                                        onCancel={onCancel}
                                        isAdminUser={isAdminUser}
                                    />
                                )}
                            </>
                        )}

                        {activeTab === 'logs' && renderLogsTab()}
                    </div>

                    {/* Footer Action Buttons — Approve/Deny shown on all tabs (matches Products) */}
                    {(showApprovalUI || showDeletionCard) && (
                        <div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="hidden sm:block" />
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onDeny}
                                            disabled={isLoading}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
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
                                            Deny
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onApprove}
                                            disabled={isLoading}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
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
                                            Approve
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedAccount}
                recordDisplayName={selectedAccount?.accountName || 'Account'}
                onConfirm={() => {
                    setShowDeleteModal(false);
                    onDelete();
                }}
                onCancel={() => setShowDeleteModal(false)}
            />

            <ConfirmationModal
                show={showReactivateModal}
                record={selectedAccount}
                variant="reactivate"
                recordDisplayName={selectedAccount?.accountName || 'Account'}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={() => {
                    setShowReactivateModal(false);
                    onReactivate();
                }}
                onCancel={() => setShowReactivateModal(false)}
            />
        </div>
    );
}
