/**
 * DeletionApprovalCard Component
 *
 * Displays a prominent card when a record is marked for deletion (FOR_DELETION status).
 * Shows the deletion reason and provides Approve/Deny buttons for admin users.
 *
 * @example
 * <DeletionApprovalCard
 *   reason={selectedProduct.changeReason}
 *   isAdminUser={isAdminUser}
 *   isLoading={isLoading}
 *   onApprove={handleApprove}
 *   onDeny={handleDeny}
 *   onCancel={handleCancel}
 * />
 */

import React from 'react';
import { ApprovalActionButtons } from './ApprovalActionButtons';

export interface DeletionApprovalCardProps {
    /** The reason provided for deletion */
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

export const DeletionApprovalCard: React.FC<DeletionApprovalCardProps> = ({
    reason,
    isAdminUser,
    isLoading = false,
    onApprove,
    onDeny,
    onCancel,
    title = 'Record Marked for Deletion',
    description = 'This record has been marked for deletion and is awaiting approval.',
}) => {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                        <TrashIcon />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800">{title}</h3>
                        <p className="mt-1 text-sm text-red-700">{description}</p>
                    </div>
                </div>

                {reason && (
                    <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                        <p className="mb-2 text-sm font-semibold text-gray-700">Deletion Reason:</p>
                        <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                            {reason}
                        </p>
                    </div>
                )}
            </div>

            <ApprovalActionButtons
                variant="deletion"
                isAdminUser={isAdminUser}
                isLoading={isLoading}
                onApprove={onApprove}
                onDeny={onDeny}
                onCancel={onCancel}
            />
        </div>
    );
};

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

export default DeletionApprovalCard;
