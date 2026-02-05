/**
 * ChangeReasonReadOnly Component
 *
 * A read-only display for change/deletion/deactivation reasons.
 * Uses a gray theme to match the rest of the form.
 *
 * @example
 * <ChangeReasonReadOnly
 *   reason={selectedProduct.forApprovalVersion?.changeReason}
 *   label="Change Reason"
 * />
 */

import React from 'react';

export interface ChangeReasonReadOnlyProps {
    /** The reason text to display */
    reason?: string | null;
    /** Label for the field */
    label?: string;
    /** Optional icon */
    icon?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}

export const ChangeReasonReadOnly: React.FC<ChangeReasonReadOnlyProps> = ({
    reason,
    label = 'Change Reason',
    icon,
    className = '',
}) => {
    if (!reason) {
        return null;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2">
                {icon || <DefaultIcon />}
                <span className="text-sm font-semibold text-gray-700">{label}</span>
            </div>
            <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{reason}</p>
            </div>
        </div>
    );
};

const DefaultIcon: React.FC = () => (
    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
    </svg>
);

export default ChangeReasonReadOnly;
