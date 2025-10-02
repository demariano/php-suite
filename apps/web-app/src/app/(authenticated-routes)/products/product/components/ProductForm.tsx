'use client';

import { ProductDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import ProductSearchableSelectionModal from '../../../search-modals/ProductSearchableSelectionModal';
import SelectionField from './SelectionField';

// Types for inner tabs
type InnerTabType = 'record-details' | 'product-deals' | 'product-unit-price';

interface ProductDealDetailsDto {
  productDealId: string;
  productDealName?: string;
  additionalQty?: number;
  minQty?: number;
}

interface ProductUnitPriceDto {
  productUnitId: string;
  productUnitName?: string;
  productPriceTypeId: string;
  productPriceTypeName?: string;
  cost?: number;
  price?: number;
}

interface ProductFormProps {
  isCreateMode: boolean;
  selectedProduct: ProductDto | null;
  successMessage: string | null;
  onSave: (product: ProductDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
}

export default function ProductForm({
  isCreateMode,
  selectedProduct,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false
}: ProductFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null);
  const [selectedClass, setSelectedClass] = useState<{id: string, name: string} | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Inner tabs state
  const [activeInnerTab, setActiveInnerTab] = useState<InnerTabType>('record-details');
  const [productDeals, setProductDeals] = useState<ProductDealDetailsDto[]>([]);
  const [productUnitPrices, setProductUnitPrices] = useState<ProductUnitPriceDto[]>([]);

  // Set initial values when editing (only when user hasn't made selections)
  useEffect(() => {
    if (!isCreateMode && selectedProduct && !userHasMadeSelections) {
      if (selectedProduct.productCategoryId && selectedProduct.productCategoryName) {
        setSelectedCategory({
          id: selectedProduct.productCategoryId,
          name: selectedProduct.productCategoryName
        });
      }
      if (selectedProduct.productClassId && selectedProduct.productClassName) {
        setSelectedClass({
          id: selectedProduct.productClassId,
          name: selectedProduct.productClassName
        });
      }
      // Initialize product deals and unit prices
      if (selectedProduct.productDeals) {
        setProductDeals(selectedProduct.productDeals);
      }
      if (selectedProduct.productUnitPrice) {
        setProductUnitPrices(selectedProduct.productUnitPrice);
      }
    }
  }, [isCreateMode, selectedProduct, userHasMadeSelections]);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productName = formData.get('productName') as string;
    const criticalLevel = formData.get('criticalLevel') as string;
    const changeReason = formData.get('changeReason') as string;
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!selectedCategory) {
      errors.push('Please select a product category.');
    }
    
    if (!selectedClass) {
      errors.push('Please select a product class.');
    }
    
    // Validate change reason for non-create mode (only required for non-admin users)
    if (!isCreateMode && !isAdminUser && (!changeReason || changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }

    // Check for duplicate deals
    const dealIds = productDeals.map(deal => deal.productDealId);
    const uniqueDealIds = new Set(dealIds);
    if (dealIds.length !== uniqueDealIds.size) {
      errors.push('Duplicate product deals detected. Please remove duplicate deals.');
    }
    
    // Check for duplicate unit price combinations
    const unitPriceCombinations = productUnitPrices.map(price => 
      `${price.productUnitName || ''}-${price.productPriceTypeName || ''}`
    );
    const uniqueUnitPriceCombinations = new Set(unitPriceCombinations);
    if (unitPriceCombinations.length !== uniqueUnitPriceCombinations.size) {
      errors.push('Duplicate unit price combinations detected. Please remove duplicate unit prices.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      
      // Focus on change reason textbox if change reason validation error occurred
      const changeReasonError = errors.find(error => error.includes('reason for the change'));
      if (changeReasonError) {
        // Switch to Record Details tab first to make the change reason field visible
        setActiveInnerTab('record-details');
        
        setTimeout(() => {
          const changeReasonTextarea = document.querySelector('textarea[name="changeReason"]') as HTMLTextAreaElement;
          if (changeReasonTextarea) {
            changeReasonTextarea.focus();
          }
        }, 200); // Increased timeout to allow tab switch to complete
      }
      
      return;
    }
    
    // Clear validation errors if validation passes
    setValidationErrors([]);
    
    if (isCreateMode) {
      const newProduct = {
        productName,
        productCategoryId: selectedCategory?.id || '',
        productCategoryName: selectedCategory?.name || '',
        productClassId: selectedClass?.id || '',
        productClassName: selectedClass?.name || '',
        criticalLevel: criticalLevel ? parseInt(criticalLevel) : 0,
        status: StatusEnum.NEW_RECORD,
        productDeals: productDeals,
        productUnitPrice: productUnitPrices,
        changeReason: '' // No change reason needed for new records
      };
      onSave(newProduct as ProductDto);
    } else {
      const updatedProduct = {
        ...selectedProduct,
        productName,
        productCategoryId: selectedCategory?.id || '',
        productCategoryName: selectedCategory?.name || '',
        productClassId: selectedClass?.id || '',
        productClassName: selectedClass?.name || '',
        criticalLevel: criticalLevel ? parseInt(criticalLevel) : 0,
        status: StatusEnum.ACTIVE,
        productDeals: productDeals,
        productUnitPrice: productUnitPrices,
        changeReason: changeReason || ''
      };
      onSave(updatedProduct as ProductDto);
    }
  };

  const handleCategorySelect = (id: string, name: string) => {
    setSelectedCategory({ id, name });
    setUserHasMadeSelections(true);
  };

  const handleClassSelect = (id: string, name: string) => {
    setSelectedClass({ id, name });
    setUserHasMadeSelections(true);
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
  };

  const handleClearClass = () => {
    setSelectedClass(null);
  };

  // Product Deals management
  const addProductDeal = () => {
    setShowDealModal(true);
  };

  const handleDealSelect = (id: string, name: string) => {
    // Check if deal is already added
    const existingDeal = productDeals.find(deal => deal.productDealId === id);
    if (existingDeal) {
      // Add validation error for duplicate deal
      setValidationErrors(['This product deal has already been added. Please select a different deal.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newDeal: ProductDealDetailsDto = {
      productDealId: id,
      productDealName: name,
      additionalQty: 0,
      minQty: 0
    };
    setProductDeals([...productDeals, newDeal]);
  };

  const updateProductDeal = (index: number, field: keyof ProductDealDetailsDto, value: string | number) => {
    const updatedDeals = [...productDeals];
    updatedDeals[index] = { ...updatedDeals[index], [field]: value };
    setProductDeals(updatedDeals);
  };

  const removeProductDeal = (index: number) => {
    setProductDeals(productDeals.filter((_, i) => i !== index));
  };

  // Product Unit Price management
  const addProductUnitPrice = () => {
    const newUnitPrice: ProductUnitPriceDto = {
      productUnitId: `temp_${Date.now()}`,
      productUnitName: '',
      productPriceTypeId: `temp_${Date.now()}`,
      productPriceTypeName: '',
      cost: 0,
      price: 0
    };
    setProductUnitPrices([...productUnitPrices, newUnitPrice]);
  };

  const updateProductUnitPrice = (index: number, field: keyof ProductUnitPriceDto, value: string | number) => {
    const updatedUnitPrices = [...productUnitPrices];
    updatedUnitPrices[index] = { ...updatedUnitPrices[index], [field]: value };
    
    // Check for duplicate unit name and price type name combination
    if (field === 'productUnitName' || field === 'productPriceTypeName') {
      const currentItem = updatedUnitPrices[index];
      const unitName = field === 'productUnitName' ? value as string : currentItem.productUnitName;
      const priceTypeName = field === 'productPriceTypeName' ? value as string : currentItem.productPriceTypeName;
      
      // Only check for duplicates if both unit name and price type name are filled
      if (unitName && priceTypeName) {
        const duplicateExists = updatedUnitPrices.some((item, idx) => 
          idx !== index && 
          item.productUnitName === unitName && 
          item.productPriceTypeName === priceTypeName
        );
        
        if (duplicateExists) {
          setValidationErrors(['This unit name and price type combination has already been added. Please use different values.']);
          return;
        }
      }
    }
    
    // Clear any existing validation errors if no duplicates found
    setValidationErrors([]);
    setProductUnitPrices(updatedUnitPrices);
  };

  const removeProductUnitPrice = (index: number) => {
    setProductUnitPrices(productUnitPrices.filter((_, i) => i !== index));
  };

  return (
    <>
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '2px solid #16a34a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <span style={{
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontWeight: '600' }}>
              Please fix the following errors:
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#dc2626'
          }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedProduct && 
       (selectedProduct.status === StatusEnum.FOR_APPROVAL || selectedProduct.status === StatusEnum.NEW_RECORD || selectedProduct.status === StatusEnum.FOR_DELETION) && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
          <span style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {selectedProduct.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Details Container with Inner Tabs */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Details
          </h3>
        </div>

        {/* Inner Tabs Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          {[
            { id: 'record-details', label: 'Record Details', icon: '📝' },
            { id: 'product-deals', label: 'Product Deals', icon: '🎯' },
            { id: 'product-unit-price', label: 'Product Unit Price', icon: '💰' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInnerTab(tab.id as InnerTabType)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeInnerTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeInnerTab === tab.id ? 'white' : '#6b7280',
                borderBottom: activeInnerTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeInnerTab === 'record-details' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Product Name
              </label>
              <input
                type="text"
                name="productName"
                defaultValue={isCreateMode ? '' : selectedProduct?.productName || ''}
                placeholder={isCreateMode ? 'Enter product name' : ''}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>

         <SelectionField
           label="Product Category *"
           selectedItem={selectedCategory}
           onSelect={() => setShowCategoryModal(true)}
           onClear={handleClearCategory}
           buttonText="Select Category"
         />

         <SelectionField
           label="Product Class *"
           selectedItem={selectedClass}
           onSelect={() => setShowClassModal(true)}
           onClear={handleClearClass}
           buttonText="Select Class"
         />

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Critical Level
          </label>
          <input
            type="number"
            name="criticalLevel"
            defaultValue={isCreateMode ? '0' : selectedProduct?.criticalLevel || '0'}
            placeholder={isCreateMode ? 'Enter critical level' : ''}
            min="0"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'white',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        
            {!isCreateMode && selectedProduct && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Status
                </label>
                <div style={{
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {selectedProduct.status || 'ACTIVE'}
                </div>
              </div>
            )}

            {/* Change Reason Field - Only show for non-create mode */}
            {!isCreateMode && (
              <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Change Reason {!isAdminUser ? '*' : ''}
                </label>
                <textarea
                  name="changeReason"
                  defaultValue={selectedProduct?.changeReason || ''}
                  placeholder="Please explain the reason for this change..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required={!isAdminUser}
                />
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {isAdminUser 
                    ? 'Optional field for documenting the reason for changes.' 
                    : 'This field is required when making changes to the product record.'
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Deals Tab */}
        {activeInnerTab === 'product-deals' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Product Deals
              </h4>
              <button
                type="button"
                onClick={addProductDeal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }}
              >
                <span>+</span>
                Add Deal
              </button>
            </div>

            {productDeals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
                <p>No product deals added yet. Click "Add Deal" to get started.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {productDeals.map((deal, index) => (
                  <div key={index} style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {deal.productDealName || 'Unnamed Deal'}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeProductDeal(index)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                      >
                        <span>🗑️</span>
                        Remove
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Minimum Quantity
                        </label>
                        <div style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#374151'
                        }}>
                          {deal.minQty || 0}
                        </div>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Additional Quantity
                        </label>
                        <div style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#374151'
                        }}>
                          {deal.additionalQty || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Unit Price Tab */}
        {activeInnerTab === 'product-unit-price' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Product Unit Prices
              </h4>
              <button
                type="button"
                onClick={addProductUnitPrice}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>+</span>
                Add Unit Price
              </button>
            </div>

            {productUnitPrices.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
                <p>No unit prices added yet. Click "Add Unit Price" to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {productUnitPrices.map((unitPrice, index) => (
                  <div key={index} style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {unitPrice.productUnitName || 'Unnamed Unit'} - {unitPrice.productPriceTypeName || 'Unnamed Price Type'}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeProductUnitPrice(index)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Cost
                        </label>
                        <input
                          type="number"
                          value={unitPrice.cost || 0}
                          onChange={(e) => updateProductUnitPrice(index, 'cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Price
                        </label>
                        <input
                          type="number"
                          value={unitPrice.price || 0}
                          onChange={(e) => updateProductUnitPrice(index, 'price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        {!isCreateMode && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={selectedProduct?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedProduct?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedProduct?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedProduct?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedProduct?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedProduct?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedProduct?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedProduct?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
          >
            Delete
          </button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isCreateMode && selectedProduct?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedProduct?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedProduct?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedProduct?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedProduct?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedProduct?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
       </div>
     </form>

     {/* Searchable Selection Modals */}
     <ProductSearchableSelectionModal
       show={showCategoryModal}
       title="Select Product Category"
       type="category"
       selectedValue={selectedCategory?.id || null}
       onSelect={handleCategorySelect}
       onClose={() => setShowCategoryModal(false)}
     />

     <ProductSearchableSelectionModal
       show={showClassModal}
       title="Select Product Class"
       type="class"
       selectedValue={selectedClass?.id || null}
       onSelect={handleClassSelect}
       onClose={() => setShowClassModal(false)}
     />

     <ProductSearchableSelectionModal
       show={showDealModal}
       title="Select Product Deal"
       type="deal"
       selectedValue={null}
       onSelect={handleDealSelect}
       onClose={() => setShowDealModal(false)}
     />
   </>
 );
}
