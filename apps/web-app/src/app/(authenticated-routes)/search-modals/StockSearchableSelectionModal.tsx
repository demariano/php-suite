'use client';

import { StatusEnum, StockApi, StockDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface StockSearchableSelectionModalProps {
  show: boolean;
  title: string;
  selectedValue: string | null;
  onSelect: (stock: StockDto) => void;
  onClose: () => void;
}

interface StockItem {
  stockId: string;
  productId?: string;
  productName: string;
  productUnitId?: string;
  productUnitName?: string;
  stockTypeId?: string;
  stockTypeName?: string;
  lotNo?: string;
  availableQuantity?: number;
  expirationDate?: string;
}

export default function StockSearchableSelectionModal({
  show,
  title,
  selectedValue,
  onSelect,
  onClose
}: StockSearchableSelectionModalProps) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [isGoingBack, setIsGoingBack] = useState(false);

  // Search fields
  const [lotNo, setLotNo] = useState('');
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('');
  const [stockType, setStockType] = useState('');

  const limit = 20;

  useEffect(() => {
    if (show) {
      setCurrentCursor(null);
      setIsGoingBack(false);
      loadItems();
    }
  }, [show]);

  // Auto-search when any search field changes
  useEffect(() => {
    if (show && (lotNo || productName || unit || stockType)) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        setCursorStack([]);
        loadItems();
      }, 500); // 500ms delay to avoid too many API calls

      return () => clearTimeout(timeoutId);
    } else if (show && !lotNo && !productName && !unit && !stockType) {
      setCurrentPage(1);
      setCursorStack([]);
      loadItems();
    }
  }, [lotNo, productName, unit, stockType]);

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

  const loadItems = async () => {
    try {
      setLoading(true);
      
      // Determine direction and cursor for pagination
      const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
      const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;
      
      const filterParams = {
        status: StatusEnum.ACTIVE,
        lotNo: lotNo?.trim() || undefined,
        productName: productName?.trim() || undefined,
        productUnitName: unit?.trim() || undefined,
        stockTypeName: stockType?.trim() || undefined,
      };

      const response = await StockApi.getStocksByFilter(
        filterParams,
        limit,
        direction,
        cursor
      );
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          // Transform the data to match the expected StockItem interface
          const transformedItems = response.data.map((item: StockDto) => ({
            stockId: item.stockId || '',
            productId: item.productId,
            productName: item.productName || '',
            productUnitId: item.productUnitId,
            productUnitName: item.productUnitName,
            stockTypeId: item.stockTypeId,
            stockTypeName: item.stockTypeName,
            lotNo: item.lotNo,
            availableQuantity: item.availableQuantity,
            expirationDate: item.expirationDate
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
      if (currentPage > 1 && !lotNo && !productName && !unit && !stockType) {
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
    setLotNo('');
    setProductName('');
    setUnit('');
    setStockType('');
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

  const handleItemSelect = (item: StockItem) => {
    // Find the full StockDto from the original response data
    const fullStock: StockDto = {
      stockId: item.stockId,
      productId: item.productId,
      productName: item.productName,
      productUnitId: item.productUnitId,
      productUnitName: item.productUnitName,
      stockTypeId: item.stockTypeId,
      stockTypeName: item.stockTypeName,
      lotNo: item.lotNo,
      availableQuantity: item.availableQuantity,
      expirationDate: item.expirationDate,
      status: StatusEnum.ACTIVE
    };
    onSelect(fullStock);
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
        borderRadius: '8px',
        padding: '24px',
        width: '800px',
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
            {title}
          </h3>
          <button
            onClick={onClose}
            tabIndex={9}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Search Fields */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Lot No */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Lot No
              </label>
              <input
                type="text"
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                placeholder="Enter lot number..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
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
            </div>

            {/* Product Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Product Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
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
            </div>

            {/* Unit */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Enter unit..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
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
            </div>

            {/* Stock Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Stock Type
              </label>
              <input
                type="text"
                value={stockType}
                onChange={(e) => setStockType(e.target.value)}
                placeholder="Enter stock type..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
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
            </div>
          </div>

          {/* Clear All Button */}
          {(lotNo || productName || unit || stockType) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClearSearch}
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
                Clear All
              </button>
            </div>
          )}
        </div>


        {/* Items List */}
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
                key={item.stockId}
                onClick={() => handleItemSelect(item)}
                tabIndex={0}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: selectedValue === item.stockId ? '#dbeafe' : 'white'
                }}
                onMouseEnter={(e) => {
                  if (selectedValue !== item.stockId) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedValue !== item.stockId) {
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
                  {item.lotNo && <span>Lot: {item.lotNo}</span>}
                  {item.stockTypeName && <span>Type: {item.stockTypeName}</span>}
                  {item.availableQuantity !== undefined && <span>Available: {item.availableQuantity}</span>}
                  {item.productUnitName && <span>Unit: {item.productUnitName}</span>}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No stock items found
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
      </div>
    </div>
  );
}
