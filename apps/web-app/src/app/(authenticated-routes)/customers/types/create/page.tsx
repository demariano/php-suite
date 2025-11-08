'use client';

import { CustomerTypeApi, CustomerTypeDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CustomerTypeForm from '../components/CustomerTypeForm';

export default function CreateCustomerTypePage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (customerType: CustomerTypeDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await CustomerTypeApi.createCustomerType({
        customerTypeName: customerType.customerTypeName,
        status: customerType.status
      }, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Customer Type created successfully!',
        alertType: 'success'
      });
      router.replace('/customers/types');
    } catch (err: any) {
      console.error('Failed to create customer type:', err);
      setError(err.message || 'Failed to create customer type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to create customer type. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/customers/types');
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
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/types" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Types
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Customer Type</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <CustomerTypeForm
          isCreateMode={true}
          selectedCustomerType={null}
          successMessage={null}
          onSave={handleSave}
          onDelete={() => {}} // Not applicable in create mode
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

