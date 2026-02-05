/**
 * FormActionButtons Component
 *
 * Standardized action buttons for edit/create forms.
 * Handles Save, Cancel, Delete, and Reactivate buttons based on mode and status.
 *
 * @example
 * <FormActionButtons
 *   mode="edit"
 *   status={product.status}
 *   isAdminUser={isAdminUser}
 *   isLoading={isLoading}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   onDelete={handleDelete}
 *   onReactivate={handleReactivate}
 *   saveLabel="Save Changes"
 *   canEdit={true}
 * />
 */

import React from 'react';

type StatusEnum = 'ACTIVE' | 'INACTIVE' | 'FOR_APPROVAL' | 'FOR_DELETION' | 'FOR_DEACTIVATION' | 'NEW_RECORD' | 'DRAFT';

export interface FormActionButtonsProps {
    /** Form mode: create or edit */
    mode: 'create' | 'edit';
    /** Current status of the record */
    status?: StatusEnum;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Whether the form can be edited */
    canEdit?: boolean;
    /** Handler for save/submit action */
    onSave?: () => void;
    /** Handler for cancel action */
    onCancel: () => void;
    /** Handler for delete action */
    onDelete?: () => void;
    /** Handler for reactivate action (admin only, when INACTIVE) */
    onReactivate?: () => void;
    /** Custom label for save button */
    saveLabel?: string;
    /** Custom label for create button */
    createLabel?: string;
    /** Whether to show the delete button */
    showDelete?: boolean;
    /** Custom className for container */
    className?: string;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
    mode,
    status,
    isAdminUser,
    isLoading = false,
    canEdit = true,
    onSave,
    onCancel,
    onDelete,
    onReactivate,
    saveLabel = 'Save Changes',
    createLabel = 'Create',
    showDelete = true,
    className = '',
}) => {
    const isCreateMode = mode === 'create';
    const isEditMode = mode === 'edit';
    const isActive = status === 'ACTIVE';
    const isInactive = status === 'INACTIVE';

    // Show save button in create mode or when status is ACTIVE
    const showSaveButton = isCreateMode || isActive;

    // Show delete button only in edit mode when ACTIVE and showDelete is true
    const showDeleteButton = isEditMode && isActive && showDelete && onDelete;

    // Show reactivate button only for admin when INACTIVE
    const showReactivateButton = isEditMode && isAdminUser && isInactive && onReactivate;

    return (
        <div
            className={`flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between ${className}`}
        >
            {/* Left side: Delete or Reactivate */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {showDeleteButton && (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300 sm:w-auto"
                    >
                        <TrashIcon />
                        Delete
                    </button>
                )}

                {showReactivateButton && (
                    <button
                        type="button"
                        onClick={onReactivate}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <CheckIcon />
                        Reactivate
                    </button>
                )}

                {/* Spacer when no left buttons */}
                {!showDeleteButton && !showReactivateButton && <div className="hidden sm:block" />}
            </div>

            {/* Right side: Save and Cancel */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {showSaveButton && onSave && (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!canEdit || isLoading}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        <CheckIcon />
                        {isLoading ? 'Saving...' : isCreateMode ? createLabel : saveLabel}
                    </button>
                )}

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <XIcon />
                    Cancel
                </button>
            </div>
        </div>
    );
};

// Icons
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

const CheckIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const XIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default FormActionButtons;
