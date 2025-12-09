'use client';

import { ProductDto, ProductUnitDto, StatusEnum, StockDto, StockTypeDto } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';
import {
    ProductSearchableSelectionModal,
    ProductUnitSearchableSelectionModal,
    StockTypeSearchableSelectionModal
} from '../../../search-modals';
import SelectionField from './SelectionField';

// Custom hook for whole number formatting (no decimals)
const useWholeNumberFormatting = (initialValue = '') => {
  const [isTyping, setIsTyping] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Format number with commas but no decimals
  const formatWholeNumber = (value: string | number): string => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US');
  };

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Auto-format when user stops typing
  useEffect(() => {
    if (value && isTyping) {
      const timer = setTimeout(() => {
        const numericValue = parseInt(removeCommas(value));
        if (!isNaN(numericValue)) {
          const formatted = formatWholeNumber(numericValue);
          setValue(formatted);
          setIsTyping(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [value, isTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    // Only allow whole numbers (no decimals)
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    
    setIsTyping(true);
    setValue(numericValue);
  };

  const handleFocus = () => {
    if (value) {
      const raw = removeCommas(value);
      setValue(raw);
    }
    setIsTyping(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    if (rawValue) {
      const numericValue = parseInt(rawValue);
      if (!isNaN(numericValue)) {
        const formatted = formatWholeNumber(numericValue);
        setValue(formatted);
      }
    }
    setIsTyping(false);
  };

  return {
    value,
    numericValue: parseInt(removeCommas(value)) || 0,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    setValue
  };
};

interface StockFormProps {
  isCreateMode: boolean;
  selectedStock: StockDto | null;
  successMessage: string | null;
  onSave: (stock: StockDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  activeTab?: 'details' | 'approval';
}

export default function StockForm({
  isCreateMode,
  selectedStock,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  activeTab = 'details'
}: StockFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string} | null>(null);
  const [selectedProductUnit, setSelectedProductUnit] = useState<{id: string, name: string} | null>(null);
  const [selectedStockType, setSelectedStockType] = useState<{id: string, name: string} | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductUnitModal, setShowProductUnitModal] = useState(false);
  const [showStockTypeModal, setShowStockTypeModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Form state for controlled inputs - Initialize with selected stock data if available
  const [formData, setFormData] = useState({
    lotNo: selectedStock?.lotNo || '',
    quantityOnHand: selectedStock?.quantityOnHand?.toString() || '0',
    availableQuantity: selectedStock?.availableQuantity?.toString() || '0',
    expirationDate: selectedStock?.expirationDate || '',
    changeReason: selectedStock?.changeReason || ''
  });

  // Whole number formatting hooks for numeric fields (no decimals)
  const quantityOnHandFormatting = useWholeNumberFormatting(formData.quantityOnHand);
  const availableQuantityFormatting = useWholeNumberFormatting(formData.availableQuantity);

  // Set initial values when editing (only when user hasn't made selections)
  useEffect(() => {
    if (!isCreateMode && selectedStock && !userHasMadeSelections) {
      if (selectedStock.productId && selectedStock.productName) {
        setSelectedProduct({
          id: selectedStock.productId,
          name: selectedStock.productName
        });
      }
      if (selectedStock.productUnitId && selectedStock.productUnitName) {
        setSelectedProductUnit({
          id: selectedStock.productUnitId,
          name: selectedStock.productUnitName
        });
      }
      if (selectedStock.stockTypeId && selectedStock.stockTypeName) {
        setSelectedStockType({
          id: selectedStock.stockTypeId,
          name: selectedStock.stockTypeName
        });
      }
      // Initialize form data
      setFormData({
        lotNo: selectedStock.lotNo || '',
        quantityOnHand: selectedStock.quantityOnHand?.toString() || '0',
        availableQuantity: selectedStock.availableQuantity?.toString() || '0',
        expirationDate: selectedStock.expirationDate || '',
        changeReason: selectedStock.changeReason || ''
      });
    }
  }, [isCreateMode, selectedStock, userHasMadeSelections]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.lotNo.trim()) {
      errors.push('Lot number is required.');
    }
    
    if (!selectedProduct) {
      errors.push('Please select a product.');
    }
    
    if (!selectedProductUnit) {
      errors.push('Please select a product unit.');
    }
    
    if (!selectedStockType) {
      errors.push('Please select a stock type.');
    }
    
    // Validate change reason for non-create mode (only required for non-admin users)
    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setValidationErrors([]);
    
    if (isCreateMode) {
      const newStock = {
        lotNo: formData.lotNo,
        productId: selectedProduct?.id || '',
        productName: selectedProduct?.name || '',
        quantityOnHand: parseInt(formData.quantityOnHand) || 0,
        availableQuantity: parseInt(formData.availableQuantity) || 0,
        productUnitId: selectedProductUnit?.id || '',
        productUnitName: selectedProductUnit?.name || '',
        expirationDate: formData.expirationDate || '',
        stockTypeId: selectedStockType?.id || '',
        stockTypeName: selectedStockType?.name || '',
        status: StatusEnum.NEW_RECORD,
        changeReason: '' // No change reason needed for new records
      };
      
      onSave(newStock as StockDto);
    } else {
      const updatedStock = {
        ...selectedStock,
        lotNo: formData.lotNo,
        productId: selectedProduct?.id || '',
        productName: selectedProduct?.name || '',
        quantityOnHand: parseInt(formData.quantityOnHand) || 0,
        availableQuantity: parseInt(formData.availableQuantity) || 0,
        productUnitId: selectedProductUnit?.id || '',
        productUnitName: selectedProductUnit?.name || '',
        expirationDate: formData.expirationDate || '',
        stockTypeId: selectedStockType?.id || '',
        stockTypeName: selectedStockType?.name || '',
        status: StatusEnum.ACTIVE,
        changeReason: formData.changeReason || ''
      };
      
      onSave(updatedStock as StockDto);
    }
  };

  const handleProductSelect = (product: ProductDto) => {
    setSelectedProduct({ id: product.productId, name: product.productName || '' });
    setUserHasMadeSelections(true);
  };

  const handleProductUnitSelect = (unit: ProductUnitDto) => {
    setSelectedProductUnit({ id: unit.productUnitId, name: unit.productUnitName || '' });
    setUserHasMadeSelections(true);
  };

  const handleStockTypeSelect = (stockType: StockTypeDto) => {
    setSelectedStockType({ id: stockType.stockTypeId, name: stockType.stockTypeName || '' });
    setUserHasMadeSelections(true);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
  };

  const handleClearProductUnit = () => {
    setSelectedProductUnit(null);
  };

  const handleClearStockType = () => {
    setSelectedStockType(null);
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
      
      {!isCreateMode && !isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason}
          onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
          disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
        />
      )}
      
      {/* Details Container */}
      <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-blue-600">
                    Basic Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lot Number */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Lot Number
                </label>
                <input
                  type="text"
                  name="lotNo"
                  value={formData.lotNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, lotNo: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter lot number' : ''}
                  disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Expiration Date */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Expiration Date
                </label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>
            </div>
              </div>
            </div>

            {/* Product & Type Selection Section */}
            <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-blue-600">
                    Product & Type
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SelectionField
              label="Product"
              selectedItem={selectedProduct}
              onSelect={() => setShowProductModal(true)}
              onClear={handleClearProduct}
              buttonText="Select Product"
              disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
            />

            <SelectionField
              label="Product Unit"
              selectedItem={selectedProductUnit}
              onSelect={() => setShowProductUnitModal(true)}
              onClear={handleClearProductUnit}
              buttonText="Select Unit"
              disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
            />

            <SelectionField
              label="Stock Type"
              selectedItem={selectedStockType}
              onSelect={() => setShowStockTypeModal(true)}
              onClear={handleClearStockType}
              buttonText="Select Type"
              disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
            />
              </div>
                </div>
              </div>

            {/* Quantity Information Section */}
            <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-blue-600">
                    Quantity Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Quantity On Hand
            </label>
            <input
              type="text"
              name="quantityOnHand"
              value={quantityOnHandFormatting.value}
              onChange={(e) => {
                quantityOnHandFormatting.onChange(e);
                setFormData(prev => ({ ...prev, quantityOnHand: e.target.value.replace(/,/g, '') }));
              }}
              onFocus={quantityOnHandFormatting.onFocus}
              onBlur={(e) => {
                quantityOnHandFormatting.onBlur(e);
                setFormData(prev => ({ ...prev, quantityOnHand: quantityOnHandFormatting.numericValue.toString() }));
              }}
              placeholder={isCreateMode ? 'Enter quantity on hand' : ''}
              disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                  ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
              }`}
            />
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Available Quantity
            </label>
            <input
              type="text"
              name="availableQuantity"
              value={availableQuantityFormatting.value}
              onChange={(e) => {
                availableQuantityFormatting.onChange(e);
                setFormData(prev => ({ ...prev, availableQuantity: e.target.value.replace(/,/g, '') }));
              }}
              onFocus={availableQuantityFormatting.onFocus}
              onBlur={(e) => {
                availableQuantityFormatting.onBlur(e);
                setFormData(prev => ({ ...prev, availableQuantity: availableQuantityFormatting.numericValue.toString() }));
              }}
              placeholder={isCreateMode ? 'Enter available quantity' : ''}
              disabled={!isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                !isCreateMode && selectedStock?.status !== StatusEnum.ACTIVE
                  ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
              }`}
            />
          </div>
        </div>
              </div>
            </div>
      </div>

        {/* Action Buttons */}
        {activeTab !== 'approval' && (
          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {!isCreateMode && selectedStock?.status === StatusEnum.ACTIVE ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {(isCreateMode || selectedStock?.status === StatusEnum.ACTIVE) && (
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isCreateMode ? 'Create Stock' : 'Save Changes'}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        )}
     </form>

     {/* Searchable Selection Modals */}
     <ProductSearchableSelectionModal
       show={showProductModal}
       title="Select Product"
       selectedValue={selectedProduct?.id || null}
       onSelect={handleProductSelect}
       onClose={() => setShowProductModal(false)}
     />

     <ProductUnitSearchableSelectionModal
       show={showProductUnitModal}
       title="Select Product Unit"
       selectedValue={selectedProductUnit?.id || null}
       onSelect={handleProductUnitSelect}
       onClose={() => setShowProductUnitModal(false)}
     />

     <StockTypeSearchableSelectionModal
       show={showStockTypeModal}
       title="Select Stock Type"
       selectedValue={selectedStockType?.id || null}
       onSelect={handleStockTypeSelect}
       onClose={() => setShowStockTypeModal(false)}
     />
   </>
  );
}
