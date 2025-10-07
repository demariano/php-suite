'use client';

import { ProductPriceTypeApi, ProductUnitApi } from '@data-access/index';
import { useEffect, useState } from 'react';

interface ProductUnitPriceSelectionModalProps {
  show: boolean;
  onSelect: (productUnitId: string, productUnitName: string, productPriceTypeId: string, productPriceTypeName: string) => void;
  onClose: () => void;
}

interface ProductUnit {
  id: string;
  name: string;
}

interface ProductPriceType {
  id: string;
  name: string;
}

export default function ProductUnitPriceSelectionModal({
  show,
  onSelect,
  onClose
}: ProductUnitPriceSelectionModalProps) {
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [productPriceTypes, setProductPriceTypes] = useState<ProductPriceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductUnit, setSelectedProductUnit] = useState<ProductUnit | null>(null);
  const [selectedProductPriceType, setSelectedProductPriceType] = useState<ProductPriceType | null>(null);
  const [showProductUnitModal, setShowProductUnitModal] = useState(false);
  const [showProductPriceTypeModal, setShowProductPriceTypeModal] = useState(false);
  
  // Pagination states for Product Units
  const [unitCurrentPage, setUnitCurrentPage] = useState(1);
  const [unitHasNextPage, setUnitHasNextPage] = useState(false);
  const [unitHasPrevPage, setUnitHasPrevPage] = useState(false);
  const [unitNextCursor, setUnitNextCursor] = useState<string | null>(null);
  const [unitPrevCursor, setUnitPrevCursor] = useState<string | null>(null);
  const [unitCursorStack, setUnitCursorStack] = useState<string[]>([]);
  const [unitCurrentCursor, setUnitCurrentCursor] = useState<string | null>(null);
  const [unitIsGoingBack, setUnitIsGoingBack] = useState(false);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  
  // Pagination states for Product Price Types
  const [priceTypeCurrentPage, setPriceTypeCurrentPage] = useState(1);
  const [priceTypeHasNextPage, setPriceTypeHasNextPage] = useState(false);
  const [priceTypeHasPrevPage, setPriceTypeHasPrevPage] = useState(false);
  const [priceTypeNextCursor, setPriceTypeNextCursor] = useState<string | null>(null);
  const [priceTypePrevCursor, setPriceTypePrevCursor] = useState<string | null>(null);
  const [priceTypeCursorStack, setPriceTypeCursorStack] = useState<string[]>([]);
  const [priceTypeCurrentCursor, setPriceTypeCurrentCursor] = useState<string | null>(null);
  const [priceTypeIsGoingBack, setPriceTypeIsGoingBack] = useState(false);
  const [priceTypeSearchTerm, setPriceTypeSearchTerm] = useState('');
  
  const limit = 20;

  // Load product units and price types when modal opens
  useEffect(() => {
    if (show) {
      setUnitCurrentCursor(null);
      setUnitIsGoingBack(false);
      setPriceTypeCurrentCursor(null);
      setPriceTypeIsGoingBack(false);
      loadProductUnits();
      loadProductPriceTypes();
    }
  }, [show]);

  // Handle page changes for units
  useEffect(() => {
    if (showProductUnitModal) {
      loadProductUnits();
    }
  }, [unitCurrentPage]);

  // Handle page changes for price types
  useEffect(() => {
    if (showProductPriceTypeModal) {
      loadProductPriceTypes();
    }
  }, [priceTypeCurrentPage]);

  // Auto-search when unit search term changes
  useEffect(() => {
    if (showProductUnitModal && unitSearchTerm) {
      const timeoutId = setTimeout(() => {
        setUnitCurrentPage(1);
        setUnitCursorStack([]);
        loadProductUnits(unitSearchTerm);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (showProductUnitModal && unitSearchTerm === '') {
      setUnitCurrentPage(1);
      setUnitCursorStack([]);
      loadProductUnits();
    }
  }, [unitSearchTerm]);

  // Auto-search when price type search term changes
  useEffect(() => {
    if (showProductPriceTypeModal && priceTypeSearchTerm) {
      const timeoutId = setTimeout(() => {
        setPriceTypeCurrentPage(1);
        setPriceTypeCursorStack([]);
        loadProductPriceTypes(priceTypeSearchTerm);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (showProductPriceTypeModal && priceTypeSearchTerm === '') {
      setPriceTypeCurrentPage(1);
      setPriceTypeCursorStack([]);
      loadProductPriceTypes();
    }
  }, [priceTypeSearchTerm]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onClose]);

  const loadProductUnits = async (searchQuery?: string) => {
    setLoading(true);
    try {
      // Determine direction and cursor for pagination
      const direction = unitCurrentPage > 1 ? (unitIsGoingBack ? 'prev' : 'next') : undefined;
      const cursor = unitCurrentCursor ? JSON.stringify(unitCurrentCursor) : undefined;
      
      const response = await ProductUnitApi.getProductUnitsByStatus(
        limit,
        'ACTIVE',
        direction,
        cursor,
        undefined, // userRole
        searchQuery || undefined // name parameter
      );

      const units = response.data.map((unit: { productUnitId: string; productUnitName?: string }) => ({
        id: unit.productUnitId,
        name: unit.productUnitName || 'Unnamed Unit'
      }));

      setProductUnits(units);
      setUnitHasNextPage(!!response.nextCursorPointer);
      setUnitHasPrevPage(!!response.prevCursorPointer);
      setUnitNextCursor(response.nextCursorPointer || null);
      setUnitPrevCursor(response.prevCursorPointer || null);

      // Update cursor stack for navigation
      if (unitCurrentPage > 1 && !searchQuery) {
        const newCursorStack = [...unitCursorStack];
        if (response.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
          newCursorStack[unitCurrentPage - 1] = response.nextCursorPointer;
          setUnitCursorStack(newCursorStack);
        }
      }
    } catch (error) {
      console.error('Error loading product units:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductPriceTypes = async (searchQuery?: string) => {
    setLoading(true);
    try {
      // Determine direction and cursor for pagination
      const direction = priceTypeCurrentPage > 1 ? (priceTypeIsGoingBack ? 'prev' : 'next') : undefined;
      const cursor = priceTypeCurrentCursor ? JSON.stringify(priceTypeCurrentCursor) : undefined;
      
      const response = await ProductPriceTypeApi.getProductPriceTypesByStatus(
        limit,
        'ACTIVE',
        direction,
        cursor,
        undefined, // userRole
        searchQuery || undefined // name parameter
      );

      const priceTypes = response.data.map((priceType: { productPriceTypeId: string; productPriceTypeName?: string }) => ({
        id: priceType.productPriceTypeId,
        name: priceType.productPriceTypeName || 'Unnamed Price Type'
      }));

      setProductPriceTypes(priceTypes);
      setPriceTypeHasNextPage(!!response.nextCursorPointer);
      setPriceTypeHasPrevPage(!!response.prevCursorPointer);
      setPriceTypeNextCursor(response.nextCursorPointer || null);
      setPriceTypePrevCursor(response.prevCursorPointer || null);

      // Update cursor stack for navigation
      if (priceTypeCurrentPage > 1 && !searchQuery) {
        const newCursorStack = [...priceTypeCursorStack];
        if (response.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
          newCursorStack[priceTypeCurrentPage - 1] = response.nextCursorPointer;
          setPriceTypeCursorStack(newCursorStack);
        }
      }
    } catch (error) {
      console.error('Error loading product price types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductUnitSelect = (id: string, name: string) => {
    setSelectedProductUnit({ id, name });
    setShowProductUnitModal(false);
  };

  const handleProductPriceTypeSelect = (id: string, name: string) => {
    setSelectedProductPriceType({ id, name });
    setShowProductPriceTypeModal(false);
  };

  const handleClearProductUnit = () => {
    setSelectedProductUnit(null);
  };

  const handleClearProductPriceType = () => {
    setSelectedProductPriceType(null);
  };

  // Pagination handlers for Product Units
  const handleUnitNextPage = () => {
    if (unitHasNextPage) {
      // Store current cursor for back navigation
      const newCursorStack = [...unitCursorStack];
      if (unitCurrentCursor) {
        newCursorStack[unitCurrentPage] = unitCurrentCursor;
      }
      setUnitCursorStack(newCursorStack);
      
      // Move to next page with next cursor
      setUnitCurrentCursor(unitNextCursor);
      setUnitIsGoingBack(false);
      setUnitCurrentPage(prev => prev + 1);
    }
  };

  const handleUnitPrevPage = () => {
    if (unitHasPrevPage && unitCurrentPage > 1) {
      // Use prevCursor from API response
      setUnitCurrentCursor(unitPrevCursor);
      setUnitIsGoingBack(true);
      setUnitCurrentPage(prev => prev - 1);
    }
  };

  const handleUnitClearSearch = () => {
    setUnitSearchTerm('');
    setUnitCurrentPage(1);
    setUnitCursorStack([]);
    setUnitCurrentCursor(null);
    setUnitIsGoingBack(false);
    loadProductUnits();
  };

  // Pagination handlers for Product Price Types
  const handlePriceTypeNextPage = () => {
    if (priceTypeHasNextPage) {
      // Store current cursor for back navigation
      const newCursorStack = [...priceTypeCursorStack];
      if (priceTypeCurrentCursor) {
        newCursorStack[priceTypeCurrentPage] = priceTypeCurrentCursor;
      }
      setPriceTypeCursorStack(newCursorStack);
      
      // Move to next page with next cursor
      setPriceTypeCurrentCursor(priceTypeNextCursor);
      setPriceTypeIsGoingBack(false);
      setPriceTypeCurrentPage(prev => prev + 1);
    }
  };

  const handlePriceTypePrevPage = () => {
    if (priceTypeHasPrevPage && priceTypeCurrentPage > 1) {
      // Use prevCursor from API response
      setPriceTypeCurrentCursor(priceTypePrevCursor);
      setPriceTypeIsGoingBack(true);
      setPriceTypeCurrentPage(prev => prev - 1);
    }
  };

  const handlePriceTypeClearSearch = () => {
    setPriceTypeSearchTerm('');
    setPriceTypeCurrentPage(1);
    setPriceTypeCursorStack([]);
    setPriceTypeCurrentCursor(null);
    setPriceTypeIsGoingBack(false);
    loadProductPriceTypes();
  };

  const handleConfirm = () => {
    if (selectedProductUnit && selectedProductPriceType) {
      onSelect(
        selectedProductUnit.id,
        selectedProductUnit.name,
        selectedProductPriceType.id,
        selectedProductPriceType.name
      );
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedProductUnit(null);
    setSelectedProductPriceType(null);
    onClose();
  };

  if (!show) return null;

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Add Product Unit Price
          </h2>
          <button
            onClick={handleCancel}
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

        {/* Product Unit Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Product Unit *
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={selectedProductUnit?.name || ''}
              placeholder="Select Product Unit"
              readOnly
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: selectedProductUnit ? '#1f2937' : '#6b7280',
                cursor: 'pointer'
              }}
              onClick={() => setShowProductUnitModal(true)}
            />
            <button
              type="button"
              onClick={() => setShowProductUnitModal(true)}
              style={{
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                height: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              🔍
            </button>
            {selectedProductUnit && (
              <button
                type="button"
                onClick={handleClearProductUnit}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  height: '48px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Product Price Type Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Product Price Type *
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={selectedProductPriceType?.name || ''}
              placeholder="Select Product Price Type"
              readOnly
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: selectedProductPriceType ? '#1f2937' : '#6b7280',
                cursor: 'pointer'
              }}
              onClick={() => setShowProductPriceTypeModal(true)}
            />
            <button
              type="button"
              onClick={() => setShowProductPriceTypeModal(true)}
              style={{
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                height: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              🔍
            </button>
            {selectedProductPriceType && (
              <button
                type="button"
                onClick={handleClearProductPriceType}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  height: '48px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedProductUnit || !selectedProductPriceType}
            style={{
              padding: '12px 24px',
              backgroundColor: (!selectedProductUnit || !selectedProductPriceType) ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!selectedProductUnit || !selectedProductPriceType) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!selectedProductUnit || !selectedProductPriceType) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedProductUnit && selectedProductPriceType) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedProductUnit && selectedProductPriceType) {
                e.currentTarget.style.backgroundColor = '#10b981';
              }
            }}
          >
            Add Unit Price
          </button>
        </div>
      </div>

      {/* Product Unit Selection Modal */}
      {showProductUnitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '70vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                Select Product Unit
              </h3>
              <button
                onClick={() => setShowProductUnitModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={unitSearchTerm}
                  onChange={(e) => setUnitSearchTerm(e.target.value)}
                  placeholder="Search units by name..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                />
                {unitSearchTerm && (
                  <button
                    type="button"
                    onClick={handleUnitClearSearch}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {loading ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  Loading...
                </div>
              ) : productUnits.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  {unitSearchTerm ? `No units found matching "${unitSearchTerm}"` : 'No units available'}
                </div>
              ) : (
                <div>
                  {productUnits.map((unit) => (
                    <div
                      key={unit.id}
                      onClick={() => handleProductUnitSelect(unit.id, unit.name)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: selectedProductUnit?.id === unit.id ? '#eff6ff' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedProductUnit?.id !== unit.id) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedProductUnit?.id !== unit.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {unit.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              gap: '8px'
            }}>
              <button
                onClick={handleUnitPrevPage}
                disabled={!unitHasPrevPage || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: unitHasPrevPage ? '#f3f4f6' : '#f9fafb',
                  color: unitHasPrevPage ? '#374151' : '#9ca3af',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: unitHasPrevPage ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Previous
              </button>
              
              <button
                onClick={handleUnitNextPage}
                disabled={!unitHasNextPage || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: unitHasNextPage ? '#3b82f6' : '#f9fafb',
                  color: unitHasNextPage ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: unitHasNextPage ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Price Type Selection Modal */}
      {showProductPriceTypeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '70vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                Select Product Price Type
              </h3>
              <button
                onClick={() => setShowProductPriceTypeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={priceTypeSearchTerm}
                  onChange={(e) => setPriceTypeSearchTerm(e.target.value)}
                  placeholder="Search price types by name..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                />
                {priceTypeSearchTerm && (
                  <button
                    type="button"
                    onClick={handlePriceTypeClearSearch}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {loading ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  Loading...
                </div>
              ) : productPriceTypes.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  {priceTypeSearchTerm ? `No price types found matching "${priceTypeSearchTerm}"` : 'No price types available'}
                </div>
              ) : (
                <div>
                  {productPriceTypes.map((priceType) => (
                    <div
                      key={priceType.id}
                      onClick={() => handleProductPriceTypeSelect(priceType.id, priceType.name)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: selectedProductPriceType?.id === priceType.id ? '#eff6ff' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedProductPriceType?.id !== priceType.id) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedProductPriceType?.id !== priceType.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {priceType.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              gap: '8px'
            }}>
              <button
                onClick={handlePriceTypePrevPage}
                disabled={!priceTypeHasPrevPage || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: priceTypeHasPrevPage ? '#f3f4f6' : '#f9fafb',
                  color: priceTypeHasPrevPage ? '#374151' : '#9ca3af',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: priceTypeHasPrevPage ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Previous
              </button>
              
              <button
                onClick={handlePriceTypeNextPage}
                disabled={!priceTypeHasNextPage || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: priceTypeHasNextPage ? '#3b82f6' : '#f9fafb',
                  color: priceTypeHasNextPage ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: priceTypeHasNextPage ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
