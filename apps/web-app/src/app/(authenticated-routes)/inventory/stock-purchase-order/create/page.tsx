'use client';

import { Add } from '@components-web';
import ProductApi from '@data-access/api/product.api';
import { StockPurchaseOrderApi } from '@data-access/api/stock-purchase-order.api';
import SupplierApi from '@data-access/api/supplier.api';
import {
    ProductDto,
    ProductUnitDto,
    StatusEnum,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
    StockTypeDto,
    SupplierDto,
    useAuthStore,
    useFlashNotificationStore,
} from '@data-access/index';
import { useEffect, useState } from 'react';
import DatePicker from '../../../components/DatePicker';
import ProductSearchableSelectionModal from '../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../search-modals/ProductUnitSearchableSelectionModal';
import StockTypeSearchableSelectionModal from '../../../search-modals/StockTypeSearchableSelectionModal';
import SupplierSearchableSelectionModal from '../../../search-modals/SupplierSearchableSelectionModal';

export default function CreateStockPurchaseOrderPage() {
    const { authedUser } = useAuthStore();
    const { setFlashNotification } = useFlashNotificationStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [showStockTypeModal, setShowStockTypeModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<ProductUnitDto | null>(null);
    const [selectedStockType, setSelectedStockType] = useState<StockTypeDto | null>(null);

    const [formData, setFormData] = useState<StockPurchaseOrderDto>({
        docNo: '',
        poDate: new Date().toISOString().split('T')[0],
        supplierId: '',
        supplierName: '',
        poStatus: StockPurchaseOrderStatusEnum.PENDING,
        purchaseOrderDetails: [],
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

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        fetchSuppliers();
        fetchProducts();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setIsLoadingSuppliers(true);
            const response = await SupplierApi.getSuppliers(100);
            if (response?.data) {
                const responseData = response.data;
                if (responseData && typeof responseData === 'object' && 'data' in responseData) {
                    const pageData = responseData as { data: SupplierDto[] };
                    const activeSuppliers = (pageData.data || []).filter(
                        (s: SupplierDto) => s.status === StatusEnum.ACTIVE
                    );
                    setSuppliers(activeSuppliers);
                } else if (Array.isArray(responseData)) {
                    const activeSuppliers = responseData.filter((s: SupplierDto) => s.status === StatusEnum.ACTIVE);
                    setSuppliers(activeSuppliers);
                }
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setIsLoadingProducts(true);
            const response = await ProductApi.getProducts(100);
            if (response?.data) {
                const responseData = response.data;
                if (responseData && typeof responseData === 'object' && 'data' in responseData) {
                    const pageData = responseData as { data: ProductDto[] };
                    const activeProducts = (pageData.data || []).filter(
                        (p: ProductDto) => p.status === StatusEnum.ACTIVE
                    );
                    setProducts(activeProducts);
                } else if (Array.isArray(responseData)) {
                    const activeProducts = responseData.filter((p: ProductDto) => p.status === StatusEnum.ACTIVE);
                    setProducts(activeProducts);
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoadingProducts(false);
        }
    };

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
            setError('Please select a product, unit, stock type, and enter a valid quantity.');
            return;
        }

        const qty = Math.floor(Number(newOrderItem.qty));
        if (qty <= 0 || !Number.isInteger(Number(newOrderItem.qty))) {
            setError('Quantity must be a positive whole number (no decimals).');
            return;
        }

        const duplicate = formData.purchaseOrderDetails?.some((item) => item.productId === newOrderItem.productId);

        if (duplicate) {
            setError('This product is already added to the purchase order.');
            return;
        }

        setFormData({
            ...formData,
            purchaseOrderDetails: [
                ...(formData.purchaseOrderDetails || []),
                {
                    productId: newOrderItem.productId,
                    productName: newOrderItem.productName,
                    productUnitId: newOrderItem.productUnitId,
                    productUnitName: newOrderItem.productUnitName,
                    stockTypeId: newOrderItem.stockTypeId,
                    stockTypeName: newOrderItem.stockTypeName,
                    qty: qty,
                },
            ],
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
        setError(null);
    };

    const handleRemoveOrderItem = (index: number) => {
        setFormData({
            ...formData,
            purchaseOrderDetails: formData.purchaseOrderDetails?.filter((_, i) => i !== index) || [],
        });
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!formData.docNo?.trim()) {
            errors.push('Document Number is required.');
        }
        if (!formData.supplierId) {
            errors.push('Supplier is required.');
        }
        if (!formData.poDate) {
            errors.push('PO Date is required.');
        }
        if (!formData.purchaseOrderDetails || formData.purchaseOrderDetails.length === 0) {
            errors.push('At least one product must be added to the purchase order.');
        }
        if (!isAdminUser && (!formData.changeReason || !formData.changeReason?.trim())) {
            errors.push('Please provide a reason for creating this purchase order.');
        }

        return errors;
    };

    const handleSubmit = async () => {
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setError(validationErrors.join(' '));
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await StockPurchaseOrderApi.createStockPurchaseOrder(formData);
            setSuccess('Purchase order created successfully!');
            setFlashNotification({
                title: 'Success',
                message: 'Purchase order created successfully!',
                alertType: 'success',
            });
            // Navigate immediately - notification will persist
            window.location.href = '/inventory/stock-purchase-order';
        } catch (error: any) {
            console.error('Error creating purchase order:', error);
            const errorMessage = error?.message || 'Failed to create purchase order. Please try again.';
            setError(errorMessage);
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 text-lg font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 shadow-sm">
                    {success}
                </div>
            )}

            <div className="mb-6">
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/stock-purchase-order"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors"
                    >
                        Stock Purchase Order
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Purchase Order</h1>

                {!isAdminUser && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Change Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.changeReason || ''}
                            onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                            rows={3}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter the reason for creating this purchase order..."
                        />
                    </div>
                )}

                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600">Purchase Order Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Document Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.docNo || ''}
                                onChange={(e) => setFormData({ ...formData, docNo: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    value={selectedSupplier?.supplierName || ''}
                                    onClick={() => setShowSupplierModal(true)}
                                    placeholder="Select supplier..."
                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                                />
                                {selectedSupplier && (
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
                                placeholder="Select PO date"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PO Status</label>
                            <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed">
                                PENDING
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600">Ordered Items</h3>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Add Product</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={selectedProduct ? selectedProduct.productName : ''}
                                        onClick={() => setShowProductModal(true)}
                                        placeholder="Select product..."
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none cursor-pointer bg-white"
                                    />
                                    {selectedProduct && (
                                        <button
                                            type="button"
                                            onClick={clearProductSelection}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={selectedUnit ? selectedUnit.productUnitName : ''}
                                        onClick={() => setShowUnitModal(true)}
                                        placeholder="Select unit..."
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none cursor-pointer bg-white"
                                    />
                                    {selectedUnit && (
                                        <button
                                            type="button"
                                            onClick={clearUnitSelection}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Type</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={selectedStockType ? selectedStockType.stockTypeName : ''}
                                        onClick={() => setShowStockTypeModal(true)}
                                        placeholder="Select stock type..."
                                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none cursor-pointer bg-white"
                                    />
                                    {selectedStockType && (
                                        <button
                                            type="button"
                                            onClick={clearStockTypeSelection}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={newOrderItem.qty}
                                    onChange={(e) => setNewOrderItem({ ...newOrderItem, qty: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter quantity"
                                />
                            </div>

                            <div className="md:col-span-1 flex items-end">
                                <button
                                    onClick={handleAddOrderItem}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <Add size={18} />
                                    Add to Order
                                </button>
                            </div>
                        </div>
                    </div>

                    {formData.purchaseOrderDetails && formData.purchaseOrderDetails.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                            <table className="w-full border-collapse">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Unit
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stock Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ordered Qty
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.purchaseOrderDetails.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.productName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.productUnitName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.stockTypeName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.qty}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOrderItem(index)}
                                                    className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-red-600 hover:bg-red-700"
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
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                            <p className="text-sm text-gray-500">
                                No items added yet. Add products to the purchase order above.
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
                        </button>
                        <button
                            type="button"
                            onClick={() => (window.location.href = '/inventory/stock-purchase-order')}
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
        </div>
    );
}
