'use client';

import { InvoiceApi, InvoiceDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface InvoiceSearchableSelectionModalProps {
  show: boolean;
  title: string;
  selectedValue: string | null;
  onSelect: (invoice: InvoiceDto) => void;
  onClose: () => void;
}

interface Item {
  id: string;
  docno: string;
  invoiceDate: string;
  finalAmount: number;
  invoiceAmount: number;
  customerName: string;
}

export default function InvoiceSearchableSelectionModal({
  show,
  title,
  selectedValue,
  onSelect,
  onClose
}: InvoiceSearchableSelectionModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [fullInvoices, setFullInvoices] = useState<InvoiceDto[]>([]);
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

  useEffect(() => {
    if (show) {
      loadItems();
    }
  }, [currentPage]);

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

  const loadItems = async (searchQuery?: string) => {
    setLoading(true);
    try {
      let response;
      
      // Determine direction and cursor for pagination
      const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
      const cursor = currentCursor ? JSON.stringify(currentCursor) : undefined;
      
      if (searchQuery) {
        response = await InvoiceApi.getInvoicesByDocno(
          searchQuery,
          limit,
          direction,
          cursor
        );
      } else {
        // Fetch ACTIVE invoices by status
        response = await InvoiceApi.getInvoicesByStatus(
          limit,
          'ACTIVE',
          direction,
          cursor
        );
      }

      const itemsList = response.data.map((item: any) => ({
        id: item.invoiceId,
        docno: item.docno,
        invoiceDate: item.invoiceDate,
        finalAmount: item.finalAmount || 0,
        invoiceAmount: item.invoiceAmount || 0,
        customerName: item.customerName || 'Unknown Customer'
      }));

      setItems(itemsList);
      setFullInvoices(response.data); // Store full invoice data
      setHasNextPage(!!response.nextCursorPointer);
      setHasPrevPage(!!response.prevCursorPointer);
      setNextCursor(response.nextCursorPointer || null);
      setPrevCursor(response.prevCursorPointer || null);

      // Update cursor stack for navigation
      if (currentPage > 1 && !searchQuery) {
        const newCursorStack = [...cursorStack];
        if (response.nextCursorPointer && !newCursorStack.includes(response.nextCursorPointer)) {
          newCursorStack[currentPage - 1] = response.nextCursorPointer;
          setCursorStack(newCursorStack);
        }
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setCursorStack([]);
    loadItems();
  };

  const handlePrevPage = () => {
    if (hasPrevPage && currentPage > 1) {
      setIsGoingBack(true);
      setCurrentCursor(prevCursor);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setIsGoingBack(false);
      setCurrentCursor(nextCursor);
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSelect = (item: Item) => {
    // Find the full invoice object
    const fullInvoice = fullInvoices.find(inv => inv.invoiceId === item.id);
    if (fullInvoice) {
      onSelect(fullInvoice);
      onClose();
    }
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
        width: '800px',
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
            {title}
          </h2>
          <button
            onClick={onClose}
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

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by document number..."
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

        {/* Items List */}
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
              Loading invoices...
            </div>
          ) : items.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              {searchTerm ? `No invoices found matching "${searchTerm}"` : 'No ACTIVE invoices found'}
            </div>
          ) : (
            <div>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedValue === item.id ? '#eff6ff' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedValue !== item.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedValue !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {item.docno}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    Customer: {item.customerName}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <div>Date: {item.invoiceDate}</div>
                    <div>Invoice Amount: ₱{item.invoiceAmount.toFixed(2)}</div>
                    <div>Final Amount: ₱{item.finalAmount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
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
        )}
      </div>
    </div>
  );
}

