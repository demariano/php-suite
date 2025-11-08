'use client';

import { InvoiceDetailTypeEnum, InvoiceDetailsDto, InvoiceDto, ProductApi, ProductDealQtyDto, ProductDto, ProductUnitDto, StockApi, StockDto, StockFilterDto, StockTypeDto, useSessionStore } from '@data-access/index';
import { CustomerProductDealDto } from '@data-access/types/customer-product-deal.types';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import ProductSearchableSelectionModal from '../../../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../../../search-modals/ProductUnitSearchableSelectionModal';
import StockTypeSearchableSelectionModal from '../../../../../search-modals/StockTypeSearchableSelectionModal';

interface InvoiceDetailsTabProps {
  formData: InvoiceDto;
  onFormDataChange: (updatedData: Partial<InvoiceDto>) => void;
  isCreateMode: boolean;
  customerDeals?: CustomerProductDealDto[];
  contractProductDealQty?: ProductDealQtyDto | null;
  contractSales?: boolean;
  isReadOnly?: boolean;
}

interface StockSelectionState {
  selectedProduct: ProductDto | null;
  selectedProductUnit: ProductUnitDto | null;
  selectedStockType: StockTypeDto | null;
  lotNo: string;
  expirationDate: string;
  selectedProductDeal: CustomerProductDealDto | null;
  quantity: number;
  showProductModal: boolean;
  showProductUnitModal: boolean;
  showStockTypeModal: boolean;
  showProductDealModal: boolean;
}

