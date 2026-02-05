/**
 * DeactivationApprovalCard Component
 *
 * Displays a prominent card when a record is marked for deactivation (FOR_DEACTIVATION status).
 * Uses orange theme to distinguish from deletion. Shows the reason and provides Approve/Deny buttons.
 *
 * @example
 * <DeactivationApprovalCard
 *   reason={selectedCustomer.deletionReason}
 *   isAdminUser={isAdminUser}
 *   isLoading={isLoading}
 *   onApprove={handleApprove}
 *   onDeny={handleDeny}
 *   onCancel={handleCancel}
 * />
 */

import React from 'react';
import { ApprovalActionButtons } from './ApprovalActionButtons';

export interface DeactivationApprovalCardProps {
    /** The reason provided for deactivation */
    reason?: string | null;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Handler for approve action */
    onApprove: () => void;
    /** Handler for deny action */
    onDeny: () => void;
    /** Handler for cancel action (optional) */
    onCancel?: () => void;
    /** Optional title override */
    title?: string;
    /** Optional description override */
    description?: string;
}

export const DeactivationApprovalCard: React.FC<DeactivationApprovalCardProps> = ({
    reason,
    isAdminUser,
    isLoading = false,
    onApprove,
    onDeny,
    onCancel,
    title = 'Record Marked for Deactivation',
    description = 'This record has been marked for deactivation and is awaiting approval.',
}) => {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600">
                        <BanIcon />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-orange-800">{title}</h3>
                        <p className="mt-1 text-sm text-orange-700">{description}</p>
                    </div>
                </div>

                {reason && (
                    <div className="mt-6 rounded-lg border-2 border-orange-200 bg-white p-4">
                        <p className="mb-2 text-sm font-semibold text-gray-700">Deactivation Reason:</p>
                        <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                            {reason}
                        </p>
                    </div>
                )}
            </div>

            <ApprovalActionButtons
                variant="deactivation"
                isAdminUser={isAdminUser}
                isLoading={isLoading}
                onApprove={onApprove}
                onDeny={onDeny}
                onCancel={onCancel}
            />
        </div>
    );
};

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

export default DeactivationApprovalCard;
