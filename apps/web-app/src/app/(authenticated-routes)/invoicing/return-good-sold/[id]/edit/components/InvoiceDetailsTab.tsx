'use client';

import { InvoiceDetailTypeEnum, ProductApi, ReturnGoodSoldDto, StockDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import StockSearchableSelectionModal from '../../../../../search-modals/StockSearchableSelectionModal';

interface InvoiceDetailsTabProps {
    formData: ReturnGoodSoldDto;
    onFormDataChange: (updatedData: Partial<ReturnGoodSoldDto>) => void;
    isCreateMode: boolean;
    isReadOnly?: boolean;
}

interface InvoiceDetailItem {
    invoiceDetailId?: string;
    productId?: string;
    productName?: string;
    productUnitId?: string;
    productUnitName?: string;
    stockTypeId?: string;
    stockTypeName?: string;
    lotNo?: string;
    expiryDate?: string;
    qty?: number;
    price?: number;
    cost?: number;
    amount?: number;
    stockId?: string;
    invoiceDetailType?: InvoiceDetailTypeEnum;
}

interface StockSelectionState {
    selectedStock: StockDto | null;
    quantity: number;
    showStockModal: boolean;
}

export default function InvoiceDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isReadOnly = false,
}: InvoiceDetailsTabProps) {
    const [stockSelection, setStockSelection] = useState<StockSelectionState>({
        selectedStock: null,
        quantity: 0,
        showStockModal: false,
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<InvoiceDetailItem | null>(null);

    const { setFlashNotification } = useSessionStore();

    // Helper function to generate unique ID for invoice details
    const generateDetailId = () => {
        return `detail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Copy item from original to modified
    const handleCopyToModified = (item: InvoiceDetailItem) => {
        const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];

        // Create a copy with a new ID
        const newItem = {
            ...item,
            invoiceDetailId: generateDetailId(),
        };

        modifiedDetails.push(newItem);

        onFormDataChange({
            modifiedInvoiceDetails: modifiedDetails,
        });

        setFlashNotification({
            title: 'Success',
            message: 'Item copied to modified details',
            alertType: 'success',
        });
    };

    // Delete item from modified list
    const handleDeleteModified = (index: number) => {
        const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];
        modifiedDetails.splice(index, 1);

        onFormDataChange({
            modifiedInvoiceDetails: modifiedDetails,
        });

        setFlashNotification({
            title: 'Success',
            message: 'Item removed from modified details',
            alertType: 'success',
        });
    };

    // Open edit modal for modified item
    const handleEditModified = (index: number) => {
        const item = formData.modifiedInvoiceDetails?.[index];
        if (item) {
            setEditingIndex(index);
            setEditingItem({ ...item });
        }
    };

    // Save edited item
    const handleSaveEdit = () => {
        if (editingIndex !== null && editingItem) {
            const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];

            // Recalculate amount
            const amount = (editingItem.qty || 0) * (editingItem.price || 0);
            editingItem.amount = amount;

            modifiedDetails[editingIndex] = editingItem;

            onFormDataChange({
                modifiedInvoiceDetails: modifiedDetails,
            });

            setEditingIndex(null);
            setEditingItem(null);

            setFlashNotification({
                title: 'Success',
                message: 'Item updated successfully',
                alertType: 'success',
            });
        }
    };

    // Handle stock selection
    const handleAddStock = () => {
        if (!formData.invoiceId) {
            setFlashNotification({
                title: 'Selection Required',
                message: 'Please select an invoice first',
                alertType: 'warning',
            });
            return;
        }

        if (!formData.productPriceTypeId) {
            setFlashNotification({
                title: 'Selection Required',
                message: 'Selected invoice does not have a product price type configured',
                alertType: 'warning',
            });
            return;
        }

        setStockSelection((prev) => ({ ...prev, showStockModal: true }));
    };

    // Handle stock item selection
    const handleStockSelect = async (stock: StockDto) => {
        try {
            // Check if productPriceTypeId is selected
            if (!formData.productPriceTypeId) {
                setFlashNotification({
                    title: 'Selection Required',
                    message: 'Please select an invoice with a product price type first',
                    alertType: 'warning',
                });
                return;
            }

            // Fetch product details to get pricing
            if (!stock.productId) {
                setFlashNotification({
                    title: 'Error',
                    message: 'Product ID is missing from selected stock',
                    alertType: 'error',
                });
                return;
            }

            const product = await ProductApi.getProductById(stock.productId);

            // Find matching price based on productUnitId and productPriceTypeId
            const matchingPrice = product.productUnitPrice?.find(
                (unitPrice) =>
                    unitPrice.productUnitId === stock.productUnitId &&
                    unitPrice.productPriceTypeId === formData.productPriceTypeId
            );

            if (!matchingPrice) {
                setFlashNotification({
                    title: 'Price Not Found',
                    message: `No price found for this product unit with the selected price type (${formData.productPriceTypeName}). Please check the product pricing configuration.`,
                    alertType: 'error',
                });
                return;
            }

            setStockSelection((prev) => ({
                ...prev,
                selectedStock: { ...stock, cost: matchingPrice.cost, price: matchingPrice.price },
                showStockModal: false,
            }));
        } catch (error) {
            console.error('Error fetching product details:', error);
            setFlashNotification({
                title: 'Error',
                message: 'Failed to fetch product pricing information',
                alertType: 'error',
            });
        }
    };

    // Handle adding stock item to modified details
    const handleAddDetailRecord = () => {
        if (!stockSelection.selectedStock || stockSelection.quantity <= 0) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Please select a stock item and enter a valid quantity',
                alertType: 'error',
            });
            return;
        }

        const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];

        const stock = stockSelection.selectedStock as any;
        const newItem: InvoiceDetailItem = {
            invoiceDetailId: generateDetailId(),
            productId: stock.productId,
            productName: stock.productName,
            productUnitId: stock.productUnitId,
            productUnitName: stock.productUnitName,
            stockTypeId: stock.stockTypeId,
            stockTypeName: stock.stockTypeName,
            lotNo: stock.lotNo,
            expiryDate: stock.expirationDate,
            stockId: stock.stockId,
            qty: stockSelection.quantity,
            price: stock.price || 0,
            cost: stock.cost || 0,
            amount: stockSelection.quantity * (stock.price || 0),
            invoiceDetailType: InvoiceDetailTypeEnum.REGULAR_ITEM,
        };

        // Prevent duplicate regular items with the same product and lot number
        const hasDuplicate = (formData.modifiedInvoiceDetails || []).some(
            (d) =>
                d.invoiceDetailType !== InvoiceDetailTypeEnum.FREE_ITEM &&
                d.productId === newItem.productId &&
                d.lotNo === newItem.lotNo
        );

        if (hasDuplicate) {
            setFlashNotification({
                title: 'Duplicate Item',
                message: 'An item with the same product and lot number is already added.',
                alertType: 'warning',
            });
            return;
        }

        modifiedDetails.push(newItem);

        onFormDataChange({
            modifiedInvoiceDetails: modifiedDetails,
        });

        // Reset selection
        setStockSelection({
            selectedStock: null,
            quantity: 0,
            showStockModal: false,
        });

        setFlashNotification({
            title: 'Success',
            message: 'Stock item added successfully',
            alertType: 'success',
        });
    };

    // Get badge for invoice detail type
    const getDetailTypeBadge = (type?: InvoiceDetailTypeEnum) => {
        if (type === InvoiceDetailTypeEnum.FREE_ITEM) {
            return (
                <span className="ml-2 bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-semibold">FREE</span>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Original Invoice Details Section */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b-2 border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h4 className="text-base font-bold text-blue-600 m-0">
                            Original Invoice Details ({formData.originalInvoiceDetails?.length || 0} items)
                        </h4>
                    </div>
                </div>

                {formData.originalInvoiceDetails && formData.originalInvoiceDetails.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                        {formData.originalInvoiceDetails.map((detail: any, index: number) => (
                            <div
                                key={detail.invoiceDetailId || index}
                                className={`p-4 border-b border-gray-200 ${
                                    detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                        ? 'bg-green-50'
                                        : index % 2 === 0
                                        ? 'bg-white'
                                        : 'bg-gray-50'
                                }`}
                            >
                                {/* Product Details Section - On Top */}
                                <div className="mb-4">
                                    <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        {detail.productName}
                                        {getDetailTypeBadge(detail.invoiceDetailType)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {detail.lotNo && `Lot: ${detail.lotNo}`}
                                        {detail.stockTypeName && ` • ${detail.stockTypeName}`}
                                    </div>
                                </div>

                                {/* Textbox Components Section - Below */}
                                <div
                                    className={`grid gap-4 items-center ${
                                        isReadOnly
                                            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-5'
                                            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-6'
                                    }`}
                                >
                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Qty</label>
                                        <input
                                            type="number"
                                            value={detail.qty || 0}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Price</label>
                                        <input
                                            type="number"
                                            value={detail.price || 0}
                                            readOnly
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                                                detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                                    ? 'bg-green-50 text-green-600 font-semibold'
                                                    : 'bg-gray-50 text-gray-600'
                                            }`}
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cost</label>
                                        <input
                                            type="number"
                                            value={detail.cost || 0}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            value={detail.amount || 0}
                                            readOnly
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                                                detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                                    ? 'bg-green-50 text-green-600 font-semibold'
                                                    : 'bg-gray-50 text-gray-600 font-medium'
                                            }`}
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Expiry Date
                                        </label>
                                        <input
                                            type="date"
                                            value={detail.expiryDate || ''}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    {!isReadOnly && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToModified(detail)}
                                                className="p-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-700 shadow-sm flex items-center justify-center"
                                                title="Copy"
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
                                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500">
                        <p className="text-base">No original invoice details</p>
                        <p className="text-sm mt-1">Select an invoice to load details</p>
                    </div>
                )}
            </div>

            {/* Add Stock Item Section */}
            {!isReadOnly && (
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg shadow-sm text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h4 className="text-base font-bold text-blue-600 m-0">Add Stock Item</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                Stock Item
                            </label>
                            <input
                                type="text"
                                value={stockSelection.selectedStock?.productName || ''}
                                readOnly
                                placeholder={formData.invoiceId ? 'Click to select stock' : 'Select invoice first'}
                                onClick={handleAddStock}
                                disabled={!formData.invoiceId}
                                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                    formData.invoiceId
                                        ? 'border-gray-200 bg-white text-gray-700 cursor-pointer hover:border-blue-300 hover:shadow-md'
                                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                }`}
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={stockSelection.quantity}
                                onChange={(e) =>
                                    setStockSelection((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                                }
                                min="1"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
                                placeholder="Enter quantity"
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                Product Price Type
                            </label>
                            <input
                                type="text"
                                value={formData.productPriceTypeName || 'Not selected'}
                                readOnly
                                disabled
                                className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 text-gray-500 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddDetailRecord}
                            disabled={!stockSelection.selectedStock || stockSelection.quantity <= 0}
                            className={`px-4 py-3 text-white border-none rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 shadow-sm ${
                                !stockSelection.selectedStock || stockSelection.quantity <= 0
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            Add Detail
                        </button>
                    </div>
                </div>
            )}

            {/* Modified Invoice Details Section */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b-2 border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h4 className="text-base font-bold text-blue-600 m-0">
                            Modified Invoice Details ({formData.modifiedInvoiceDetails?.length || 0} items)
                        </h4>
                    </div>
                </div>

                {formData.modifiedInvoiceDetails && formData.modifiedInvoiceDetails.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                        {formData.modifiedInvoiceDetails.map((detail: any, index: number) => (
                            <div
                                key={detail.invoiceDetailId || index}
                                className={`p-4 border-b border-gray-200 ${
                                    detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                        ? 'bg-green-50'
                                        : index % 2 === 0
                                        ? 'bg-white'
                                        : 'bg-gray-50'
                                }`}
                            >
                                {/* Product Details Section - On Top */}
                                <div className="mb-4">
                                    <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        {detail.productName}
                                        {getDetailTypeBadge(detail.invoiceDetailType)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {detail.lotNo && `Lot: ${detail.lotNo}`}
                                        {detail.stockTypeName && ` • ${detail.stockTypeName}`}
                                    </div>
                                </div>

                                {/* Textbox Components Section - Below */}
                                <div
                                    className={`grid gap-4 items-center ${
                                        isReadOnly
                                            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-5'
                                            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-6'
                                    }`}
                                >
                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Qty</label>
                                        <input
                                            type="number"
                                            value={detail.qty || 0}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Price</label>
                                        <input
                                            type="number"
                                            value={detail.price || 0}
                                            readOnly
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                                                detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                                    ? 'bg-green-50 text-green-600 font-semibold'
                                                    : 'bg-gray-50 text-gray-600'
                                            }`}
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cost</label>
                                        <input
                                            type="number"
                                            value={detail.cost || 0}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            value={detail.amount || 0}
                                            readOnly
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                                                detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                                    ? 'bg-green-50 text-green-600 font-semibold'
                                                    : 'bg-gray-50 text-gray-600 font-medium'
                                            }`}
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Expiry Date
                                        </label>
                                        <input
                                            type="date"
                                            value={detail.expiryDate || ''}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                                        />
                                    </div>

                                    {!isReadOnly && (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEditModified(index)}
                                                className="p-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-700 shadow-sm flex items-center justify-center"
                                                title="Edit"
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
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteModified(index)}
                                                className="p-2 bg-red-600 text-white border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-700 shadow-sm flex items-center justify-center"
                                                title="Delete"
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500">
                        <p className="text-base">No modified invoice details</p>
                        <p className="text-sm mt-1">Add or copy items to modify</p>
                    </div>
                )}
            </div>

            {/* Stock Selection Modal */}
            <StockSearchableSelectionModal
                show={stockSelection.showStockModal}
                title="Select Stock Item"
                selectedValue={stockSelection.selectedStock?.stockId || null}
                onSelect={handleStockSelect}
                onClose={() => setStockSelection((prev) => ({ ...prev, showStockModal: false }))}
            />

            {/* Edit Item Modal */}
            {editingItem && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
                    onClick={(e) => {
                        // Only close if clicking directly on the backdrop, not on modal content
                        if (e.target === e.currentTarget) {
                            setEditingIndex(null);
                            setEditingItem(null);
                        }
                    }}
                >
                    <div
                        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-5 pb-4 border-b-2 border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 m-0">Edit Item</h3>
                            <button
                                onClick={() => {
                                    setEditingIndex(null);
                                    setEditingItem(null);
                                }}
                                className="bg-transparent border-none text-2xl cursor-pointer text-gray-600 p-1 rounded transition-colors duration-200 hover:bg-gray-100"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 mb-5">
                            <div className="group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
                                <input
                                    type="text"
                                    value={editingItem.productName || ''}
                                    disabled
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium bg-gray-50 text-gray-600"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    value={editingItem.qty || 0}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, qty: parseFloat(e.target.value) || 0 })
                                    }
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingItem.price || 0}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })
                                    }
                                    disabled={editingItem.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM}
                                    className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                        editingItem.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                                            ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                    } outline-none`}
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                                <input
                                    type="text"
                                    value={`₱${((editingItem.qty || 0) * (editingItem.price || 0)).toFixed(2)}`}
                                    disabled
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium bg-gray-50 text-gray-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setEditingIndex(null);
                                    setEditingItem(null);
                                }}
                                className="px-5 py-2.5 bg-transparent text-gray-700 border-2 border-gray-300 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 hover:bg-gray-50 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-5 py-2.5 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 hover:bg-blue-700 shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
