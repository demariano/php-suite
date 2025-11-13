'use client';

import { extractErrorMessage, TownApi, TownDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TownForm from '../components/TownForm';

export default function CreateTownPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();

  const handleSave = async (town: TownDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new town
      await TownApi.createTown({
        townName: town.townName,
        areaId: town.areaId,
        areaName: town.areaName,
        status: town.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Town created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to town list after a short delay
      setTimeout(() => {
        router.push('/customers/towns');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating town:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create town. Please try again.');
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
    router.push('/customers/towns');
  };

  const handleDelete = () => {
    // Not applicable for create mode
  };

  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  return (
    <div className="p-4 sm:p-6 space-y-6">
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
          <a href="/customers/towns" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Towns
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Town Form */}
      <div className="flex justify-center">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
          {/* Tab Navigation */}
          <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
            <div className="flex gap-2 flex-nowrap">
              <button
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Town Information
                </span>
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-4 sm:p-6 bg-white">
            <TownForm
              isCreateMode={true}
              selectedTown={null}
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

