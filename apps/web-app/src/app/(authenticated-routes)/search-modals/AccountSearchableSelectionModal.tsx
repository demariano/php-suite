'use client';

import { AccountApi, AccountsDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface AccountSearchableSelectionModalProps {
  show: boolean;
  title: string;
  selectedAccountId?: string | null;
  onSelect: (result: { account: AccountsDto; subAccount: string | null }) => void;
  onClose: () => void;
}

interface AccountItem {
  id: string;
  name: string;
}

export default function AccountSearchableSelectionModal({
  show,
  title,
  selectedAccountId,
  onSelect,
  onClose
}: AccountSearchableSelectionModalProps) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
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
      // Reset all state when modal opens
      setCurrentCursor(null);
      setIsGoingBack(false);
      setSearchTerm('');
      setCurrentPage(1);
      setCursorStack([]);
      loadAccounts();
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
      loadAccounts();
    }
  }, [currentPage, show]);

  // Auto-search when search term changes
  useEffect(() => {
    if (show && searchTerm) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        setCursorStack([]);
        loadAccounts(searchTerm);
      }, 500); // 500ms delay to avoid too many API calls

      return () => clearTimeout(timeoutId);
    } else if (show && searchTerm === '') {
      setCurrentPage(1);
      setCursorStack([]);
      loadAccounts();
    }
  }, [searchTerm, show]);

  const loadAccounts = async (searchQuery?: string) => {
    setLoading(true);
    try {
      // Determine direction and cursor for pagination
      const direction = currentPage > 1 ? (isGoingBack ? 'prev' : 'next') : undefined;
      const cursor = currentCursor || undefined;
      
      const response = await AccountApi.getAccountsByStatus(
        'ACTIVE',
        limit,
        direction,
        cursor,
        searchQuery || undefined,
        undefined // userRole
      );

      const accountsList = response.data.map((item: AccountsDto) => ({
        id: item.accountingId,
        name: item.accountName || ''
      }));

      setAccounts(accountsList);
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
      console.error('Error loading accounts:', error);
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
    loadAccounts();
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

  const handleSelectAccount = async (accountItem: AccountItem) => {
    setLoading(true);
    try {
      // Fetch full account details
      const account = await AccountApi.getAccountById(accountItem.id);
      // Immediately call onSelect with account and null subAccount
      onSelect({
        account: account,
        subAccount: null
      });
      onClose();
    } catch (error) {
      console.error('Error loading account details:', error);
    } finally {
      setLoading(false);
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

        {/* Account Selection View */}
        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts by name..."
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

        {/* Accounts List */}
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
          ) : accounts.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              {searchTerm ? `No accounts found matching "${searchTerm}"` : 'No accounts available'}
            </div>
          ) : (
            <div>
              {accounts.map((account, index) => (
                <div
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < accounts.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedAccountId === account.id ? '#eff6ff' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAccountId !== account.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAccountId !== account.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {account.name}
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
  );
}

