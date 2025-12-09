'use client';

import { ContractApi, ContractDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ContractForm from '../../components/ContractForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';

interface EditContractPageProps {
  params: {
    id: string;
  };
}

export default function EditContractPage({ params }: EditContractPageProps) {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [selectedContract, setSelectedContract] = useState<ContractDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchContract = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const contract = await ContractApi.getContractById(params.id);
        setSelectedContract(contract);

        if ((contract.status === StatusEnum.FOR_APPROVAL || contract.status === StatusEnum.NEW_RECORD || contract.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
      } catch (err: any) {
        console.error('Failed to fetch contract:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load contract details. Please try again.');
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

    fetchContract();
  }, [params.id, isAdminUser, setFlashNotification]);

  const handleSave = async (contract: ContractDto) => {
    if (!selectedContract) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      const updatedRecord = await ContractApi.updateContract(contract.contractId, {
        ...contract,
        status: contract.status,
        changeReason: contract.changeReason
      }, userRole);

      setSelectedContract(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Contract updated successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/contract');
    } catch (err: any) {
      console.error('Failed to save contract:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to save contract. Please try again.');
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedContract) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await ContractApi.deleteContract(selectedContract, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Contract deleted successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/contract');
    } catch (err: any) {
      console.error('Failed to delete contract:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to delete contract. Please try again.');
      setError(errorMessage);
      setFlashNotification({
        title: 'Error!',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleApproveRecord = async () => {
    if (!selectedContract) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await ContractApi.approveContract(selectedContract.contractId, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Contract approved successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/contract');
    } catch (err: any) {
      console.error('Failed to approve contract:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve contract. Please try again.');
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

  const handleDenyRecord = () => {
    setShowDenyDialog(true);
  };

  const handleDenyConfirm = async (approverMessage: string) => {
    if (!selectedContract) return;

    try {
      setIsLoading(true);
      setError(null);
      setShowDenyDialog(false);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await ContractApi.denyContract(selectedContract.contractId, approverMessage, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Contract denied successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/contract');
    } catch (err: any) {
      console.error('Failed to deny contract:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny contract. Please try again.');
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

  const handleDenyCancel = () => {
    setShowDenyDialog(false);
  };

  const handleCancel = () => {
    router.replace('/invoicing/contract');
  };

  if (isLoading && !selectedContract) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Helper function to get status text
  const getStatusText = (status: StatusEnum): string => {
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'Active';
      case StatusEnum.FOR_APPROVAL:
        return 'For Approval';
      case StatusEnum.FOR_DELETION:
        return 'For Deletion';
      case StatusEnum.NEW_RECORD:
        return 'New Record';
      default:
        return status;
    }
  };

  const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
      return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }
    
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'bg-green-600 text-white shadow-sm';
      case StatusEnum.FOR_APPROVAL:
        return 'bg-yellow-500 text-white shadow-sm';
      case StatusEnum.FOR_DELETION:
        return 'bg-red-600 text-white shadow-sm';
      case StatusEnum.NEW_RECORD:
        return 'bg-blue-600 text-white shadow-sm';
      default:
        return 'bg-gray-500 text-white shadow-sm';
    }
  };

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedContract) return null;
    
    // If status is FOR_DELETION, show deletion message instead of approval version
    if (selectedContract.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                <p className="mt-1 text-sm text-red-700">This record has been marked for deletion and is awaiting approval.</p>
              </div>
            </div>
            {selectedContract.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-700">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedContract.changeReason}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleDenyRecord}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isLoading ? 'Processing...' : 'Deny Deletion'}
                </button>
                <button
                  type="button"
                  onClick={handleApproveRecord}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isLoading ? 'Processing...' : 'Approve Deletion'}
                </button>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}

            <button
              type="button"
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // For FOR_APPROVAL and NEW_RECORD, show approval version
    if (!selectedContract.forApprovalVersion) return null;
    
    const approvalData = selectedContract.forApprovalVersion;
    
    // Helper function to normalize values for comparison
    const normalizeValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (val === '') return '';
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? '' : trimmed;
      }
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return String(val);
      if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
      }
      return String(val).trim();
    };
    
    // Helper function to check if a field has changed
    const isFieldChanged = (fieldName: string): boolean => {
      if (!selectedContract?.forApprovalVersion) return false;
      
      const originalValue = (selectedContract as any)[fieldName];
      const newValue = (selectedContract.forApprovalVersion as any)[fieldName];
      
      if (!(fieldName in selectedContract.forApprovalVersion)) return false;
      
      if (Array.isArray(originalValue) && Array.isArray(newValue)) {
        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
      }
      
      const normalizedOriginal = normalizeValue(originalValue);
      const normalizedNew = normalizeValue(newValue);
      
      return normalizedOriginal !== normalizedNew;
    };
    
    // Helper function to format display value
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    // Helper function to format number with commas
    const formatNumberWithCommas = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '-';
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '-';
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper function to format date
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '-';
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch {
        return dateString;
      }
    };
    
    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
      const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;
      
      return (
        <div className="group">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
            {label}
          </label>
          <div className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
            fieldChanged 
              ? 'border-blue-500 bg-blue-50 text-gray-700' 
              : 'border-gray-200 bg-white text-gray-500'
          }`}>
            {formatValue(value)}
          </div>
        </div>
      );
    };
    
    return (
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Change Reason and Modification Made */}
        {selectedContract?.changeReason && (
          <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="m-0 text-base font-bold text-blue-600">
                Change Reason and Modification Made
              </h4>
            </div>
            <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm">
              {selectedContract.changeReason}
            </div>
          </div>
        )}
        
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Basic Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderReadOnlyField('Contract Number', approvalData.contractNo, 'bg-blue-500', 'contractNo')}
              {renderReadOnlyField('Contract Name', approvalData.contractName, 'bg-blue-500', 'contractName')}
              {renderReadOnlyField('Customer', approvalData.customerName, 'bg-blue-500', 'customerName')}
              {renderReadOnlyField('Contract Amount', approvalData.contractAmount ? formatNumberWithCommas(approvalData.contractAmount) : '-', 'bg-blue-500', 'contractAmount')}
            </div>
            {/* Start Date and End Date - Full width row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {renderReadOnlyField('Start Date', formatDate(approvalData.startDate), 'bg-blue-500', 'startDate')}
              {renderReadOnlyField('End Date', formatDate(approvalData.endDate), 'bg-blue-500', 'endDate')}
            </div>
          </div>
        </div>

        {/* Product Deal Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Product Deal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderReadOnlyField('Product Deal', approvalData.productDealName, 'bg-blue-500', 'productDealName')}
              <div></div>
            </div>
            {/* Product Deal Quantity Fields - Only show when productDealQty is available */}
            {approvalData.productDealQty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {renderReadOnlyField('Minimum Quantity', approvalData.productDealQty.minQty?.toString() || '0', 'bg-blue-500')}
                {renderReadOnlyField('Additional Quantity', approvalData.productDealQty.additionalQty?.toString() || '0', 'bg-blue-500')}
              </div>
            )}
          </div>
        </div>

        {/* Status Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Status Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderReadOnlyField('Payment Status', approvalData.paymentStatus, 'bg-blue-500', 'paymentStatus')}
              {renderReadOnlyField('Amount Paid', formatNumberWithCommas(approvalData.amountPaid), 'bg-blue-500', 'amountPaid')}
              {renderReadOnlyField('Delivery Status', approvalData.deliveryStatus, 'bg-blue-500', 'deliveryStatus')}
              {renderReadOnlyField('Delivered Amount', formatNumberWithCommas(approvalData.deliveredAmount), 'bg-blue-500', 'deliveredAmount')}
              {renderReadOnlyField('Invoiced Amount', formatNumberWithCommas((approvalData as any).invoicedAmount), 'bg-blue-500', 'invoicedAmount')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && (selectedContract?.status === StatusEnum.FOR_APPROVAL || selectedContract?.status === StatusEnum.NEW_RECORD || selectedContract?.status === StatusEnum.FOR_DELETION) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleDenyRecord}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {isLoading ? 'Processing...' : 'Deny Changes'}
              </button>
              <button
                type="button"
                onClick={handleApproveRecord}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

          <button
            type="button"
            onClick={handleCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Render logs tab content
  const renderLogsTab = () => {
    if (!selectedContract) return null;
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="m-0 text-base font-bold text-blue-600">
              Activity Logs
            </h3>
          </div>
          
          {renderActivityLogsTable(selectedContract?.activityLogs)}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (error && !selectedContract) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
        <button onClick={() => router.replace('/invoicing/contract')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Contracts
        </button>
      </div>
    );
  }

  if (!selectedContract && !isLoading) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Contract not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Breadcrumbs */}
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
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedContract && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading contract details...</div>
        </div>
      )}

      {/* Contract Form with Tabs */}
      {selectedContract && (
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
              <div className="flex gap-2 flex-nowrap">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    getTabColorClasses(selectedContract.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Contract Information
                    {selectedContract && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedContract.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>
                
                {selectedContract.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                      activeTab === 'approval'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Changes
                    </span>
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity Logs
                  </span>
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="bg-white p-4 sm:p-6">
              {activeTab === 'details' && (
                <ContractForm
                  isCreateMode={false}
                  selectedContract={selectedContract}
                  successMessage={null}
                  isAdminUser={isAdminUser}
                  activeTab="details"
                  onSave={handleSave}
                  onDelete={handleDeleteClick}
                  onCancel={handleCancel}
                />
              )}
              
              {activeTab === 'approval' && renderApprovalTab()}
              
              {activeTab === 'logs' && renderLogsTab()}
            </div>
          </div>
        </div>
      )}

      <DenyReasonDialog
        show={showDenyDialog}
        contract={selectedContract}
        onConfirm={handleDenyConfirm}
        onCancel={handleDenyCancel}
      />

      <DeleteConfirmationModal
        show={showDeleteConfirm}
        contract={selectedContract}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

