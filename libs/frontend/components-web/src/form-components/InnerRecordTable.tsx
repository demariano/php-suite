/**
 * InnerRecordTable Component
 *
 * Table component for displaying sub-records within a form (e.g., Product Deals, Unit Prices).
 * Includes add button, remove functionality, and empty state.
 *
 * @example
 * <InnerRecordTable
 *   title="Product Deals"
 *   icon="tag"
 *   items={productDeals}
 *   columns={[
 *     { key: 'productDealName', label: 'Deal', render: (item) => item.productDealName || '-' },
 *     { key: 'minQty', label: 'Min Qty' },
 *     { key: 'additionalQty', label: 'Additional Qty' },
 *   ]}
 *   getKey={(item) => item.productDealId}
 *   onAdd={() => setShowDealModal(true)}
 *   onRemove={(index) => removeProductDeal(index)}
 *   disabled={!canEdit}
 *   emptyMessage="No product deals added."
 * />
 */

import React from 'react';

export interface InnerRecordColumn<T> {
    /** Key to access the value */
    key: keyof T | string;
    /** Column header label */
    label: string;
    /** Custom render function */
    render?: (item: T, index: number) => React.ReactNode;
    /** Column alignment */
    align?: 'left' | 'center' | 'right';
    /** Column width class */
    widthClass?: string;
}

export interface InnerRecordTableProps<T> {
    /** Section title */
    title: string;
    /** Description text below title */
    description?: string;
    /** Icon type for the header */
    icon?: 'document' | 'card' | 'currency' | 'tag' | 'box' | 'list' | 'user';
    /** Array of items to display */
    items: T[];
    /** Column definitions */
    columns: InnerRecordColumn<T>[];
    /** Function to get unique key from item */
    getKey: (item: T, index: number) => string | number;
    /** Handler for add button click */
    onAdd?: () => void;
    /** Handler for remove button click */
    onRemove?: (index: number) => void;
    /** Whether the table is disabled (no add/remove) */
    disabled?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Add button label */
    addLabel?: string;
    /** Whether to show the remove column */
    showRemove?: boolean;
    /** Whether to highlight the section (for changed data) */
    highlighted?: boolean;
    /** Additional className for container */
    className?: string;
}

export function InnerRecordTable<T>({
    title,
    description,
    icon = 'list',
    items,
    columns,
    getKey,
    onAdd,
    onRemove,
    disabled = false,
    emptyMessage = 'No items added.',
    addLabel = 'Add',
    showRemove = true,
    highlighted = false,
    className = '',
}: InnerRecordTableProps<T>): React.ReactElement {
    const getCellValue = (item: T, column: InnerRecordColumn<T>, index: number): React.ReactNode => {
        if (column.render) {
            return column.render(item, index);
        }

        const value = (item as Record<string, unknown>)[column.key as string];

        if (value === null || value === undefined || value === '') {
            return <span className="text-gray-400">-</span>;
        }

        return String(value);
    };

    const getAlignClass = (align?: 'left' | 'center' | 'right'): string => {
        switch (align) {
            case 'center':
                return 'text-center';
            case 'right':
                return 'text-right';
            default:
                return 'text-left';
        }
    };

    return (
        <div
            className={`rounded-xl border-2 p-4 sm:p-6 ${
                highlighted ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200 bg-white'
            } ${className}`}
        >
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                    <IconComponent icon={icon} />
                </div>
                <h3
                    className={`m-0 text-base font-bold ${
                        highlighted
                            ? 'rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-1 text-blue-700'
                            : 'text-blue-600'
                    }`}
                >
                    {title}
                </h3>
            </div>

            {/* Description and Add Button */}
            <div className="mb-4 flex items-center justify-between">
                {description && <p className="text-sm text-gray-500">{description}</p>}
                {!description && <div />}
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={disabled}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        {addLabel}
                    </button>
                )}
            </div>

            {/* Table or Empty State */}
            {items.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 sm:p-6">
                    {emptyMessage}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={String(column.key)}
                                        className={`px-4 py-2 font-semibold text-gray-600 ${getAlignClass(
                                            column.align
                                        )} ${column.widthClass || ''}`}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                                {showRemove && onRemove && (
                                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {items.map((item, index) => (
                                <tr key={getKey(item, index)} className="transition-colors hover:bg-gray-50">
                                    {columns.map((column) => (
                                        <td
                                            key={String(column.key)}
                                            className={`px-4 py-3 text-gray-700 ${getAlignClass(column.align)} ${
                                                column.widthClass || ''
                                            }`}
                                        >
                                            {getCellValue(item, column, index)}
                                        </td>
                                    ))}
                                    {showRemove && onRemove && (
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onRemove(index)}
                                                disabled={disabled}
                                                className={`flex items-center justify-center rounded-lg p-2 font-semibold text-white shadow-sm transition-colors ${
                                                    disabled
                                                        ? 'cursor-not-allowed bg-gray-500 opacity-60'
                                                        : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                                title="Remove"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Icon component
const IconComponent: React.FC<{ icon: string }> = ({ icon }) => {
    const className = 'h-5 w-5 text-white';

    switch (icon) {
        case 'card':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                </svg>
            );
        case 'currency':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            );
        case 'tag':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                </svg>
            );
        case 'box':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                </svg>
            );
        case 'user':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            );
        case 'document':
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            );
        case 'list':
        default:
            return (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                </svg>
            );
    }
};

const TrashIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

export default InnerRecordTable;
