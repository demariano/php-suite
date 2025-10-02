'use client';

import { CreateProductCategoryDto, ProductApi, ProductCategoryDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
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
  const fetchCategories = async (direction?: 'next' | 'prev', cursor?: any) => {
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
        response = await ProductApi.getProductCategoriesByName(
          searchTerm.trim(),
          pageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductApi.getProductCategories(
          pageSize, 
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
    const isActive = status === StatusEnum.ACTIVE;
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-600'
      }`}>
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
        const newCategory = await ProductApi.createProductCategory({
          productCategoryName: updatedCategory.productCategoryName,
          status: updatedCategory.status
        }, userRole);
        
        // Refetch the categories to get the most up-to-date data
        await fetchCategories();
        
        // Close modal after creation
        handleCloseModal();
      } else {
        // Update existing category
        const updatedRecord = await ProductApi.updateProductCategory(updatedCategory.productCategoryId, {
          productCategoryId: updatedCategory.productCategoryId,
          productCategoryName: updatedCategory.productCategoryName,
          status: updatedCategory.status
        }, userRole);
        
        // Refetch the categories to get the most up-to-date data
        await fetchCategories();
        
        // Update the selected category with the latest data
        setSelectedCategory(updatedRecord);
        
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
      setError('Failed to save category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (newCategory: CreateProductCategoryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.createProductCategory(newCategory, userRole);
      
      // Refetch the categories to get the most up-to-date data
      await fetchCategories();
      
      handleCloseModal();
    } catch (error) {
      setError('Failed to create category. Please try again.');
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
      
      // Refetch the categories to get the most up-to-date data
      await fetchCategories();
      
      setShowDeleteConfirm(false);
      handleCloseModal();
    } catch (error) {
      setError('Failed to delete category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
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
      
      // Refresh the categories list - use await to ensure it completes before closing modal
      await fetchCategories();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
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
      
      // Refresh the categories list - use await to ensure it completes before closing modal
      await fetchCategories();
      
      // Close the modal
      handleCloseModal();
    } catch (err) {
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

      {/* Table */}
      <CategoryTable
        isLoading={isLoading}
        tableData={tableData}
        headers={headers}
        searchTerm={searchTerm}
        onRowClick={handleRowClick}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        prevCursor={prevCursor}
        nextCursor={nextCursor}
        onPrevious={() => fetchCategories('prev', prevCursor)}
        onNext={() => fetchCategories('next', nextCursor)}
      />

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
