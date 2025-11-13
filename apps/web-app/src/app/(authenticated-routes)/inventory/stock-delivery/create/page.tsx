'use client';

import { extractErrorMessage, StockDeliveryApi, StockDeliveryDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import StockDeliveryForm from '../[id]/edit/components/StockDeliveryForm';

export default function CreateStockDeliveryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (stockDelivery: StockDeliveryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new stock delivery
      const newStockDelivery = await StockDeliveryApi.createStockDelivery({
        docno: stockDelivery.docno,
        dateReceived: stockDelivery.dateReceived,
        supplierId: stockDelivery.supplierId,
        supplierName: stockDelivery.supplierName,
        status: stockDelivery.status,
        deliveryDetails: stockDelivery.deliveryDetails,
        changeReason: stockDelivery.changeReason
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating stock delivery:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create stock delivery. Please try again.');
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
    router.push('/inventory/stock-delivery');
  };

  const handleDelete = () => {
    // Not applicable for create mode
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory/stock-delivery" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Deliveries
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Create New Stock Delivery</h1>

      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 w-full sm:max-w-4xl">
          <StockDeliveryForm
            isCreateMode={true}
            selectedStockDelivery={null}
            successMessage={null}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={handleCancel}
            isAdminUser={isAdminUser}
          />
        </div>
      </div>
    </div>
  );
}

