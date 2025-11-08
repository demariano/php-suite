'use client';

import { extractErrorMessage, ProductApi, ProductCategoryDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CategoryForm from './components/CategoryForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditCategoryPageProps {
  params: {
    id: string;
  };
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch category details on component mount
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const category = await ProductApi.getProductCategoryById(params.id, userRole);
        setSelectedCategory(category);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((category.status === StatusEnum.FOR_APPROVAL || category.status === StatusEnum.NEW_RECORD || category.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching category:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load category details. Please try again.');
        setFlashNotification({
          title: 'Error',
          message: errorMessage,
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchCategory();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (category: ProductCategoryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing category
      const updatedRecord = await ProductApi.updateProductCategory(category.productCategoryId, {
        productCategoryId: category.productCategoryId,
        productCategoryName: category.productCategoryName,
        status: category.status
      }, userRole);
      
      setSelectedCategory(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update category. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
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
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete category. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleApprove = async () => {
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
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving category:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve category. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = async () => {
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
        message: 'Product Category changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying category:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny category. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/products/categories');
  };

  if (!selectedCategory && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Category not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
          <a href="/products/categories" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Categories
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedCategory && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading category details...</div>
        </div>
      )}

      {/* Category Form */}
      {selectedCategory && (
        <CategoryForm
          isCreateMode={false}
          selectedCategory={selectedCategory}
          successMessage={null}
          isAdminUser={isAdminUser}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={handleSave}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onCancel={handleCancel}
        />
      )}

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

