'use client';

import { CreateProductDealDto, ProductApi, ProductDealDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';

export default function ProductDealsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deals, setDeals] = useState<ProductDealDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  const [nextCursor, setNextCursor] = useState<any>(undefined);
  const [prevCursor, setPrevCursor] = useState<any>(undefined);
  const [currentCursor, setCurrentCursor] = useState<any>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch deals from API
  const fetchDeals = async (direction?: 'next' | 'prev', cursor?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // If search term exists, use search API, otherwise use regular pagination API
      if (searchTerm && searchTerm.trim() !== '') {
        response = await ProductApi.getProductDealsByName(
          searchTerm.trim(),
          pageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductDeals(
          pageSize, 
          undefined, // No status filter - show all records
          direction, 
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
          setDeals(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setDeals([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setDeals([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load deals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchDeals();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchDeals();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productDealName', label: 'DEAL NAME' },
    { key: 'minQty', label: 'MIN QTY' },
    { key: 'additionalQty', label: 'ADDITIONAL QTY' },
    { key: 'status', label: 'STATUS' }
  ];

  const getStatusBadge = (status: StatusEnum) => {
    const isActive = status === StatusEnum.ACTIVE;
    return (
      <span style={{
        backgroundColor: isActive ? '#dcfce7' : '#f3f4f6',
        color: isActive ? '#166534' : '#6b7280',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  const [selectedDeal, setSelectedDeal] = useState<ProductDealDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  const handleRowClick = async (deal: ProductDealDto) => {
    if (!deal || !deal.productDealId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version from the API
      const latestDeal = await ProductApi.getProductDealById(
        deal.productDealId,
        userRole
      );
      
      setSelectedDeal(latestDeal);
      setIsCreateMode(false);
      
      if ((latestDeal.status === StatusEnum.FOR_APPROVAL || latestDeal.status === StatusEnum.NEW_RECORD || latestDeal.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load deal details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedDeal(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedDeal(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null);
  };

  const handleSaveChanges = async (updatedDeal: ProductDealDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        await ProductApi.createProductDeal({
          productDealName: updatedDeal.productDealName,
          minQty: updatedDeal.minQty,
          additionalQty: updatedDeal.additionalQty,
          status: updatedDeal.status
        }, userRole);
        
        await fetchDeals();
        handleCloseModal();
      } else {
        const updatedRecord = await ProductApi.updateProductDeal(updatedDeal.productDealId, {
          productDealId: updatedDeal.productDealId,
          productDealName: updatedDeal.productDealName,
          minQty: updatedDeal.minQty,
          additionalQty: updatedDeal.additionalQty,
          status: updatedDeal.status
        }, userRole);
        
        await fetchDeals();
        setSelectedDeal(updatedRecord);
        
        if (isAdminUser) {
          handleCloseModal();
        } else if (updatedRecord.status === StatusEnum.FOR_APPROVAL) {
          setSuccessMessage('Your changes have been submitted for approval.');
        }
      }
    } catch (error) {
      setError('Failed to save deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeal = async (newDeal: CreateProductDealDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.createProductDeal(newDeal, userRole);
      await fetchDeals();
      handleCloseModal();
    } catch (error) {
      setError('Failed to create deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeal) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductDeal(selectedDeal, userRole);
      await fetchDeals();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedDeal) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.approveProductDeal(selectedDeal.productDealId, userRole);
      await fetchDeals();
      handleCloseModal();
    } catch (err) {
      setError('Failed to approve deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedDeal) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.denyProductDeal(selectedDeal.productDealId, userRole);
      await fetchDeals();
      handleCloseModal();
    } catch (err) {
      setError('Failed to deny deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = deals?.map(deal => {
    return {
      ...deal,
      status: getStatusBadge(deal.status || StatusEnum.ACTIVE)
    };
  }) || [];

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="mb-4">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600">
            Home
          </a>
          <span className="text-gray-500">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600">
            Products
          </a>
          <span className="text-gray-500">/</span>
          <span className="text-gray-800 text-sm">Deals</span>
        </nav>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Product Deals
        </h1>

        {/* Search and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by deal name"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentCursor(undefined);
                  setNextCursor(undefined);
                  setPrevCursor(undefined);
                }}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm w-72 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                🔍
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentCursor(undefined);
                setNextCursor(undefined);
                setPrevCursor(undefined);
                fetchDeals();
              }}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Add Deal Button */}
          <button 
            onClick={handleCreateClick}
            className="px-4 py-2.5 bg-gray-800 text-white border-none rounded-md cursor-pointer text-sm font-medium flex items-center gap-1.5 hover:bg-gray-900 transition-colors duration-200"
          >
            <span>+</span>
            Add Deal
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6b7280',
              fontSize: '16px'
            }}>
              Loading deals...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                {headers.map((header) => (
                  <th key={header.key} style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? tableData.map((deal) => (
                <tr 
                  key={deal.productDealId}
                  onClick={() => {
                    const originalDeal = deals.find(d => d.productDealId === deal.productDealId);
                    if (originalDeal) {
                      handleRowClick(originalDeal);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#1f2937' }}>
                    {deal.productDealName}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                    {deal.minQty || '-'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                    {deal.additionalQty || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {deal.status}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={headers.length} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    {searchTerm ? `No deals found matching "${searchTerm}"` : 'No deals found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        
        {/* Custom Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Rows per page:</span>
            <select 
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '60px'
              }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                color: prevCursor ? '#374151' : '#9ca3af',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: prevCursor ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              disabled={!prevCursor}
              onClick={() => fetchDeals('prev', prevCursor)}
              onMouseEnter={(e) => {
                if (prevCursor) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Previous
            </button>
            <button 
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                color: nextCursor ? '#374151' : '#9ca3af',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: nextCursor ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              disabled={!nextCursor}
              onClick={() => fetchDeals('next', nextCursor)}
              onMouseEnter={(e) => {
                if (nextCursor) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Basic Modal Placeholder - You can expand this with full CRUD functionality */}
      {showEditModal && (
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
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{ marginBottom: '16px' }}>
              {isCreateMode ? 'Create Deal' : 'Edit Deal'}
            </h2>
            <p>Modal functionality can be expanded here...</p>
            <button onClick={handleCloseModal} style={{ marginTop: '16px', padding: '8px 16px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}