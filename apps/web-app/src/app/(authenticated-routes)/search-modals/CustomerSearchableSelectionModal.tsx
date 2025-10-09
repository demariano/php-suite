'use client';

import { AreaApi, CustomerClassificationApi, CustomerTypeApi, ProductDealApi, TermsApi, TownApi } from '@data-access/index';
import { useEffect, useState } from 'react';

interface CustomerSearchableSelectionModalProps {
  show: boolean;
  title: string;
  type: 'town' | 'area' | 'classification' | 'type' | 'terms' | 'deals';
  selectedValue: string | null;
  areaId?: string; // For filtering towns by area
  onSelect: (id: string, name: string, additionalData?: any) => void;
  onClose: () => void;
}

interface Item {
  id: string;
  name: string;
  days?: number; // For terms
  additionalQty?: number; // For deals
  minQty?: number; // For deals
}

export default function CustomerSearchableSelectionModal({
  show,
  title,
  type,
  selectedValue,
  areaId,
  onSelect,
  onClose
}: CustomerSearchableSelectionModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [isGoingBack, setIsGoingBack] = useState(false);

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
      
      let response;
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor || undefined;
      
      switch (type) {
        case 'town':
          if (areaId) {
            response = await TownApi.getTownsByArea(areaId, undefined);
          } else {
            // If no areaId provided, return empty results
            response = {
              statusCode: 200,
              data: [],
              nextCursorPointer: null,
              prevCursorPointer: null
            };
          }
          break;
        case 'area':
          response = await AreaApi.getAreas(limit, direction, serializedCursor);
          break;
        case 'classification':
          response = await CustomerClassificationApi.getCustomerClassifications(limit, direction, serializedCursor);
          break;
        case 'type':
          response = await CustomerTypeApi.getCustomerTypes(limit, direction, serializedCursor);
          break;
        case 'terms':
          response = await TermsApi.getTermsByStatus(limit, 'ACTIVE', direction, serializedCursor);
          break;
        case 'deals':
          response = await ProductDealApi.getProductDealsByStatus(limit, 'ACTIVE', direction, serializedCursor);
          break;
        default:
          return;
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          // Transform the data to match the expected Item interface
          const transformedItems = response.data.map((item: any) => ({
            id: item.townId || item.areaId || item.customerClassificationId || item.customerTypeId || item.termsId || item.productDealId || item.id,
            name: item.townName || item.areaName || item.customerClassificationName || item.customerTypeName || item.termsName || item.productDealName || item.name,
            days: item.days, // For terms
            additionalQty: item.additionalQty, // For deals
            minQty: item.minQty // For deals
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
    if (!searchTerm.trim()) {
      loadItems();
      return;
    }

    try {
      setLoading(true);
      
      let response;
      
      switch (type) {
        case 'town':
          response = await TownApi.getTownsByName(searchTerm.trim(), limit);
          break;
        case 'area':
          response = await AreaApi.getAreasByName(searchTerm.trim(), limit);
          break;
        case 'classification':
          response = await CustomerClassificationApi.getCustomerClassificationsByName(searchTerm.trim(), limit);
          break;
        case 'type':
          response = await CustomerTypeApi.getCustomerTypesByName(searchTerm.trim(), limit);
          break;
        case 'terms':
          response = await TermsApi.getTermsByName(searchTerm.trim(), limit);
          break;
        case 'deals':
          response = await ProductDealApi.getProductDealsByName(searchTerm.trim(), limit);
          break;
        default:
          return;
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          // Transform the data to match the expected Item interface
          const transformedItems = response.data.map((item: any) => ({
            id: item.townId || item.areaId || item.customerClassificationId || item.customerTypeId || item.termsId || item.productDealId || item.id,
            name: item.townName || item.areaName || item.customerClassificationName || item.customerTypeName || item.termsName || item.productDealName || item.name,
            days: item.days, // For terms
            additionalQty: item.additionalQty, // For deals
            minQty: item.minQty // For deals
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
    } catch (error) {
      console.error('Error searching items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
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

  const handleItemSelect = (id: string, name: string, additionalData?: any) => {
    onSelect(id, name, additionalData);
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
        width: '600px',
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

        {/* Search Input */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }}>
              🔍
            </div>
          </div>
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
                key={item.id}
                onClick={() => handleItemSelect(item.id, item.name, item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: selectedValue === item.id ? '#dbeafe' : 'white'
                }}
                onMouseEnter={(e) => {
                  if (selectedValue !== item.id) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedValue !== item.id) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}>
                  {item.name}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No items found
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
