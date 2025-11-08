'use client';

import { extractErrorMessage, StockDeliveryApi, StockDeliveryDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StockDeliveryForm from './components/StockDeliveryForm';

interface EditStockDeliveryPageProps {
  params: {
    id: string;
  };
}

export default function EditStockDeliveryPage({ params }: EditStockDeliveryPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStockDelivery, setSelectedStockDelivery] = useState<StockDeliveryDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch stock delivery details on component mount
  useEffect(() => {
    const fetchStockDelivery = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const stockDelivery = await StockDeliveryApi.getStockDeliveryById(params.id);
        setSelectedStockDelivery(stockDelivery);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((stockDelivery.status === StatusEnum.FOR_APPROVAL || stockDelivery.status === StatusEnum.NEW_RECORD || stockDelivery.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching stock delivery:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load stock delivery details. Please try again.');
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
      fetchStockDelivery();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (stockDelivery: StockDeliveryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing stock delivery
      const updatedStockDelivery = await StockDeliveryApi.updateStockDelivery(params.id, {
        docno: stockDelivery.docno,
        dateReceived: stockDelivery.dateReceived,
        supplierId: stockDelivery.supplierId,
        supplierName: stockDelivery.supplierName,
        status: stockDelivery.status,
        deliveryDetails: stockDelivery.deliveryDetails,
        changeReason: stockDelivery.changeReason
      }, userRole);
      
      setSelectedStockDelivery(updatedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating stock delivery:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update stock delivery. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStockDelivery) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await StockDeliveryApi.deleteStockDelivery(selectedStockDelivery, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting stock delivery:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete stock delivery. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedStockDelivery) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedStockDelivery = await StockDeliveryApi.approveStockDelivery(selectedStockDelivery.stockDeliveryId!, userRole);
      setSelectedStockDelivery(approvedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving stock delivery:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve stock delivery. Please try again.');
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
    if (!selectedStockDelivery) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedStockDelivery = await StockDeliveryApi.denyStockDelivery(selectedStockDelivery.stockDeliveryId!, userRole);
      setSelectedStockDelivery(deniedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying stock delivery:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny stock delivery. Please try again.');
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

  if (!selectedStockDelivery && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Stock delivery not found</span>
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
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory/stock-delivery" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Delivery
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedStockDelivery && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading stock delivery details...</div>
        </div>
      )}

      {/* Stock Delivery Form */}
      {selectedStockDelivery && (
        <StockDeliveryForm
          isCreateMode={false}
          selectedStockDelivery={selectedStockDelivery}
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
    </div>
  );
}

