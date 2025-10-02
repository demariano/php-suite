'use client';

import { CreateProductUnitDto, ProductApi, ProductUnitDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';


export default function ProductUnitsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [units, setUnits] = useState<ProductUnitDto[]>([]);
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

  // Fetch units from API
  const fetchUnits = async (direction?: 'next' | 'prev', cursor?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // If search term exists, use search API, otherwise use regular pagination API
      if (searchTerm && searchTerm.trim() !== '') {
        response = await ProductApi.getProductUnitsByName(
          searchTerm.trim(),
          pageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductUnits(
        pageSize, 
          undefined, // No status filter - show all records
        direction, 
          serializedCursor, 
        userRole
      );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data)) {
      setUnits(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setUnits([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setUnits([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load units. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchUnits();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchUnits();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productUnitName', label: 'NAME' },
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

  const [selectedUnit, setSelectedUnit] = useState<ProductUnitDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  const handleRowClick = async (productUnit: ProductUnitDto) => {
    if (!productUnit || !productUnit.productUnitId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the unit from the API
      const latestUnit = await ProductApi.getProductUnitById(
        productUnit.productUnitId,
        userRole
      );
      
      setSelectedUnit(latestUnit);
    setIsCreateMode(false);
      
      if ((latestUnit.status === StatusEnum.FOR_APPROVAL || latestUnit.status === StatusEnum.NEW_RECORD || latestUnit.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        setActiveTab('details');
      }
      
    setShowEditModal(true);
    } catch (err) {
      setError('Failed to load unit details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedUnit(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedUnit(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null);
  };

  const handleSaveChanges = async (updatedUnit: ProductUnitDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        const newUnit = await ProductApi.createProductUnit({
          productUnitName: updatedUnit.productUnitName,
          status: updatedUnit.status
        }, userRole);
        
        await fetchUnits();
        handleCloseModal();
      } else {
        const updatedRecord = await ProductApi.updateProductUnit(updatedUnit.productUnitId, {
          productUnitId: updatedUnit.productUnitId,
          productUnitName: updatedUnit.productUnitName,
          status: updatedUnit.status
        }, userRole);
        
        await fetchUnits();
        setSelectedUnit(updatedRecord);
        
        if (isAdminUser) {
          handleCloseModal();
        } else if (updatedRecord.status === StatusEnum.FOR_APPROVAL) {
          setSuccessMessage('Your changes have been submitted for approval.');
        }
      }
    } catch (error) {
      setError('Failed to save unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUnit = async (newUnit: CreateProductUnitDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.createProductUnit(newUnit, userRole);
      await fetchUnits();
      handleCloseModal();
    } catch (error) {
      setError('Failed to create unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUnit) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductUnit(selectedUnit.productUnitId, userRole);
      await fetchUnits();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedUnit) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.approveProductUnit(selectedUnit.productUnitId, userRole);
      await fetchUnits();
      handleCloseModal();
    } catch (err) {
      setError('Failed to approve unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedUnit) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      await ProductApi.denyProductUnit(selectedUnit.productUnitId, userRole);
      await fetchUnits();
      handleCloseModal();
    } catch (err) {
      setError('Failed to deny unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = units?.map(productUnit => {
    return {
    ...productUnit,
    status: getStatusBadge(productUnit.status || StatusEnum.ACTIVE)
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
          <span className="text-gray-800 text-sm">Units</span>
        </nav>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Units
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
                fetchUnits();
              }}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Add Unit Button */}
          <button 
            onClick={handleCreateClick}
            className="px-4 py-2.5 bg-gray-800 text-white border-none rounded-md cursor-pointer text-sm font-medium flex items-center gap-1.5 hover:bg-gray-900 transition-colors duration-200"
          >
            <span>+</span>
            Add Unit
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
              Loading units...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                {headers.map((header, index) => (
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
              {tableData.length > 0 ? tableData.map((productUnit, index) => (
                <tr 
                  key={productUnit.productUnitId}
                  onClick={() => {
                    const originalUnit = units.find(u => u.productUnitId === productUnit.productUnitId);
                    if (originalUnit) {
                      handleRowClick(originalUnit);
                    }
                  }}
                  className="cursor-pointer border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {productUnit.productUnitName}
                  </td>
                  <td className="px-6 py-4">
                    {productUnit.status}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-6 text-center text-gray-500">
                    {searchTerm ? `No units found matching "${searchTerm}"` : 'No units found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        
        {/* Custom Pagination */}
        <div className="flex justify-between items-center px-6 py-5 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm font-medium">Rows per page:</span>
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white cursor-pointer min-w-15 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className={`px-4 py-2.5 bg-white border border-gray-300 rounded-md text-sm font-medium transition-all duration-200 shadow-sm ${
                prevCursor 
                  ? 'text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-400' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!prevCursor}
              onClick={() => fetchUnits('prev', prevCursor)}
            >
              Previous
            </button>
            <button 
              className={`px-4 py-2.5 bg-white border border-gray-300 rounded-md text-sm font-medium transition-all duration-200 shadow-sm ${
                nextCursor 
                  ? 'text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-400' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!nextCursor}
              onClick={() => fetchUnits('next', nextCursor)}
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
                {isCreateMode ? 'Create Unit' : 'Edit Unit'}
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
              
              {!isCreateMode && selectedUnit && (
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
                  const unitName = formData.get('productUnitName') as string;
                  
                  if (isCreateMode) {
                    const newUnit = {
                      productUnitName: unitName,
                      status: StatusEnum.ACTIVE
                    };
                    handleCreateUnit(newUnit);
                  } else {
                    const updatedUnit = {
                      ...selectedUnit,
                      productUnitName: unitName,
                      status: StatusEnum.ACTIVE
                    };
                    handleSaveChanges(updatedUnit as ProductUnitDto);
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
                  {!isCreateMode && selectedUnit && 
                   (selectedUnit.status === StatusEnum.FOR_APPROVAL || selectedUnit.status === StatusEnum.NEW_RECORD || selectedUnit.status === StatusEnum.FOR_DELETION) && (
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
                        {selectedUnit.status === StatusEnum.FOR_DELETION 
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
                      Unit Name
                    </label>
                    <input
                      type="text"
                      name="productUnitName"
                      defaultValue={isCreateMode ? '' : selectedUnit?.productUnitName || ''}
                      placeholder={isCreateMode ? 'Enter unit name' : ''}
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
                  
                  {!isCreateMode && selectedUnit && (
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
                        {selectedUnit.status || 'ACTIVE'}
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
                        disabled={selectedUnit?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: '6px',
                          cursor: selectedUnit?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          opacity: selectedUnit?.status !== StatusEnum.ACTIVE ? '0.5' : '1'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedUnit?.status === StatusEnum.ACTIVE) {
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
                        disabled={!isCreateMode && selectedUnit?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!isCreateMode && selectedUnit?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          opacity: (!isCreateMode && selectedUnit?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
                        }}
                      >
                        {isCreateMode ? 'Create Unit' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Approval Version Tab */}
              {activeTab === 'approval' && !isCreateMode && selectedUnit && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    {(selectedUnit.status === StatusEnum.FOR_APPROVAL || selectedUnit.status === StatusEnum.NEW_RECORD) && (
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
                    
                    {selectedUnit?.forApprovalVersion ? (
                      <div>
                        {selectedUnit.forApprovalVersion.productUnitName !== undefined && (
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '8px'
                            }}>
                              Unit Name
                            </label>
                            <input
                              type="text"
                              value={String(selectedUnit.forApprovalVersion.productUnitName)}
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
                        
                        {selectedUnit.forApprovalVersion.status !== undefined && (
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
                              value={String(selectedUnit.forApprovalVersion.status)}
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
                        
                        {Object.entries(selectedUnit.forApprovalVersion).map(([key, value]) => {
                          if (key === 'productUnitName' || key === 'status') {
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
                    {isAdminUser && (selectedUnit?.status === StatusEnum.FOR_APPROVAL || selectedUnit?.status === StatusEnum.NEW_RECORD || selectedUnit?.status === StatusEnum.FOR_DELETION) && (
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
                    {selectedUnit?.activityLogs && selectedUnit.activityLogs.length > 0 ? (
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '16px', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {selectedUnit.activityLogs.map((log, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              padding: '8px 0',
                              borderBottom: index < selectedUnit.activityLogs!.length - 1 ? '1px solid #e5e7eb' : 'none'
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
      {showDeleteConfirm && selectedUnit && (
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
                Delete Unit
              </h3>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong>&quot;{selectedUnit.productUnitName}&quot;</strong>? This action cannot be undone.
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
