'use client';

import { ContractApi, ContractDto, extractErrorMessage, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ContractForm from '../components/ContractForm';

export default function CreateContractPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (contract: ContractDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await ContractApi.createContract({
        contractNo: contract.contractNo,
        contractName: contract.contractName,
        customerId: contract.customerId,
        customerName: contract.customerName,
        startDate: contract.startDate,
        endDate: contract.endDate,
        contractAmount: contract.contractAmount,
        productDealId: contract.productDealId,
        productDealName: contract.productDealName,
        productDealQty: contract.productDealQty,
        deliveryStatus: contract.deliveryStatus,
        paymentStatus: contract.paymentStatus,
        deliveredAmount: contract.deliveredAmount,
        amountPaid: contract.amountPaid,
        status: contract.status
      }, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Contract created successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/contract');
    } catch (err: any) {
      console.error('Failed to create contract:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to create contract. Please try again.');
      setError(errorMessage);
      setFlashNotification({
        title: 'Error!',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/invoicing/contract');
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
          <a href="/invoicing" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoicing
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing/contract" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Contracts
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Contract</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <ContractForm
          isCreateMode={true}
          selectedContract={null}
          successMessage={null}
          onSave={handleSave}
          onDelete={() => {}} // Not applicable in create mode
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