export default function InvoiceDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  customerDeals = [],
  contractProductDealQty,
  contractSales = false,
  isReadOnly = false
}: InvoiceDetailsTabProps) {
  const { setFlashNotification } = useSessionStore();
  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedProduct: null,
    selectedProductUnit: null,
    selectedStockType: null,
    lotNo: '',
    expirationDate: '',
    selectedProductDeal: null,
    quantity: 0,
    showProductModal: false,
    showProductUnitModal: false,
    showStockTypeModal: false,
    showProductDealModal: false
  });

  const handleProductSelect = (product: ProductDto) => {
    setStockSelection(prev => ({
      ...prev,
      selectedProduct: product,
      showProductModal: false
    }));
  };

  const handleProductUnitSelect = (productUnit: ProductUnitDto) => {
    setStockSelection(prev => ({
      ...prev,
      selectedProductUnit: productUnit,
      showProductUnitModal: false
    }));
  };

  const handleStockTypeSelect = (stockType: StockTypeDto) => {
    setStockSelection(prev => ({
      ...prev,
      selectedStockType: stockType,
      showStockTypeModal: false
    }));
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

    if (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
        !stockSelection.selectedStockType || stockSelection.quantity <= 0) {
      setFlashNotification({
        title: 'Missing Information',
        message: 'Please select product, product unit, stock type, and enter quantity.',
        alertType: 'warning'
      });
      return;
    }

    // Fetch product details to get pricing
    try {
      const product = await ProductApi.getProductById(stockSelection.selectedProduct.productId || '');
      
      // Find matching price based on productUnitId and productPriceTypeId
      const matchingPrice = product.productUnitPrice?.find(
        (unitPrice) =>
          unitPrice.productUnitId === stockSelection.selectedProductUnit?.productUnitId &&
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

      // Find stock by filter (product, unit, type, lot)
      const filter: StockFilterDto = {
        productName: stockSelection.selectedProduct.productName || '',
        productUnitName: stockSelection.selectedProductUnit.productUnitName,
        stockTypeName: stockSelection.selectedStockType.stockTypeName || '',
        lotNo: stockSelection.lotNo || undefined,
        status: 'ACTIVE'
      };

      const stockResponse = await StockApi.getStocksByFilter(filter, 1);
      let foundStock: StockDto | null = null;

      if (stockResponse.data && stockResponse.data.length > 0) {
        // Find exact match
        foundStock = stockResponse.data.find(stock => 
          stock.productId === stockSelection.selectedProduct?.productId &&
          stock.productUnitId === stockSelection.selectedProductUnit?.productUnitId &&
          stock.stockTypeId === stockSelection.selectedStockType?.stockTypeId &&
          stock.lotNo === stockSelection.lotNo
        ) || stockResponse.data[0];
      }

      if (!foundStock || !foundStock.stockId) {
        setFlashNotification({
          title: 'Stock Not Found',
          message: 'No matching stock found. Please verify the product, unit, type, and lot number combination.',
          alertType: 'error'
        });
        return;
      }

      // Calculate total quantity needed (including free items from deal)
      let totalQuantityNeeded = stockSelection.quantity;
      let freeItemQuantity = 0;
      
      if (contractSales && contractProductDealQty) {
        // Use contract's productDealQty for all products
        if (stockSelection.quantity >= (contractProductDealQty.minQty || 0)) {
          freeItemQuantity = contractProductDealQty.additionalQty || 0;
          totalQuantityNeeded += freeItemQuantity;
        }
      } else if (stockSelection.selectedProductDeal && 
          stockSelection.quantity >= (stockSelection.selectedProductDeal.minQty || 0)) {
        // Use customer product deal
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

      const cost = Math.round((matchingPrice.cost || 0) * 100) / 100;
      const price = Math.round((matchingPrice.price || 0) * 100) / 100;
      const amount = Math.round((stockSelection.quantity * price) * 100) / 100;

      const newDetail: InvoiceDetailsDto = {
        invoiceDetailId: `temp_${Date.now()}`,
        productId: stockSelection.selectedProduct.productId || '',
        productName: stockSelection.selectedProduct.productName || '',
        productUnitId: stockSelection.selectedProductUnit.productUnitId,
        productUnitName: stockSelection.selectedProductUnit.productUnitName,
        stockTypeId: stockSelection.selectedStockType.stockTypeId || '',
        stockTypeName: stockSelection.selectedStockType.stockTypeName || '',
        lotNo: stockSelection.lotNo,
        stockId: foundStock.stockId,
        qty: stockSelection.quantity,
        productDealId: stockSelection.selectedProductDeal?.productDealId,
        productDealName: stockSelection.selectedProductDeal?.productDealName,
        price: price,
        cost: cost,
        amount: amount,
        expiryDate: stockSelection.expirationDate,
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
          productId: stockSelection.selectedProduct.productId || '',
          productName: stockSelection.selectedProduct.productName || '',
          productUnitId: stockSelection.selectedProductUnit.productUnitId,
          productUnitName: stockSelection.selectedProductUnit.productUnitName,
          stockTypeId: stockSelection.selectedStockType.stockTypeId || '',
          stockTypeName: stockSelection.selectedStockType.stockTypeName || '',
          lotNo: stockSelection.lotNo,
          stockId: foundStock.stockId,
          qty: freeItemQuantity,
          productDealId: contractSales ? formData.contractId : stockSelection.selectedProductDeal?.productDealId,
          productDealName: contractSales ? formData.contractName : stockSelection.selectedProductDeal?.productDealName,
          price: 0,
          cost: 0,
          amount: 0,
          expiryDate: stockSelection.expirationDate,
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
        selectedProduct: null,
        selectedProductUnit: null,
        selectedStockType: null,
        lotNo: '',
        expirationDate: '',
        selectedProductDeal: null,
        quantity: 0,
        showProductModal: false,
        showProductUnitModal: false,
        showStockTypeModal: false,
        showProductDealModal: false
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
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px'
      }}>
        Invoice Details
      </h3>

      {/* Stock Selection Section - Hidden when read-only */}
      {!isReadOnly && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Add Stock Item
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr auto',
            gap: '16px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Product *
              </label>
              <input
                type="text"
                value={stockSelection.selectedProduct?.productName || ''}
                readOnly
                placeholder={formData.productPriceTypeId ? "Click to select product" : "Select Product Price Type first"}
                onClick={() => {
                  if (formData.productPriceTypeId) {
                    setStockSelection(prev => ({ ...prev, showProductModal: true }));
                  }
                }}
                disabled={!formData.productPriceTypeId || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: formData.productPriceTypeId ? '#f9fafb' : '#f3f4f6',
                  color: formData.productPriceTypeId ? '#6b7280' : '#9ca3af',
                  cursor: formData.productPriceTypeId ? 'pointer' : 'not-allowed',
                  opacity: formData.productPriceTypeId ? 1 : 0.6
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Product Unit *
              </label>
              <input
                type="text"
                value={stockSelection.selectedProductUnit?.productUnitName || ''}
                readOnly
                placeholder="Click to select unit"
                onClick={() => setStockSelection(prev => ({ ...prev, showProductUnitModal: true }))}
                disabled={!formData.productPriceTypeId || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: formData.productPriceTypeId ? '#f9fafb' : '#f3f4f6',
                  color: formData.productPriceTypeId ? '#6b7280' : '#9ca3af',
                  cursor: formData.productPriceTypeId ? 'pointer' : 'not-allowed',
                  opacity: formData.productPriceTypeId ? 1 : 0.6
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Stock Type *
              </label>
              <input
                type="text"
                value={stockSelection.selectedStockType?.stockTypeName || ''}
                readOnly
                placeholder="Click to select type"
                onClick={() => setStockSelection(prev => ({ ...prev, showStockTypeModal: true }))}
                disabled={!formData.productPriceTypeId || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: formData.productPriceTypeId ? '#f9fafb' : '#f3f4f6',
                  color: formData.productPriceTypeId ? '#6b7280' : '#9ca3af',
                  cursor: formData.productPriceTypeId ? 'pointer' : 'not-allowed',
                  opacity: formData.productPriceTypeId ? 1 : 0.6
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                LOT Number
              </label>
              <input
                type="text"
                value={stockSelection.lotNo}
                onChange={(e) => setStockSelection(prev => ({ ...prev, lotNo: e.target.value }))}
                disabled={!formData.productPriceTypeId || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: formData.productPriceTypeId ? 'white' : '#f3f4f6',
                  opacity: formData.productPriceTypeId ? 1 : 0.6
                }}
                placeholder="Enter LOT number"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Expiration Date
              </label>
              <DatePicker
                value={stockSelection.expirationDate}
                onChange={(date) => setStockSelection(prev => ({ ...prev, expirationDate: date }))}
                placeholder="Select expiration date"
                disabled={!formData.productPriceTypeId || isReadOnly}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Quantity *
              </label>
              <input
                type="number"
                value={stockSelection.quantity}
                onChange={(e) => setStockSelection(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                min="1"
                disabled={!formData.productPriceTypeId || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: formData.productPriceTypeId ? 'white' : '#f3f4f6',
                  opacity: formData.productPriceTypeId ? 1 : 0.6
                }}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Product Deal
              </label>
              {contractSales ? (
                <input
                  type="text"
                  value={contractProductDealQty ? 
                    `Contract Deal (Min: ${contractProductDealQty.minQty || 0}, Free: ${contractProductDealQty.additionalQty || 0})` : 
                    'No contract deal available'
                  }
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'not-allowed'
                  }}
                />
              ) : (
                <select
                  value={stockSelection.selectedProductDeal?.productDealId || ''}
                  onChange={(e) => {
                    const dealId = e.target.value;
                    const filteredDeals = stockSelection.selectedProduct 
                      ? customerDeals.filter(deal => deal.productId === stockSelection.selectedProduct?.productId)
                      : [];
                    const selectedDeal = filteredDeals.find(deal => deal.productDealId === dealId);
                    setStockSelection(prev => ({
                      ...prev,
                      selectedProductDeal: selectedDeal || null
                    }));
                  }}
                  disabled={!stockSelection.selectedProduct}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: !stockSelection.selectedProduct ? '#f9fafb' : 'white',
                    color: !stockSelection.selectedProduct ? '#6b7280' : '#1f2937',
                    cursor: !stockSelection.selectedProduct ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">
                    {!stockSelection.selectedProduct ? 'Select product first' : 'Select product deal'}
                  </option>
                  {stockSelection.selectedProduct && customerDeals
                    .filter(deal => deal.productId === stockSelection.selectedProduct?.productId)
                    .map((deal) => (
                      <option key={deal.productDealId} value={deal.productDealId}>
                        {deal.productDealName} (Min: {deal.minQty || 0}, Free: {deal.additionalQty || 0})
                      </option>
                    ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddDetailRecord}
              disabled={!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
                       !stockSelection.selectedStockType || stockSelection.quantity <= 0 || isReadOnly}
              style={{
                padding: '12px 20px',
                backgroundColor: (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
                                 !stockSelection.selectedStockType || stockSelection.quantity <= 0 || isReadOnly) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
                         !stockSelection.selectedStockType || stockSelection.quantity <= 0 || isReadOnly) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
                         !stockSelection.selectedStockType || stockSelection.quantity <= 0) ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (stockSelection.selectedProduct && stockSelection.selectedProductUnit && 
                    stockSelection.selectedStockType && stockSelection.quantity > 0) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (stockSelection.selectedProduct && stockSelection.selectedProductUnit && 
                    stockSelection.selectedStockType && stockSelection.quantity > 0) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              Add Detail
            </button>
          </div>
        </div>
      )}

      {/* Invoice Details Table */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Invoice Details ({formData.invoiceDetails?.length || 0} items)
          </h4>
        </div>

        {formData.invoiceDetails && formData.invoiceDetails.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {formData.invoiceDetails.map((detail, index) => (
              <div
                key={detail.invoiceDetailId || index}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#d1fae5' : (index % 2 === 0 ? 'white' : '#f9fafb')
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isReadOnly ? '2fr 1fr 1fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr 1fr 1fr auto',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {detail.productName}
                      {detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM && (
                        <span style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          marginLeft: '8px'
                        }}>
                          FREE
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {detail.lotNo && `Lot: ${detail.lotNo}`}
                      {detail.stockTypeName && ` • ${detail.stockTypeName}`}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Qty
                    </label>
                    <input
                      type="number"
                      value={detail.qty || 0}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Price
                    </label>
                    <input
                      type="number"
                      value={detail.price || 0}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#f0fdf4' : '#f9fafb',
                        color: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#10b981' : '#6b7280',
                        fontWeight: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '600' : 'normal'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Cost
                    </label>
                    <input
                      type="number"
                      value={detail.cost || 0}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      value={detail.amount || 0}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#f0fdf4' : '#f9fafb',
                        color: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#10b981' : '#6b7280',
                        fontWeight: detail.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '600' : '500'
                      }}
                    />
                  </div>


                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={detail.expiryDate || ''}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280'
                      }}
                    />
                  </div>

                  {!isReadOnly && (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDetail(index)}
                        disabled={isReadOnly}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: isReadOnly ? '#9ca3af' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isReadOnly ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            {isReadOnly 
              ? "No invoice details in this version."
              : "No invoice details added yet. Click \"Add Stock\" to get started."
            }
          </div>
        )}
      </div>

      {/* Selection Modals */}
      <ProductSearchableSelectionModal
        show={stockSelection.showProductModal}
        title="Select Product"
        selectedValue={stockSelection.selectedProduct?.productId || null}
        onSelect={handleProductSelect}
        onClose={() => setStockSelection(prev => ({ ...prev, showProductModal: false }))}
        skipDealSelection={true}
      />

      <ProductUnitSearchableSelectionModal
        show={stockSelection.showProductUnitModal}
        title="Select Product Unit"
        selectedValue={stockSelection.selectedProductUnit?.productUnitId || null}
        onSelect={handleProductUnitSelect}
        onClose={() => setStockSelection(prev => ({ ...prev, showProductUnitModal: false }))}
      />

      <StockTypeSearchableSelectionModal
        show={stockSelection.showStockTypeModal}
        title="Select Stock Type"
        selectedValue={stockSelection.selectedStockType?.stockTypeId || null}
        onSelect={handleStockTypeSelect}
        onClose={() => setStockSelection(prev => ({ ...prev, showStockTypeModal: false }))}
      />

    </div>
  );
}
