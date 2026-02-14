'use client';

import { RawMaterialsPurchaseOrderApi } from '@data-access/api/raw-materials-purchase-order.api';
import {
    RawMaterialApi,
    RawMaterialDto,
    RawMaterialsPurchaseOrderStatusEnum,
    RawMaterialSupplierApi,
    RawMaterialSupplierDto,
    RawMaterialUnitDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DatePicker from '../../../components/DatePicker';
import RawMaterialSearchableSelectionModal from '../../../search-modals/RawMaterialSearchableSelectionModal';
import RawMaterialSupplierSearchableSelectionModal from '../../../search-modals/RawMaterialSupplierSearchableSelectionModal';
import RawMaterialUnitSearchableSelectionModal from '../../../search-modals/RawMaterialUnitSearchableSelectionModal';

export default function CreateRawMaterialsPurchaseOrderPage() {
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [suppliers, setSuppliers] = useState<RawMaterialSupplierDto[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterialDto[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingRawMaterials, setIsLoadingRawMaterials] = useState(false);

    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<RawMaterialSupplierDto | null>(null);
    const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialDto | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<RawMaterialUnitDto | null>(null);

    const [formData, setFormData] = useState<any>({
        docNo: '',
        poDate: new Date().toISOString().split('T')[0],
        rawMaterialSupplierId: '',
        rawMaterialSupplierName: '',
        poStatus: RawMaterialsPurchaseOrderStatusEnum.PENDING,
        purchaseOrderDetails: [],
    });

    const [newOrderItem, setNewOrderItem] = useState({
        rawMaterialId: '',
        rawMaterialName: '',
        rawMaterialUnitId: '',
        rawMaterialUnitName: '',
        qty: '',
    });

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        fetchSuppliers();
        fetchRawMaterials();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setIsLoadingSuppliers(true);
            const response = await RawMaterialSupplierApi.getRawMaterialSuppliers(100);
            if (response?.statusCode === 200 && response.data) {
                const pageData = response.data as any;
                const activeSuppliers = (
                    Array.isArray(pageData.data) ? pageData.data : Array.isArray(pageData) ? pageData : []
                ).filter((s: RawMaterialSupplierDto) => s.status === StatusEnum.ACTIVE);
                setSuppliers(activeSuppliers);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    const fetchRawMaterials = async () => {
        try {
            setIsLoadingRawMaterials(true);
            const response = await RawMaterialApi.getRawMaterials(100);
            if (response?.statusCode === 200 && response.data) {
                const pageData = response.data as any;
                const activeRawMaterials = (Array.isArray(pageData.data) ? pageData.data : (pageData as any)).filter(
                    (rm: RawMaterialDto) => rm.status === StatusEnum.ACTIVE
                );
                setRawMaterials(activeRawMaterials);
            }
        } catch (error) {
            console.error('Error fetching raw materials:', error);
        } finally {
            setIsLoadingRawMaterials(false);
        }
    };

    const handleSupplierSelect = (supplier: RawMaterialSupplierDto) => {
        setSelectedSupplier(supplier);
        setFormData({
            ...formData,
            rawMaterialSupplierId: supplier.rawMaterialSupplierId || '',
            rawMaterialSupplierName: supplier.rawMaterialSupplierName || '',
        });
        setShowSupplierModal(false);
    };

    const clearSupplierSelection = () => {
        setSelectedSupplier(null);
        setFormData({
            ...formData,
            rawMaterialSupplierId: '',
            rawMaterialSupplierName: '',
        });
    };

    const handleRawMaterialSelect = (rawMaterial: RawMaterialDto) => {
        setSelectedRawMaterial(rawMaterial);
        // Auto-populate unit from raw material but allow override
        const defaultUnit: RawMaterialUnitDto = {
            rawMaterialUnitId: (rawMaterial as any).rawMaterialUnitId || '',
            rawMaterialUnitName: (rawMaterial as any).rawMaterialUnitName || '',
        };
        setSelectedUnit(defaultUnit);
        setNewOrderItem({
            ...newOrderItem,
            rawMaterialId: rawMaterial.rawMaterialId || '',
            rawMaterialName: rawMaterial.rawMaterialName || '',
            rawMaterialUnitId: (rawMaterial as any).rawMaterialUnitId || '',
            rawMaterialUnitName: (rawMaterial as any).rawMaterialUnitName || '',
        });
        setShowRawMaterialModal(false);
    };

    const clearRawMaterialSelection = () => {
        setSelectedRawMaterial(null);
        setSelectedUnit(null);
        setNewOrderItem({
            ...newOrderItem,
            rawMaterialId: '',
            rawMaterialName: '',
            rawMaterialUnitId: '',
            rawMaterialUnitName: '',
        });
    };

    const handleUnitSelect = (unit: RawMaterialUnitDto) => {
        setSelectedUnit(unit);
        setNewOrderItem({
            ...newOrderItem,
            rawMaterialUnitId: unit.rawMaterialUnitId || '',
            rawMaterialUnitName: unit.rawMaterialUnitName || '',
        });
        setShowUnitModal(false);
    };

    const clearUnitSelection = () => {
        setSelectedUnit(null);
        setNewOrderItem({
            ...newOrderItem,
            rawMaterialUnitId: '',
            rawMaterialUnitName: '',
        });
    };

    const handleAddOrderItem = () => {
        if (
            !newOrderItem.rawMaterialId ||
            !newOrderItem.rawMaterialUnitId ||
            !newOrderItem.qty ||
            Number(newOrderItem.qty) <= 0
        ) {
            setError('Please select a raw material, unit, and enter a valid quantity.');
            return;
        }

        const qty = Math.floor(Number(newOrderItem.qty));
        if (qty <= 0 || !Number.isInteger(Number(newOrderItem.qty))) {
            setError('Quantity must be a positive whole number (no decimals).');
            return;
        }

        const duplicate = formData.purchaseOrderDetails?.some(
            (item: any) => item.rawMaterialId === newOrderItem.rawMaterialId
        );

        if (duplicate) {
            setError('This raw material is already added to the purchase order.');
            return;
        }

        setFormData({
            ...formData,
            purchaseOrderDetails: [
                ...(formData.purchaseOrderDetails || []),
                {
                    rawMaterialId: newOrderItem.rawMaterialId,
                    rawMaterialName: newOrderItem.rawMaterialName,
                    rawMaterialUnitId: newOrderItem.rawMaterialUnitId,
                    rawMaterialUnitName: newOrderItem.rawMaterialUnitName,
                    qty: qty,
                },
            ],
        });

        setNewOrderItem({
            rawMaterialId: '',
            rawMaterialName: '',
            rawMaterialUnitId: '',
            rawMaterialUnitName: '',
            qty: '',
        });
        setError(null);
    };

    const handleRemoveOrderItem = (index: number) => {
        setFormData({
            ...formData,
            purchaseOrderDetails: formData.purchaseOrderDetails?.filter((_: any, i: number) => i !== index) || [],
        });
    };

    const handleSubmit = async () => {
        if (!formData.docNo?.trim()) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Document Number is required.',
                alertType: 'error',
            });
            return;
        }
        if (!formData.rawMaterialSupplierId) {
            setFlashNotification({ title: 'Validation Error', message: 'Supplier is required.', alertType: 'error' });
            return;
        }
        if (!formData.poDate) {
            setFlashNotification({ title: 'Validation Error', message: 'PO Date is required.', alertType: 'error' });
            return;
        }
        if (!formData.purchaseOrderDetails || formData.purchaseOrderDetails.length === 0) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'At least one raw material must be added.',
                alertType: 'error',
            });
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await RawMaterialsPurchaseOrderApi.createRawMaterialsPurchaseOrder(formData, userRole);
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order created successfully!',
                alertType: 'success',
            });
            router.push('/inventory/raw-materials-purchase-order');
        } catch (error: any) {
            console.error('Error creating purchase order:', error);
            setFlashNotification({
                title: 'Error',
                message: error?.response?.data?.message || error?.message || 'Failed to create purchase order.',
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/inventory/raw-materials-purchase-order');
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/raw-materials-purchase-order"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Raw Materials Purchase Orders
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {/* Tab Header */}
                    <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                        <div className="flex flex-nowrap gap-2">
                            <button className="flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold bg-blue-600 text-white shadow-sm">
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    Create Purchase Order
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="bg-white p-4 sm:p-6">
                        <div className="space-y-6">
                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Document Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.docNo || ''}
                                        onChange={(e) => setFormData({ ...formData, docNo: e.target.value })}
                                        disabled={isSubmitting}
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Enter document number"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Supplier <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            readOnly
                                            value={selectedSupplier?.rawMaterialSupplierName || ''}
                                            onClick={() => !isSubmitting && setShowSupplierModal(true)}
                                            placeholder="Select supplier..."
                                            disabled={isSubmitting}
                                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white"
                                        />
                                        {selectedSupplier && !isSubmitting && (
                                            <button
                                                type="button"
                                                onClick={clearSupplierSelection}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        PO Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.poDate || ''}
                                        onChange={(date) => setFormData({ ...formData, poDate: date })}
                                        disabled={isSubmitting}
                                        placeholder="Select PO date"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">PO Status</label>
                                    <input
                                        type="text"
                                        value="PENDING"
                                        disabled
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm bg-gray-100 cursor-not-allowed opacity-75"
                                    />
                                </div>
                            </div>

                            {/* Ordered Items */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordered Items</h3>

                                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Raw Material
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={
                                                        selectedRawMaterial ? selectedRawMaterial.rawMaterialName : ''
                                                    }
                                                    onClick={() => !isSubmitting && setShowRawMaterialModal(true)}
                                                    placeholder="Select raw material..."
                                                    disabled={isSubmitting}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                                                />
                                                {selectedRawMaterial && (
                                                    <button
                                                        type="button"
                                                        onClick={clearRawMaterialSelection}
                                                        disabled={isSubmitting}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={selectedUnit ? selectedUnit.rawMaterialUnitName : ''}
                                                    onClick={() => !isSubmitting && setShowUnitModal(true)}
                                                    placeholder="Select unit..."
                                                    disabled={isSubmitting}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                                                />
                                                {selectedUnit && (
                                                    <button
                                                        type="button"
                                                        onClick={clearUnitSelection}
                                                        disabled={isSubmitting}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={newOrderItem.qty}
                                                onChange={(e) =>
                                                    setNewOrderItem({ ...newOrderItem, qty: e.target.value })
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === '.' ||
                                                        e.key === ',' ||
                                                        e.key === 'e' ||
                                                        e.key === 'E'
                                                    ) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                disabled={isSubmitting}
                                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Enter quantity"
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddOrderItem}
                                                disabled={isSubmitting}
                                                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {formData.purchaseOrderDetails && formData.purchaseOrderDetails.length > 0 ? (
                                    <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Raw Material
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Unit
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Quantity
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {formData.purchaseOrderDetails.map((item: any, index: number) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                            {item.rawMaterialName}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700">
                                                            {item.rawMaterialUnitName}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700">{item.qty}</td>
                                                        <td className="px-6 py-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveOrderItem(index)}
                                                                disabled={isSubmitting}
                                                                className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                                                    isSubmitting
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
                                ) : (
                                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                                        <p className="text-gray-500">
                                            No items added yet. Add raw materials to the purchase order above.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="hidden sm:block" />
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                    <button
                                        type="submit"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
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
                </div>
            </div>

            <RawMaterialSupplierSearchableSelectionModal
                show={showSupplierModal}
                title="Select Supplier"
                selectedValue={selectedSupplier?.rawMaterialSupplierId || null}
                onSelect={handleSupplierSelect}
                onClose={() => setShowSupplierModal(false)}
            />

            <RawMaterialSearchableSelectionModal
                show={showRawMaterialModal}
                title="Select Raw Material"
                selectedValue={selectedRawMaterial?.rawMaterialId || null}
                onSelect={handleRawMaterialSelect}
                onClose={() => setShowRawMaterialModal(false)}
            />

            <RawMaterialUnitSearchableSelectionModal
                show={showUnitModal}
                title="Select Unit"
                selectedValue={selectedUnit?.rawMaterialUnitId || null}
                onSelect={handleUnitSelect}
                onClose={() => setShowUnitModal(false)}
            />
        </div>
    );
}
