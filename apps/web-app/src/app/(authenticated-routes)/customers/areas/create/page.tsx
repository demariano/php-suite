'use client';

import { AreaApi, AreaDto, extractErrorMessage, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AreaForm from '../components/AreaForm';

export default function CreateAreaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();

  const handleSave = async (area: AreaDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new area
      await AreaApi.createArea({
        areaName: area.areaName,
        territoryManagerId: area.territoryManagerId,
        territoryManagerName: area.territoryManagerName,
        status: area.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Area created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to area list after a short delay
      setTimeout(() => {
        router.push('/customers/areas');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating area:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create area. Please try again.');
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
    router.push('/customers/areas');
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
          <a href="/customers/areas" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Areas
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Area Form */}
      <AreaForm
        isCreateMode={true}
        selectedArea={null}
        successMessage={null}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </div>
  );
}

