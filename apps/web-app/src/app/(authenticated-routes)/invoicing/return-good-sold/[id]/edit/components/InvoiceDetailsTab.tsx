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
  isReadOnly = false
}: InvoiceDetailsTabProps) {
  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedStock: null,
    quantity: 0,
    showStockModal: false
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
      invoiceDetailId: generateDetailId()
    };
    
    modifiedDetails.push(newItem);
    
    onFormDataChange({
      modifiedInvoiceDetails: modifiedDetails
    });
    
    setFlashNotification({
      title: 'Success',
      message: 'Item copied to modified details',
      alertType: 'success'
    });
  };

  // Delete item from modified list
  const handleDeleteModified = (index: number) => {
    const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];
    modifiedDetails.splice(index, 1);
    
    onFormDataChange({
      modifiedInvoiceDetails: modifiedDetails
    });
    
    setFlashNotification({
      title: 'Success',
      message: 'Item removed from modified details',
      alertType: 'success'
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
        modifiedInvoiceDetails: modifiedDetails
      });
      
      setEditingIndex(null);
      setEditingItem(null);
      
      setFlashNotification({
        title: 'Success',
        message: 'Item updated successfully',
        alertType: 'success'
      });
    }
  };

  // Handle stock selection
  const handleAddStock = () => {
    if (!formData.invoiceId) {
      setFlashNotification({
        title: 'Selection Required',
        message: 'Please select an invoice first',
        alertType: 'warning'
      });
      return;
    }
    
    if (!formData.productPriceTypeId) {
      setFlashNotification({
        title: 'Selection Required',
        message: 'Selected invoice does not have a product price type configured',
        alertType: 'warning'
      });
      return;
    }
    
    setStockSelection(prev => ({ ...prev, showStockModal: true }));
  };

  // Handle stock item selection
  const handleStockSelect = async (stock: StockDto) => {
    try {
      // Check if productPriceTypeId is selected
      if (!formData.productPriceTypeId) {
        setFlashNotification({
          title: 'Selection Required',
          message: 'Please select an invoice with a product price type first',
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
          message: `No price found for this product unit with the selected price type (${formData.productPriceTypeName}). Please check the product pricing configuration.`,
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

  // Handle adding stock item to modified details
  const handleAddDetailRecord = () => {
    if (!stockSelection.selectedStock || stockSelection.quantity <= 0) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please select a stock item and enter a valid quantity',
        alertType: 'error'
      });
      return;
    }

    const modifiedDetails = [...(formData.modifiedInvoiceDetails || [])];
    
    const newItem: InvoiceDetailItem = {
      invoiceDetailId: generateDetailId(),
      productId: stockSelection.selectedStock.productId,
      productName: stockSelection.selectedStock.productName,
      productUnitId: stockSelection.selectedStock.productUnitId,
      productUnitName: stockSelection.selectedStock.productUnitName,
      stockTypeId: stockSelection.selectedStock.stockTypeId,
      stockTypeName: stockSelection.selectedStock.stockTypeName,
      lotNo: stockSelection.selectedStock.lotNo,
      expiryDate: stockSelection.selectedStock.expirationDate,
      stockId: stockSelection.selectedStock.stockId,
      qty: stockSelection.quantity,
      price: stockSelection.selectedStock.price || 0,
      cost: stockSelection.selectedStock.cost || 0,
      amount: stockSelection.quantity * (stockSelection.selectedStock.price || 0),
      invoiceDetailType: InvoiceDetailTypeEnum.REGULAR_ITEM
    };

    // Prevent duplicate regular items with the same product and lot number
    const hasDuplicate = (formData.modifiedInvoiceDetails || []).some(d =>
      d.invoiceDetailType !== InvoiceDetailTypeEnum.FREE_ITEM &&
      d.productId === newItem.productId &&
      d.lotNo === newItem.lotNo
    );

    if (hasDuplicate) {
      setFlashNotification({
        title: 'Duplicate Item',
        message: 'An item with the same product and lot number is already added.',
        alertType: 'warning'
      });
      return;
    }
    
    modifiedDetails.push(newItem);
    
    onFormDataChange({
      modifiedInvoiceDetails: modifiedDetails
    });
    
    // Reset selection
    setStockSelection({
      selectedStock: null,
      quantity: 0,
      showStockModal: false
    });
    
    setFlashNotification({
      title: 'Success',
      message: 'Stock item added successfully',
      alertType: 'success'
    });
  };

  // Get badge for invoice detail type
  const getDetailTypeBadge = (type?: InvoiceDetailTypeEnum) => {
    if (type === InvoiceDetailTypeEnum.FREE_ITEM) {
      return (
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
      );
    }
    return null;
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

      {/* Original Invoice Details */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '24px'
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
            Original Invoice Details ({formData.originalInvoiceDetails?.length || 0} items)
          </h4>
        </div>

        {formData.originalInvoiceDetails && formData.originalInvoiceDetails.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {formData.originalInvoiceDetails.map((detail: any, index: number) => (
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
                      {getDetailTypeBadge(detail.invoiceDetailType)}
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
                        onClick={() => handleCopyToModified(detail)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                        }}
                      >
                        Copy
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
            <p>No original invoice details</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Select an invoice to load details</p>
          </div>
        )}
      </div>

      {/* Add Stock Item Section */}
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
                placeholder={formData.invoiceId ? "Click to select stock" : "Select invoice first"}
                onClick={handleAddStock}
                disabled={!formData.invoiceId}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: formData.invoiceId ? '#f9fafb' : '#f3f4f6',
                  color: formData.invoiceId ? '#6b7280' : '#9ca3af',
                  cursor: formData.invoiceId ? 'pointer' : 'not-allowed',
                  opacity: formData.invoiceId ? 1 : 0.6
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
                Product Price Type
              </label>
              <input
                type="text"
                value={formData.productPriceTypeName || 'Not selected'}
                readOnly
                disabled
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: formData.productPriceTypeName ? '#6b7280' : '#9ca3af',
                  cursor: 'not-allowed'
                }}
              />
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
      )}

      {/* Modified Invoice Details */}
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
            Modified Invoice Details ({formData.modifiedInvoiceDetails?.length || 0} items)
          </h4>
        </div>

        {formData.modifiedInvoiceDetails && formData.modifiedInvoiceDetails.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {formData.modifiedInvoiceDetails.map((detail: any, index: number) => (
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
                      {getDetailTypeBadge(detail.invoiceDetailType)}
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditModified(index)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModified(index)}
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
            <p>No modified invoice details</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Add or copy items to modify</p>
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setEditingIndex(null);
            setEditingItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Edit Item
              </h3>
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setEditingItem(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Product
                </label>
                <input
                  type="text"
                  value={editingItem.productName || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={editingItem.qty || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, qty: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.price || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                  disabled={editingItem.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: editingItem.invoiceDetailType === InvoiceDetailTypeEnum.FREE_ITEM ? '#f9fafb' : 'white'
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
                  Amount
                </label>
                <input
                  type="text"
                  value={`₱${((editingItem.qty || 0) * (editingItem.price || 0)).toFixed(2)}`}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setEditingItem(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
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

