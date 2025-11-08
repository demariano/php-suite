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

      await StockTypeApi.createStockType({
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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

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
          <a href="/inventory/stock-types" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Types
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Stock Type</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <StockTypeForm
          isCreateMode={true}
          selectedStockType={null}
          successMessage={null}
          onSave={handleSave}
          onDelete={() => {}} // Not applicable in create mode
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

