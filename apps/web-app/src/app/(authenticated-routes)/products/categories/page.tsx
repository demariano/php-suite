'use client';

import { ProductApi, ProductCategoryDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { CategoryHeader, CategoryModal, CategoryTable, DeleteConfirmationModal } from './components';

export default function ProductCategoriesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  
  const [nextCursor, setNextCursor] = useState<any>(undefined);
  const [prevCursor, setPrevCursor] = useState<any>(undefined);
  const [currentCursor, setCurrentCursor] = useState<any>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Modal and form state
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryDto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');

  // Fetch categories from API
  const fetchCategories = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
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
      
      // Use custom page size if provided, otherwise use state page size
      const currentPageSize = customPageSize ?? pageSize;
      
      // If search term exists, use search API, otherwise use regular pagination API
      if (searchTerm && searchTerm.trim() !== '') {
        response = await ProductApi.getProductCategoriesByName(
          searchTerm.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductCategories(
          currentPageSize, 
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of categories
        if (Array.isArray(response.data)) {
          setCategories(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setCategories([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setCategories([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      setError('Failed to load categories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchCategories();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search term changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search term
    if (searchTerm === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchCategories();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const headers = [
    { key: 'productCategoryName', label: 'NAME' },
    { key: 'status', label: 'STATUS' }
  ];

  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  const handleRowClick = async (category: ProductCategoryDto) => {
    // Ensure we have a valid category object
    if (!category || !category.productCategoryId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Fetch the latest version of the category from the API
      const latestCategory = await ProductApi.getProductCategoryById(
        category.productCategoryId,
        userRole
      );
      
      setSelectedCategory(latestCategory);
      setIsCreateMode(false);
      
      // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
      if ((latestCategory.status === StatusEnum.FOR_APPROVAL || latestCategory.status === StatusEnum.NEW_RECORD || latestCategory.status === StatusEnum.FOR_DELETION) && isAdminUser) {
        setActiveTab('approval');
      } else {
        // Default to details tab
        setActiveTab('details');
      }
      
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load category details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedCategory(null);
    setIsCreateMode(true);
    setActiveTab('details');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(false); // Ensure delete confirmation is also closed
    setSelectedCategory(null);
    setIsCreateMode(false);
    setActiveTab('details');
    setSuccessMessage(null); // Clear any success messages when closing the modal
  };

  const handleSaveChanges = async (updatedCategory: ProductCategoryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      if (isCreateMode) {
        // Create new category
        await ProductApi.createProductCategory({
          productCategoryName: updatedCategory.productCategoryName,
          status: updatedCategory.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Product Category created successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list for new records
        handleCloseModal();
        await fetchCategories();
      } else {
        // Update existing category
        const updatedRecord = await ProductApi.updateProductCategory(updatedCategory.productCategoryId, {
          productCategoryId: updatedCategory.productCategoryId,
          productCategoryName: updatedCategory.productCategoryName,
          status: updatedCategory.status
        }, userRole);
        
        setFlashNotification({
          title: 'Success!',
          message: 'Product Category updated successfully!',
          alertType: 'success'
        });
        
        // Close modal and refresh list after successful update
        handleCloseModal();
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to save category. Please try again.',
        alertType: 'error'
      });
      setError('Failed to save category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductCategory(selectedCategory, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category deleted successfully!',
        alertType: 'success'
      });
      
      setShowDeleteConfirm(false);
      handleCloseModal();
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to delete category. Please try again.',
        alertType: 'error'
      });
      setError('Failed to delete category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setCurrentCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchCategories(undefined, undefined, newPageSize);
  };
  
  const handleApproveRecord = async () => {
    if (!selectedCategory) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductCategory(selectedCategory.productCategoryId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category approved successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchCategories();
    } catch (error) {
      console.error('Error approving category:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to approve category. Please try again.',
        alertType: 'error'
      });
      setError('Failed to approve category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDenyRecord = async () => {
    if (!selectedCategory) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProductCategory(selectedCategory.productCategoryId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category denied successfully!',
        alertType: 'success'
      });
      
      // Close the modal and refresh the list
      handleCloseModal();
      await fetchCategories();
    } catch (error) {
      console.error('Error denying category:', error);
      setFlashNotification({
        title: 'Error!',
        message: 'Failed to deny category. Please try again.',
        alertType: 'error'
      });
      setError('Failed to deny category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data for table display
  const tableData = categories?.map(category => {
    return {
      ...category,
      status: getStatusBadge(category.status || StatusEnum.ACTIVE)
    };
  }) || [];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
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
      <div className="mb-6">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Categories</span>
        </nav>
      </div>

      {/* Header */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <CategoryHeader
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            // Reset pagination when search term changes
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
          }}
          onRefresh={() => {
            setSearchTerm('');
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchCategories();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div 
        className={showEditModal || showDeleteConfirm ? '!opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}
        style={{ opacity: showEditModal || showDeleteConfirm ? 0.5 : 1 }}
      >
        <CategoryTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchTerm={searchTerm}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchCategories('prev', prevCursor)}
          onNext={() => fetchCategories('next', nextCursor)}
        />
      </div>

      {/* Edit/Create Modal */}
      <CategoryModal
        show={showEditModal}
        isCreateMode={isCreateMode}
        selectedCategory={selectedCategory}
        activeTab={activeTab}
        successMessage={successMessage}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        onClose={handleCloseModal}
        onTabChange={setActiveTab}
        onSave={handleSaveChanges}
        onDelete={handleDeleteClick}
        onApprove={handleApproveRecord}
        onDeny={handleDenyRecord}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteConfirm}
        category={selectedCategory}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
