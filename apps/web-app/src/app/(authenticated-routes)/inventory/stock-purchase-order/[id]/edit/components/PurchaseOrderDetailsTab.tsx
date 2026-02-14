import { Warning } from '@components-web';
import { ProductDto, ProductUnitDto, StockTypeDto, SupplierDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../../components';
import DatePicker from '../../../../../components/DatePicker';
import ProductSearchableSelectionModal from '../../../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../../../search-modals/ProductUnitSearchableSelectionModal';
import StockTypeSearchableSelectionModal from '../../../../../search-modals/StockTypeSearchableSelectionModal';
import SupplierSearchableSelectionModal from '../../../../../search-modals/SupplierSearchableSelectionModal';

interface OrderItem {
    productId: string;
    productName: string;
    productUnitId?: string;
    productUnitName: string;
    stockTypeId?: string;
    stockTypeName: string;
    qty: number;
}

interface PurchaseOrderDetailsTabProps {
    purchaseOrderData: any;
    hasDeliveries: boolean;
    status: string;
    poStatus: string;
    isAdminUser: boolean;
    onUpdate: (data: any) => void;
    onDelete: () => void;
    onCancel: () => void;
    onTransitionToPending: () => void;
    isSubmitting: boolean;
}

export function PurchaseOrderDetailsTab({
    purchaseOrderData,
    hasDeliveries,
    status,
    poStatus,
    isAdminUser,
    onUpdate,
    onDelete,
    onCancel,
    onTransitionToPending,
    isSubmitting,
}: PurchaseOrderDetailsTabProps) {
    const { setFlashNotification } = useSessionStore();
    const [formData, setFormData] = useState({
        docNo: '',
        supplierId: '',
        supplierName: '',
        poDate: '',
        purchaseOrderDetails: [] as OrderItem[],
        changeReason: '',
    });

    const [newOrderItem, setNewOrderItem] = useState({
        productId: '',
        productName: '',
        productUnitId: '',
        productUnitName: '',
        stockTypeId: '',
        stockTypeName: '',
        qty: '',
    });

    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [showStockTypeModal, setShowStockTypeModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<ProductUnitDto | null>(null);
    const [selectedStockType, setSelectedStockType] = useState<StockTypeDto | null>(null);

    useEffect(() => {
        if (purchaseOrderData) {
            setFormData({
                docNo: purchaseOrderData.docNo || '',
                supplierId: purchaseOrderData.supplierId || '',
                supplierName: purchaseOrderData.supplierName || '',
                poDate: purchaseOrderData.poDate || '',
                purchaseOrderDetails: purchaseOrderData.purchaseOrderDetails || [],
                changeReason: '',
            });
        }
    }, [purchaseOrderData]);

    useEffect(() => {
        // Data will be loaded through the search modals as needed
    }, []);

    const handleSupplierSelect = (supplier: SupplierDto) => {
        setSelectedSupplier(supplier);
        setFormData({
            ...formData,
            supplierId: supplier.supplierId || '',
            supplierName: supplier.supplierName || '',
        });
        setShowSupplierModal(false);
    };

    const clearSupplierSelection = () => {
        setSelectedSupplier(null);
        setFormData({
            ...formData,
            supplierId: '',
            supplierName: '',
        });
    };

    const handleProductSelect = (product: ProductDto) => {
        setSelectedProduct(product);
        setNewOrderItem({
            ...newOrderItem,
            productId: product.productId || '',
            productName: product.productName || '',
        });
        setShowProductModal(false);
    };

    const clearProductSelection = () => {
        setSelectedProduct(null);
        setSelectedUnit(null);
        setSelectedStockType(null);
        setNewOrderItem({
            ...newOrderItem,
            productId: '',
            productName: '',
            productUnitId: '',
            productUnitName: '',
            stockTypeId: '',
            stockTypeName: '',
        });
    };

    const handleStockTypeSelect = (stockType: StockTypeDto) => {
        setSelectedStockType(stockType);
        setNewOrderItem({
            ...newOrderItem,
            stockTypeId: stockType.stockTypeId || '',
            stockTypeName: stockType.stockTypeName || '',
        });
        setShowStockTypeModal(false);
    };

    const clearStockTypeSelection = () => {
        setSelectedStockType(null);
        setNewOrderItem({
            ...newOrderItem,
            stockTypeId: '',
            stockTypeName: '',
        });
    };

    const handleUnitSelect = (unit: ProductUnitDto) => {
        setSelectedUnit(unit);
        setNewOrderItem({
            ...newOrderItem,
            productUnitId: unit.productUnitId || '',
            productUnitName: unit.productUnitName || '',
        });
        setShowUnitModal(false);
    };

    const clearUnitSelection = () => {
        setSelectedUnit(null);
        setNewOrderItem({
            ...newOrderItem,
            productUnitId: '',
            productUnitName: '',
        });
    };

    const handleAddOrderItem = () => {
        if (
            !newOrderItem.productId ||
            !newOrderItem.productUnitId ||
            !newOrderItem.stockTypeId ||
            !newOrderItem.qty ||
            Number(newOrderItem.qty) <= 0
        ) {
            setFlashNotification({
                title: 'Missing Information',
                message: 'Please select a product, unit, stock type, and enter a valid quantity.',
                alertType: 'warning',
            });
            return;
        }

        const qtyNum = Math.floor(Number(newOrderItem.qty));
        if (qtyNum !== Number(newOrderItem.qty)) {
            setFlashNotification({
                title: 'Invalid Quantity',
                message: 'Quantity must be a whole number (no decimals).',
                alertType: 'warning',
            });
            return;
        }

        const isDuplicate = formData.purchaseOrderDetails.some((item) => item.productId === newOrderItem.productId);

        if (isDuplicate) {
            setFlashNotification({
                title: 'Duplicate Item',
                message: 'This product has already been added.',
                alertType: 'warning',
            });
            return;
        }

        const newItem: OrderItem = {
            productId: newOrderItem.productId,
            productName: newOrderItem.productName,
            productUnitId: newOrderItem.productUnitId,
            productUnitName: newOrderItem.productUnitName,
            stockTypeId: newOrderItem.stockTypeId,
            stockTypeName: newOrderItem.stockTypeName,
            qty: qtyNum,
        };

        setFormData({
            ...formData,
            purchaseOrderDetails: [...formData.purchaseOrderDetails, newItem],
        });

        setNewOrderItem({
            productId: '',
            productName: '',
            productUnitId: '',
            productUnitName: '',
            stockTypeId: '',
            stockTypeName: '',
            qty: '',
        });
        setSelectedProduct(null);
        setSelectedUnit(null);
        setSelectedStockType(null);
    };

    const handleRemoveOrderItem = (index: number) => {
        setFormData({
            ...formData,
            purchaseOrderDetails: formData.purchaseOrderDetails.filter((_, i) => i !== index),
        });
    };

    const handleSubmit = () => {
        if (!formData.docNo?.trim()) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Document No is required.',
                alertType: 'error',
            });
            return;
        }
        if (!formData.supplierId) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Supplier is required.',
                alertType: 'error',
            });
            return;
        }
        if (!formData.poDate) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'PO Date is required.',
                alertType: 'error',
            });
            return;
        }
        if (formData.purchaseOrderDetails.length === 0) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'At least one ordered item is required.',
                alertType: 'error',
            });
            return;
        }
        if (!isAdminUser && !formData.changeReason?.trim()) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Change reason is required.',
                alertType: 'error',
            });
            return;
        }

        onUpdate(formData);
    };

    const isDisabled = status !== 'ACTIVE' || hasDeliveries;

    return (
        <>
            <div className="space-y-6">
                {/* Warning Banner */}
                {hasDeliveries && (
                    <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
                        <div className="flex items-start gap-3">
                            <Warning size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-yellow-800">Purchase Order Has Deliveries</h4>
                                <p className="mt-1 text-sm text-yellow-700">
                                    This purchase order has recorded deliveries. Only delivery records can be modified.
                                    Main fields are locked.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Change Reason Field - First component when displayed */}
                {!isAdminUser && (
                    <ChangeReasonField
                        value={formData.changeReason}
                        onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                        disabled={status !== 'ACTIVE'}
                    />
                )}

                {/* SYSTEM_GENERATED Transition Button */}
                {poStatus === 'SYSTEM_GENERATED' && status === 'ACTIVE' && (
                    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">System Generated Purchase Order</h4>
                                <p className="mt-1 text-sm text-blue-700">
                                    This purchase order was automatically generated. Click the button to mark it as
                                    pending.
                                </p>
                            </div>
                            <button
                                onClick={onTransitionToPending}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isSubmitting ? 'Transitioning...' : 'Mark as Pending'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document No <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.docNo}
                            disabled
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm bg-gray-100 cursor-not-allowed opacity-75"
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
                                value={formData.supplierName || ''}
                                onClick={() => !isDisabled && !isSubmitting && setShowSupplierModal(true)}
                                placeholder="Select supplier..."
                                disabled={isDisabled || isSubmitting}
                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 cursor-pointer bg-white"
                            />
                            {formData.supplierId && !isDisabled && !isSubmitting && (
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
                            value={formData.poDate}
                            onChange={(date) => setFormData({ ...formData, poDate: date })}
                            disabled={isDisabled || isSubmitting}
                            placeholder="Select PO date"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PO Status</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={poStatus}
                                disabled
                                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm bg-gray-100 cursor-not-allowed"
                            />
                            {isAdminUser && poStatus === 'SYSTEM_GENERATED' && (
                                <button
                                    type="button"
                                    onClick={onTransitionToPending}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Move to Pending status"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                    </svg>
                                    <span className="whitespace-nowrap">To Pending</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ordered Items */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordered Items</h3>

                    {!isDisabled && (
                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            readOnly
                                            value={selectedProduct ? selectedProduct.productName : ''}
                                            onClick={() => !isSubmitting && setShowProductModal(true)}
                                            placeholder="Select product..."
                                            disabled={isSubmitting}
                                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                                        />
                                        {selectedProduct && (
                                            <button
                                                type="button"
                                                onClick={clearProductSelection}
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
                                            value={selectedUnit ? selectedUnit.productUnitName : ''}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Type</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            readOnly
                                            value={selectedStockType ? selectedStockType.stockTypeName : ''}
                                            onClick={() => !isSubmitting && setShowStockTypeModal(true)}
                                            placeholder="Select stock type..."
                                            disabled={isSubmitting}
                                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                                        />
                                        {selectedStockType && (
                                            <button
                                                type="button"
                                                onClick={clearStockTypeSelection}
                                                disabled={isSubmitting}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        value={newOrderItem.qty}
                                        onChange={(e) => setNewOrderItem({ ...newOrderItem, qty: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
                                                e.preventDefault();
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        step="1"
                                        min="1"
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    )}

                    {formData.purchaseOrderDetails.length === 0 ? (
                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                            <p className="text-gray-500">No items added yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Unit
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Stock Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Quantity
                                        </th>
                                        {!isDisabled && (
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.purchaseOrderDetails.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {item.productName}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{item.productUnitName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{item.stockTypeName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{item.qty}</td>
                                            {!isDisabled && (
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
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                {status === 'ACTIVE' && (
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            {!hasDeliveries && (
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
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
            </div>

            <SupplierSearchableSelectionModal
                show={showSupplierModal}
                title="Select Supplier"
                selectedValue={selectedSupplier?.supplierId || null}
                onSelect={handleSupplierSelect}
                onClose={() => setShowSupplierModal(false)}
            />

            <ProductSearchableSelectionModal
                show={showProductModal}
                title="Select Product"
                selectedValue={selectedProduct?.productId || null}
                onSelect={handleProductSelect}
                onClose={() => setShowProductModal(false)}
                skipDealSelection={true}
            />

            <ProductUnitSearchableSelectionModal
                show={showUnitModal}
                title="Select Unit"
                selectedValue={selectedUnit?.productUnitId || null}
                onSelect={handleUnitSelect}
                onClose={() => setShowUnitModal(false)}
            />

            <StockTypeSearchableSelectionModal
                show={showStockTypeModal}
                title="Select Stock Type"
                selectedValue={selectedStockType?.stockTypeId || null}
                onSelect={handleStockTypeSelect}
                onClose={() => setShowStockTypeModal(false)}
            />
        </>
    );
}
