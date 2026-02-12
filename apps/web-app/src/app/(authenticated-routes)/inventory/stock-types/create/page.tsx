'use client';

import { StockTypeApi, StockTypeDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import StockTypeForm from '../components/StockTypeForm';

export default function CreateStockTypePage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (stockType: StockTypeDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await (StockTypeApi as any).createStockType({
        stockTypeName: stockType.stockTypeName,
        status: stockType.status
      }, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Stock Type created successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/stock-types');
    } catch (err: any) {
      console.error('Failed to create stock type:', err);
      setError(err.message || 'Failed to create stock type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to create stock type. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/inventory/stock-types');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

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
          <a href="/inventory/stock-types" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Types
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
            <div className="flex flex-nowrap gap-2">
              <button
                className="flex-shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Stock Type Information
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6">
            <StockTypeForm
              isCreateMode={true}
              selectedStockType={null}
              successMessage={null}
              onSave={handleSave}
              onDelete={() => {}} // Not applicable in create mode
              onCancel={handleCancel}
              isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

