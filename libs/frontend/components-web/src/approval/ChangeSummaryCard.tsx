/**
 * ChangeSummaryCard Component
 *
 * Displays a summary banner at the top of the approval review showing:
 * - Record status (FOR_APPROVAL, FOR_DELETION, FOR_DEACTIVATION)
 * - Quick counts: X fields modified, Y items added, Z items removed
 * - Optional change reason
 *
 * @example
 * <ChangeSummaryCard
 *   status="FOR_APPROVAL"
 *   fieldChanges={5}
 *   arrayChanges={[
 *     { name: 'Product Deals', added: 1, modified: 2, removed: 0 }
 *   ]}
 *   changeReason={product.forApprovalVersion?.changeReason}
 *   isAdminUser={isAdminUser}
 * />
 */

import React from 'react';

export interface ArrayChangeSummary {
    /** Name of the array/sub-record (e.g., "Product Deals") */
    name: string;
    /** Number of items added */
    added: number;
    /** Number of items modified */
    modified: number;
    /** Number of items removed */
    removed: number;
}

export interface ChangeSummaryCardProps {
    /** Current status of the record */
    status: 'FOR_APPROVAL' | 'FOR_DELETION' | 'FOR_DEACTIVATION';
    /** Number of simple fields that changed */
    fieldChanges: number;
    /** Summary of array/sub-record changes */
    arrayChanges?: ArrayChangeSummary[];
    /** The reason provided for the change */
    changeReason?: string | null;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Name of the record being reviewed (e.g., "Product", "Customer") */
    recordName?: string;
}

