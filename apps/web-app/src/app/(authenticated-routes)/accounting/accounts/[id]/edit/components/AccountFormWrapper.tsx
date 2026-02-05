'use client';

import { ConfirmationModal, DeleteConfirmationModal } from '@components-web';
import { AccountsDto, StatusEnum } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useState } from 'react';
import { ChangeReasonReadOnly } from '../../../../../components';
import { isFieldChanged as checkFieldChanged } from '../../../../../utils/fieldChangeDetection';
import { AccountForm } from '../../../components';

interface AccountFormWrapperProps {
    isCreateMode: boolean;
    selectedAccount: AccountsDto | null;
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'approval' | 'logs';
    onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
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

const ApprovalIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

const normalizeValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join('|');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value).trim();
};

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

    const isFieldChanged = (field: keyof AccountsDto) => {
        if (!pendingVersion || pendingVersion[field] === undefined) return false;
        return checkFieldChanged(
            String(field),
            selectedAccount?.[field],
            pendingVersion[field],
            pendingVersion as Record<string, unknown>
        );
    };

    const renderReadOnlyField = (label: string, field: keyof AccountsDto) => {
        if (pendingVersion[field] === undefined) return null;
        const changed = isFieldChanged(field);
        return (
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {label}
                </label>
                <div
                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm ${
                        changed
                            ? 'border-blue-500 bg-blue-50 text-gray-800'
                            : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                >
                    {formatValue(pendingVersion[field])}
                </div>
            </div>
        );
    };

    const hasSubAccountChanges = () => {
        if (pendingVersion.subAccounts === undefined) return false;
        const current = selectedAccount?.subAccounts || [];
        const pending = Array.isArray(pendingVersion.subAccounts) ? pendingVersion.subAccounts : [];
        if (!current.length && !pending.length) return false;
        const normalizeList = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));
        return JSON.stringify(normalizeList(current)) !== JSON.stringify(normalizeList(pending));
    };

    const renderSubAccountChanges = () => {
        if (pendingVersion.subAccounts === undefined) return null;
        const changed = hasSubAccountChanges();
        const original = selectedAccount?.subAccounts || [];
        const pending = Array.isArray(pendingVersion.subAccounts) ? pendingVersion.subAccounts : [];
        const hasNewItems = pending.length > 0;
        const allRemoved = original.length > 0 && pending.length === 0;

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

                    {allRemoved ? (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
                            <p className="text-sm font-semibold text-amber-800">
                                All sub accounts will be removed once approved.
                            </p>
                            <p className="text-xs text-amber-700">Existing records: {original.length}</p>
                        </div>
                    ) : hasNewItems ? (
                        <>
                            <div className="mt-6 hidden overflow-x-auto sm:block">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <th className="px-4 py-3">Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {pending.map((name, index) => (
                                            <tr key={`${name}-${index}`} className="bg-white">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 space-y-3 sm:hidden">
                                {pending.map((name, index) => (
                                    <div
                                        key={`${name}-${index}`}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                            No sub account changes.
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const renderApprovalActions = () => (
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                        type="button"
                        onClick={onDeny}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        {status === StatusEnum.FOR_DELETION
                            ? 'Deny Deletion'
                            : status === StatusEnum.FOR_DEACTIVATION
                            ? 'Deny Deactivation'
                            : 'Deny Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={onApprove}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {status === StatusEnum.FOR_DELETION
                            ? 'Approve Deletion'
                            : status === StatusEnum.FOR_DEACTIVATION
                            ? 'Approve Deactivation'
                            : 'Approve Changes'}
                    </button>
                </div>
            ) : (
                <div className="hidden sm:block" />
            )}
            <button
                type="button"
                onClick={onCancel}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
            </button>
        </div>
    );

    const renderApprovalContent = () => {
        if (!selectedAccount) {
            return <p className="text-sm text-gray-500">No account selected.</p>;
        }

        if (status === StatusEnum.FOR_DELETION) {
            return (
                <div className="space-y-6 animate-fadeIn">
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="m-0 text-lg font-bold text-red-800">Record Marked for Deletion</p>
                                <p className="m-0 text-sm text-red-700">
                                    This record has been flagged and is awaiting approval.
                                </p>
                            </div>
                        </div>
                        {selectedAccount.changeReason && (
                            <div className="rounded-xl border-2 border-red-200 bg-white p-4">
                                <p className="mb-2 text-sm font-semibold text-red-700">Deletion Reason</p>
                                <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                    {selectedAccount.changeReason}
                                </p>
                            </div>
                        )}
                    </div>
                    {renderApprovalActions()}
                </div>
            );
        }

        if (status === StatusEnum.FOR_DEACTIVATION) {
            return (
                <div className="space-y-6 animate-fadeIn">
                    <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-6 shadow-sm sm:p-8">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="m-0 text-lg font-bold text-orange-800">Record Marked for Deactivation</p>
                                <p className="m-0 text-sm text-orange-700">
                                    This record has been flagged for deactivation and is awaiting approval.
                                </p>
                            </div>
                        </div>
                        {selectedAccount.changeReason && (
                            <div className="rounded-xl border-2 border-orange-200 bg-white p-4">
                                <p className="mb-2 text-sm font-semibold text-orange-700">Deactivation Reason</p>
                                <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                    {selectedAccount.changeReason}
                                </p>
                            </div>
                        )}
                    </div>
                    {renderApprovalActions()}
                </div>
            );
        }

        const hasPendingChanges = Object.keys(pendingVersion).length > 0;

        if (!hasPendingChanges) {
            return (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No pending approval changes were found.
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
                    <ChangeReasonReadOnly value={selectedAccount.changeReason} />
                    <div className="space-y-6">
                        <section className="space-y-4">
                            <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
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
                                    <h3 className="text-base font-bold text-blue-600">Account Information</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {renderReadOnlyField('Account Name', 'accountName')}
                                    {renderReadOnlyField('Account Type', 'accountType')}
                                </div>
                            </div>
                        </section>
                        {renderSubAccountChanges()}
                    </div>
                </div>
                {renderApprovalActions()}
            </div>
        );
    };

    const renderActivityLogs = () => (
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
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                </button>
            </div>
        </div>
    );

    const tabs = [
        {
            key: 'details' as const,
            label: `Account Information - ${getStatusText(status)}`,
            show: true,
            className: getTabColorClasses(status, activeTab === 'details'),
            icon: <DetailsIcon />,
        },
        {
            key: 'approval' as const,
            label:
                status === StatusEnum.FOR_DELETION
                    ? 'Deletion Request'
                    : status === StatusEnum.FOR_DEACTIVATION
                    ? 'Deactivation Request'
                    : 'Pending Changes',
            show: !isCreateMode && !!selectedAccount && status !== StatusEnum.ACTIVE,
            className: secondaryTabClasses(activeTab === 'approval'),
            icon: <ApprovalIcon />,
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

                        {activeTab === 'approval' && renderApprovalContent()}

                        {activeTab === 'logs' && renderActivityLogs()}
                    </div>
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
