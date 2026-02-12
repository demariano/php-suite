'use client';

import { ProductDealDto, StatusEnum } from '@data-access/index';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../components';
import { createFieldChangeDetector } from '../../../utils/fieldChangeDetection';

interface ProductDealFormProps {
    isCreateMode: boolean;
    selectedProductDeal: ProductDealDto | null;
    successMessage: string | null;
    onSave: (productDeal: ProductDealDto) => void;
    onDelete: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
}

// Helper function to format display value
const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function ProductDealForm({
    isCreateMode,
    selectedProductDeal,
    successMessage,
    onSave,
    onDelete,
    onCancel,
    isAdminUser = false,
    onApprove,
    onDeny,
}: ProductDealFormProps) {
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        productDealName: '',
        minQty: '',
        additionalQty: '',
        changeReason: '',
    });

    const currentStatus = selectedProductDeal?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedProductDeal?.forApprovalVersion ?? {}) as any,
        [selectedProductDeal?.forApprovalVersion]
    );

    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);
    const showApprovalUI = isApprovalState && !isCreateMode;
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION;

    useEffect(() => {
        if (!isCreateMode && selectedProductDeal) {
            setFormData({
                productDealName: selectedProductDeal.productDealName || '',
                minQty: selectedProductDeal.minQty?.toString() || '',
                additionalQty: selectedProductDeal.additionalQty?.toString() || '',
                changeReason: selectedProductDeal.changeReason || '',
            });
        }
    }, [isCreateMode, selectedProductDeal]);

    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
        (selectedProductDeal ?? {}) as any,
        (selectedProductDeal?.forApprovalVersion as any) ?? undefined
    );

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
                        <span className="mx-2 text-blue-600">&rarr;</span>
                        <span className="font-semibold text-blue-700">{formatValue(pendingValue)}</span>
                    </div>
                </div>
            );
        }

        // Normal read-only display
        const isNewRecord = currentStatus === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                    {label}
                </label>
                <div
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                        hasChange
                            ? 'border-blue-500 bg-blue-50 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                    {formatValue(displayValue)}
                </div>
            </div>
        );
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const errors: string[] = [];

        if (!formData.productDealName?.trim()) {
            errors.push('Product Deal Name is required.');
        }

        if (formData.minQty && isNaN(Number(formData.minQty))) {
            errors.push('Minimum Quantity must be a valid number.');
        }

        if (formData.additionalQty && isNaN(Number(formData.additionalQty))) {
            errors.push('Additional Quantity must be a valid number.');
        }

        if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason?.trim() === '')) {
            errors.push('Please provide a reason for the change.');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);

        if (isCreateMode) {
            const newProductDeal = {
                productDealName: formData.productDealName,
                minQty: formData.minQty ? Number(formData.minQty) : undefined,
                additionalQty: formData.additionalQty ? Number(formData.additionalQty) : undefined,
                status: StatusEnum.NEW_RECORD,
            } as ProductDealDto;
            onSave(newProductDeal);
        } else {
            // Determine status based on user role
            const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;

            const updatedProductDeal = {
                ...selectedProductDeal,
                productDealName: formData.productDealName,
                minQty: formData.minQty ? Number(formData.minQty) : undefined,
                additionalQty: formData.additionalQty ? Number(formData.additionalQty) : undefined,
                status: newStatus,
                changeReason: formData.changeReason?.trim() || undefined,
            } as ProductDealDto;
            onSave(updatedProductDeal);
        }
    };

    const isFormDisabled = !isCreateMode && selectedProductDeal?.status !== StatusEnum.ACTIVE;

    return (
        <form onSubmit={handleSubmit}>
            {successMessage && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                        ✓
                    </div>
                    <span className="text-sm font-semibold">{successMessage}</span>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="mb-4 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
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

            {/* Change Reason for Users Editing ACTIVE records */}
            {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                <ChangeReasonField
                    value={formData.changeReason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
                    disabled={isFormDisabled}
                />
            )}

            {/* Change Reason Read-Only for approval states */}
            {showApprovalUI && selectedProductDeal?.changeReason && (
                <ChangeReasonReadOnly value={selectedProductDeal.changeReason} />
            )}

            {/* Deletion Approval Card */}
            {showDeletionCard && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">
                            🗑️
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-800 m-0">Record Marked for Deletion</h3>
                            <p className="text-sm text-red-700">
                                This record has been marked for deletion and is awaiting approval.
                            </p>
                        </div>
                    </div>
                    {selectedProductDeal?.changeReason && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-red-700">Deletion Reason</p>
                            <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedProductDeal.changeReason}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className={`rounded-xl border-2 p-4 sm:p-6 ${showApprovalUI ? 'border-green-400 bg-white' : 'border-gray-200'}`}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                                <svg
                                    className="h-5 w-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Product Deal Information</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {showApprovalUI ? (
                                <>
                                    {renderFieldWithInlineDiff(
                                        'Product Deal Name',
                                        'productDealName',
                                        selectedProductDeal?.productDealName,
                                        pendingVersion.productDealName,
                                        'bg-blue-500'
                                    )}
                                    {renderFieldWithInlineDiff(
                                        'Minimum Quantity',
                                        'minQty',
                                        selectedProductDeal?.minQty,
                                        pendingVersion.minQty,
                                        'bg-blue-500'
                                    )}
                                    <div className="sm:col-span-2">
                                        {renderFieldWithInlineDiff(
                                            'Additional Quantity',
                                            'additionalQty',
                                            selectedProductDeal?.additionalQty,
                                            pendingVersion.additionalQty,
                                            'bg-blue-500'
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="group">
                                        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                            Product Deal Name
                                        </label>
                                        <input
                                            type="text"
                                            name="productDealName"
                                            value={formData.productDealName}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, productDealName: e.target.value }))
                                            }
                                            placeholder={isCreateMode ? 'Enter product deal name' : ''}
                                            disabled={isFormDisabled}
                                            className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                                isFormDisabled
                                                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                                                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                            }`}
                                            required
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                            Minimum Quantity
                                        </label>
                                        <input
                                            type="number"
                                            name="minQty"
                                            value={formData.minQty}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, minQty: e.target.value }))}
                                            placeholder={isCreateMode ? 'Enter minimum quantity' : ''}
                                            disabled={isFormDisabled}
                                            min="0"
                                            step="1"
                                            className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                                isFormDisabled
                                                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                                                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                            }`}
                                        />
                                    </div>
                                    <div className="group sm:col-span-2">
                                        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                            Additional Quantity
                                        </label>
                                        <input
                                            type="number"
                                            name="additionalQty"
                                            value={formData.additionalQty}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, additionalQty: e.target.value }))
                                            }
                                            placeholder={isCreateMode ? 'Enter additional quantity' : ''}
                                            disabled={isFormDisabled}
                                            min="0"
                                            step="1"
                                            className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                                isFormDisabled
                                                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                                                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                            }`}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {!isCreateMode && currentStatus === StatusEnum.ACTIVE ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
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
                ) : (
                    <div className="hidden sm:block" />
                )}

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {/* Save/Create button - only when editable */}
                    {(isCreateMode || currentStatus === StatusEnum.ACTIVE) && (
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isCreateMode ? 'Create Product Deal' : 'Save Changes'}
                        </button>
                    )}

                    {/* Approval Buttons - shown when admin user and approval/deletion state */}
                    {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                        <>
                            <button
                                type="button"
                                onClick={onDeny}
                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </form>
    );
}