export const ChangeSummaryCard: React.FC<ChangeSummaryCardProps> = ({
    status,
    fieldChanges,
    arrayChanges = [],
    changeReason,
    isAdminUser,
    recordName = 'Record',
}) => {
    const config = getStatusConfig(status, recordName);

    const hasArrayChanges = arrayChanges.some((arr) => arr.added > 0 || arr.modified > 0 || arr.removed > 0);

    const totalArrayChanges = arrayChanges.reduce(
        (acc, arr) => ({
            added: acc.added + arr.added,
            modified: acc.modified + arr.modified,
            removed: acc.removed + arr.removed,
        }),
        { added: 0, modified: 0, removed: 0 }
    );

    return (
        <div className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-5 shadow-sm`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Status & Summary */}
                <div className="flex items-start gap-4">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBgColor}`}
                    >
                        {config.icon}
                    </div>

                    <div className="space-y-2">
                        <div>
                            <h3 className={`text-lg font-bold ${config.titleColor}`}>{config.title}</h3>
                            <p className={`text-sm ${config.textColor}`}>
                                {isAdminUser ? config.adminDescription : config.userDescription}
                            </p>
                        </div>

                        {/* Quick Change Stats */}
                        {status === 'FOR_APPROVAL' && (fieldChanges > 0 || hasArrayChanges) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {fieldChanges > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                                        <FieldIcon />
                                        <span className="ml-1.5">
                                            {fieldChanges} field{fieldChanges !== 1 ? 's' : ''} modified
                                        </span>
                                    </span>
                                )}
                                {totalArrayChanges.added > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                        <PlusIcon />
                                        <span className="ml-1.5">
                                            {totalArrayChanges.added} item{totalArrayChanges.added !== 1 ? 's' : ''}{' '}
                                            added
                                        </span>
                                    </span>
                                )}
                                {totalArrayChanges.modified > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                                        <EditIcon />
                                        <span className="ml-1.5">
                                            {totalArrayChanges.modified} item
                                            {totalArrayChanges.modified !== 1 ? 's' : ''} modified
                                        </span>
                                    </span>
                                )}
                                {totalArrayChanges.removed > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                                        <MinusIcon />
                                        <span className="ml-1.5">
                                            {totalArrayChanges.removed} item{totalArrayChanges.removed !== 1 ? 's' : ''}{' '}
                                            removed
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div
                    className={`inline-flex shrink-0 items-center rounded-full border ${config.badgeBorderColor} ${config.badgeBgColor} px-3 py-1.5 text-sm font-semibold ${config.badgeTextColor}`}
                >
                    {config.badgeLabel}
                </div>
            </div>

            {/* Change Reason */}
            {changeReason && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {status === 'FOR_DELETION'
                            ? 'Deletion Reason'
                            : status === 'FOR_DEACTIVATION'
                            ? 'Deactivation Reason'
                            : 'Change Reason'}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{changeReason}</p>
                </div>
            )}

            {/* Detailed Array Changes Breakdown (if multiple arrays) */}
            {arrayChanges.length > 1 && hasArrayChanges && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Changes by Section
                    </p>
                    <div className="space-y-2">
                        {arrayChanges
                            .filter((arr) => arr.added > 0 || arr.modified > 0 || arr.removed > 0)
                            .map((arr) => (
                                <div key={arr.name} className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-700">{arr.name}</span>
                                    <div className="flex gap-3 text-xs">
                                        {arr.added > 0 && <span className="text-emerald-600">+{arr.added}</span>}
                                        {arr.modified > 0 && <span className="text-blue-600">~{arr.modified}</span>}
                                        {arr.removed > 0 && <span className="text-red-600">-{arr.removed}</span>}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface StatusConfig {
    title: string;
    adminDescription: string;
    userDescription: string;
    icon: React.ReactNode;
    borderColor: string;
    bgColor: string;
    iconBgColor: string;
    titleColor: string;
    textColor: string;
    badgeLabel: string;
    badgeBgColor: string;
    badgeBorderColor: string;
    badgeTextColor: string;
}

const getStatusConfig = (
    status: 'FOR_APPROVAL' | 'FOR_DELETION' | 'FOR_DEACTIVATION',
    recordName: string
): StatusConfig => {
    switch (status) {
        case 'FOR_DELETION':
            return {
                title: `${recordName} Marked for Deletion`,
                adminDescription: 'Review this deletion request and approve or deny.',
                userDescription: 'Your deletion request is awaiting admin approval.',
                icon: <TrashIcon />,
                borderColor: 'border-red-300',
                bgColor: 'bg-red-50',
                iconBgColor: 'bg-red-600',
                titleColor: 'text-red-800',
                textColor: 'text-red-700',
                badgeLabel: 'FOR DELETION',
                badgeBgColor: 'bg-red-100',
                badgeBorderColor: 'border-red-300',
                badgeTextColor: 'text-red-800',
            };

        case 'FOR_DEACTIVATION':
            return {
                title: `${recordName} Marked for Deactivation`,
                adminDescription: 'Review this deactivation request and approve or deny.',
                userDescription: 'Your deactivation request is awaiting admin approval.',
                icon: <BanIcon />,
                borderColor: 'border-orange-300',
                bgColor: 'bg-orange-50',
                iconBgColor: 'bg-orange-600',
                titleColor: 'text-orange-800',
                textColor: 'text-orange-700',
                badgeLabel: 'FOR DEACTIVATION',
                badgeBgColor: 'bg-orange-100',
                badgeBorderColor: 'border-orange-300',
                badgeTextColor: 'text-orange-800',
            };

        case 'FOR_APPROVAL':
        default:
            return {
                title: `${recordName} Changes Pending Approval`,
                adminDescription: 'Review the proposed changes below and approve or deny.',
                userDescription: 'Your changes are awaiting admin approval.',
                icon: <ClockIcon />,
                borderColor: 'border-yellow-300',
                bgColor: 'bg-yellow-50',
                iconBgColor: 'bg-yellow-500',
                titleColor: 'text-yellow-800',
                textColor: 'text-yellow-700',
                badgeLabel: 'FOR APPROVAL',
                badgeBgColor: 'bg-yellow-100',
                badgeBorderColor: 'border-yellow-300',
                badgeTextColor: 'text-yellow-800',
            };
    }
};

// Icons
const TrashIcon: React.FC = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

const BanIcon: React.FC = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
    </svg>
);

const ClockIcon: React.FC = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const FieldIcon: React.FC = () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
    </svg>
);

const PlusIcon: React.FC = () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
    </svg>
);

const MinusIcon: React.FC = () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

export default ChangeSummaryCard;
