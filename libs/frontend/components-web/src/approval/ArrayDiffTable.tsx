/**
 * ArrayDiffTable Component
 *
 * Displays a table showing differences between original and proposed arrays (sub-records).
 * Each row shows its status: Added, Modified, Removed, or Unchanged.
 * Used for inner tables like Product Deals, Unit Prices, etc.
 *
 * @example
 * const diffResult = computeArrayDiff(originalDeals, proposedDeals, {
 *   getKey: (deal) => deal.id
 * });
 *
 * <ArrayDiffTable
 *   title="Product Deals"
 *   diffResult={diffResult}
 *   columns={[
 *     { key: 'dealName', label: 'Deal Name' },
 *     { key: 'discount', label: 'Discount', formatter: (v) => `${v}%` },
 *   ]}
 *   getKey={(item) => item.id}
 * />
 */

import React from 'react';
import {
    ArrayDiffItem,
    ArrayDiffResult,
    ArrayDiffStatus,
    getDiffStatusClasses,
    getDiffStatusLabel,
} from './computeArrayDiff';

export interface ArrayDiffColumn<T> {
    /** Object key to display */
    key: keyof T;
    /** Column header label */
    label: string;
    /** Optional formatter for cell value */
    formatter?: (value: unknown) => string;
    /** Optional custom cell renderer */
    render?: (item: T, diffItem: ArrayDiffItem<T>) => React.ReactNode;
    /** Column width class */
    widthClass?: string;
}

export interface ArrayDiffTableProps<T extends Record<string, unknown>> {
    /** Title for the table section */
    title?: string;
    /** Description text below title */
    description?: string;
    /** The computed diff result */
    diffResult: ArrayDiffResult<T>;
    /** Column definitions */
    columns: ArrayDiffColumn<T>[];
    /** Function to get unique key from item */
    getKey: (item: T) => string | number;
    /** Optional icon for the section */
    icon?: React.ReactNode;
    /** Show only changed items (hide unchanged) */
    showChangesOnly?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Whether to show the summary badges */
    showSummary?: boolean;
}

export function ArrayDiffTable<T extends Record<string, unknown>>({
    title,
    description,
    diffResult,
    columns,
    getKey,
    icon,
    showChangesOnly = false,
    emptyMessage = 'No items',
    showSummary = true,
}: ArrayDiffTableProps<T>): React.ReactElement {
    const { items, summary, hasChanges } = diffResult;

    const displayItems = showChangesOnly ? items.filter((i) => i.status !== 'unchanged') : items;

    const formatCellValue = (column: ArrayDiffColumn<T>, item: T, diffItem: ArrayDiffItem<T>): React.ReactNode => {
        if (column.render) {
            return column.render(item, diffItem);
        }

        const value = item[column.key];

        if (column.formatter) {
            return column.formatter(value);
        }

        if (value === null || value === undefined || value === '') {
            return <span className="text-gray-400">—</span>;
        }

        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        return String(value);
    };

    const isFieldChanged = (diffItem: ArrayDiffItem<T>, fieldKey: keyof T): boolean => {
        return diffItem.status === 'modified' && diffItem.changedFields?.includes(String(fieldKey)) === true;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            {(title || showSummary) && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-gray-500">{icon}</span>}
                        {title && <h4 className="text-sm font-semibold text-gray-800">{title}</h4>}
                        {hasChanges && (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                Has Changes
                            </span>
                        )}
                    </div>

                    {/* Summary Badges */}
                    {showSummary && hasChanges && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {summary.added > 0 && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800">
                                    +{summary.added} Added
                                </span>
                            )}
                            {summary.modified > 0 && (
                                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 font-medium text-yellow-800">
                                    {summary.modified} Modified
                                </span>
                            )}
                            {summary.removed > 0 && (
                                <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-800">
                                    -{summary.removed} Removed
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {description && <p className="text-sm text-gray-500">{description}</p>}

            {/* Table */}
            {displayItems.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    {emptyMessage}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                                {columns.map((column) => (
                                    <th
                                        key={String(column.key)}
                                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                                            column.widthClass || ''
                                        }`}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {displayItems.map((diffItem) => (
                                <ArrayDiffRow
                                    key={getKey(diffItem.item)}
                                    diffItem={diffItem}
                                    columns={columns}
                                    formatCellValue={formatCellValue}
                                    isFieldChanged={isFieldChanged}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

interface ArrayDiffRowProps<T extends Record<string, unknown>> {
    diffItem: ArrayDiffItem<T>;
    columns: ArrayDiffColumn<T>[];
    formatCellValue: (column: ArrayDiffColumn<T>, item: T, diffItem: ArrayDiffItem<T>) => React.ReactNode;
    isFieldChanged: (diffItem: ArrayDiffItem<T>, fieldKey: keyof T) => boolean;
}

function ArrayDiffRow<T extends Record<string, unknown>>({
    diffItem,
    columns,
    formatCellValue,
    isFieldChanged,
}: ArrayDiffRowProps<T>): React.ReactElement {
    const rowClasses = getRowClasses(diffItem.status);

    return (
        <tr className={rowClasses}>
            {/* Status Badge */}
            <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={diffItem.status} />
            </td>

            {/* Data Columns */}
            {columns.map((column) => {
                const fieldChanged = isFieldChanged(diffItem, column.key);

                return (
                    <td
                        key={String(column.key)}
                        className={`px-4 py-3 text-sm ${
                            diffItem.status === 'removed'
                                ? 'text-gray-500 line-through'
                                : fieldChanged
                                ? 'font-medium text-emerald-700'
                                : 'text-gray-900'
                        } ${column.widthClass || ''}`}
                    >
                        <div className="flex items-center gap-2">
                            {formatCellValue(column, diffItem.item, diffItem)}
                            {fieldChanged && (
                                <span
                                    className="text-xs text-gray-400"
                                    title={`Previous: ${diffItem.originalItem?.[column.key] ?? '—'}`}
                                >
                                    ✎
                                </span>
                            )}
                        </div>
                    </td>
                );
            })}
        </tr>
    );
}

const StatusBadge: React.FC<{ status: ArrayDiffStatus }> = ({ status }) => {
    const classes = getDiffStatusClasses(status);
    const label = getDiffStatusLabel(status);

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}>
            {status === 'added' && <PlusIcon />}
            {status === 'modified' && <EditIcon />}
            {status === 'removed' && <MinusIcon />}
            <span className="ml-1">{label}</span>
        </span>
    );
};

const getRowClasses = (status: ArrayDiffStatus): string => {
    switch (status) {
        case 'added':
            return 'bg-emerald-50/50';
        case 'modified':
            return 'bg-yellow-50/50';
        case 'removed':
            return 'bg-red-50/50';
        case 'unchanged':
        default:
            return '';
    }
};

const PlusIcon: React.FC = () => (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
    </svg>
);

const MinusIcon: React.FC = () => (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

export default ArrayDiffTable;
