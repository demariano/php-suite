'use client';

import { DeliveryDetailsDto, ProductDto, ProductUnitDto, StockDeliveryDto, StockTypeDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import ProductSearchableSelectionModal from '../../../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../../../search-modals/ProductUnitSearchableSelectionModal';
import StockTypeSearchableSelectionModal from '../../../../../search-modals/StockTypeSearchableSelectionModal';

interface StockDeliveryDetailsTabProps {
  formData: StockDeliveryDto;
  onFormDataChange: (updatedData: Partial<StockDeliveryDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
}

interface StockSelectionState {
  selectedProduct: ProductDto | null;
  selectedProductUnit: ProductUnitDto | null;
  selectedStockType: StockTypeDto | null;
  lotNo: string;
  expirationDate: string;
  quantity: number;
  showProductModal: boolean;
  showProductUnitModal: boolean;
  showStockTypeModal: boolean;
}

export default function StockDeliveryDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false
}: StockDeliveryDetailsTabProps) {
  const { setFlashNotification } = useSessionStore();
  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedProduct: null,
    selectedProductUnit: null,
    selectedStockType: null,
    lotNo: '',
    expirationDate: '',
    quantity: 0,
    showProductModal: false,
    showProductUnitModal: false,
    showStockTypeModal: false
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

  const handleAddDetailRecord = () => {
    if (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit || 
        !stockSelection.selectedStockType || stockSelection.quantity <= 0) {
      setFlashNotification({
        title: 'Missing Information',
        message: 'Please select product, product unit, stock type, and enter quantity.',
        alertType: 'warning'
      });
      return;
    }

    // Prevent duplicate items with the same product and lot number
    const hasDuplicate = (formData.deliveryDetails || []).some(d =>
      d.productId === stockSelection.selectedProduct?.productId &&
      d.lotNo === stockSelection.lotNo
    );
    if (hasDuplicate) {
      setFlashNotification({
        title: 'Duplicate Item',
        message: 'An item with the same product and lot is already added.',
        alertType: 'warning'
      });
      return;
    }

    const newDetail: DeliveryDetailsDto = {
      productId: stockSelection.selectedProduct.productId || '',
      productName: stockSelection.selectedProduct.productName || '',
      productUnitId: stockSelection.selectedProductUnit.productUnitId,
      productUnitName: stockSelection.selectedProductUnit.productUnitName,
      stockTypeId: stockSelection.selectedStockType.stockTypeId || '',
      stockTypeName: stockSelection.selectedStockType.stockTypeName || '',
      lotNo: stockSelection.lotNo,
      qty: stockSelection.quantity,
      expirationDate: stockSelection.expirationDate
    };

    const updatedDetails = [...(formData.deliveryDetails || [])];
    updatedDetails.push(newDetail);

    onFormDataChange({
      deliveryDetails: updatedDetails
    });

    // Reset selection
    setStockSelection({
      selectedProduct: null,
      selectedProductUnit: null,
      selectedStockType: null,
      lotNo: '',
      expirationDate: '',
      quantity: 0,
      showProductModal: false,
      showProductUnitModal: false,
      showStockTypeModal: false
    });
  };

  const handleDeleteDetail = (index: number) => {
    const updatedDetails = [...(formData.deliveryDetails || [])];
    updatedDetails.splice(index, 1);
    
    onFormDataChange({
      deliveryDetails: updatedDetails
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
        Delivery Details
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
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
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
                placeholder="Click to select product"
                onClick={() => setStockSelection(prev => ({ ...prev, showProductModal: true }))}
                disabled={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer'
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
                disabled={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer'
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
                disabled={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer'
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
                disabled={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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

      {/* Delivery Details Table */}
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
            Delivery Details ({formData.deliveryDetails?.length || 0} items)
          </h4>
        </div>

        {formData.deliveryDetails && formData.deliveryDetails.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {formData.deliveryDetails.map((detail, index) => (
              <div
                key={`${detail.productId}-${detail.lotNo}-${index}`}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isReadOnly ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr auto',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {detail.productName}
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
                      Unit
                    </label>
                    <input
                      type="text"
                      value={detail.productUnitName || ''}
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
                      Stock Type
                    </label>
                    <input
                      type="text"
                      value={detail.stockTypeName || ''}
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
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={detail.expirationDate || ''}
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
                          if (!isReadOnly) {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isReadOnly) {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }
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
              ? "No delivery details in this version."
              : "No delivery details added yet. Click \"Add Stock\" to get started."
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

