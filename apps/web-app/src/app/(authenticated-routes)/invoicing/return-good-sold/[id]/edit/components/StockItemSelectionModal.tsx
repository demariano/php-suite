'use client';

import { StockApi, StockDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface StockItemSelectionModalProps {
  show: boolean;
  title: string;
  productPriceTypeId?: string;
  onSelect: (stock: StockDto) => void;
  onClose: () => void;
}

export default function StockItemSelectionModal({
  show,
  title,
  productPriceTypeId,
  onSelect,
  onClose
}: StockItemSelectionModalProps) {
  const [stocks, setStocks] = useState<StockDto[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (show) {
      loadStocks();
    }
  }, [show]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = stocks.filter(stock => 
        stock.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.lotNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  }, [searchTerm, stocks]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      // Fetch all stocks with pagination
      // TODO: If productPriceTypeId filter is available in API, use it
      const response = await StockApi.getStocks(100, undefined, undefined);
      
      if (response && response.statusCode === 200 && response.data) {
        setStocks(response.data);
        setFilteredStocks(response.data);
      }
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (stock: StockDto) => {
    onSelect(stock);
    setSearchTerm('');
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
    }}
      onClick={onClose}
    >
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
      }}
        onClick={(e) => e.stopPropagation()}
      >
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
              placeholder="Search by product name or lot number..."
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
                onClick={() => setSearchTerm('')}
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
              Loading stock items...
            </div>
          ) : filteredStocks.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              {searchTerm ? `No stock items found matching "${searchTerm}"` : 'No stock items available'}
            </div>
          ) : (
            <div>
              {filteredStocks.map((stock, index) => (
                <div
                  key={stock.stockId}
                  onClick={() => handleSelect(stock)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < filteredStocks.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {stock.productName}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    {stock.productUnitName} | {stock.stockTypeName}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <div>Lot: {stock.lotNo || '-'}</div>
                    <div>Expiry: {stock.expiryDate || '-'}</div>
                    <div>Qty: {stock.qty || 0}</div>
                    <div>Price: ₱{(stock.price || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

