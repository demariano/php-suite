'use client';

import { ProductDto, StatusEnum } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../../../components';
import NumberInput from '../../../../../components/NumberInput';
import ProductCategorySearchableSelectionModal from '../../../../../search-modals/ProductCategorySearchableSelectionModal';
import ProductClassSearchableSelectionModal from '../../../../../search-modals/ProductClassSearchableSelectionModal';
import ProductDealSearchableSelectionModal from '../../../../../search-modals/ProductDealSearchableSelectionModal';
import ProductUnitPriceSelectionModal from '../../../../../search-modals/ProductUnitPriceSelectionModal';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import SelectionField from './SelectionField';

type ProductDealDetails = {
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
};

type ProductUnitPriceDetails = {
    productUnitId: string;
    productUnitName?: string;
    productPriceTypeId: string;
    productPriceTypeName?: string;
    cost?: number;
    price?: number;
};

interface ProductFormProps {
    isCreateMode: boolean;
    selectedProduct: ProductDto | null;
    successMessage: string | null;
    onSave: (product: ProductDto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    onApprove?: () => void;
    onDeny?: () => void;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'logs';
    onTabChange: (tab: 'details' | 'logs') => void;
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

// Helper function to normalize values for comparison
const normalizeValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (val === '') return '';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? '' : trimmed;
    }
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return String(val);
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
    }
    return String(val).trim();
};

