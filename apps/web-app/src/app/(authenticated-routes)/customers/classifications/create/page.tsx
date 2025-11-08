'use client';

import { extractErrorMessage, CustomerClassificationApi, CustomerClassificationDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CustomerClassificationForm from '../components/CustomerClassificationForm';

export default function CreateCustomerClassificationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();

  const handleSave = async (customerClassification: CustomerClassificationDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new customer classification
      await CustomerClassificationApi.createCustomerClassification({
        customerClassificationName: customerClassification.customerClassificationName,
        status: customerClassification.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Customer Classification created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to classification list after a short delay
      setTimeout(() => {
        router.push('/customers/classifications');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating customer classification:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create customer classification. Please try again.');
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
    router.push('/customers/classifications');
  };

  const handleDelete = () => {
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
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/classifications" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Classifications
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Customer Classification Form */}
      <CustomerClassificationForm
        isCreateMode={true}
        selectedCustomerClassification={null}
        successMessage={null}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </div>
  );
}

