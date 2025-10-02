'use client';

import { CreateProductPriceTypeDto, ProductApi, ProductPriceTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';


export default function ProductPriceTypesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceTypes, setPriceTypes] = useState<ProductPriceTypeDto[]>([]);
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

  // Fetch price types from API
  const fetchPriceTypes = async (direction?: 'next' | 'prev', cursor?: any) => {
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
        response = await ProductApi.getProductPriceTypesByName(
          searchTerm.trim(),
          pageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductPriceTypes(
        pageSize, 
          undefined, // No status filter - show all records
        direction, 
          serializedCursor, 
        userRole
      );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
      setPriceTypes(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setPriceTypes([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setPriceTypes([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load price types. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchPriceTypes();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchPriceTypes();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productPriceTypeName', label: 'NAME' },
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

  const [selectedPriceType, setSelectedPriceType] = useState<ProductPriceTypeDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  const handleRowClick = async (priceType: ProductPriceTypeDto) => {
    if (!priceType || !priceType.productPriceTypeId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version from the API
      const latestPriceType = await ProductApi.getProductPriceTypeById(
        priceType.productPriceTypeId,
        userRole
      );
      
      setSelectedPriceType(latestPriceType);
    setIsCreateMode(false);
      
      if ((latestPriceType.status === StatusEnum.FOR_APPROVAL || latestPriceType.status === StatusEnum.NEW_RECORD || latestPriceType.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        setActiveTab('details');
      }
      
    setShowEditModal(true);
    } catch (err) {
      setError('Failed to load price type details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedPriceType(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedPriceType(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null);
  };

  const handleSaveChanges = async (updatedPriceType: ProductPriceTypeDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        await ProductApi.createProductPriceType({
          productPriceTypeName: updatedPriceType.productPriceTypeName,
          status: updatedPriceType.status
        }, userRole);
        
        await fetchPriceTypes();
        handleCloseModal();
      } else {
        const updatedRecord = await ProductApi.updateProductPriceType(updatedPriceType.productPriceTypeId, {
          productPriceTypeId: updatedPriceType.productPriceTypeId,
          productPriceTypeName: updatedPriceType.productPriceTypeName,
          status: updatedPriceType.status
        }, userRole);
        
        await fetchPriceTypes();
        setSelectedPriceType(updatedRecord);
        
        if (isAdminUser) {
          handleCloseModal();
        } else if (updatedRecord.status === StatusEnum.FOR_APPROVAL) {
          setSuccessMessage('Your changes have been submitted for approval.');
        }
      }
    } catch (error) {
      setError('Failed to save price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePriceType = async (newPriceType: CreateProductPriceTypeDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.createProductPriceType(newPriceType, userRole);
      await fetchPriceTypes();
      handleCloseModal();
    } catch (error) {
      setError('Failed to create price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPriceType) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductPriceType(selectedPriceType, userRole);
      await fetchPriceTypes();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedPriceType) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.approveProductPriceType(selectedPriceType.productPriceTypeId, userRole);
      await fetchPriceTypes();
      handleCloseModal();
    } catch (err) {
      setError('Failed to approve price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedPriceType) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.denyProductPriceType(selectedPriceType.productPriceTypeId, userRole);
      await fetchPriceTypes();
      handleCloseModal();
    } catch (err) {
      setError('Failed to deny price type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = priceTypes?.map(priceType => {
    return {
    ...priceType,
    status: getStatusBadge(priceType.status || StatusEnum.ACTIVE)
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
          <span className="text-gray-800 text-sm">Price Types</span>
        </nav>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Price Types
        </h1>

        {/* Search and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name"
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
                fetchPriceTypes();
              }}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Add Price Type Button */}
          <button 
            onClick={handleCreateClick}
            className="px-4 py-2.5 bg-gray-800 text-white border-none rounded-md cursor-pointer text-sm font-medium flex items-center gap-1.5 hover:bg-gray-900 transition-colors duration-200"
          >
            <span>+</span>
            Add Price Type
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
              Loading price types...
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
              {tableData.length > 0 ? tableData.map((priceType) => (
                <tr 
                  key={priceType.productPriceTypeId}
                  onClick={() => {
                    const originalPriceType = priceTypes.find(pt => pt.productPriceTypeId === priceType.productPriceTypeId);
                    if (originalPriceType) {
                      handleRowClick(originalPriceType);
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
                    {priceType.productPriceTypeName}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {priceType.status}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={headers.length} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    {searchTerm ? `No price types found matching "${searchTerm}"` : 'No price types found'}
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
              onClick={() => fetchPriceTypes('prev', prevCursor)}
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
              onClick={() => fetchPriceTypes('next', nextCursor)}
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

      {/* Edit/Create Modal */}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                {isCreateMode ? 'Create Price Type' : 'Edit Price Type'}
              </h2>
              <button
                onClick={handleCloseModal}
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

            {/* Tab Navigation */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setActiveTab('details')}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'details' ? '#1f2937' : '#6b7280',
                  border: 'none',
                  borderBottom: activeTab === 'details' ? '2px solid #1f2937' : 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === 'details' ? '600' : '400',
                  marginBottom: activeTab === 'details' ? '-1px' : '0'
                }}
              >
                Details
              </button>
              
              {!isCreateMode && selectedPriceType && (
                <button
                  onClick={() => setActiveTab('approval')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'approval' ? '#1f2937' : '#6b7280',
                    border: 'none',
                    borderBottom: activeTab === 'approval' ? '2px solid #1f2937' : 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTab === 'approval' ? '600' : '400',
                    marginBottom: activeTab === 'approval' ? '-1px' : '0'
                  }}
                >
                  Approval Version
                </button>
              )}
              
              {!isCreateMode && (
                <button
                  onClick={() => setActiveTab('logs')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'logs' ? '#1f2937' : '#6b7280',
                    border: 'none',
                    borderBottom: activeTab === 'logs' ? '2px solid #1f2937' : 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTab === 'logs' ? '600' : '400',
                    marginBottom: activeTab === 'logs' ? '-1px' : '0'
                  }}
                >
                  Activity Logs
                </button>
              )}
            </div>
            
            {/* Tab Content */}
            <div>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('productPriceTypeName') as string;
                  
                  if (isCreateMode) {
                    const newPriceType = {
                      productPriceTypeName: name,
                      status: StatusEnum.ACTIVE
                    };
                    handleCreatePriceType(newPriceType);
                  } else {
                    const updatedPriceType = {
                      ...selectedPriceType,
                      productPriceTypeName: name,
                      status: StatusEnum.ACTIVE
                    };
                    handleSaveChanges(updatedPriceType as ProductPriceTypeDto);
                  }
                }}>
                  {/* Success message */}
                  {successMessage && (
                    <div style={{
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #d1fae5',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: '#059669', fontSize: '16px' }}>✓</span>
                      <span style={{ color: '#065f46', fontSize: '14px' }}>
                        {successMessage}
                      </span>
                    </div>
                  )}
                  
                  {/* Pending approval or deletion warning */}
                  {!isCreateMode && selectedPriceType && 
                   (selectedPriceType.status === StatusEnum.FOR_APPROVAL || selectedPriceType.status === StatusEnum.NEW_RECORD || selectedPriceType.status === StatusEnum.FOR_DELETION) && (
                    <div style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: '#d97706', fontSize: '16px' }}>⚠️</span>
                      <span style={{ color: '#92400e', fontSize: '14px' }}>
                        {selectedPriceType.status === StatusEnum.FOR_DELETION 
                          ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                          : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
                      </span>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Price Type Name
                    </label>
                    <input
                      type="text"
                      name="productPriceTypeName"
                      defaultValue={isCreateMode ? '' : selectedPriceType?.productPriceTypeName || ''}
                      placeholder={isCreateMode ? 'Enter price type name' : ''}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>
                  
                  
                  {!isCreateMode && selectedPriceType && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Status
                      </label>
                      <div style={{
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb'
                      }}>
                        {selectedPriceType.status || 'ACTIVE'}
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '24px'
                  }}>
                    {!isCreateMode && (
                      <button
                        type="button"
                        onClick={handleDeleteClick}
                        disabled={selectedPriceType?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: '6px',
                          cursor: selectedPriceType?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          opacity: selectedPriceType?.status !== StatusEnum.ACTIVE ? '0.5' : '1'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedPriceType?.status === StatusEnum.ACTIVE) {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Delete
                      </button>
                    )}
                    
                    <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!isCreateMode && selectedPriceType?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!isCreateMode && selectedPriceType?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          opacity: (!isCreateMode && selectedPriceType?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
                        }}
                      >
                        {isCreateMode ? 'Create Price Type' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Approval Version Tab */}
              {activeTab === 'approval' && !isCreateMode && selectedPriceType && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    {(selectedPriceType.status === StatusEnum.FOR_APPROVAL || selectedPriceType.status === StatusEnum.NEW_RECORD) && (
                      <div style={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ color: '#d97706', fontSize: '16px' }}>ℹ️</span>
                        <span style={{ color: '#92400e', fontSize: '14px' }}>
                          These are the proposed changes awaiting approval
                        </span>
                      </div>
                    )}
                    
                    {selectedPriceType?.forApprovalVersion ? (
                      <div>
                        {selectedPriceType.forApprovalVersion.productPriceTypeName !== undefined && (
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '8px'
                            }}>
                              Price Type Name
                            </label>
                            <input
                              type="text"
                              value={String(selectedPriceType.forApprovalVersion.productPriceTypeName)}
                              readOnly
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f9fafb'
                              }}
                            />
                          </div>
                        )}
                        
                        
                        {selectedPriceType.forApprovalVersion.status !== undefined && (
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '8px'
                            }}>
                              Status
                            </label>
                            <input
                              type="text"
                              value={String(selectedPriceType.forApprovalVersion.status)}
                              readOnly
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f9fafb'
                              }}
                            />
                          </div>
                        )}
                        
                        {Object.entries(selectedPriceType.forApprovalVersion).map(([key, value]) => {
                          if (key === 'productPriceTypeName' || key === 'status') {
                            return null;
                          }
                          
                          return (
                            <div key={key} style={{ marginBottom: '24px' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#374151',
                                marginBottom: '8px'
                              }}>
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </label>
                              <input
                                type="text"
                                value={String(value)}
                                readOnly
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none',
                                  backgroundColor: '#f9fafb'
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        No pending approval changes
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    {isAdminUser && (selectedPriceType?.status === StatusEnum.FOR_APPROVAL || selectedPriceType?.status === StatusEnum.NEW_RECORD || selectedPriceType?.status === StatusEnum.FOR_DELETION) && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={handleDenyRecord}
                          disabled={isLoading}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading) e.currentTarget.style.backgroundColor = '#fef2f2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {isLoading ? 'Processing...' : 'Deny Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={handleApproveRecord}
                          disabled={isLoading}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading) e.currentTarget.style.backgroundColor = '#047857';
                          }}
                          onMouseLeave={(e) => {
                            if (!isLoading) e.currentTarget.style.backgroundColor = '#059669';
                          }}
                        >
                          {isLoading ? 'Processing...' : 'Approve Changes'}
                        </button>
                      </div>
                    )}
                    
                    <div style={{ marginLeft: isAdminUser ? 'auto' : '0' }}>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Activity Logs Tab */}
              {activeTab === 'logs' && !isCreateMode && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                      Recent Activity
                    </h3>
                    {selectedPriceType?.activityLogs && selectedPriceType.activityLogs.length > 0 ? (
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '16px', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {selectedPriceType.activityLogs.map((log, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              padding: '8px 0',
                              borderBottom: index < selectedPriceType.activityLogs!.length - 1 ? '1px solid #e5e7eb' : 'none'
                            }}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        No activity logs available
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPriceType && (
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
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <span style={{ fontSize: '20px', color: '#dc2626' }}>⚠️</span>
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Delete Price Type
              </h3>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong>&quot;{selectedPriceType.productPriceTypeName}&quot;</strong>? This action cannot be undone.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
