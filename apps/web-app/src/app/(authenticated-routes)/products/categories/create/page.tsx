'use client';

import { extractErrorMessage, ProductApi, ProductCategoryDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CategoryForm from '../[id]/edit/components/CategoryForm';

export default function CreateCategoryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (category: ProductCategoryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new category
      await ProductApi.createProductCategory({
        productCategoryName: category.productCategoryName,
        status: category.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create category. Please try again.');
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

  const handleDelete = () => {
    // Not applicable for create mode
  };

  const handleApprove = () => {
    // Not applicable for create mode
  };

  const handleDeny = () => {
    // Not applicable for create mode
  };

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
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Category Form */}
      <CategoryForm
        isCreateMode={true}
        selectedCategory={null}
        successMessage={null}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        activeTab="details"
        onTabChange={() => {}} // Not used in create mode
        onSave={handleSave}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onCancel={handleCancel}
      />
    </div>
  );
}

