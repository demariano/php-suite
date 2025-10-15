'use client';

import { ProductApi, ProductDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';

interface ProductSearchableSelectionModalProps {
  show: boolean;
  title: string;
  selectedValue: string | null;
  onSelect: (product: ProductDto) => void;
  onClose: () => void;
}

interface ProductItem {
  productId: string;
  productName?: string;
  productCategoryName?: string;
  productClassName?: string;
  productDeals?: Array<{
    productDealId: string;
    productDealName?: string;
    additionalQty?: number;
    minQty?: number;
  }>;
}

export default function ProductSearchableSelectionModal({
  show,
  title,
  selectedValue,
  onSelect,
  onClose
}: ProductSearchableSelectionModalProps) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showDeals, setShowDeals] = useState(false);

  // Search term
  const [searchTerm, setSearchTerm] = useState('');

  const limit = 20;

  useEffect(() => {
    if (show) {
      setCurrentCursor(null);
      setIsGoingBack(false);
      setSelectedProduct(null);
      setShowDeals(false);
      loadItems();
    }
  }, [show]);

  // Auto-search when search term changes
  useEffect(() => {
    if (show && searchTerm) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        setCursorStack([]);
        loadItems(searchTerm);
      }, 500); // 500ms delay to avoid too many API calls

      return () => clearTimeout(timeoutId);
    } else if (show && searchTerm === '') {
      setCurrentPage(1);
      setCursorStack([]);
      loadItems();
    }
  }, [searchTerm]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        if (showDeals) {
          setShowDeals(false);
          setSelectedProduct(null);
        } else {
          onClose();
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, showDeals, onClose]);

  const loadItems = async (searchQuery?: string) => {
    try {
      setLoading(true);
      
      // Determine direction and cursor for pagination
      const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
      const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;
      
      let response;
      
      if (searchQuery?.trim()) {
        response = await ProductApi.getProductsByName(
          searchQuery.trim(),
          limit,
          direction,
          cursor
        );
      } else {
        response = await ProductApi.getProductsByStatus(
          limit,
          StatusEnum.ACTIVE,
          direction,
          cursor
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          // Transform the data to match the expected ProductItem interface
          const transformedItems = response.data.map((item: ProductDto) => ({
            productId: item.productId || '',
            productName: item.productName || '',
            productCategoryName: item.productCategoryName || '',
            productClassName: item.productClassName || '',
            productDeals: item.productDeals || []
          }));
          setItems(transformedItems);
          setNextCursor(response.nextCursorPointer || null);
          setPrevCursor(response.prevCursorPointer || null);
          setHasNextPage(!!response.nextCursorPointer);
          setHasPrevPage(!!response.prevCursorPointer);
        } else {
          setItems([]);
          setNextCursor(null);
          setPrevCursor(null);
          setHasNextPage(false);
          setHasPrevPage(false);
        }
      } else {
        setItems([]);
        setNextCursor(null);
        setPrevCursor(null);
        setHasNextPage(false);
        setHasPrevPage(false);
      }
      
      // Update cursor stack for navigation
      if (currentPage > 1 && !searchQuery) {
        const newCursorStack = [...cursorStack];
        if (response.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
          newCursorStack[currentPage - 1] = response.nextCursorPointer;
          setCursorStack(newCursorStack);
        }
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setCursorStack([]);
    setCurrentCursor(null);
    setIsGoingBack(false);
    loadItems();
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      // Store current cursor for back navigation
      const newCursorStack = [...cursorStack];
      if (currentCursor) {
        newCursorStack[currentPage] = currentCursor;
      }
      setCursorStack(newCursorStack);
      
      // Move to next page with next cursor
      setCurrentCursor(nextCursor);
      setIsGoingBack(false);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage && currentPage > 1) {
      // Use prevCursor from API response
      setCurrentCursor(prevCursor);
      setIsGoingBack(true);
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleProductSelect = (product: ProductItem) => {
    if (product.productDeals && product.productDeals.length > 0) {
      setSelectedProduct(product);
      setShowDeals(true);
    } else {
      // If no deals, select the product directly
      const fullProduct: ProductDto = {
        productId: product.productId,
        productName: product.productName,
        productCategoryName: product.productCategoryName,
        productClassName: product.productClassName,
        productDeals: product.productDeals || []
      };
      onSelect(fullProduct);
      onClose();
    }
  };

  const handleDealSelect = (deal: any) => {
    if (selectedProduct) {
      const fullProduct: ProductDto = {
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        productCategoryName: selectedProduct.productCategoryName,
        productClassName: selectedProduct.productClassName,
        productDeals: selectedProduct.productDeals || []
      };
      onSelect(fullProduct);
      onClose();
    }
  };

  const handleBackToProducts = () => {
    setShowDeals(false);
    setSelectedProduct(null);
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
        borderRadius: '8px',
        padding: '24px',
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {showDeals ? `${selectedProduct?.productName} - Product Deals` : title}
          </h3>
          <button
            onClick={showDeals ? handleBackToProducts : onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            {showDeals ? '←' : '×'}
          </button>
        </div>

        {!showDeals && (
          <>
            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name..."
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
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
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

            {/* Products List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
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
              ) : items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.productId}
                    onClick={() => handleProductSelect(item)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      backgroundColor: selectedValue === item.productId ? '#dbeafe' : 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedValue !== item.productId) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedValue !== item.productId) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {item.productName}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      {item.productCategoryName && <span>Category: {item.productCategoryName}</span>}
                      {item.productClassName && <span>Class: {item.productClassName}</span>}
                      <span>Deals: {item.productDeals?.length || 0}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  No products found
                </div>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {items.length} items
              </div>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={handlePrevPage}
                  disabled={!hasPrevPage || loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: hasPrevPage ? '#f3f4f6' : '#f9fafb',
                    color: hasPrevPage ? '#374151' : '#9ca3af',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: hasPrevPage ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!hasNextPage || loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: hasNextPage ? '#3b82f6' : '#f9fafb',
                    color: hasNextPage ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: hasNextPage ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {showDeals && selectedProduct && (
          <>
            {/* Product Deals List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {selectedProduct.productDeals && selectedProduct.productDeals.length > 0 ? (
                selectedProduct.productDeals.map((deal) => (
                  <div
                    key={deal.productDealId}
                    onClick={() => handleDealSelect(deal)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {deal.productDealName}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      {deal.minQty !== undefined && <span>Min Qty: {deal.minQty}</span>}
                      {deal.additionalQty !== undefined && <span>Additional Qty: {deal.additionalQty}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  No deals available for this product
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {selectedProduct.productDeals?.length || 0} deals available
              </div>
              <button
                onClick={handleBackToProducts}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Back to Products
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
