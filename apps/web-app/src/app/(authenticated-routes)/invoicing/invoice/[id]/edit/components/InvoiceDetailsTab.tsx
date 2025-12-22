'use client';

import { ContractProductDealDto, InvoiceDetailTypeEnum, InvoiceDetailsDto, InvoiceDto, ProductApi, StockApi, StockDto, useSessionStore } from '@data-access/index';
import { CustomerProductDealDto } from '@data-access/types/customer-product-deal.types';
import { useState } from 'react';
import StockSearchableSelectionModal from '../../../../../search-modals/StockSearchableSelectionModal';

interface InvoiceDetailsTabProps {
  formData: InvoiceDto;
  onFormDataChange: (updatedData: Partial<InvoiceDto>) => void;
  isCreateMode: boolean;
  customerDeals?: CustomerProductDealDto[];
  contractProductDeals?: ContractProductDealDto[] | null;
  contractSales?: boolean;
  isReadOnly?: boolean;
}

interface StockSelectionState {
  selectedStock: StockDto | null;
  selectedProductDeal: CustomerProductDealDto | null;
  quantity: number;
  showStockModal: boolean;
}

export default function InvoiceDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  customerDeals = [],
  contractProductDeals,
  contractSales = false,
  isReadOnly = false
}: InvoiceDetailsTabProps) {
  const { setFlashNotification } = useSessionStore();
  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedStock: null,
    selectedProductDeal: null,
    quantity: 0,
    showStockModal: false
  });

  // Handle stock item selection from modal
  const handleStockSelect = async (stock: StockDto) => {
    try {
      // Check if productPriceTypeId is selected
      if (!formData.productPriceTypeId) {
        setFlashNotification({
          title: 'Selection Required',
          message: 'Please select a Product Price Type in the invoice details before adding items.',
          alertType: 'warning'
        });
        return;
      }

      // Fetch product details to get pricing
      if (!stock.productId) {
        setFlashNotification({
          title: 'Error',
          message: 'Product ID is missing from selected stock',
          alertType: 'error'
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
          message: `No price found for this product unit with the selected price type (${formData.productPriceTypeName}). Please select a different price type in the invoice details.`,
          alertType: 'error'
        });
        return;
      }

      // Update stock selection with pricing information
      setStockSelection(prev => ({
        ...prev,
        selectedStock: {
          ...stock,
          cost: matchingPrice.cost,
          price: matchingPrice.price
        },
        showStockModal: false
      }));
    } catch (error) {
      console.error('Error fetching product details:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to fetch product pricing information',
        alertType: 'error'
      });
    }
  };


  const handleAddDetailRecord = async () => {
    // Check if productPriceTypeId is selected
    if (!formData.productPriceTypeId) {
      setFlashNotification({ 
        title: 'Selection Required', 
        message: 'Please select a Product Price Type in the invoice details before adding items.', 
        alertType: 'warning' 
      });
      return;
    }

    // Check if contract sales is enabled but no contract is selected
    if (contractSales && !formData.contractId) {
      setFlashNotification({ 
        title: 'Contract Required', 
        message: 'Please select a contract before adding items when using contract sales.', 
        alertType: 'warning' 
      });
      return;
    }

    if (!stockSelection.selectedStock || stockSelection.quantity <= 0) {
      setFlashNotification({
        title: 'Missing Information',
        message: 'Please select a stock item and enter quantity.',
        alertType: 'warning'
      });
      return;
    }

    // Use the selected stock (already has pricing from handleStockSelect)
    const foundStock = stockSelection.selectedStock;

    if (!foundStock || !foundStock.stockId) {
      setFlashNotification({
        title: 'Stock Not Found',
        message: 'Selected stock is invalid. Please select a stock item again.',
        alertType: 'error'
      });
      return;
    }

    try {
      // Calculate total quantity needed (including free items from deal)
      let totalQuantityNeeded = stockSelection.quantity;
      let freeItemQuantity = 0;
      
      if (stockSelection.selectedProductDeal && 
          stockSelection.quantity >= (stockSelection.selectedProductDeal.minQty || 0)) {
        // Use selected product deal (works for both contract and customer deals)
        freeItemQuantity = stockSelection.selectedProductDeal.additionalQty || 0;
        totalQuantityNeeded += freeItemQuantity;
      }

      // Fetch current stock to validate availability
      const currentStock = await StockApi.getStockById(foundStock.stockId);
      
      if (!currentStock || (currentStock.availableQuantity || 0) < totalQuantityNeeded) {
        setFlashNotification({
          title: 'Insufficient Stock',
          message: `Not enough stock available. Required: ${totalQuantityNeeded}, Available: ${currentStock?.availableQuantity || 0}`,
          alertType: 'error'
        });
        return;
      }

      const cost = Math.round((foundStock.cost || 0) * 100) / 100;
      const price = Math.round((foundStock.price || 0) * 100) / 100;
      const amount = Math.round((stockSelection.quantity * price) * 100) / 100;

      const newDetail: InvoiceDetailsDto = {
        invoiceDetailId: `temp_${Date.now()}`,
        productId: foundStock.productId || '',
        productName: foundStock.productName || '',
        productUnitId: foundStock.productUnitId || '',
        productUnitName: foundStock.productUnitName || '',
        stockTypeId: foundStock.stockTypeId || '',
        stockTypeName: foundStock.stockTypeName || '',
        lotNo: foundStock.lotNo || '',
        stockId: foundStock.stockId,
        qty: stockSelection.quantity,
        productDealId: stockSelection.selectedProductDeal?.productDealId,
        productDealName: stockSelection.selectedProductDeal?.productDealName,
        price: price,
        cost: cost,
        amount: amount,
        expiryDate: foundStock.expirationDate,
        invoiceDetailType: InvoiceDetailTypeEnum.REGULAR_ITEM
      };

      // Prevent duplicate regular items with the same product and lot number
      const hasDuplicate = (formData.invoiceDetails || []).some(d =>
        d.invoiceDetailType !== InvoiceDetailTypeEnum.FREE_ITEM &&
        d.productId === newDetail.productId &&
        d.lotNo === newDetail.lotNo
      );
      if (hasDuplicate) {
        setFlashNotification({
          title: 'Duplicate Item',
          message: 'An item with the same product and lot is already added.',
          alertType: 'warning'
        });
        return;
      }

      const updatedDetails = [...(formData.invoiceDetails || [])];
      updatedDetails.push(newDetail);

      // Check if we should add a free item
      if (freeItemQuantity > 0) {
        // Add free item
        const freeItem: InvoiceDetailsDto = {
          invoiceDetailId: `temp_${Date.now()}_free`,
          productId: foundStock.productId || '',
          productName: foundStock.productName || '',
          productUnitId: foundStock.productUnitId || '',
          productUnitName: foundStock.productUnitName || '',
          stockTypeId: foundStock.stockTypeId || '',
          stockTypeName: foundStock.stockTypeName || '',
          lotNo: foundStock.lotNo || '',
          stockId: foundStock.stockId,
          qty: freeItemQuantity,
          productDealId: stockSelection.selectedProductDeal?.productDealId,
          productDealName: stockSelection.selectedProductDeal?.productDealName,
          price: 0,
          cost: 0,
          amount: 0,
          expiryDate: foundStock.expirationDate,
          invoiceDetailType: InvoiceDetailTypeEnum.FREE_ITEM
        };
        updatedDetails.push(freeItem);
      }

      // Reserve stock quantities
      await StockApi.updateAvailableQuantity(
        foundStock.stockId,
        { qty: totalQuantityNeeded }
      );

      const invoiceAmount = Math.round(updatedDetails.reduce((sum, detail) => sum + (detail.amount || 0), 0) * 100) / 100;
      const taxAmount = Math.round((invoiceAmount * 0.1) * 100) / 100;
      const finalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100;

      onFormDataChange({
        invoiceDetails: updatedDetails,
        invoiceAmount,
        taxAmount,
        finalAmount
      });

      // Reset selection
      setStockSelection({
        selectedStock: null,
        selectedProductDeal: null,
        quantity: 0,
        showStockModal: false
      });
    } catch (error) {
      console.error('Error adding invoice detail:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to add invoice detail. Please try again.',
        alertType: 'error'
      });
    }
  };


  const handleDeleteDetail = async (index: number) => {
    const updatedDetails = [...(formData.invoiceDetails || [])];
    const detailToDelete = updatedDetails[index];
    
    if (!detailToDelete) {
      return;
    }

    // Calculate total quantity to restore (including associated free item if exists)
    let totalQuantityToRestore = detailToDelete.qty || 0;
    let associatedFreeItemIndex = -1;

    // If this is a regular item with a product deal, find and include the associated free item
    if (detailToDelete.invoiceDetailType === InvoiceDetailTypeEnum.REGULAR_ITEM && 
        detailToDelete.productDealId) {
      // Look for the associated free item (same productId, lotNo, and productDealId)
      for (let i = 0; i < updatedDetails.length; i++) {
        const item = updatedDetails[i];
        if (i !== index && 
            item.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM &&
            item.productId === detailToDelete.productId &&
            item.lotNo === detailToDelete.lotNo &&
            item.productDealId === detailToDelete.productDealId) {
          totalQuantityToRestore += item.qty || 0;
          associatedFreeItemIndex = i;
          break;
        }
      }
    }

    // Restore stock quantities if stockId exists
    if (detailToDelete.stockId && totalQuantityToRestore > 0) {
      try {
        await StockApi.updateAvailableQuantity(
          detailToDelete.stockId,
          { qty: -totalQuantityToRestore } // Negative value to restore stock
        );
      } catch (error) {
        console.error('Error restoring stock:', error);
        setFlashNotification({
          title: 'Stock Restoration Failed',
          message: 'Failed to restore stock quantities. Please try again.',
          alertType: 'error'
        });
        return;
      }
    }

    // Remove the main item
    updatedDetails.splice(index, 1);
    
    // Remove the associated free item if it exists
    if (associatedFreeItemIndex > -1) {
      // Adjust index if the free item was after the main item
      const adjustedIndex = associatedFreeItemIndex > index ? associatedFreeItemIndex - 1 : associatedFreeItemIndex;
      updatedDetails.splice(adjustedIndex, 1);
    }
    
    const invoiceAmount = Math.round(updatedDetails.reduce((sum, detail) => sum + (detail.amount || 0), 0) * 100) / 100;
    const taxAmount = Math.round((invoiceAmount * 0.1) * 100) / 100;
    const finalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100;

    onFormDataChange({
      invoiceDetails: updatedDetails,
      invoiceAmount,
      taxAmount,
      finalAmount
    });
  };


  return (
    <div className="space-y-6">
      {/* Stock Selection Section - Hidden when read-only */}
      {!isReadOnly && (
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-blue-600 m-0">
              Add Stock Item
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Stock Item Selection */}
            <div className="group sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Stock Item *
              </label>
              <input
                type="text"
                value={stockSelection.selectedStock 
                  ? `${stockSelection.selectedStock.productName || ''} - ${stockSelection.selectedStock.productUnitName || ''} - ${stockSelection.selectedStock.stockTypeName || ''}${stockSelection.selectedStock.lotNo ? ` (Lot: ${stockSelection.selectedStock.lotNo})` : ''}`
                  : ''}
                readOnly
                placeholder={formData.productPriceTypeId ? "Click to select stock item" : "Select Product Price Type first"}
                onClick={() => {
                  if (formData.productPriceTypeId && !isReadOnly) {
                    setStockSelection(prev => ({ ...prev, showStockModal: true }));
                  }
                }}
                disabled={!formData.productPriceTypeId || isReadOnly}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  !formData.productPriceTypeId || isReadOnly
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-gray-300 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {stockSelection.selectedStock && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStockSelection(prev => ({ ...prev, selectedStock: null }));
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Quantity */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Quantity *
              </label>
              <input
                type="number"
                value={stockSelection.quantity}
                onChange={(e) => setStockSelection(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                min="1"
                disabled={!formData.productPriceTypeId || !stockSelection.selectedStock || isReadOnly}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  !formData.productPriceTypeId || !stockSelection.selectedStock || isReadOnly
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-gray-300 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter quantity"
              />
            </div>

            {/* Product Deal */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Product Deal
              </label>
              {contractSales ? (
                <select
                  value={stockSelection.selectedProductDeal?.productDealId || ''}
                  onChange={(e) => {
                    const dealId = e.target.value;
                    const filteredDeals = stockSelection.selectedStock && contractProductDeals
                      ? contractProductDeals.filter(deal => deal.productId === stockSelection.selectedStock?.productId)
                      : [];
                    const selectedDeal = filteredDeals.find(deal => deal.productDealId === dealId);
                    setStockSelection(prev => ({
                      ...prev,
                      selectedProductDeal: selectedDeal ? {
                        productId: selectedDeal.productId,
                        productDealId: selectedDeal.productDealId,
                        productDealName: selectedDeal.productDealName,
                        minQty: selectedDeal.minQty,
                        additionalQty: selectedDeal.additionalQty
                      } : null
                    }));
                  }}
                  disabled={!stockSelection.selectedStock || !contractProductDeals}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    !stockSelection.selectedStock || !contractProductDeals
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                >
                  <option value="">
                    {!stockSelection.selectedStock ? 'Select stock item first' : 
                     !contractProductDeals || contractProductDeals.length === 0 ? 'No contract deals available' :
                     'Select contract product deal (optional)'}
                  </option>
                  {stockSelection.selectedStock && contractProductDeals
                    ?.filter(deal => deal.productId === stockSelection.selectedStock?.productId)
                    .map((deal) => (
                      <option key={deal.productDealId} value={deal.productDealId}>
                        {deal.productDealName} (Min: {deal.minQty || 0}, Free: {deal.additionalQty || 0})
                      </option>
                    ))}
                </select>
              ) : (
                <select
                  value={stockSelection.selectedProductDeal?.productDealId || ''}
                  onChange={(e) => {
                    const dealId = e.target.value;
                    const filteredDeals = stockSelection.selectedStock 
                      ? customerDeals.filter(deal => deal.productId === stockSelection.selectedStock?.productId)
                      : [];
                    const selectedDeal = filteredDeals.find(deal => deal.productDealId === dealId);
                    setStockSelection(prev => ({
                      ...prev,
                      selectedProductDeal: selectedDeal || null
                    }));
                  }}
                  disabled={!stockSelection.selectedStock}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    !stockSelection.selectedStock
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                >
                  <option value="">
                    {!stockSelection.selectedStock ? 'Select stock item first' : 'Select product deal (optional)'}
                  </option>
                  {stockSelection.selectedStock && customerDeals
                    .filter(deal => deal.productId === stockSelection.selectedStock?.productId)
                    .map((deal) => (
                      <option key={deal.productDealId} value={deal.productDealId}>
                        {deal.productDealName} (Min: {deal.minQty || 0}, Free: {deal.additionalQty || 0})
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Add Button */}
            <div className="group flex items-end">
              <button
                type="button"
                onClick={handleAddDetailRecord}
                disabled={!stockSelection.selectedStock || stockSelection.quantity <= 0 || isReadOnly}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 m-0">
            Invoice Details ({formData.invoiceDetails?.length || 0} items)
          </h4>
        </div>

        {formData.invoiceDetails && formData.invoiceDetails.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {formData.invoiceDetails.map((detail, index) => (
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
                <div className={`grid gap-4 items-center ${
                  isReadOnly 
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-7' 
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-8'
                }`}>
                  <div className="sm:col-span-2">
                    <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                      {detail.productName}
                      {detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM && (
                        <span className="ml-2 bg-green-600 text-white px-2 py-0.5 rounded text-xs font-semibold">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {detail.lotNo && `Lot: ${detail.lotNo}`}
                      {detail.stockTypeName && ` • ${detail.stockTypeName}`}
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      value={detail.qty || 0}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={detail.price || 0}
                      readOnly
                      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${
                        detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                          ? 'bg-green-50 text-green-700 font-semibold'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cost
                    </label>
                    <input
                      type="number"
                      value={detail.cost || 0}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={detail.amount || 0}
                      readOnly
                      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${
                        detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM
                          ? 'bg-green-50 text-green-700 font-semibold'
                          : 'bg-gray-50 text-gray-600 font-medium'
                      }`}
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={detail.expiryDate || ''}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>

                  {!isReadOnly && (
                    <div className="group flex items-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteDetail(index)}
                        disabled={isReadOnly}
                        className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-10 py-10 text-center text-gray-600">
            {isReadOnly 
              ? "No invoice details in this version."
              : "No invoice details added yet. Click \"Add Item\" to get started."
            }
          </div>
        )}
      </div>

      {/* Stock Selection Modal */}
      <StockSearchableSelectionModal
        show={stockSelection.showStockModal}
        title="Select Stock Item"
        selectedValue={stockSelection.selectedStock?.stockId || null}
        onSelect={handleStockSelect}
        onClose={() => setStockSelection(prev => ({ ...prev, showStockModal: false }))}
      />

    </div>
  );
}
