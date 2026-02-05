'use client';

import { ProductCategoryDto, StatusEnum } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';

interface CategoryFormProps {
    isCreateMode: boolean;
    selectedCategory: ProductCategoryDto | null;
    successMessage: string | null;
    onSave: (category: ProductCategoryDto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    activeTab?: 'details' | 'logs';
    onTabChange?: (tab: 'details' | 'logs') => void;
    isLoading?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
}

const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-600 text-white shadow-sm',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white shadow-sm',
    [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.FOR_DEACTIVATION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white shadow-sm',
    [StatusEnum.INACTIVE]: 'bg-gray-500 text-white shadow-sm',
    [StatusEnum.DRAFT]: 'bg-blue-600 text-white shadow-sm',
};

const getStatusText = (status?: StatusEnum): string => {
    switch (status) {
        case StatusEnum.ACTIVE:
            return 'Active';
        case StatusEnum.FOR_APPROVAL:
            return 'For Approval';
        case StatusEnum.FOR_DELETION:
            return 'For Deletion';
        case StatusEnum.FOR_DEACTIVATION:
            return 'For Deactivation';
        case StatusEnum.INACTIVE:
            return 'Inactive';
        case StatusEnum.NEW_RECORD:
            return 'New Record';
        case StatusEnum.DRAFT:
            return 'Draft';
        default:
            return 'Active';
    }
};

const getTabClassName = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
        return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }

    return STATUS_TAB_CLASSES[status] ?? STATUS_TAB_CLASSES[StatusEnum.NEW_RECORD];
};

