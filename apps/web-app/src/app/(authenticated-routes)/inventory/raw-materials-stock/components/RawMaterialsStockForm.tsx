'use client';

import {
    RawMaterialDto,
    RawMaterialsLocationDto,
    RawMaterialsStockDto,
    RawMaterialSupplierDto,
    StatusEnum,
} from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';
import { ChangeReasonReadOnly } from '../../../components/ChangeReasonReadOnly';
import {
    RawMaterialSearchableSelectionModal,
    RawMaterialsLocationSearchableSelectionModal,
    RawMaterialSupplierSearchableSelectionModal,
} from '../../../search-modals';
import { createFieldChangeDetector } from '../../../utils/fieldChangeDetection';
import SelectionField from '../../stock/components/SelectionField';

interface RawMaterialsStockFormProps {
    isCreateMode: boolean;
    selectedStock: RawMaterialsStockDto | null;
    successMessage: string | null;
    onSave: (stock: RawMaterialsStockDto) => void;
    onDelete: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    activeTab?: 'details' | 'approval';
    onApprove?: () => void;
    onDeny?: () => void;
}

export default function RawMaterialsStockForm({
    isCreateMode,
    selectedStock,
    successMessage,
    onSave,
    onDelete,
    onCancel,
    isAdminUser = false,
    activeTab = 'details',
    onApprove,
    onDeny,
}: RawMaterialsStockFormProps) {
    const [selectedRawMaterial, setSelectedRawMaterial] = useState<{ id: string; name: string } | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);
    const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Form state for controlled inputs - Initialize with selected stock data if available
    const [formData, setFormData] = useState({
        lotNo: selectedStock?.lotNo || '',
        qty: selectedStock?.qty?.toString() || '0',
        changeReason: selectedStock?.changeReason || '',
    });

    // Set initial values when editing (only when user hasn't made selections)
    useEffect(() => {
        if (!isCreateMode && selectedStock && !userHasMadeSelections) {
            if (selectedStock.rawMaterialId && selectedStock.rawMaterialName) {
                setSelectedRawMaterial({
                    id: selectedStock.rawMaterialId,
                    name: selectedStock.rawMaterialName,
                });
            }
            if (selectedStock.rawMaterialSupplierId && selectedStock.rawMaterialSupplierName) {
                setSelectedSupplier({
                    id: selectedStock.rawMaterialSupplierId,
                    name: selectedStock.rawMaterialSupplierName,
                });
            }
            if (selectedStock.rawMaterialsLocationId && selectedStock.rawMaterialsLocationName) {
                setSelectedLocation({
                    id: selectedStock.rawMaterialsLocationId,
                    name: selectedStock.rawMaterialsLocationName,
                });
            }
            // Initialize form data
            setFormData({
                lotNo: selectedStock.lotNo || '',
                qty: selectedStock.qty?.toString() || '0',
                changeReason: selectedStock.changeReason || '',
            });
        }
    }, [isCreateMode, selectedStock, userHasMadeSelections]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate required fields
        const errors: string[] = [];

        if (!selectedRawMaterial) {
            errors.push('Please select a raw material.');
        }

        if (!selectedSupplier) {
            errors.push('Please select a supplier.');
        }

        if (!selectedLocation) {
            errors.push('Please select a location.');
        }

        // Validate change reason for non-create mode (only required for non-admin users)
        if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason?.trim() === '')) {
            errors.push('Please provide a reason for the change.');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear validation errors if validation passes
        setValidationErrors([]);

        if (isCreateMode) {
            const newStock = {
                lotNo: formData.lotNo,
                rawMaterialId: selectedRawMaterial?.id || '',
                rawMaterialName: selectedRawMaterial?.name || '',
                rawMaterialSupplierId: selectedSupplier?.id || '',
                rawMaterialSupplierName: selectedSupplier?.name || '',
                rawMaterialsLocationId: selectedLocation?.id || '',
                rawMaterialsLocationName: selectedLocation?.name || '',
                qty: parseInt(formData.qty) || 0,
                status: StatusEnum.NEW_RECORD,
                changeReason: '', // No change reason needed for new records
            };

            onSave(newStock as RawMaterialsStockDto);
        } else {
            const updatedStock = {
                ...selectedStock,
                lotNo: formData.lotNo,
                rawMaterialId: selectedRawMaterial?.id || '',
                rawMaterialName: selectedRawMaterial?.name || '',
                rawMaterialSupplierId: selectedSupplier?.id || '',
                rawMaterialSupplierName: selectedSupplier?.name || '',
                rawMaterialsLocationId: selectedLocation?.id || '',
                rawMaterialsLocationName: selectedLocation?.name || '',
                qty: parseInt(formData.qty) || 0,
                status: StatusEnum.ACTIVE,
                changeReason: formData.changeReason || '',
            };

            onSave(updatedStock as RawMaterialsStockDto);
        }
    };

    const handleRawMaterialSelect = (rawMaterial: RawMaterialDto) => {
        setSelectedRawMaterial({ id: rawMaterial.rawMaterialId || '', name: rawMaterial.rawMaterialName || '' });
        setUserHasMadeSelections(true);
    };

    const handleSupplierSelect = (supplier: RawMaterialSupplierDto) => {
        setSelectedSupplier({ id: supplier.rawMaterialSupplierId || '', name: supplier.rawMaterialSupplierName || '' });
        setUserHasMadeSelections(true);
    };

    const handleLocationSelect = (location: RawMaterialsLocationDto) => {
        setSelectedLocation({
            id: location.rawMaterialsLocationId || '',
            name: location.rawMaterialsLocationName || '',
        });
        setUserHasMadeSelections(true);
    };

    const handleClearRawMaterial = () => {
        setSelectedRawMaterial(null);
    };

    const handleClearSupplier = () => {
        setSelectedSupplier(null);
    };

    const handleClearLocation = () => {
        setSelectedLocation(null);
    };

    const currentStatus = selectedStock?.status as StatusEnum;
    const forApprovalVersion = (selectedStock as any)?.forApprovalVersion;
    const isFieldChangedFn = createFieldChangeDetector(selectedStock, forApprovalVersion);
    const showApprovalUI = !isCreateMode && [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);
    const showDeletionCard = !isCreateMode && currentStatus === StatusEnum.FOR_DELETION;

    const formatValue = (val: any): string => {
        if (val === null || val === undefined || val === '') return '(empty)';
        return String(val);
    };

    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        currentValue: any,
        pendingValue: any,
        colorClass = 'bg-blue-500'
    ) => {
        const hasChange = isFieldChangedFn(fieldName);

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

        const isNewRecord = currentStatus === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return (
            <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                    {label}
                </label>
                <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
                    {formatValue(displayValue)}
                </div>
            </div>
        );
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Success message */}
                {successMessage && (
                    <div
                        style={{
                            backgroundColor: '#dcfce7',
                            border: '2px solid #16a34a',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            animation: 'pulse 2s infinite',
                        }}
                    >
                        <div
                            style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#16a34a',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            ✓
                        </div>
                        <span
                            style={{
                                color: '#166534',
                                fontSize: '14px',
                                fontWeight: '600',
                            }}
                        >
                            {successMessage}
                        </span>
                    </div>
                )}

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                    <div
                        style={{
                            backgroundColor: '#fef2f2',
                            border: '2px solid #dc2626',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '8px',
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <span style={{ color: '#dc2626', fontWeight: '600' }}>
                                Please fix the following errors:
                            </span>
                        </div>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '20px',
                                color: '#dc2626',
                            }}
                        >
                            {validationErrors.map((error, index) => (
                                <li key={index} style={{ marginBottom: '4px' }}>
                                    {error}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                    <ChangeReasonField
                        value={formData.changeReason}
                        onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
                        disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                    />
                )}

                {(showApprovalUI || showDeletionCard) && selectedStock?.changeReason && (
                    <ChangeReasonReadOnly value={selectedStock.changeReason} />
                )}

                {showDeletionCard && (
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 mb-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                            <span className="text-base">🗑️</span>
                            This record is marked for deletion and is awaiting admin approval.
                        </div>
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
                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-blue-600">Basic Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {showApprovalUI ? (
                                    <>
                                        {!isCreateMode &&
                                            selectedStock?.rawMaterialNamePoNo &&
                                            renderFieldWithInlineDiff(
                                                'Source PO Number',
                                                'rawMaterialNamePoNo',
                                                selectedStock?.rawMaterialNamePoNo,
                                                forApprovalVersion?.rawMaterialNamePoNo
                                            )}
                                        {renderFieldWithInlineDiff(
                                            'Lot Number',
                                            'lotNo',
                                            selectedStock?.lotNo,
                                            forApprovalVersion?.lotNo
                                        )}
                                        {renderFieldWithInlineDiff(
                                            'Quantity',
                                            'qty',
                                            selectedStock?.qty,
                                            forApprovalVersion?.qty
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* PO Number - Display only for existing records */}
                                        {!isCreateMode && selectedStock?.rawMaterialNamePoNo && (
                                            <div className="group">
                                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                    Source PO Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedStock.rawMaterialNamePoNo}
                                                    readOnly
                                                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed"
                                                />
                                            </div>
                                        )}
                                        {/* Lot Number */}
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                Lot Number (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="lotNo"
                                                value={formData.lotNo}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, lotNo: e.target.value }))
                                                }
                                                placeholder={isCreateMode ? 'Enter lot number' : ''}
                                                disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                                                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                                    !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                                                        ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                                }`}
                                            />
                                        </div>

                                        {/* Quantity */}
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                name="qty"
                                                min="0"
                                                value={formData.qty}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, qty: e.target.value }))
                                                }
                                                placeholder={isCreateMode ? 'Enter quantity' : ''}
                                                disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                                                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                                    !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                                                        ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                                }`}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Material & Location Selection Section */}
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
                                <h3 className="text-base font-bold text-blue-600">Material & Location</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {showApprovalUI ? (
                                    <>
                                        {renderFieldWithInlineDiff(
                                            'Raw Material',
                                            'rawMaterialName',
                                            selectedStock?.rawMaterialName,
                                            forApprovalVersion?.rawMaterialName
                                        )}
                                        {renderFieldWithInlineDiff(
                                            'Supplier',
                                            'rawMaterialSupplierName',
                                            selectedStock?.rawMaterialSupplierName,
                                            forApprovalVersion?.rawMaterialSupplierName
                                        )}
                                        {renderFieldWithInlineDiff(
                                            'Location',
                                            'rawMaterialsLocationName',
                                            selectedStock?.rawMaterialsLocationName,
                                            forApprovalVersion?.rawMaterialsLocationName
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <SelectionField
                                            label="Raw Material"
                                            selectedItem={selectedRawMaterial}
                                            onSelect={() => setShowRawMaterialModal(true)}
                                            onClear={handleClearRawMaterial}
                                            buttonText="Select Material"
                                            disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                                        />

                                        <SelectionField
                                            label="Supplier"
                                            selectedItem={selectedSupplier}
                                            onSelect={() => setShowSupplierModal(true)}
                                            onClear={handleClearSupplier}
                                            buttonText="Select Supplier"
                                            disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                                        />

                                        <SelectionField
                                            label="Location"
                                            selectedItem={selectedLocation}
                                            onSelect={() => setShowLocationModal(true)}
                                            onClear={handleClearLocation}
                                            buttonText="Select Location"
                                            disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {activeTab !== 'approval' && (
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        {!isCreateMode &&
                        !showApprovalUI &&
                        !showDeletionCard &&
                        selectedStock?.status === StatusEnum.ACTIVE ? (
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
                            {isAdminUser && (showApprovalUI || showDeletionCard) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onDeny}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onApprove}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
                            {(isCreateMode ||
                                (!showApprovalUI &&
                                    !showDeletionCard &&
                                    selectedStock?.status === StatusEnum.ACTIVE)) && (
                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {isCreateMode ? 'Create Raw Materials Stock' : 'Save Changes'}
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
                )}
            </form>

            {/* Searchable Selection Modals */}
            <RawMaterialSearchableSelectionModal
                show={showRawMaterialModal}
                title="Select Raw Material"
                selectedValue={selectedRawMaterial?.id || null}
                onSelect={handleRawMaterialSelect}
                onClose={() => setShowRawMaterialModal(false)}
            />

            <RawMaterialSupplierSearchableSelectionModal
                show={showSupplierModal}
                title="Select Supplier"
                selectedValue={selectedSupplier?.id || null}
                onSelect={handleSupplierSelect}
                onClose={() => setShowSupplierModal(false)}
            />

            <RawMaterialsLocationSearchableSelectionModal
                show={showLocationModal}
                title="Select Location"
                selectedValue={selectedLocation?.id || null}
                onSelect={handleLocationSelect}
                onClose={() => setShowLocationModal(false)}
            />
        </>
    );
}
