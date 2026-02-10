'use client';

import { CustomerClassificationDto, StatusEnum } from '@data-access/index';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../components';
import { createFieldChangeDetector } from '../../../utils/fieldChangeDetection';

interface CustomerClassificationFormProps {
    isCreateMode: boolean;
    selectedCustomerClassification: CustomerClassificationDto | null;
    successMessage: string | null;
    onSave: (customerClassification: CustomerClassificationDto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
    isLoading?: boolean;
}

export default function CustomerClassificationForm({
    isCreateMode,
    selectedCustomerClassification,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    isAdminUser = false,
    onApprove,
    onDeny,
    isLoading = false,
}: CustomerClassificationFormProps) {
    const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Form state for controlled inputs
    const [formData, setFormData] = useState({
        customerClassificationName: '',
        changeReason: '',
    });

    const currentStatus = selectedCustomerClassification?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedCustomerClassification?.forApprovalVersion ?? {}) as Record<string, unknown>,
        [selectedCustomerClassification?.forApprovalVersion]
    );

    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);
    const showApprovalUI = isApprovalState && !isCreateMode;
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    const isFieldChanged = createFieldChangeDetector(
        (selectedCustomerClassification ?? {}) as Record<string, unknown>,
        (selectedCustomerClassification?.forApprovalVersion as Record<string, unknown>) ?? undefined
    );

    const renderReadOnlyField = (label: string, value: unknown, fieldName?: string) => {
        const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {label}
                </label>
                <div
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                        fieldChanged
                            ? 'border-blue-500 bg-blue-50 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                    {value === undefined || value === null || value === '' ? '-' : String(value)}
                </div>
            </div>
        );
    };

    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        currentValue: unknown,
        pendingValue: unknown
    ) => {
        const hasChange = isFieldChanged(fieldName);

        if (showApprovalUI && hasChange) {
            return (
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        {label}
                    </label>
                    <div className="px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-xl text-sm font-medium">
                        <span className="line-through text-gray-500">
                            {currentValue === undefined || currentValue === null || currentValue === ''
                                ? '-'
                                : String(currentValue)}
                        </span>
                        <span className="mx-2 text-blue-600">→</span>
                        <span className="font-semibold text-blue-700">
                            {pendingValue === undefined || pendingValue === null || pendingValue === ''
                                ? '-'
                                : String(pendingValue)}
                        </span>
                    </div>
                </div>
            );
        }

        const isNewRecord = currentStatus === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return renderReadOnlyField(label, displayValue, fieldName);
    };

    // Set initial values when editing (only when user hasn't made selections)
    useEffect(() => {
        if (!isCreateMode && selectedCustomerClassification && !userHasMadeSelections) {
            // Initialize form data
            setFormData({
                customerClassificationName: selectedCustomerClassification.customerClassificationName || '',
                changeReason: selectedCustomerClassification.changeReason || '',
            });
        }
    }, [isCreateMode, selectedCustomerClassification, userHasMadeSelections]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const customerClassificationName = formData.customerClassificationName.trim();

        // Validate required fields
        const errors: string[] = [];

        if (!customerClassificationName) {
            errors.push('Customer classification name is required.');
        }

        // Validate change reason for non-create mode (only required for non-admin users)
        if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
            errors.push('Please provide a reason for the change.');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear validation errors if validation passes
        setValidationErrors([]);

        if (isCreateMode) {
            const newCustomerClassification = {
                customerClassificationId: '', // Will be generated by the backend
                customerClassificationName: customerClassificationName,
                status: StatusEnum.NEW_RECORD, // Default status for new classifications
            } as CustomerClassificationDto;
            onSave(newCustomerClassification);
        } else {
            // Determine status based on user role
            const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;

            const updatedCustomerClassification = {
                ...selectedCustomerClassification,
                customerClassificationName: customerClassificationName,
                status: newStatus,
                changeReason: formData.changeReason.trim() || undefined,
            } as CustomerClassificationDto;
            onSave(updatedCustomerClassification);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Success message */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                        ✓
                    </div>
                    <span className="text-sm font-semibold">{successMessage}</span>
                </div>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
                <div className="space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                        <span className="text-base">⚠️</span>
                        <span>Please fix the following errors:</span>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                        {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Change Reason Field - First component when displayed */}
            {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                <ChangeReasonField
                    value={formData.changeReason}
                    onChange={(e) => {
                        setFormData((prev) => ({ ...prev, changeReason: e.target.value }));
                        setUserHasMadeSelections(true);
                    }}
                    disabled={selectedCustomerClassification?.status !== StatusEnum.ACTIVE}
                />
            )}

            {/* Change Reason Read-Only for approval states */}
            {showApprovalUI && selectedCustomerClassification?.changeReason && (
                <ChangeReasonReadOnly value={selectedCustomerClassification.changeReason} />
            )}

            {/* Deletion/Deactivation Approval Card */}
            {showDeletionCard && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">
                            🗑️
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-red-800 m-0">
                                {currentStatus === StatusEnum.FOR_DELETION
                                    ? 'Record Marked for Deletion'
                                    : 'Record Marked for Deactivation'}
                            </h3>
                            <p className="text-sm text-red-700">
                                This record has been marked for{' '}
                                {currentStatus === StatusEnum.FOR_DELETION ? 'deletion' : 'deactivation'} and is
                                awaiting approval.
                            </p>
                        </div>
                    </div>
                    {selectedCustomerClassification?.changeReason && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-red-700">
                                {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                            </p>
                            <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedCustomerClassification.changeReason}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Details Container */}
            <div className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Classification Information</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {showApprovalUI ? (
                                renderFieldWithInlineDiff(
                                    'Classification Name',
                                    'customerClassificationName',
                                    selectedCustomerClassification?.customerClassificationName,
                                    pendingVersion.customerClassificationName
                                )
                            ) : (
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Classification Name
                                    </label>
                                    <input
                                        type="text"
                                        name="customerClassificationName"
                                        value={formData.customerClassificationName}
                                        onChange={(e) => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                customerClassificationName: e.target.value,
                                            }));
                                            setUserHasMadeSelections(true);
                                        }}
                                        placeholder={isCreateMode ? 'Enter classification name' : ''}
                                        disabled={
                                            !isCreateMode &&
                                            selectedCustomerClassification?.status !== StatusEnum.ACTIVE
                                        }
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !isCreateMode &&
                                            selectedCustomerClassification?.status !== StatusEnum.ACTIVE
                                                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {!isCreateMode && selectedCustomerClassification?.status === StatusEnum.ACTIVE ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Delete
                    </button>
                ) : !isCreateMode &&
                  isAdminUser &&
                  selectedCustomerClassification?.status === StatusEnum.INACTIVE &&
                  onReactivate ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReactivate();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Reactivate
                    </button>
                ) : (
                    <div className="hidden sm:block" />
                )}

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {(isCreateMode || selectedCustomerClassification?.status === StatusEnum.ACTIVE) && (
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isCreateMode ? 'Create Classification' : 'Save Changes'}
                        </button>
                    )}

                    {/* Approval Buttons - shown when admin user and approval/deletion state (NOT in create mode) */}
                    {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                        <>
                            <button
                                type="button"
                                onClick={onDeny}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                Deny
                            </button>
                            <button
                                type="button"
                                onClick={onApprove}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Approve
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        Cancel
                    </button>
                </div>
            </div>
        </form>
    );
}
