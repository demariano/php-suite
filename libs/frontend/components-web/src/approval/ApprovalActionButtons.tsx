/**
 * ApprovalActionButtons Component
 *
 * Standardized action buttons for approval workflows (Approve/Deny/Cancel).
 * Used in Pending Changes tab for Admin users to approve or deny changes.
 *
 * @example
 * // Basic usage for FOR_APPROVAL status
 * <ApprovalActionButtons
 *   variant="changes"
 *   onApprove={handleApprove}
 *   onDeny={handleDeny}
 *   onCancel={handleCancel}
 *   isLoading={isSubmitting}
 * />
 *
 * @example
 * // For FOR_DELETION status
 * <ApprovalActionButtons
 *   variant="deletion"
 *   onApprove={handleApprove}
 *   onDeny={handleDeny}
 *   onCancel={handleCancel}
 *   isLoading={isSubmitting}
 * />
 */

import React from 'react';

export type ApprovalVariant = 'changes' | 'deletion' | 'deactivation';

export interface ApprovalActionButtonsProps {
    /** Type of approval action */
    variant: ApprovalVariant;
    /** Handler for approve action */
    onApprove: () => void;
    /** Handler for deny action */
    onDeny: () => void;
    /** Handler for cancel action (optional - hides cancel button if not provided) */
    onCancel?: () => void;
    /** Loading state - disables buttons during processing */
    isLoading?: boolean;
    /** Show buttons only for admin users */
    isAdminUser?: boolean;
    /** Custom class name for container */
    className?: string;
}

const variantConfig: Record<
    ApprovalVariant,
    {
        approveText: string;
        denyText: string;
        approveColor: string;
        approveHoverColor: string;
    }
> = {
    changes: {
        approveText: 'Approve Changes',
        denyText: 'Deny Changes',
        approveColor: 'bg-green-600',
        approveHoverColor: 'hover:bg-green-700',
    },
    deletion: {
        approveText: 'Approve Deletion',
        denyText: 'Deny Deletion',
        approveColor: 'bg-green-600',
        approveHoverColor: 'hover:bg-green-700',
    },
    deactivation: {
        approveText: 'Approve Deactivation',
        denyText: 'Deny Deactivation',
        approveColor: 'bg-blue-600',
        approveHoverColor: 'hover:bg-blue-700',
    },
};

export const ApprovalActionButtons: React.FC<ApprovalActionButtonsProps> = ({
    variant,
    onApprove,
    onDeny,
    onCancel,
    isLoading = false,
    isAdminUser = true,
    className = '',
}) => {
    const config = variantConfig[variant];

    // Don't render if not admin
    if (!isAdminUser) {
        return onCancel ? (
            <div className={`mt-8 flex justify-end border-t-2 border-gray-200 pt-6 ${className}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                >
                    <XIcon />
                    Cancel
                </button>
            </div>
        ) : null;
    }

    return (
        <div
            className={`mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between ${className}`}
        >
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                    type="button"
                    onClick={onDeny}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <XIcon />
                    {isLoading ? 'Processing...' : config.denyText}
                </button>
                <button
                    type="button"
                    onClick={onApprove}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 rounded-xl ${config.approveColor} px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 ${config.approveHoverColor} focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                    <CheckIcon />
                    {isLoading ? 'Processing...' : config.approveText}
                </button>
            </div>

            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                >
                    <XIcon />
                    Cancel
                </button>
            )}
        </div>
    );
};

// Inline SVG icons to avoid external dependencies
const XIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

export default ApprovalActionButtons;
