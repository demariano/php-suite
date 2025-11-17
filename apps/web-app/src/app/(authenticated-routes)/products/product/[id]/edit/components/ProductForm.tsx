'use client';

import { ProductDto, StatusEnum } from '@data-access/index';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../../../components';
import NumberInput from '../../../../../components/NumberInput';
import ProductCategorySearchableSelectionModal from '../../../../../search-modals/ProductCategorySearchableSelectionModal';
import ProductClassSearchableSelectionModal from '../../../../../search-modals/ProductClassSearchableSelectionModal';
import ProductDealSearchableSelectionModal from '../../../../../search-modals/ProductDealSearchableSelectionModal';
import ProductUnitPriceSelectionModal from '../../../../../search-modals/ProductUnitPriceSelectionModal';
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
    onCancel: () => void;
    onApprove?: () => void;
    onDeny?: () => void;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'approval' | 'logs';
    onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
}

const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-600 text-white shadow-sm',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white shadow-sm',
    [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white shadow-sm',
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

        const unitPriceKeys = productUnitPrices.map(
            (item) => `${item.productUnitId}|${item.productPriceTypeId}`
        );
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
                !isCreateMode && !isAdminUser ? formData.changeReason.trim() || undefined : selectedProduct?.changeReason,
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
            (item) =>
                item.productUnitId === productUnitId && item.productPriceTypeId === productPriceTypeId
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

    const updateProductUnitPrice = (
        index: number,
        field: keyof ProductUnitPriceDetails,
        value: number
    ) => {
        setProductUnitPrices((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
        );
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
            return arr.map(item => {
                const normalized: any = {};
                Object.keys(item).forEach(key => {
                    if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
                        normalized[key] = item[key];
                    }
                });
                return normalized;
            }).sort((a, b) => (a[idField] || '').localeCompare(b[idField] || ''));
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
    
    // Helper function to check if a field has changed
    const isFieldChanged = (fieldName: string): boolean => {
        if (!selectedProduct?.forApprovalVersion) return false;
        
        const originalValue = (selectedProduct as any)[fieldName];
        const newValue = (selectedProduct.forApprovalVersion as any)[fieldName];
        
        if (!(fieldName in selectedProduct.forApprovalVersion)) return false;
        
        if (Array.isArray(originalValue) && Array.isArray(newValue)) {
            return JSON.stringify(originalValue) !== JSON.stringify(newValue);
        }
        
        const normalizedOriginal = normalizeValue(originalValue);
        const normalizedNew = normalizeValue(newValue);
        
        const hasChanged = normalizedOriginal !== normalizedNew;
        
        return hasChanged;
    };
    
    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
        const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;
        
        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                    {label}
                </label>
                <div className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                    fieldChanged 
                        ? 'border-blue-500 bg-blue-50 text-gray-700' 
                        : 'border-gray-200 bg-white text-gray-500'
                }`}>
                    {formatValue(value)}
                </div>
            </div>
        );
    };

    const renderDetailsTab = () => (
        <div className="space-y-6">
            <ChangeReasonField
                value={formData.changeReason}
                onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                disabled={isFormDisabled}
            />
            
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Product Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            Product Name
                        </label>
                        <input
                            type="text"
                            value={formData.productName}
                            onChange={(event) => setFormData((prev) => ({ ...prev, productName: event.target.value }))}
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
                            onChange={(event) => setFormData((prev) => ({ ...prev, criticalLevel: event.target.value }))}
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
                </div>
            </div>

            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Product Deals</h3>
                </div>

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

                {productDeals.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                        No product deals added.
                    </div>
                ) : (
                    <div className="overflow-hidden border border-gray-200 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Deal</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Min Qty</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Additional Qty</th>
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
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Unit Pricing</h3>
                </div>

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

                {productUnitPrices.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                        No unit prices configured.
                    </div>
                ) : (
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
                                        <td className="px-4 py-3 text-gray-700">{price.productPriceTypeName ?? '-'}</td>
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
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

            {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-2">
                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Change Reason
                    </label>
                    <textarea
                        value={formData.changeReason}
                        onChange={(event) => setFormData((prev) => ({ ...prev, changeReason: event.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Describe the changes you made to this product..."
                    />
                    <p className="text-xs text-gray-500">
                        This field is required when submitting updates for approval.
                    </p>
                </div>
            )}
        </div>
    );

    const renderApprovalTab = () => {
        if (!selectedProduct) {
            return null;
        }

        if (currentStatus === StatusEnum.FOR_DELETION) {
            return (
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
                    {selectedProduct.changeReason && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-red-700">Deletion Reason</p>
                            <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedProduct.changeReason}
                            </div>
                        </div>
                    )}
                    {isAdminUser && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t-2 border-gray-200">
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onDeny}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Deny Deletion
                                </button>
                                <button
                                    type="button"
                                    onClick={onApprove}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Approve Deletion
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        const approvalData = pendingVersion;
        
        const pendingDeals = (pendingVersion.productDeals as ProductDealDetails[]) ?? [];
        const pendingUnitPrices = (pendingVersion.productUnitPrice as ProductUnitPriceDetails[]) ?? [];

        return (
            <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
                <ChangeReasonReadOnly value={selectedProduct?.changeReason} />

                {/* Product Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">
                                Product Information
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderReadOnlyField('Product Name', pendingVersion.productName, 'bg-blue-500', 'productName')}
                            {renderReadOnlyField('Critical Level', pendingVersion.criticalLevel, 'bg-blue-500', 'criticalLevel')}
                            {renderReadOnlyField('Product Category', pendingVersion.productCategoryName, 'bg-blue-500', 'productCategoryName')}
                            {renderReadOnlyField('Product Class', pendingVersion.productClassName, 'bg-blue-500', 'productClassName')}
                        </div>
                    </div>
                </div>

                {/* Product Deals */}
                {(() => {
                    const dealsChanged = hasArrayChanges('productDeals');
                    const originalDeals = selectedProduct.productDeals;
                    const newDeals = pendingDeals;
                    const originalHasItems = originalDeals && Array.isArray(originalDeals) && originalDeals.length > 0;
                    const newHasItems = newDeals && Array.isArray(newDeals) && newDeals.length > 0;
                    const allRemoved = originalHasItems && !newHasItems;
                    
                    // Render if there are changes OR if new array has items
                    if (!dealsChanged && !newHasItems) return null;
                    
                    return (
                        <div className="mt-6">
                            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h4 className={`text-base font-bold ${dealsChanged ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700' : 'text-blue-600'}`}>
                                        Product Deals
                                    </h4>
                                </div>
                                {allRemoved ? (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-600 rounded-lg">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    All Product Deals records have been removed
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    {originalDeals.length} record{originalDeals.length !== 1 ? 's' : ''} will be deleted upon approval
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                        {!newHasItems ? (
                                            <div className="p-10 text-center text-gray-500 text-base">
                                                No product deals in pending changes.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead className="bg-white border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Product Deal Name
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Minimum Quantity
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Additional Quantity
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {newDeals.map((deal: any, index: number) => (
                                                            <tr 
                                                                key={index}
                                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                                            >
                                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                    {deal.productDealName || '-'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {deal.minQty || 0}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {deal.additionalQty || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Unit Pricing */}
                {(() => {
                    const pricesChanged = hasArrayChanges('productUnitPrice');
                    const originalPrices = selectedProduct.productUnitPrice;
                    const newPrices = pendingUnitPrices;
                    const originalHasItems = originalPrices && Array.isArray(originalPrices) && originalPrices.length > 0;
                    const newHasItems = newPrices && Array.isArray(newPrices) && newPrices.length > 0;
                    const allRemoved = originalHasItems && !newHasItems;
                    
                    // Render if there are changes OR if new array has items
                    if (!pricesChanged && !newHasItems) return null;
                    
                    return (
                        <div className="mt-6">
                            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className={`text-base font-bold ${pricesChanged ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700' : 'text-blue-600'}`}>
                                        Unit Pricing
                                    </h4>
                                </div>
                                {allRemoved ? (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-600 rounded-lg">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    All Unit Pricing records have been removed
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    {originalPrices.length} record{originalPrices.length !== 1 ? 's' : ''} will be deleted upon approval
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                        {!newHasItems ? (
                                            <div className="p-10 text-center text-gray-500 text-base">
                                                No unit prices in pending changes.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead className="bg-white border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Product Unit
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Price Type
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Cost
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Price
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {newPrices.map((price: any, index: number) => (
                                                            <tr 
                                                                key={index}
                                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                                            >
                                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                    {price.productUnitName || '-'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {price.productPriceTypeName || '-'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {price.cost || 0}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {price.price || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {isAdminUser && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t-2 border-gray-200">
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                onClick={onDeny}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Deny Changes
                            </button>
                            <button
                                type="button"
                                onClick={onApprove}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Approve Changes
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderLogsTab = () => (
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-200">
                {(selectedProduct?.activityLogs ?? []).length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No activity logs available.</p>
                ) : (
                    (selectedProduct?.activityLogs ?? []).map((log, index) => (
                        <p key={`${log}-${index}`} className="p-4 text-sm text-gray-700">
                            {log}
                        </p>
                    ))
                )}
            </div>
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
                                    className={`${getTabClassName(currentStatus, activeTab === 'details')} px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {detailsTabLabel}
                                </button>
                                {!isCreateMode && (
                                    <>
                                        {currentStatus !== StatusEnum.ACTIVE && (
                                            <button
                                                type="button"
                                                onClick={() => onTabChange('approval')}
                                                className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0 ${
                                                    activeTab === 'approval'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Pending Changes
                                            </button>
                                        )}
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Activity Logs
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                <div className="p-4 sm:p-6 bg-white space-y-6">
                    {activeTab === 'details' && renderDetailsTab()}
                    {!isCreateMode && activeTab === 'approval' && renderApprovalTab()}
                    {!isCreateMode && activeTab === 'logs' && renderLogsTab()}
                </div>

                {/* Action Buttons */}
                {activeTab !== 'approval' && (
                    <div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6 sm:flex-row sm:items-center sm:justify-between">
                        {!isCreateMode && currentStatus === StatusEnum.ACTIVE ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={deleteDisabled || isLoading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto disabled:bg-red-300 disabled:cursor-not-allowed"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {isCreateMode ? 'Create Product' : 'Save Changes'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
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

