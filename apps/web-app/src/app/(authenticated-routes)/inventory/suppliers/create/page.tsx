'use client';

import { SupplierApi, SupplierDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SupplierForm from '../components/SupplierForm';

export default function CreateSupplierPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (supplier: SupplierDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await (SupplierApi as any).createSupplier({
        supplierName: supplier.supplierName,
        supplierAddress: supplier.supplierAddress,
        supplierPhone: supplier.supplierPhone,
        supplierEmail: supplier.supplierEmail,
        supplierContactPerson: supplier.supplierContactPerson,
        status: supplier.status
      }, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Supplier created successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/suppliers');
    } catch (err: any) {
      console.error('Failed to create supplier:', err);
      setError(err.message || 'Failed to create supplier. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to create supplier. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/inventory/suppliers');
  };

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  return (
    <div className="p-4 sm:p-6 space-y-6">
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
          <a href="/inventory/suppliers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Suppliers
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Create New Supplier</h1>

      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 w-full sm:max-w-4xl">
          <SupplierForm
            isCreateMode={true}
            selectedSupplier={null}
            successMessage={null}
            onSave={handleSave}
            onDelete={() => {}} // Not applicable in create mode
            onCancel={handleCancel}
            isAdminUser={isAdminUser}
          />
        </div>
      </div>
    </div>
  );
}

