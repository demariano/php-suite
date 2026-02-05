'use client';

import {
    ProductApi,
    ProductDto,
    ProductUnitDto,
    ProductUnitRawMaterialDto,
    RawMaterialDto,
    RawMaterialUnitDto,
    RawMaterialsPerUnitDto,
    StatusEnum,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField } from '../../../../../components';
import ProductSearchableSelectionModal from '../../../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../../../search-modals/ProductUnitSearchableSelectionModal';
import RawMaterialSearchableSelectionModal from '../../../../../search-modals/RawMaterialSearchableSelectionModal';
import RawMaterialUnitSearchableSelectionModal from '../../../../../search-modals/RawMaterialUnitSearchableSelectionModal';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import SelectionField from '../../../../product/[id]/edit/components/SelectionField';

interface ProductUnitRawMaterialFormProps {
    isCreateMode: boolean;
    selectedRecord: ProductUnitRawMaterialDto | null;
    successMessage: string | null;
    onSave: (record: ProductUnitRawMaterialDto) => void;
    onDelete: () => void;
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

const normalizeValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (val === '') return '';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? '' : trimmed;
    }
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
    }
    return String(val).trim();
};

const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function ProductUnitRawMaterialForm({
    isCreateMode,
    selectedRecord,
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
}: ProductUnitRawMaterialFormProps) {
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [productUnits, setProductUnits] = useState<ProductUnitDto[]>([]);
    const [rawMaterials, setRawMaterials] = useState<ProductDto[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [rawMaterialsPerUnit, setRawMaterialsPerUnit] = useState<RawMaterialsPerUnitDto[]>([]);
    const [unitModalStates, setUnitModalStates] = useState<Record<number, boolean>>({});
    const [newRawMaterialItem, setNewRawMaterialItem] = useState<
        Record<
            number,
            {
                rawMaterialId: string;
                rawMaterialName: string;
                rawMaterialUnitId: string;
                rawMaterialUnitName: string;
                quantity: string;
            }
        >
    >({});
    const [showRawMaterialModal, setShowRawMaterialModal] = useState<{ unitIndex: number | null; show: boolean }>({
        unitIndex: null,
        show: false,
    });
    const [showRawMaterialUnitModal, setShowRawMaterialUnitModal] = useState<{
        unitIndex: number | null;
        show: boolean;
    }>({ unitIndex: null, show: false });
    const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialDto | null>(null);
    const [selectedRawMaterialUnit, setSelectedRawMaterialUnit] = useState<RawMaterialUnitDto | null>(null);
    const [changeReason, setChangeReason] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const currentStatus = selectedRecord?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedRecord?.forApprovalVersion ?? {}) as Record<string, unknown>,
        [selectedRecord?.forApprovalVersion]
    );
    const showApprovalButtons =
        isAdminUser && (currentStatus === StatusEnum.FOR_APPROVAL || currentStatus === StatusEnum.FOR_DELETION);

    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
        selectedRecord as Record<string, unknown>,
        (selectedRecord?.forApprovalVersion as Record<string, unknown>) ?? undefined
    );

    // Helper function to check if arrays have changes
    const hasArrayChanges = (fieldName: string): boolean => {
        if (!selectedRecord?.forApprovalVersion) return false;
        const originalValue = (selectedRecord as any)[fieldName];
        const newValue = (selectedRecord.forApprovalVersion as any)[fieldName];

        if (!originalValue && !newValue) return false;
        if (!originalValue || !newValue) return true;
        if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;

        // Normalize arrays for comparison (exclude metadata fields)
        const normalizeArray = (arr: any[]) => {
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
                .sort((a, b) => (a.productUnitId || '').localeCompare(b.productUnitId || ''));
        };

        const normalizedOriginal = normalizeArray(originalValue);
        const normalizedNew = normalizeArray(newValue);
        return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
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

    const canEditDetails = isCreateMode || currentStatus === StatusEnum.ACTIVE;
    const detailsTabLabel = `Product Unit Raw Material - ${getStatusText(currentStatus)}`;
    const deleteDisabled = isCreateMode || currentStatus !== StatusEnum.ACTIVE;

    // Fetch products, units, and raw materials
    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const [productsRes, unitsRes, rawMaterialsRes] = await Promise.all([
                    ProductApi.getProducts(100, StatusEnum.ACTIVE, undefined, undefined, userRole),
                    ProductApi.getProductUnits(100, StatusEnum.ACTIVE, undefined, undefined, userRole),
                    ProductApi.getProducts(100, StatusEnum.ACTIVE, undefined, undefined, userRole),
                ]);

                if (productsRes?.statusCode === 200) setProducts(productsRes.data);
                if (unitsRes?.statusCode === 200) setProductUnits(unitsRes.data);
                if (rawMaterialsRes?.statusCode === 200) setRawMaterials(rawMaterialsRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Initialize form from selected record
    useEffect(() => {
        if (!isCreateMode && selectedRecord) {
            setSelectedProductId(selectedRecord.productId ?? '');
            if (selectedRecord.productId && selectedRecord.productName) {
                setSelectedProduct({
                    id: selectedRecord.productId,
                    name: selectedRecord.productName,
                });
            }
            setRawMaterialsPerUnit(selectedRecord.rawMaterialsPerUnit ?? []);
            setChangeReason(selectedRecord.changeReason ?? '');
        }
    }, [isCreateMode, selectedRecord]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const errors: string[] = [];

        if (!selectedProductId) {
            errors.push('Product is required.');
        }

        if (rawMaterialsPerUnit.length === 0) {
            errors.push('At least one product unit with raw materials is required.');
        }

        rawMaterialsPerUnit.forEach((unit, unitIndex) => {
            if (!unit.productUnitId) {
                errors.push(`Product unit ${unitIndex + 1}: Unit is required.`);
            }
            if (!unit.rawMaterials || unit.rawMaterials.length === 0) {
                errors.push(`Product unit ${unitIndex + 1}: At least one raw material is required.`);
            }
            unit.rawMaterials?.forEach((rm, rmIndex) => {
                if (!rm.rawMaterialId) {
                    errors.push(`Product unit ${unitIndex + 1}, Raw material ${rmIndex + 1}: Material is required.`);
                }
                if (!rm.quantity || rm.quantity <= 0) {
                    errors.push(
                        `Product unit ${unitIndex + 1}, Raw material ${rmIndex + 1}: Quantity must be greater than 0.`
                    );
                }
            });
        });

        // Check for duplicate product units
        const productUnitIds = rawMaterialsPerUnit.map((unit) => unit.productUnitId).filter((id) => id);
        const duplicateUnits = productUnitIds.filter((id, index) => productUnitIds.indexOf(id) !== index);
        if (duplicateUnits.length > 0) {
            const duplicateUnitNames = duplicateUnits.map((id) => {
                const unit = productUnits.find((u) => u.productUnitId === id);
                return unit?.productUnitName || id;
            });
            errors.push(
                `Duplicate product units detected: ${duplicateUnitNames.join(
                    ', '
                )}. Each product unit can only be added once.`
            );
        }

        if (!isCreateMode && !isAdminUser && !changeReason.trim()) {
            errors.push('Please provide a reason for the change.');
        }

        setValidationErrors(errors);

        if (errors.length > 0) {
            return;
        }

        const selectedProduct = products.find((p) => p.productId === selectedProductId);
        const productName = selectedProduct?.productName ?? '';

        const record: ProductUnitRawMaterialDto = {
            productUnitRawMaterialId: selectedRecord?.productUnitRawMaterialId ?? '',
            productId: selectedProductId,
            productName,
            rawMaterialsPerUnit: rawMaterialsPerUnit.map((unit) => {
                const selectedUnit = productUnits.find((u) => u.productUnitId === unit.productUnitId);
                return {
                    productUnitId: unit.productUnitId,
                    productUnitName: selectedUnit?.productUnitName ?? '',
                    rawMaterials:
                        unit.rawMaterials?.map((rm) => {
                            const selectedRM = rawMaterials.find((r) => r.productId === rm.rawMaterialId);
                            return {
                                rawMaterialId: rm.rawMaterialId,
                                rawMaterialName: rm.rawMaterialName || selectedRM?.productName || '',
                                rawMaterialUnitId: rm.rawMaterialUnitId,
                                rawMaterialUnitName: rm.rawMaterialUnitName,
                                quantity: rm.quantity,
                            };
                        }) ?? [],
                };
            }),
            changeReason: changeReason.trim(),
            status: selectedRecord?.status ?? StatusEnum.NEW_RECORD,
        };

        onSave(record);
    };

    const handleAddUnit = () => {
        setRawMaterialsPerUnit([
            ...rawMaterialsPerUnit,
            {
                productUnitId: '',
                productUnitName: '',
                rawMaterials: [],
            },
        ]);
    };

    const handleRemoveUnit = (unitIndex: number) => {
        setRawMaterialsPerUnit(rawMaterialsPerUnit.filter((_, idx) => idx !== unitIndex));
    };

    const handleUnitChange = (unitIndex: number, productUnitId: string) => {
        const selectedUnit = productUnits.find((u) => u.productUnitId === productUnitId);
        const updated = [...rawMaterialsPerUnit];
        updated[unitIndex] = {
            ...updated[unitIndex],
            productUnitId,
            productUnitName: selectedUnit?.productUnitName ?? '',
        };
        setRawMaterialsPerUnit(updated);
    };

    const handleAddRawMaterial = (unitIndex: number) => {
        const updated = [...rawMaterialsPerUnit];
        updated[unitIndex].rawMaterials = [
            ...(updated[unitIndex].rawMaterials ?? []),
            {
                rawMaterialId: '',
                rawMaterialName: '',
                rawMaterialUnitId: '',
                rawMaterialUnitName: '',
                quantity: 0,
            },
        ];
        setRawMaterialsPerUnit(updated);
    };

    const handleRemoveRawMaterial = (unitIndex: number, rmIndex: number) => {
        const updated = [...rawMaterialsPerUnit];
        updated[unitIndex].rawMaterials = updated[unitIndex].rawMaterials?.filter((_, idx) => idx !== rmIndex) ?? [];
        setRawMaterialsPerUnit(updated);
    };

    const handleRawMaterialChange = (unitIndex: number, rmIndex: number, field: string, value: any) => {
        const updated = [...rawMaterialsPerUnit];
        if (!updated[unitIndex].rawMaterials) {
            updated[unitIndex].rawMaterials = [];
        }

        const rawMaterial = updated[unitIndex].rawMaterials![rmIndex];

        if (field === 'rawMaterialId') {
            const selectedRM = rawMaterials.find((r) => r.productId === value);
            rawMaterial.rawMaterialId = value;
            rawMaterial.rawMaterialName = selectedRM?.productName ?? '';
        } else if (field === 'rawMaterialUnitId') {
            const selectedUnit = productUnits.find((u) => u.productUnitId === value);
            rawMaterial.rawMaterialUnitId = value;
            rawMaterial.rawMaterialUnitName = selectedUnit?.productUnitName ?? '';
        } else if (field === 'quantity') {
            rawMaterial.quantity = Number(value);
        }

        setRawMaterialsPerUnit(updated);
    };

    const handleProductSelect = (product: ProductDto) => {
        setSelectedProduct({
            id: product.productId,
            name: product.productName ?? '',
        });
        setSelectedProductId(product.productId);
        setShowProductModal(false);
    };

    const handleProductClear = () => {
        setSelectedProduct(null);
        setSelectedProductId('');
    };

    const handleUnitSelect = (unitIndex: number, unit: ProductUnitDto) => {
        const updated = [...rawMaterialsPerUnit];
        updated[unitIndex] = {
            ...updated[unitIndex],
            productUnitId: unit.productUnitId,
            productUnitName: unit.productUnitName ?? '',
        };
        setRawMaterialsPerUnit(updated);
        setUnitModalStates({ ...unitModalStates, [unitIndex]: false });
    };

    const handleRawMaterialSelect = (rawMaterial: RawMaterialDto, unitIndex: number) => {
        setSelectedRawMaterial(rawMaterial);
        setNewRawMaterialItem({
            ...newRawMaterialItem,
            [unitIndex]: {
                ...newRawMaterialItem[unitIndex],
                rawMaterialId: rawMaterial.rawMaterialId,
                rawMaterialName: rawMaterial.rawMaterialName ?? '',
            },
        });
        setShowRawMaterialModal({ unitIndex: null, show: false });
    };

    const handleRawMaterialUnitSelect = (unit: RawMaterialUnitDto, unitIndex: number) => {
        setSelectedRawMaterialUnit(unit);
        setNewRawMaterialItem({
            ...newRawMaterialItem,
            [unitIndex]: {
                ...newRawMaterialItem[unitIndex],
                rawMaterialUnitId: unit.rawMaterialUnitId,
                rawMaterialUnitName: unit.rawMaterialUnitName ?? '',
            },
        });
        setShowRawMaterialUnitModal({ unitIndex: null, show: false });
    };

    const handleAddRawMaterialToUnit = (unitIndex: number) => {
        const item = newRawMaterialItem[unitIndex];
        if (!item || !item.rawMaterialId || !item.rawMaterialUnitId || !item.quantity || Number(item.quantity) <= 0) {
            return;
        }

        const updated = [...rawMaterialsPerUnit];
        updated[unitIndex].rawMaterials = [
            ...(updated[unitIndex].rawMaterials ?? []),
            {
                rawMaterialId: item.rawMaterialId,
                rawMaterialName: item.rawMaterialName,
                rawMaterialUnitId: item.rawMaterialUnitId,
                rawMaterialUnitName: item.rawMaterialUnitName,
                quantity: Number(item.quantity),
            },
        ];
        setRawMaterialsPerUnit(updated);

        // Clear the form for this unit
        setNewRawMaterialItem({
            ...newRawMaterialItem,
            [unitIndex]: {
                rawMaterialId: '',
                rawMaterialName: '',
                rawMaterialUnitId: '',
                rawMaterialUnitName: '',
                quantity: '',
            },
        });
        setSelectedRawMaterial(null);
        setSelectedRawMaterialUnit(null);
    };

    const clearRawMaterialSelection = (unitIndex: number) => {
        setSelectedRawMaterial(null);
        setNewRawMaterialItem({
            ...newRawMaterialItem,
            [unitIndex]: {
                ...newRawMaterialItem[unitIndex],
                rawMaterialId: '',
                rawMaterialName: '',
            },
        });
    };

    const clearRawMaterialUnitSelection = (unitIndex: number) => {
        setSelectedRawMaterialUnit(null);
        setNewRawMaterialItem({
            ...newRawMaterialItem,
            [unitIndex]: {
                ...newRawMaterialItem[unitIndex],
                rawMaterialUnitId: '',
                rawMaterialUnitName: '',
            },
        });
    };

    const hasFieldChanged = useMemo(() => {
        if (isCreateMode || !selectedRecord) return () => false;

        const detectChange = createFieldChangeDetector(selectedRecord as any, pendingVersion);
        return (fieldName: string) => detectChange(fieldName);
    }, [isCreateMode, selectedRecord, pendingVersion]);

    const renderDetailsTab = () => (
        <div className="space-y-6">
            {!isCreateMode && !isAdminUser && (
                <ChangeReasonField
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    disabled={!canEditDetails}
                />
            )}

            {/* Product Information Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Product Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectionField
                        label="Product *"
                        selectedItem={selectedProduct}
                        onSelect={() => setShowProductModal(true)}
                        onClear={handleProductClear}
                        disabled={!canEditDetails || isLoading}
                    />
                </div>
            </div>

            {/* Raw Materials Per Unit Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0 flex-1">Raw Materials Per Unit</h3>
                    <button
                        type="button"
                        onClick={handleAddUnit}
                        disabled={!canEditDetails || isLoading}
                        className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        Add Unit
                    </button>
                </div>

                {rawMaterialsPerUnit.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                        No units configured yet
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rawMaterialsPerUnit.map((unit, unitIndex) => (
                            <div key={unitIndex} className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                        <h4 className="text-sm font-bold text-gray-700">
                                            {unit.productUnitName ? `Unit: ${unit.productUnitName}` : 'New Unit'}
                                        </h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveUnit(unitIndex)}
                                        disabled={!canEditDetails || isLoading}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-300"
                                    >
                                        Remove Unit
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SelectionField
                                        label="Product Unit *"
                                        selectedItem={
                                            unit.productUnitId
                                                ? { id: unit.productUnitId, name: unit.productUnitName || '' }
                                                : null
                                        }
                                        onSelect={() => setUnitModalStates({ ...unitModalStates, [unitIndex]: true })}
                                        onClear={() => handleUnitChange(unitIndex, '')}
                                        disabled={!canEditDetails || isLoading}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Raw Materials <span className="text-red-500">*</span>
                                    </h4>

                                    <div className="bg-gray-50 rounded-xl p-6 mb-4">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-4">Add Raw Material</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Raw Material
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={newRawMaterialItem[unitIndex]?.rawMaterialName || ''}
                                                        onClick={() =>
                                                            canEditDetails &&
                                                            !isLoading &&
                                                            setShowRawMaterialModal({ unitIndex, show: true })
                                                        }
                                                        placeholder="Select raw material..."
                                                        disabled={!canEditDetails || isLoading}
                                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none cursor-pointer bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    />
                                                    {newRawMaterialItem[unitIndex]?.rawMaterialName &&
                                                        canEditDetails &&
                                                        !isLoading && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    clearRawMaterialSelection(unitIndex);
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Unit
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={newRawMaterialItem[unitIndex]?.rawMaterialUnitName || ''}
                                                        onClick={() =>
                                                            canEditDetails &&
                                                            !isLoading &&
                                                            setShowRawMaterialUnitModal({ unitIndex, show: true })
                                                        }
                                                        placeholder="Select unit..."
                                                        disabled={!canEditDetails || isLoading}
                                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none cursor-pointer bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    />
                                                    {newRawMaterialItem[unitIndex]?.rawMaterialUnitName &&
                                                        canEditDetails &&
                                                        !isLoading && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    clearRawMaterialUnitSelection(unitIndex);
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Quantity
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={newRawMaterialItem[unitIndex]?.quantity || ''}
                                                    onChange={(e) =>
                                                        setNewRawMaterialItem({
                                                            ...newRawMaterialItem,
                                                            [unitIndex]: {
                                                                ...newRawMaterialItem[unitIndex],
                                                                quantity: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    disabled={!canEditDetails || isLoading}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                                                    placeholder="Enter quantity"
                                                />
                                            </div>

                                            <div className="md:col-span-1 flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddRawMaterialToUnit(unitIndex)}
                                                    disabled={!canEditDetails || isLoading}
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
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
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                    Add to List
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {!unit.rawMaterials || unit.rawMaterials.length === 0 ? (
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 sm:p-6 text-center text-sm text-gray-500">
                                            No raw materials added yet
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden border border-gray-200 rounded-xl">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                            Raw Material
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                            Unit
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                                                            Quantity
                                                        </th>
                                                        <th className="px-4 py-2 text-right font-semibold text-gray-600">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {unit.rawMaterials.map((rm, rmIndex) => (
                                                        <tr key={rmIndex}>
                                                            <td className="px-4 py-3 text-gray-700">
                                                                {rm.rawMaterialName || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600">
                                                                {rm.rawMaterialUnitName || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-700">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={rm.quantity ?? 0}
                                                                    onChange={(e) =>
                                                                        handleRawMaterialChange(
                                                                            unitIndex,
                                                                            rmIndex,
                                                                            'quantity',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    disabled={!canEditDetails || isLoading}
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveRawMaterial(unitIndex, rmIndex)
                                                                    }
                                                                    disabled={!canEditDetails || isLoading}
                                                                    className="inline-flex items-center justify-center p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Remove raw material"
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderLogsTab = () => (
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
            </div>
            {selectedRecord?.activityLogs && selectedRecord.activityLogs.length > 0 ? (
                renderActivityLogsTable(selectedRecord.activityLogs)
            ) : (
                <p className="text-gray-500 text-sm">No activity logs available.</p>
            )}
        </div>
    );

    return (
        <form onSubmit={handleSubmit}>
            {successMessage && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm shadow-sm mb-6">
                    {successMessage}
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm space-y-2 mb-6">
                    <p className="text-sm font-semibold text-red-700">Please fix the following errors:</p>
                    <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                        {validationErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-center">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-7xl">
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
                          (currentStatus === StatusEnum.FOR_APPROVAL ||
                              currentStatus === StatusEnum.NEW_RECORD ||
                              currentStatus === StatusEnum.FOR_DELETION) ? (
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onDeny}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'Deny Deletion' : 'Deny'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onApprove}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'Approve Deletion' : 'Approve'}
                                </button>
                            </div>
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
                                    {isCreateMode ? 'Create' : 'Save Changes'}
                                </button>
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

            {/* Product Selection Modal */}
            <ProductSearchableSelectionModal
                show={showProductModal}
                title="Select Product"
                selectedValue={selectedProduct?.id ?? null}
                onSelect={handleProductSelect}
                onClose={() => setShowProductModal(false)}
                skipDealSelection={true}
            />

            {/* Unit Selection Modals */}
            {rawMaterialsPerUnit.map((unit, unitIndex) => {
                // Exclude already selected units except the current one being edited
                const excludeIds = rawMaterialsPerUnit
                    .map((u, idx) => (idx !== unitIndex ? u.productUnitId : null))
                    .filter((id): id is string => id !== null && id !== '');

                return (
                    <ProductUnitSearchableSelectionModal
                        key={`unit-modal-${unitIndex}`}
                        show={unitModalStates[unitIndex] ?? false}
                        title="Select Product Unit"
                        selectedValue={unit.productUnitId || null}
                        onSelect={(selectedUnit) => handleUnitSelect(unitIndex, selectedUnit)}
                        onClose={() => setUnitModalStates({ ...unitModalStates, [unitIndex]: false })}
                        excludeIds={excludeIds}
                    />
                );
            })}

            {/* Raw Material Selection Modal */}
            <RawMaterialSearchableSelectionModal
                show={showRawMaterialModal.show}
                title="Select Raw Material"
                selectedValue={selectedRawMaterial?.rawMaterialId ?? null}
                onSelect={(rawMaterial) =>
                    showRawMaterialModal.unitIndex !== null &&
                    handleRawMaterialSelect(rawMaterial, showRawMaterialModal.unitIndex)
                }
                onClose={() => setShowRawMaterialModal({ unitIndex: null, show: false })}
            />

            {/* Raw Material Unit Selection Modal */}
            <RawMaterialUnitSearchableSelectionModal
                show={showRawMaterialUnitModal.show}
                title="Select Unit"
                selectedValue={selectedRawMaterialUnit?.rawMaterialUnitId ?? null}
                onSelect={(unit) =>
                    showRawMaterialUnitModal.unitIndex !== null &&
                    handleRawMaterialUnitSelect(unit, showRawMaterialUnitModal.unitIndex)
                }
                onClose={() => setShowRawMaterialUnitModal({ unitIndex: null, show: false })}
            />
        </form>
    );
}
