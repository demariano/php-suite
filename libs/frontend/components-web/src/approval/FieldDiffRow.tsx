/**
 * FieldDiffRow Component
 *
 * Displays a side-by-side comparison of a field's current vs proposed value.
 * Used in approval workflows to clearly show what changes are being requested.
 *
 * @example
 * <FieldDiffRow
 *   label="Product Name"
 *   currentValue={product.name}
 *   proposedValue={product.forApprovalVersion?.name}
 *   isChanged={true}
 * />
 */

import React from 'react';

export interface FieldDiffRowProps {
    /** Label for the field */
    label: string;
    /** Current/original value */
    currentValue: string | number | boolean | null | undefined;
    /** Proposed new value */
    proposedValue: string | number | boolean | null | undefined;
    /** Whether the field has changed */
    isChanged: boolean;
    /** Optional formatter for display values */
    formatter?: (value: unknown) => string;
    /** Hide unchanged fields */
    hideUnchanged?: boolean;
    /** Optional icon to display before label */
    icon?: React.ReactNode;
}

export const FieldDiffRow: React.FC<FieldDiffRowProps> = ({
    label,
    currentValue,
    proposedValue,
    isChanged,
    formatter,
    hideUnchanged = false,
    icon,
}) => {
    // Don't render if unchanged and hideUnchanged is true
    if (!isChanged && hideUnchanged) {
        return null;
    }

    const formatValue = (value: unknown): string => {
        if (formatter) {
            return formatter(value);
        }
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    };

    const currentDisplay = formatValue(currentValue);
    const proposedDisplay = formatValue(proposedValue);

    return (
        <div
            className={`grid grid-cols-1 gap-2 rounded-lg border p-4 transition-colors sm:grid-cols-3 sm:items-center ${
                isChanged ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200 bg-white'
            }`}
        >
            {/* Field Label */}
            <div className="flex items-center gap-2">
                {icon && <span className="text-gray-500">{icon}</span>}
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {isChanged && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Modified
                    </span>
                )}
            </div>

            {/* Current Value */}
            <div className="flex flex-col sm:text-center">
                <span className="text-xs text-gray-500 sm:hidden">Current:</span>
                <span className={`text-sm ${isChanged ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {currentDisplay}
                </span>
            </div>

            {/* Proposed Value */}
            <div className="flex flex-col sm:text-right">
                <span className="text-xs text-gray-500 sm:hidden">Proposed:</span>
                <span className={`text-sm ${isChanged ? 'font-semibold text-emerald-700' : 'text-gray-900'}`}>
                    {isChanged ? proposedDisplay : currentDisplay}
                </span>
            </div>
        </div>
    );
};

/**
 * FieldDiffHeader Component
 *
 * Header row for FieldDiffRow columns
 */
export const FieldDiffHeader: React.FC = () => (
    <div className="mb-2 hidden grid-cols-3 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:grid">
        <div>Field</div>
        <div className="text-center">Current Value</div>
        <div className="text-right">Proposed Value</div>
    </div>
);

/**
 * FieldDiffContainer Component
 *
 * Wrapper for multiple FieldDiffRow components with header
 */
export interface FieldDiffContainerProps {
    children: React.ReactNode;
    showHeader?: boolean;
    title?: string;
}

export const FieldDiffContainer: React.FC<FieldDiffContainerProps> = ({ children, showHeader = true, title }) => (
    <div className="space-y-3">
        {title && <h4 className="text-sm font-semibold text-gray-800">{title}</h4>}
        {showHeader && <FieldDiffHeader />}
        <div className="space-y-2">{children}</div>
    </div>
);

export default FieldDiffRow;
