'use client';

import { InvoiceDetailTypeEnum, InvoiceDetailsDto, InvoiceDto, ProductApi, StockApi, StockDto, useSessionStore } from '@data-access/index';
import { CustomerProductDealDto } from '@data-access/types/customer-product-deal.types';
import { useState } from 'react';
import StockSearchableSelectionModal from '../../../../../search-modals/StockSearchableSelectionModal';

interface InvoiceDetailsTabProps {
  formData: InvoiceDto;
  onFormDataChange: (updatedData: Partial<InvoiceDto>) => void;
  isCreateMode: boolean;
  customerDeals?: CustomerProductDealDto[];
}

interface StockWithPricing extends StockDto {
  cost?: number;
  price?: number;
}

interface StockSelectionState {
  selectedStock: StockWithPricing | null;
  selectedProductDeal: CustomerProductDealDto | null;
  quantity: number;
  showStockModal: boolean;
  showProductDealModal: boolean;
}

export default function InvoiceDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  customerDeals = []
}: InvoiceDetailsTabProps) {
  const { setFlashNotification } = useSessionStore();
  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedStock: null,
    selectedProductDeal: null,
    quantity: 0,
    showStockModal: false,
    showProductDealModal: false
  });

  const handleAddStock = () => {
    // Check if productPriceTypeId is selected before allowing stock selection
    if (!formData.productPriceTypeId) {
      setFlashNotification({ 
        title: 'Selection Required', 
        message: 'Please select a Product Price Type in the invoice details before selecting stock items.', 
        alertType: 'warning' 
      });
      return;
    }
    setStockSelection(prev => ({ ...prev, showStockModal: true }));
  };

  const handleStockSelect = async (stock: StockDto) => {
    try {
      // Check if productPriceTypeId is selected
      if (!formData.productPriceTypeId) {
        setFlashNotification({ 
          title: 'Selection Required', 
          message: 'Please select a Product Price Type in the invoice details before selecting stock items.', 
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
      
      setStockSelection(prev => ({
        ...prev,
        selectedStock: { ...stock, cost: matchingPrice.cost, price: matchingPrice.price },
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
    if (!stockSelection.selectedStock || stockSelection.quantity <= 0) {
      return;
    }

    // Calculate total quantity needed (including free items from deal)
    let totalQuantityNeeded = stockSelection.quantity;
    if (stockSelection.selectedProductDeal && 
        stockSelection.quantity >= (stockSelection.selectedProductDeal.minQty || 0)) {
      totalQuantityNeeded += stockSelection.selectedProductDeal.additionalQty || 0;
    }

    // Fetch current stock to validate availability
    try {
      if (!stockSelection.selectedStock.stockId) {
        setFlashNotification({
          title: 'Error',
          message: 'Stock ID is missing from selected stock',
          alertType: 'error'
        });
        return;
      }
      const currentStock = await StockApi.getStockById(stockSelection.selectedStock.stockId);
      
      if (!currentStock || (currentStock.availableQuantity || 0) < totalQuantityNeeded) {
        setFlashNotification({
          title: 'Insufficient Stock',
          message: `Not enough stock available. Required: ${totalQuantityNeeded}, Available: ${currentStock?.availableQuantity || 0}`,
          alertType: 'error'
        });
        return;
      }
    } catch (error) {
      console.error('Error fetching stock details:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to verify stock availability',
        alertType: 'error'
      });
      return;
    }

    const cost = Math.round((stockSelection.selectedStock.cost || 0) * 100) / 100;
    const price = Math.round((stockSelection.selectedStock.price || 0) * 100) / 100;
    const amount = Math.round((stockSelection.quantity * price) * 100) / 100;

    const newDetail: InvoiceDetailsDto = {
      invoiceDetailId: `temp_${Date.now()}`,
      productId: stockSelection.selectedStock.productId,
      productName: stockSelection.selectedStock.productName,
      productUnitId: stockSelection.selectedStock.productUnitId,
      productUnitName: stockSelection.selectedStock.productUnitName,
      stockTypeId: stockSelection.selectedStock.stockTypeId,
      stockTypeName: stockSelection.selectedStock.stockTypeName,
      lotNo: stockSelection.selectedStock.lotNo,
      stockId: stockSelection.selectedStock.stockId,
      qty: stockSelection.quantity,
      productDealId: stockSelection.selectedProductDeal?.productDealId,
      productDealName: stockSelection.selectedProductDeal?.productDealName,
      price: price,
      cost: cost,
      amount: amount,
      expiryDate: stockSelection.selectedStock.expirationDate,
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
    if (stockSelection.selectedProductDeal && 
        stockSelection.quantity >= (stockSelection.selectedProductDeal.minQty || 0)) {
      // Add free item
      const freeItem: InvoiceDetailsDto = {
        invoiceDetailId: `temp_${Date.now()}_free`,
        productId: stockSelection.selectedStock.productId,
        productName: stockSelection.selectedStock.productName,
        productUnitId: stockSelection.selectedStock.productUnitId,
        productUnitName: stockSelection.selectedStock.productUnitName,
        stockTypeId: stockSelection.selectedStock.stockTypeId,
        stockTypeName: stockSelection.selectedStock.stockTypeName,
        lotNo: stockSelection.selectedStock.lotNo,
        stockId: stockSelection.selectedStock.stockId,
        qty: stockSelection.selectedProductDeal.additionalQty || 0,
        productDealId: stockSelection.selectedProductDeal.productDealId,
        productDealName: stockSelection.selectedProductDeal.productDealName,
        price: 0,
        cost: 0,
        amount: 0,
        expiryDate: stockSelection.selectedStock.expirationDate,
        invoiceDetailType: InvoiceDetailTypeEnum.FREE_ITEM
      };
      updatedDetails.push(freeItem);
    }

    // Reserve stock quantities
    try {
      if (!stockSelection.selectedStock.stockId) {
        setFlashNotification({
          title: 'Error',
          message: 'Stock ID is missing from selected stock',
          alertType: 'error'
        });
        return;
      }
      await StockApi.updateAvailableQuantity(
        stockSelection.selectedStock.stockId,
        { qty: totalQuantityNeeded }
      );
    } catch (error) {
      console.error('Error reserving stock:', error);
      setFlashNotification({
        title: 'Stock Reservation Failed',
        message: 'Failed to reserve stock quantities. Please try again.',
        alertType: 'error'
      });
      return;
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

    // Reset selection
    setStockSelection({
      selectedStock: null,
      selectedProductDeal: null,
      quantity: 0,
      showStockModal: false,
      showProductDealModal: false
    });
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

      {/* Stock Selection Section */}
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
          gridTemplateColumns: '1fr 1fr 1fr auto',
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
              Stock Item
            </label>
            <input
              type="text"
              value={stockSelection.selectedStock?.productName || ''}
              readOnly
              placeholder={formData.productPriceTypeId ? "Click to select stock" : "Select Product Price Type first"}
              onClick={handleAddStock}
              disabled={!formData.productPriceTypeId}
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
              Quantity *
            </label>
            <input
              type="number"
              value={stockSelection.quantity}
              onChange={(e) => setStockSelection(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              min="1"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
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
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: !stockSelection.selectedStock ? '#f9fafb' : 'white',
                color: !stockSelection.selectedStock ? '#6b7280' : '#1f2937',
                cursor: !stockSelection.selectedStock ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">
                {!stockSelection.selectedStock ? 'Select stock item first' : 'Select product deal'}
              </option>
              {stockSelection.selectedStock && customerDeals
                .filter(deal => deal.productId === stockSelection.selectedStock?.productId)
                .map((deal) => (
                  <option key={deal.productDealId} value={deal.productDealId}>
                    {deal.productDealName} (Min: {deal.minQty || 0}, Free: {deal.additionalQty || 0})
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddDetailRecord}
            disabled={!stockSelection.selectedStock || stockSelection.quantity <= 0}
            style={{
              padding: '12px 20px',
              backgroundColor: (!stockSelection.selectedStock || stockSelection.quantity <= 0) ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!stockSelection.selectedStock || stockSelection.quantity <= 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!stockSelection.selectedStock || stockSelection.quantity <= 0) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (stockSelection.selectedStock && stockSelection.quantity > 0) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (stockSelection.selectedStock && stockSelection.quantity > 0) {
                e.currentTarget.style.backgroundColor = '#10b981';
              }
            }}
          >
            Add Detail
          </button>
        </div>
      </div>

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
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr auto',
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

                  <div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDetail(index)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
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
            No invoice details added yet. Click &quot;Add Stock&quot; to get started.
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
