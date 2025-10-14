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
  productName: string;
  lotNo?: string;
  stockTypeName?: string;
  availableQuantity?: number;
  productUnitName?: string;
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

  // Filter inputs
  const [stockTypeName, setStockTypeName] = useState('');
  const [productUnitName, setProductUnitName] = useState('');
  const [productName, setProductName] = useState('');
  const [lotNo, setLotNo] = useState('');

  const limit = 20;

  useEffect(() => {
    if (show) {
      setCurrentCursor(null);
      setIsGoingBack(false);
      loadItems();
    }
  }, [show]);

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

  const loadItems = async (direction?: 'next' | 'prev', cursor?: string | null) => {
    try {
      setLoading(true);
      
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor || undefined;
      
      const filterParams = {
        status: StatusEnum.ACTIVE,
        stockTypeName: stockTypeName.trim() || undefined,
        productUnitName: productUnitName.trim() || undefined,
        productName: productName.trim() || undefined,
        lotNo: lotNo.trim() || undefined,
      };

      const response = await StockApi.getStocksByFilter(
        filterParams,
        limit,
        direction,
        serializedCursor
      );
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          // Transform the data to match the expected StockItem interface
          const transformedItems = response.data.map((item: StockDto) => ({
            stockId: item.stockId || '',
            productName: item.productName || '',
            lotNo: item.lotNo,
            stockTypeName: item.stockTypeName,
            availableQuantity: item.availableQuantity,
            productUnitName: item.productUnitName
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
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(null);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setCurrentCursor(null);
    setIsGoingBack(false);
    setCursorStack([]);
    loadItems();
  };

  const handleNext = () => {
    if (nextCursor) {
      setCursorStack([...cursorStack, currentCursor || '']);
      setCurrentCursor(nextCursor);
      loadItems('next', nextCursor || undefined);
    }
  };

  const handlePrev = () => {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      const prevCursor = newStack.pop();
      setCursorStack(newStack);
      setCurrentCursor(prevCursor);
      loadItems('prev', prevCursor || undefined);
    }
  };

  const handleItemSelect = (item: StockItem) => {
    // Find the full StockDto from the original response data
    const fullStock: StockDto = {
      stockId: item.stockId,
      productName: item.productName,
      lotNo: item.lotNo,
      stockTypeName: item.stockTypeName,
      availableQuantity: item.availableQuantity,
      productUnitName: item.productUnitName,
      status: StatusEnum.ACTIVE
    };
    onSelect(fullStock);
    onClose();
  };

  const clearFilters = () => {
    setStockTypeName('');
    setProductUnitName('');
    setProductName('');
    setLotNo('');
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

        {/* Filter Inputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Stock Type Name
            </label>
            <input
              type="text"
              placeholder="Enter stock type name..."
              value={stockTypeName}
              onChange={(e) => setStockTypeName(e.target.value)}
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
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Product Unit Name
            </label>
            <input
              type="text"
              placeholder="Enter product unit name..."
              value={productUnitName}
              onChange={(e) => setProductUnitName(e.target.value)}
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
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Product Name
            </label>
            <input
              type="text"
              placeholder="Enter product name..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
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
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Lot Number
            </label>
            <input
              type="text"
              placeholder="Enter lot number..."
              value={lotNo}
              onChange={(e) => setLotNo(e.target.value)}
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

        {/* Search and Clear Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
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
            Search
          </button>
          <button
            onClick={clearFilters}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6b7280';
            }}
          >
            Clear Filters
          </button>
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
              onClick={handlePrev}
              disabled={!hasPrevPage}
              style={{
                padding: '8px 16px',
                backgroundColor: hasPrevPage ? 'white' : 'transparent',
                color: hasPrevPage ? '#374151' : '#9ca3af',
                border: hasPrevPage ? '1px solid #d1d5db' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: hasPrevPage ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: hasPrevPage ? 1 : 0.5
              }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNextPage}
              style={{
                padding: '8px 16px',
                backgroundColor: hasNextPage ? 'white' : 'transparent',
                color: hasNextPage ? '#374151' : '#9ca3af',
                border: hasNextPage ? '1px solid #d1d5db' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: hasNextPage ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: hasNextPage ? 1 : 0.5
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
