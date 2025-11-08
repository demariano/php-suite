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

  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <div>
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
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">
          {/* Tab Navigation */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b-2 border-blue-200 rounded-t-xl p-2">
            <div className="flex gap-2">
              <button
                className="px-5 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50 transform scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Area Information
                </span>
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-6 bg-white">
            <AreaForm
              isCreateMode={true}
              selectedArea={null}
              successMessage={null}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={handleCancel}
              isAdminUser={isAdminUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