// Helper function to format display value
const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function ProductForm({
    isCreateMode,
    selectedProduct,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    onApprove,
    onDeny,
    isAdminUser,
    isLoading,
    activeTab,
    onTabChange,
}: ProductFormProps) {
    const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
    const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);
    const [showUnitPriceModal, setShowUnitPriceModal] = useState(false);
    const [productDeals, setProductDeals] = useState<ProductDealDetails[]>([]);
    const [productUnitPrices, setProductUnitPrices] = useState<ProductUnitPriceDetails[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        productName: '',
        criticalLevel: '',
        changeReason: '',
    });

    const currentStatus = selectedProduct?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedProduct?.forApprovalVersion ?? {}) as Record<string, unknown>,
        [selectedProduct?.forApprovalVersion]
    );

    const canEditDetails = isCreateMode || currentStatus === StatusEnum.ACTIVE;

    useEffect(() => {
        if (!isCreateMode && selectedProduct) {
            if (selectedProduct.productCategoryId && selectedProduct.productCategoryName) {
                setSelectedCategory({
                    id: selectedProduct.productCategoryId,
                    name: selectedProduct.productCategoryName,
                });
            }

            if (selectedProduct.productClassId && selectedProduct.productClassName) {
                setSelectedClass({
                    id: selectedProduct.productClassId,
                    name: selectedProduct.productClassName,
                });
            }

            setProductDeals(
                (selectedProduct.productDeals ?? []).map((deal) => ({
                    productDealId: deal.productDealId,
                    productDealName: deal.productDealName,
                    additionalQty: deal.additionalQty,
                    minQty: deal.minQty,
                }))
            );

            setProductUnitPrices(
                (selectedProduct.productUnitPrice ?? []).map((price) => ({
                    productUnitId: price.productUnitId,
                    productUnitName: price.productUnitName,
                    productPriceTypeId: price.productPriceTypeId,
                    productPriceTypeName: price.productPriceTypeName,
                    cost: price.cost,
                    price: price.price,
                }))
            );

            setFormData({
                productName: selectedProduct.productName ?? '',
                criticalLevel:
                    selectedProduct.criticalLevel !== undefined && selectedProduct.criticalLevel !== null
                        ? String(selectedProduct.criticalLevel)
                        : '',
                changeReason: selectedProduct.changeReason ?? '',
            });
        }
    }, [isCreateMode, selectedProduct]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const errors: string[] = [];

        if (!formData.productName.trim()) {
            errors.push('Product name is required.');
        }

        if (!selectedCategory) {
            errors.push('Product category is required.');
        }

        if (!selectedClass) {
            errors.push('Product class is required.');
        }

        if (!isCreateMode && !isAdminUser && !formData.changeReason.trim()) {
            errors.push('Please provide a reason for the change.');
        }

        const dealIds = productDeals.map((deal) => deal.productDealId);
        if (new Set(dealIds).size !== dealIds.length) {
            errors.push('Duplicate product deals detected. Please remove duplicate deals.');
        }

        const unitPriceKeys = productUnitPrices.map((item) => `${item.productUnitId}|${item.productPriceTypeId}`);
        if (new Set(unitPriceKeys).size !== unitPriceKeys.length) {
            errors.push('Duplicate unit price combinations detected. Please remove duplicates.');
        }

        if (errors.length) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);

        const payload: ProductDto = {
            ...(selectedProduct ?? {}),
            productId: selectedProduct?.productId ?? '',
            productName: formData.productName.trim(),
            productCategoryId: selectedCategory?.id ?? '',
            productCategoryName: selectedCategory?.name ?? '',
            productClassId: selectedClass?.id ?? '',
            productClassName: selectedClass?.name ?? '',
            criticalLevel: formData.criticalLevel ? Number(formData.criticalLevel) : 0,
            productDeals,
            productUnitPrice: productUnitPrices,
            status: selectedProduct?.status ?? StatusEnum.NEW_RECORD,
            changeReason:
                !isCreateMode && !isAdminUser
                    ? formData.changeReason.trim() || undefined
                    : selectedProduct?.changeReason,
        };

        onSave(payload);
    };

    const handleCategorySelect = (value: { productCategoryId: string; productCategoryName?: string }) => {
        setSelectedCategory({
            id: value.productCategoryId,
            name: value.productCategoryName ?? '',
        });
        setShowCategoryModal(false);
    };

    const handleClassSelect = (value: { productClassId: string; productClassName?: string }) => {
        setSelectedClass({
            id: value.productClassId,
            name: value.productClassName ?? '',
        });
        setShowClassModal(false);
    };

    const handleDealSelect = (value: {
        productDealId: string;
        productDealName?: string;
        additionalQty?: number;
        minQty?: number;
    }) => {
        if (productDeals.some((deal) => deal.productDealId === value.productDealId)) {
            setValidationErrors(['This product deal has already been added. Please select a different deal.']);
            return;
        }

        setProductDeals((prev) => [
            ...prev,
            {
                productDealId: value.productDealId,
                productDealName: value.productDealName,
                additionalQty: value.additionalQty ?? 0,
                minQty: value.minQty ?? 0,
            },
        ]);
        setShowDealModal(false);
    };

    const handleUnitPriceSelect = (
        productUnitId: string,
        productUnitName: string,
        productPriceTypeId: string,
        productPriceTypeName: string
    ) => {
        const exists = productUnitPrices.some(
            (item) => item.productUnitId === productUnitId && item.productPriceTypeId === productPriceTypeId
        );

        if (exists) {
            setValidationErrors([
                'This product unit and price type combination has already been added. Please select a different combination.',
            ]);
            return;
        }

        setProductUnitPrices((prev) => [
            ...prev,
            {
                productUnitId,
                productUnitName,
                productPriceTypeId,
                productPriceTypeName,
                cost: 0,
                price: 0,
            },
        ]);
        setShowUnitPriceModal(false);
    };

    const updateProductUnitPrice = (index: number, field: keyof ProductUnitPriceDetails, value: number) => {
        setProductUnitPrices((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
    };

    const removeProductDeal = (index: number) => {
        setProductDeals((prev) => prev.filter((_, idx) => idx !== index));
    };

    const removeProductUnitPrice = (index: number) => {
        setProductUnitPrices((prev) => prev.filter((_, idx) => idx !== index));
    };

    // Helper function to check if arrays have changes
    const hasArrayChanges = (fieldName: string): boolean => {
        if (!selectedProduct?.forApprovalVersion) return false;
        const originalValue = (selectedProduct as any)[fieldName];
        const newValue = (selectedProduct.forApprovalVersion as any)[fieldName];

        if (!originalValue && !newValue) return false;
        if (!originalValue || !newValue) return true;
        if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;

        // Normalize arrays for comparison (exclude metadata fields)
        const normalizeArray = (arr: any[], idField: string) => {
            return arr
                .map((item) => {
                    const normalized: any = {};
                    Object.keys(item).forEach((key) => {
                        if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
                            normalized[key] = item[key];
                        }
                    });
                    return normalized;
                })
                .sort((a, b) => (a[idField] || '').localeCompare(b[idField] || ''));
        };

        if (fieldName === 'productDeals') {
            const normalizedOriginal = normalizeArray(originalValue, 'productDealId');
            const normalizedNew = normalizeArray(newValue, 'productDealId');
            return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
        } else if (fieldName === 'productUnitPrice') {
            // For productUnitPrice, use composite key (productUnitId|productPriceTypeId)
            const normalizedOriginal = normalizeArray(originalValue, 'productUnitId');
            const normalizedNew = normalizeArray(newValue, 'productUnitId');
            return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
        }

        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
    };

    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
        selectedProduct as Record<string, unknown>,
        (selectedProduct?.forApprovalVersion as Record<string, unknown>) ?? undefined
    );

    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
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

    // Helper to check if we're in an approval state (FOR_APPROVAL or NEW_RECORD)
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);

    // In create mode, we should show editable form fields, not the approval/diff UI
    // Even though status is NEW_RECORD (which triggers isApprovalState), create mode needs editable inputs
    const showApprovalUI = isApprovalState && !isCreateMode;

    // Check if we need to show deletion/deactivation card (defined at component level for use in footer)
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    // Helper to render inline field diff
    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        currentValue: any,
        pendingValue: any,
        colorClass: string = 'bg-blue-500'
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

    const renderDetailsTab = () => {
        // Get pending data for inner tables
        const pendingDeals = (pendingVersion.productDeals as ProductDealDetails[]) ?? [];
        const pendingUnitPrices = (pendingVersion.productUnitPrice as ProductUnitPriceDetails[]) ?? [];

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
                {showApprovalUI && selectedProduct?.changeReason && (
                    <ChangeReasonReadOnly value={selectedProduct.changeReason} />
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
                        {selectedProduct?.changeReason && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-red-700">
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                                </p>
                                <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedProduct.changeReason}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Product Information Section */}
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
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600 m-0">Product Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Show inline diffs for approval states, editable inputs otherwise */}
                        {showApprovalUI ? (
                            <>
                                {renderFieldWithInlineDiff(
                                    'Product Name',
                                    'productName',
                                    selectedProduct?.productName,
                                    pendingVersion.productName,
                                    'bg-blue-500'
                                )}
                                {renderFieldWithInlineDiff(
                                    'Critical Level',
                                    'criticalLevel',
                                    selectedProduct?.criticalLevel,
                                    pendingVersion.criticalLevel,
                                    'bg-blue-500'
                                )}
                                {renderFieldWithInlineDiff(
                                    'Product Category',
                                    'productCategoryName',
                                    selectedProduct?.productCategoryName,
                                    pendingVersion.productCategoryName,
                                    'bg-blue-500'
                                )}
                                {renderFieldWithInlineDiff(
                                    'Product Class',
                                    'productClassName',
                                    selectedProduct?.productClassName,
                                    pendingVersion.productClassName,
                                    'bg-blue-500'
                                )}
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        Product Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.productName}
                                        onChange={(event) =>
                                            setFormData((prev) => ({ ...prev, productName: event.target.value }))
                                        }
                                        disabled={!canEditDetails}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm focus:outline-none transition-all duration-200 ${
                                            canEditDetails
                                                ? 'border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                        }`}
                                        placeholder="Enter product name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        Critical Level
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.criticalLevel}
                                        min={0}
                                        onChange={(event) =>
                                            setFormData((prev) => ({ ...prev, criticalLevel: event.target.value }))
                                        }
                                        disabled={!canEditDetails}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm focus:outline-none transition-all duration-200 ${
                                            canEditDetails
                                                ? 'border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                        }`}
                                        placeholder="Enter critical level"
                                    />
                                </div>
                                <SelectionField
                                    label="Product Category *"
                                    selectedItem={selectedCategory}
                                    onSelect={() => setShowCategoryModal(true)}
                                    onClear={() => setSelectedCategory(null)}
                                    disabled={!canEditDetails}
                                />
                                <SelectionField
                                    label="Product Class *"
                                    selectedItem={selectedClass}
                                    onSelect={() => setShowClassModal(true)}
                                    onClear={() => setSelectedClass(null)}
                                    disabled={!canEditDetails}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Product Deals Section */}
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                            </svg>
                        </div>
                        <h3
                            className={`text-base font-bold ${
                                showApprovalUI && hasArrayChanges('productDeals')
                                    ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                    : 'text-blue-600'
                            }`}
                        >
                            Product Deals
                        </h3>
                    </div>

                    {!showApprovalUI && (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">
                                Manage product deals that can be associated with this product.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDealModal(true)}
                                disabled={!canEditDetails}
                                className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400"
                            >
                                Add Deal
                            </button>
                        </div>
                    )}

                    {/* Legend for approval state */}
                    {showApprovalUI && hasArrayChanges('productDeals') && (
                        <div className="flex flex-wrap gap-3 text-xs mb-2">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-green-100 rounded border border-green-300"></span>
                                <span>Added</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-blue-100 rounded border border-blue-300"></span>
                                <span>Modified</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-red-100 rounded border border-red-300"></span>
                                <span>Removed</span>
                            </span>
                        </div>
                    )}

                    {(
                        showApprovalUI
                            ? pendingDeals.length === 0 && productDeals.length === 0
                            : productDeals.length === 0
                    ) ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                            No product deals added.
                        </div>
                    ) : showApprovalUI ? (
                        /* Approval state: show row status indicators */
                        (() => {
                            const originalDeals = productDeals;
                            const newDeals = pendingDeals;
                            const originalIds = new Set(originalDeals.map((d) => d.productDealId));
                            const newIds = new Set(newDeals.map((d) => d.productDealId));

                            // Calculate row statuses
                            const rows: Array<{
                                deal: ProductDealDetails;
                                status: 'unchanged' | 'added' | 'modified' | 'removed';
                            }> = [];

                            // Helper to compare only relevant deal fields
                            const compareDeal = (a: ProductDealDetails, b: ProductDealDetails) => {
                                return (
                                    a.productDealId === b.productDealId &&
                                    a.productDealName === b.productDealName &&
                                    a.minQty === b.minQty &&
                                    a.additionalQty === b.additionalQty
                                );
                            };

                            // Added/Modified/Unchanged rows (from pending)
                            newDeals.forEach((newDeal) => {
                                const originalDeal = originalDeals.find(
                                    (d) => d.productDealId === newDeal.productDealId
                                );
                                if (!originalDeal) {
                                    rows.push({ deal: newDeal, status: 'added' });
                                } else if (!compareDeal(originalDeal, newDeal)) {
                                    rows.push({ deal: newDeal, status: 'modified' });
                                } else {
                                    rows.push({ deal: newDeal, status: 'unchanged' });
                                }
                            });

                            // Removed rows (in original but not in pending)
                            originalDeals.forEach((originalDeal) => {
                                if (!newIds.has(originalDeal.productDealId)) {
                                    rows.push({ deal: originalDeal, status: 'removed' });
                                }
                            });

                            return (
                                <div className="overflow-hidden border border-gray-200 rounded-xl">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Deal
                                                </th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Min Qty
                                                </th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Additional Qty
                                                </th>
                                                <th className="px-4 py-2 text-right font-semibold text-gray-600">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.deal.productDealId}
                                                    className={
                                                        row.status === 'added'
                                                            ? 'bg-green-50'
                                                            : row.status === 'modified'
                                                            ? 'bg-blue-50'
                                                            : row.status === 'removed'
                                                            ? 'bg-red-50'
                                                            : ''
                                                    }
                                                >
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {row.deal.productDealName ?? '-'}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-600'
                                                        }`}
                                                    >
                                                        {row.deal.minQty ?? 0}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-600'
                                                        }`}
                                                    >
                                                        {row.deal.additionalQty ?? 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {row.status === 'added' && (
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                ➕ ADDED
                                                            </span>
                                                        )}
                                                        {row.status === 'modified' && (
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                ✏️ MODIFIED
                                                            </span>
                                                        )}
                                                        {row.status === 'removed' && (
                                                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                                ➖ REMOVED
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()
                    ) : (
                        /* Normal editable state */
                        <div className="overflow-hidden border border-gray-200 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Deal</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Min Qty</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                            Additional Qty
                                        </th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {productDeals.map((deal, index) => (
                                        <tr key={deal.productDealId}>
                                            <td className="px-4 py-3 text-gray-700">{deal.productDealName ?? '-'}</td>
                                            <td className="px-4 py-3 text-gray-600">{deal.minQty ?? 0}</td>
                                            <td className="px-4 py-3 text-gray-600">{deal.additionalQty ?? 0}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => removeProductDeal(index)}
                                                    disabled={!isCreateMode && currentStatus !== StatusEnum.ACTIVE}
                                                    className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                                        !isCreateMode && currentStatus !== StatusEnum.ACTIVE
                                                            ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                                            : 'bg-red-600 hover:bg-red-700'
                                                    }`}
                                                    title="Remove"
                                                >
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Unit Pricing Section */}
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3
                            className={`text-base font-bold ${
                                showApprovalUI && hasArrayChanges('productUnitPrice')
                                    ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                    : 'text-blue-600'
                            }`}
                        >
                            Unit Pricing
                        </h3>
                    </div>

                    {!showApprovalUI && (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">
                                Configure pricing combinations for different units and price types.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowUnitPriceModal(true)}
                                disabled={!canEditDetails}
                                className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400"
                            >
                                Add Unit Price
                            </button>
                        </div>
                    )}

                    {/* Legend for approval state */}
                    {showApprovalUI && hasArrayChanges('productUnitPrice') && (
                        <div className="flex flex-wrap gap-3 text-xs mb-2">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-green-100 rounded border border-green-300"></span>
                                <span>Added</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-blue-100 rounded border border-blue-300"></span>
                                <span>Modified</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-red-100 rounded border border-red-300"></span>
                                <span>Removed</span>
                            </span>
                        </div>
                    )}

                    {(
                        showApprovalUI
                            ? pendingUnitPrices.length === 0 && productUnitPrices.length === 0
                            : productUnitPrices.length === 0
                    ) ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                            No unit prices configured.
                        </div>
                    ) : showApprovalUI ? (
                        /* Approval state: show row status indicators */
                        (() => {
                            const originalPrices = productUnitPrices;
                            const newPrices = pendingUnitPrices;
                            const getKey = (p: ProductUnitPriceDetails) => `${p.productUnitId}|${p.productPriceTypeId}`;
                            const originalKeys = new Set(originalPrices.map(getKey));
                            const newKeys = new Set(newPrices.map(getKey));

                            // Calculate row statuses
                            const rows: Array<{
                                price: ProductUnitPriceDetails;
                                status: 'unchanged' | 'added' | 'modified' | 'removed';
                            }> = [];

                            // Helper to compare only relevant price fields
                            const comparePrice = (a: ProductUnitPriceDetails, b: ProductUnitPriceDetails) => {
                                return (
                                    a.productUnitId === b.productUnitId &&
                                    a.productUnitName === b.productUnitName &&
                                    a.productPriceTypeId === b.productPriceTypeId &&
                                    a.productPriceTypeName === b.productPriceTypeName &&
                                    a.cost === b.cost &&
                                    a.price === b.price
                                );
                            };

                            // Added/Modified/Unchanged rows (from pending)
                            newPrices.forEach((newPrice) => {
                                const key = getKey(newPrice);
                                const originalPrice = originalPrices.find((p) => getKey(p) === key);
                                if (!originalPrice) {
                                    rows.push({ price: newPrice, status: 'added' });
                                } else if (!comparePrice(originalPrice, newPrice)) {
                                    rows.push({ price: newPrice, status: 'modified' });
                                } else {
                                    rows.push({ price: newPrice, status: 'unchanged' });
                                }
                            });

                            // Removed rows (in original but not in pending)
                            originalPrices.forEach((originalPrice) => {
                                if (!newKeys.has(getKey(originalPrice))) {
                                    rows.push({ price: originalPrice, status: 'removed' });
                                }
                            });

                            return (
                                <div className="overflow-hidden border border-gray-200 rounded-xl">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Unit
                                                </th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Price Type
                                                </th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Cost
                                                </th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                    Price
                                                </th>
                                                <th className="px-4 py-2 text-right font-semibold text-gray-600">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {rows.map((row) => (
                                                <tr
                                                    key={`${row.price.productUnitId}-${row.price.productPriceTypeId}`}
                                                    className={
                                                        row.status === 'added'
                                                            ? 'bg-green-50'
                                                            : row.status === 'modified'
                                                            ? 'bg-blue-50'
                                                            : row.status === 'removed'
                                                            ? 'bg-red-50'
                                                            : ''
                                                    }
                                                >
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {row.price.productUnitName ?? '-'}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {row.price.productPriceTypeName ?? '-'}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {row.price.cost ?? 0}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 ${
                                                            row.status === 'removed'
                                                                ? 'line-through text-gray-500'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {row.price.price ?? 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {row.status === 'added' && (
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                ➕ ADDED
                                                            </span>
                                                        )}
                                                        {row.status === 'modified' && (
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                ✏️ MODIFIED
                                                            </span>
                                                        )}
                                                        {row.status === 'removed' && (
                                                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                                ➖ REMOVED
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()
                    ) : (
                        /* Normal editable state */
                        <div className="overflow-hidden border border-gray-200 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Unit</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Price Type</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Cost</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Price</th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {productUnitPrices.map((price, index) => (
                                        <tr key={`${price.productUnitId}-${price.productPriceTypeId}`}>
                                            <td className="px-4 py-3 text-gray-700">{price.productUnitName ?? '-'}</td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {price.productPriceTypeName ?? '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <NumberInput
                                                    value={price.cost ?? 0}
                                                    onChange={(value) => updateProductUnitPrice(index, 'cost', value)}
                                                    disabled={!canEditDetails}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <NumberInput
                                                    value={price.price ?? 0}
                                                    onChange={(value) => updateProductUnitPrice(index, 'price', value)}
                                                    disabled={!canEditDetails}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => removeProductUnitPrice(index)}
                                                    disabled={!isCreateMode && currentStatus !== StatusEnum.ACTIVE}
                                                    className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                                        !isCreateMode && currentStatus !== StatusEnum.ACTIVE
                                                            ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                                            : 'bg-red-600 hover:bg-red-700'
                                                    }`}
                                                    title="Remove"
                                                >
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderLogsTab = () => (
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
            {renderActivityLogsTable(selectedProduct?.activityLogs, 'No activity logs available.')}
        </div>
    );

    const deleteDisabled = isCreateMode || currentStatus !== StatusEnum.ACTIVE;
    const detailsTabLabel = `Product Information - ${getStatusText(currentStatus)}`;

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                {successMessage && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm shadow-sm">
                        {successMessage}
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm space-y-2">
                        <p className="text-sm font-semibold text-red-700">Please fix the following errors:</p>
                        <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                            {validationErrors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    type="button"
                                    onClick={() => onTabChange('details')}
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
                                        onClick={() => onTabChange('logs')}
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
                                    disabled={deleteDisabled || isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto disabled:bg-red-300 disabled:cursor-not-allowed"
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
                              selectedProduct?.status === StatusEnum.INACTIVE &&
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
                                        {isCreateMode ? 'Create Product' : 'Save Changes'}
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

            <ProductCategorySearchableSelectionModal
                show={showCategoryModal}
                title="Select Product Category"
                selectedValue={selectedCategory?.id ?? null}
                onSelect={handleCategorySelect}
                onClose={() => setShowCategoryModal(false)}
            />

            <ProductClassSearchableSelectionModal
                show={showClassModal}
                title="Select Product Class"
                selectedValue={selectedClass?.id ?? null}
                onSelect={handleClassSelect}
                onClose={() => setShowClassModal(false)}
            />

            <ProductDealSearchableSelectionModal
                show={showDealModal}
                title="Select Product Deal"
                selectedValue={null}
                onSelect={handleDealSelect}
                onClose={() => setShowDealModal(false)}
            />

            <ProductUnitPriceSelectionModal
                show={showUnitPriceModal}
                onSelect={handleUnitPriceSelect}
                onClose={() => setShowUnitPriceModal(false)}
            />
        </>
    );
}
