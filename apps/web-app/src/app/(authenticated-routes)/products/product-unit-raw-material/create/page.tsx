'use client';

import { extractErrorMessage, ProductApi, ProductUnitRawMaterialDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ProductUnitRawMaterialForm from '../[id]/edit/components/ProductUnitRawMaterialForm';

export default function CreateProductUnitRawMaterialPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productId = searchParams?.get('productId') || '';
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (record: ProductUnitRawMaterialDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new record
      const newRecord = await ProductApi.createProductUnitRawMaterial({
        productId: record.productId,
        productName: record.productName,
        rawMaterialsPerUnit: record.rawMaterialsPerUnit,
        changeReason: record.changeReason
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product unit raw material created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to list after a short delay
      setTimeout(() => {
        router.push('/products/product-unit-raw-material');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating record:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create record. Please try again.');
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
    router.push('/products/product-unit-raw-material');
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

  // Create initial record with productId from query param
  const initialRecord: ProductUnitRawMaterialDto | null = productId ? {
    productUnitRawMaterialId: '',
    productId: productId,
    productName: '',
    rawMaterialsPerUnit: [],
    changeReason: ''
  } : null;

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
          <a href="/products/product-unit-raw-material" className="text-blue-600 hover:text-blue-700">
            Product Unit Raw Material
          </a>
          <span>/</span>
          <span className="text-gray-800 font-medium">Create</span>
        </nav>
      </div>

      <ProductUnitRawMaterialForm
        isCreateMode={true}
        selectedRecord={initialRecord}
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
