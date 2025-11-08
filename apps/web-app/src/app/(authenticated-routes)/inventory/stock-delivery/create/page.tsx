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
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory/stock-delivery" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Delivery
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Stock Delivery Form */}
      <StockDeliveryForm
        isCreateMode={true}
        selectedStockDelivery={null}
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

