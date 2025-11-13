'use client';

import { extractErrorMessage, ProductApi, ProductDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProductForm from '../components/ProductForm';

export default function CreateProductPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (product: ProductDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new product
      const newProduct = await ProductApi.createProduct({
        productName: product.productName,
        productCategoryId: product.productCategoryId,
        productCategoryName: product.productCategoryName,
        productClassId: product.productClassId,
        productClassName: product.productClassName,
        criticalLevel: product.criticalLevel,
        productDeals: product.productDeals,
        productUnitPrice: product.productUnitPrice,
        changeReason: product.changeReason
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to product list after a short delay
      setTimeout(() => {
        router.push('/products/product');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create product. Please try again.');
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
    router.push('/products/product');
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
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Home
          </a>
          <span>/</span>
          <a href="/products" className="text-blue-600 hover:text-blue-700">
            Products
          </a>
          <span>/</span>
          <a href="/products/product" className="text-blue-600 hover:text-blue-700">
            Product
          </a>
          <span>/</span>
          <span className="text-gray-800 font-medium">Create</span>
        </nav>
      </div>

      <ProductForm
        isCreateMode={true}
        selectedProduct={null}
        successMessage={null}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        activeTab="details"
        onTabChange={() => {}}
        onSave={handleSave}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onCancel={handleCancel}
      />
    </div>
  );
}

