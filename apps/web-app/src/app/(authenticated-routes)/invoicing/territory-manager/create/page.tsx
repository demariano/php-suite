'use client';

import { TerritoryManagerApi, TerritoryManagerDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TerritoryManagerForm from '../components/TerritoryManagerForm';

export default function CreateTerritoryManagerPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (territoryManager: TerritoryManagerDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await TerritoryManagerApi.createTerritoryManager({
        territoryManagerName: territoryManager.territoryManagerName,
        contactNo: territoryManager.contactNo,
        status: territoryManager.status
      }, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Territory Manager created successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/territory-manager');
    } catch (err: any) {
      console.error('Failed to create territory manager:', err);
      setError(err.message || 'Failed to create territory manager. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to create territory manager. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/invoicing/territory-manager');
  };

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoicing
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing/territory-manager" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Territory Manager
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <div className="flex justify-center">
        <div className="w-full sm:max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
            <div className="flex flex-nowrap gap-2">
              <button
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Territory Manager Information
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6">
            <TerritoryManagerForm
              isCreateMode={true}
              selectedTerritoryManager={null}
              successMessage={null}
              onSave={handleSave}
              onDelete={() => {}} // Not applicable in create mode
              onCancel={handleCancel}
              isAdminUser={isAdminUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

