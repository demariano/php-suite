'use client';

import { ContractApi, ContractDto, extractErrorMessage, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ContractCreatedDialog from '../components/ContractCreatedDialog';
import ContractForm from '../components/ContractForm';

export default function CreateContractPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdContract, setCreatedContract] = useState<ContractDto | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleSave = async (contract: ContractDto) => {
    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      const createdContractData = await ContractApi.createContract({
        contractNo: contract.contractNo,
        contractName: contract.contractName,
        customerId: contract.customerId,
        customerName: contract.customerName,
        areaId: contract.areaId,
        areaName: contract.areaName,
        areaPrefixId: (contract as any).areaPrefixId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        contractType: contract.contractType,
        contractAmount: contract.contractAmount,
        contractProductDeals: contract.contractProductDeals,
        deliveryStatus: contract.deliveryStatus,
        paymentStatus: contract.paymentStatus,
        deliveredAmount: contract.deliveredAmount,
        amountPaid: contract.amountPaid,
        invoicedAmount: contract.invoicedAmount,
        rebateType: contract.rebateType,
        rebatePercentage: contract.rebatePercentage,
        rebateAmount: contract.rebateAmount,
        rebateClaimedAmount: contract.rebateClaimedAmount,
        rebateClaimedStatus: contract.rebateClaimedStatus,
        status: contract.status
      } as any, userRole);

      // Store the created contract and show dialog instead of redirecting immediately
      setCreatedContract(createdContractData);
      setShowSuccessDialog(true);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Contract created successfully!',
        alertType: 'success'
      });
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

  const handleAcknowledge = () => {
    setShowSuccessDialog(false);
    router.replace('/invoicing/contract');
  };

  const handleCancel = () => {
    router.replace('/invoicing/contract');
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
          <a href="/invoicing/contract" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Contracts
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <div className="flex justify-center">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
          {/* Tab Navigation */}
          <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
            <div className="flex gap-2 flex-nowrap">
              <button
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Contract Information
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6">
            <ContractForm
              isCreateMode={true}
              selectedContract={null}
              successMessage={null}
              onSave={handleSave}
              onDelete={() => {}} // Not applicable in create mode
              onCancel={handleCancel}
              isAdminUser={isAdminUser}
            />
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <ContractCreatedDialog
        show={showSuccessDialog}
        contract={createdContract}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  );
}

