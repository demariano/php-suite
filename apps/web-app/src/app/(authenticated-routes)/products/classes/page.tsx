'use client';

import { CreateProductClassDto, ProductApi, ProductClassDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';


export default function ProductClassesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<ProductClassDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  // User role check
  
  const [nextCursor, setNextCursor] = useState<any>(undefined);
  const [prevCursor, setPrevCursor] = useState<any>(undefined);
  const [currentCursor, setCurrentCursor] = useState<any>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch classes from API
  const fetchClasses = async (direction?: 'next' | 'prev', cursor?: any) => {
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
        response = await ProductApi.getProductClassesByName(
          searchTerm.trim(),
          pageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductClasses(
          pageSize, 
          undefined, // No status filter - show all records
          direction, 
          serializedCursor, 
          userRole
        );
      }
      
      // Both search and regular pagination now return the same PaginatedResponse structure
      // {
      //   "statusCode": 200,
      //   "data": [ array of classes ],
      //   "nextCursorPointer": string | null,
      //   "prevCursorPointer": string | null
      // }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of classes
        if (Array.isArray(response.data)) {
          setClasses(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setClasses([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setClasses([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load classes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchClasses();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchClasses();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productClassName', label: 'NAME' },
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

  const [selectedClass, setSelectedClass] = useState<ProductClassDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  const handleRowClick = async (productClass: ProductClassDto) => {
    // Ensure we have a valid class object
    if (!productClass || !productClass.productClassId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the class from the API
      const latestClass = await ProductApi.getProductClassById(
        productClass.productClassId,
        userRole
      );
      
      setSelectedClass(latestClass);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestClass.status === StatusEnum.FOR_APPROVAL || latestClass.status === StatusEnum.NEW_RECORD || latestClass.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load class details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedClass(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedClass(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedClass: ProductClassDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new class
        const newClass = await ProductApi.createProductClass({
          productClassName: updatedClass.productClassName,
          status: updatedClass.status
        }, userRole);
        
        // Refetch the classes to get the most up-to-date data
        await fetchClasses();
        
        // Close modal after creation
        handleCloseModal();
      } else {
        // Update existing class
        const updatedRecord = await ProductApi.updateProductClass(updatedClass.productClassId, {
          productClassId: updatedClass.productClassId,
          productClassName: updatedClass.productClassName,
          status: updatedClass.status
        }, userRole);
        
        // Refetch the classes to get the most up-to-date data
        await fetchClasses();
        
        // Update the selected class with the latest data
        setSelectedClass(updatedRecord);
        
        // For regular users, keep the modal open to show the updated record
        // For admin users, close the modal
        if (isAdminUser) {
          handleCloseModal();
        } else if (updatedRecord.status === StatusEnum.FOR_APPROVAL) {
          // Show success message for regular users when changes are pending approval
          setSuccessMessage('Your changes have been submitted for approval.');
        }
      }
    } catch (error) {
      setError('Failed to save class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async (newClass: CreateProductClassDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.createProductClass(newClass, userRole);
      
      // Refetch the classes to get the most up-to-date data
      await fetchClasses();
      
      handleCloseModal();
    } catch (error) {
      setError('Failed to create class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClass) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductClass(selectedClass.productClassId, userRole);
      
      // Refetch the classes to get the most up-to-date data
      await fetchClasses();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedClass) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductClass(selectedClass.productClassId, userRole);
      
      // Refresh the classes list - use await to ensure it completes before closing modal
      await fetchClasses();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
      setError('Failed to approve class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedClass) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProductClass(selectedClass.productClassId, userRole);
      
      // Refresh the classes list - use await to ensure it completes before closing modal
      await fetchClasses();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
      setError('Failed to deny class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = classes?.map(productClass => {
    return {
      ...productClass,
      status: getStatusBadge(productClass.status || StatusEnum.ACTIVE)
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
          <span className="text-gray-800 text-sm">Classes</span>
        </nav>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Classes
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
                  // Reset pagination when search term changes
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
                fetchClasses();
              }}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Add Class Button */}
          <button 
            onClick={handleCreateClick}
            className="px-4 py-2.5 bg-gray-800 text-white border-none rounded-md cursor-pointer text-sm font-medium flex items-center gap-1.5 hover:bg-gray-900 transition-colors duration-200"
          >
            <span>+</span>
            Add Class
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
              Loading classes...
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
              {tableData.length > 0 ? tableData.map((productClass, index) => (
                <tr 
                  key={productClass.productClassId}
                  onClick={() => {
                    // Find the original class object from classes array
                    const originalClass = classes.find(c => c.productClassId === productClass.productClassId);
                    if (originalClass) {
                      handleRowClick(originalClass);
                    }
                  }}
                  className="cursor-pointer border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {productClass.productClassName}
                  </td>
                  <td className="px-6 py-4">
                    {productClass.status}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-6 text-center text-gray-500">
                    {searchTerm ? `No classes found matching "${searchTerm}"` : 'No classes found'}
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
              onClick={() => fetchClasses('prev', prevCursor)}
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
              onClick={() => fetchClasses('next', nextCursor)}
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
                {isCreateMode ? 'Create Class' : 'Edit Class'}
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
              
              {!isCreateMode && selectedClass && (
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
                  const className = formData.get('productClassName') as string;
                  
                  if (isCreateMode) {
                    const newClass = {
                      productClassName: className,
                      status: StatusEnum.ACTIVE // Default status for new classes
                    };
                    handleCreateClass(newClass);
                  } else {
                    const updatedClass = {
                      ...selectedClass,
                      productClassName: className,
                      status: StatusEnum.ACTIVE
                    };
                    handleSaveChanges(updatedClass as ProductClassDto);
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
                  {!isCreateMode && selectedClass && 
                   (selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD || selectedClass.status === StatusEnum.FOR_DELETION) && (
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
                        {selectedClass.status === StatusEnum.FOR_DELETION 
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
                      Class Name
                    </label>
                    <input
                      type="text"
                      name="productClassName"
                      defaultValue={isCreateMode ? '' : selectedClass?.productClassName || ''}
                      placeholder={isCreateMode ? 'Enter class name' : ''}
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
                  
                  {!isCreateMode && selectedClass && (
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
                        {selectedClass.status || 'ACTIVE'}
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
                        disabled={selectedClass?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: '6px',
                          cursor: selectedClass?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          opacity: selectedClass?.status !== StatusEnum.ACTIVE ? '0.5' : '1'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedClass?.status === StatusEnum.ACTIVE) {
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
                        disabled={!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          opacity: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
                        }}
                      >
                        {isCreateMode ? 'Create Class' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Approval Version Tab */}
              {activeTab === 'approval' && !isCreateMode && selectedClass && (
                <div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    {(selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD) && (
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
                    
                    {selectedClass?.forApprovalVersion ? (
                      <div>
                        {/* Product Class Name */}
                        {selectedClass.forApprovalVersion.productClassName !== undefined && (
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '8px'
                            }}>
                              Class Name
                            </label>
                            <input
                              type="text"
                              value={String(selectedClass.forApprovalVersion.productClassName)}
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
                        
                        {/* Status */}
                        {selectedClass.forApprovalVersion.status !== undefined && (
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
                              value={String(selectedClass.forApprovalVersion.status)}
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
                        
                        {/* Other fields that might be in forApprovalVersion */}
                        {Object.entries(selectedClass.forApprovalVersion).map(([key, value]) => {
                          // Skip the fields we've already handled
                          if (key === 'productClassName' || key === 'status') {
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
                                {/* Convert camelCase to Title Case */}
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
                    {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                    {isAdminUser && (selectedClass?.status === StatusEnum.FOR_APPROVAL || selectedClass?.status === StatusEnum.NEW_RECORD || selectedClass?.status === StatusEnum.FOR_DELETION) && (
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
                    
                    {/* Close button */}
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
                    {selectedClass?.activityLogs && selectedClass.activityLogs.length > 0 ? (
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '16px', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {selectedClass.activityLogs.map((log, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              padding: '8px 0',
                              borderBottom: index < selectedClass.activityLogs!.length - 1 ? '1px solid #e5e7eb' : 'none'
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
      {showDeleteConfirm && selectedClass && (
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
                Delete Class
              </h3>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong>&quot;{selectedClass.productClassName}&quot;</strong>? This action cannot be undone.
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