// Helper function to format display value
const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function CategoryForm({
    isCreateMode,
    selectedCategory,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    isAdminUser = false,
    activeTab = 'details',
    onTabChange,
    isLoading = false,
    onApprove,
    onDeny,
}: CategoryFormProps) {
    const [formData, setFormData] = useState({
        productCategoryName: '',
        changeReason: '',
    });

    const currentStatus = selectedCategory?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedCategory?.forApprovalVersion ?? {}) as Record<string, unknown>,
        [selectedCategory?.forApprovalVersion]
    );

    const canEditDetails = isCreateMode || currentStatus === StatusEnum.ACTIVE;

    // Helper to check if we're in an approval state (FOR_APPROVAL or NEW_RECORD)
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);

    // In create mode, we should show editable form fields, not the approval/diff UI
    // Even though status is NEW_RECORD (which triggers isApprovalState), create mode needs editable inputs
    const showApprovalUI = isApprovalState && !isCreateMode;

    // Check if we need to show deletion/deactivation card (defined at component level for use in footer)
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    // Initialize form data from selected category
    useEffect(() => {
        if (!isCreateMode && selectedCategory) {
            setFormData({
                productCategoryName: selectedCategory.productCategoryName ?? '',
                changeReason: selectedCategory.changeReason ?? '',
            });
        }
    }, [isCreateMode, selectedCategory]);

    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
        (selectedCategory ?? {}) as Record<string, unknown>,
        (selectedCategory?.forApprovalVersion as Record<string, unknown>) ?? undefined
    );

    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
        const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                    {label}
                </label>
                <div
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                        fieldChanged
                            ? 'border-blue-500 bg-blue-50 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                    {formatValue(value)}
                </div>
            </div>
        );
    };

    // Helper to render inline field diff
    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        currentValue: unknown,
        pendingValue: unknown,
        colorClass = 'bg-blue-500'
    ) => {
        const hasChange = isFieldChanged(fieldName);

        if (showApprovalUI && hasChange) {
            return (
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                        {label}
                    </label>
                    <div className="px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-xl text-sm font-medium">
                        <span className="line-through text-gray-500">{formatValue(currentValue)}</span>
                        <span className="mx-2 text-blue-600">→</span>
                        <span className="font-semibold text-blue-700">{formatValue(pendingValue)}</span>
                    </div>
                </div>
            );
        }

        // Normal display (read-only when not editable)
        // For NEW_RECORD status, data is in the main record (currentValue), not forApprovalVersion (pendingValue)
        // For FOR_APPROVAL status, pendingValue has the changes to approve
        const isNewRecord = currentStatus === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return renderReadOnlyField(label, displayValue, colorClass, fieldName);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isCreateMode) {
            const newCategory = {
                productCategoryName: formData.productCategoryName,
                status: StatusEnum.NEW_RECORD,
            };
            onSave(newCategory as ProductCategoryDto);
        } else {
            const updatedCategory = {
                ...selectedCategory,
                productCategoryName: formData.productCategoryName,
                changeReason: !isAdminUser ? formData.changeReason.trim() || undefined : selectedCategory?.changeReason,
            };
            onSave(updatedCategory as ProductCategoryDto);
        }
    };

    // Render details tab content
    const renderDetailsTab = () => {
        return (
            <div className="space-y-6">
                {/* Change Reason for Users Editing ACTIVE records */}
                {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                    <ChangeReasonField
                        value={formData.changeReason}
                        onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
                        disabled={!canEditDetails}
                    />
                )}

                {/* Change Reason Read-Only for approval states */}
                {showApprovalUI && selectedCategory?.changeReason && (
                    <ChangeReasonReadOnly value={selectedCategory.changeReason} />
                )}

                {/* Deletion/Deactivation Approval Card */}
                {showDeletionCard && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">
                                🗑️
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-800 m-0">
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
                        {selectedCategory?.changeReason && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-red-700">
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                                </p>
                                <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedCategory.changeReason}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Category Information Section */}
                <div
                    className={`border-2 rounded-xl p-4 sm:p-6 ${
                        showApprovalUI ? 'border-green-400 bg-white' : 'border-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600 m-0">Category Information</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Show inline diffs for approval states, editable inputs otherwise */}
                        {showApprovalUI ? (
                            <>
                                {renderFieldWithInlineDiff(
                                    'Category Name',
                                    'productCategoryName',
                                    selectedCategory?.productCategoryName,
                                    pendingVersion.productCategoryName,
                                    'bg-blue-500'
                                )}
                            </>
                        ) : (
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    name="productCategoryName"
                                    value={formData.productCategoryName}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, productCategoryName: e.target.value }))
                                    }
                                    placeholder={isCreateMode ? 'Enter category name' : ''}
                                    disabled={!canEditDetails}
                                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        !canEditDetails
                                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                    }`}
                                    required
                                />
                            </div>
                        )}

                        {/* Status field - read-only in edit mode */}
                        {!isCreateMode && selectedCategory && (
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                    Status
                                </label>
                                <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm bg-gray-50 text-gray-500">
                                    {getStatusText(selectedCategory.status)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Render logs tab content
    const renderLogsTab = () => {
        if (isCreateMode || !selectedCategory) return null;

        return (
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
                {renderActivityLogsTable(selectedCategory.activityLogs, 'No activity logs available.')}
            </div>
        );
    };

    const detailsTabLabel = `Category Information - ${getStatusText(currentStatus)}`;

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Success message */}
                {successMessage && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm shadow-sm">
                        {successMessage}
                    </div>
                )}

                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    type="button"
                                    onClick={() => onTabChange?.('details')}
                                    className={`${getTabClassName(
                                        currentStatus,
                                        activeTab === 'details'
                                    )} px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    {detailsTabLabel}
                                </button>
                                {!isCreateMode && (
                                    <button
                                        type="button"
                                        onClick={() => onTabChange?.('logs')}
                                        className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0 ${
                                            activeTab === 'logs'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 bg-white space-y-6">
                            {activeTab === 'details' && renderDetailsTab()}
                            {!isCreateMode && activeTab === 'logs' && renderLogsTab()}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6 sm:flex-row sm:items-center sm:justify-between">
                            {!isCreateMode && currentStatus === StatusEnum.ACTIVE ? (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed sm:w-auto"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              selectedCategory?.status === StatusEnum.INACTIVE &&
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
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    Reactivate
                                </button>
                            ) : (
                                <div className="hidden sm:block" />
                            )}

                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                {/* Save/Create button - only when editable */}
                                {(isCreateMode || currentStatus === StatusEnum.ACTIVE) && (
                                    <button
                                        type="submit"
                                        disabled={!canEditDetails || isLoading}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        {isCreateMode ? 'Create Category' : 'Save Changes'}
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
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
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
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
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

                                {/* Cancel button */}
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>
                </div>
            </form>
        </>
    );
}
