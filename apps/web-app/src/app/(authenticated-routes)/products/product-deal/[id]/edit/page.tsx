'use client';

import { ProductDealApi, ProductDealDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductDealForm from '../../components/ProductDealForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditProductDealPageProps {
  params: {
    id: string;
  };
}

export default function EditProductDealPage({ params }: EditProductDealPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductDeal, setSelectedProductDeal] = useState<ProductDealDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchProductDeal = async () => {
      try {
        setIsLoading(true);
        
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const productDeal = await ProductDealApi.getProductDealById(params.id, userRole);
        setSelectedProductDeal(productDeal);
        
        if ((productDeal.status === StatusEnum.FOR_APPROVAL || productDeal.status === StatusEnum.NEW_RECORD || productDeal.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching product deal:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load product deal details. Please try again.');
        setFlashNotification({
          title: 'Error',
          message: errorMessage,
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchProductDeal();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (productDeal: ProductDealDto) => {
    try {
      setIsLoading(true);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      const updatedProductDeal = await ProductDealApi.updateProductDeal(params.id, {
        productDealId: productDeal.productDealId,
        productDealName: productDeal.productDealName,
        minQty: productDeal.minQty,
        additionalQty: productDeal.additionalQty,
        status: productDeal.status,
        changeReason: productDeal.changeReason
      }, userRole);
      
      setSelectedProductDeal(updatedProductDeal);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Deal updated successfully!',
        alertType: 'success'
      });
      
      setTimeout(() => {
        router.push('/products/product-deal');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating product deal:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update product deal. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedProductDeal) {
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProductDeal) {
      return;
    }
    
    try {
      setIsLoading(true);
      setShowDeleteModal(false);
      
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductDealApi.deleteProductDeal(selectedProductDeal, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Deal deleted successfully!',
        alertType: 'success'
      });
      
      setTimeout(() => {
        router.push('/products/product-deal');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting product deal:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete product deal. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProductDeal) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      const approvedProductDeal = await ProductDealApi.approveProductDeal(selectedProductDeal.productDealId, userRole);
      setSelectedProductDeal(approvedProductDeal);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Deal approved successfully!',
        alertType: 'success'
      });
      
      setTimeout(() => {
        router.push('/products/product-deal');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving product deal:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve product deal. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = async () => {
    if (!selectedProductDeal) return;
    
    try {
      setIsLoading(true);
      
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      const deniedProductDeal = await ProductDealApi.denyProductDeal(selectedProductDeal.productDealId, userRole);
      setSelectedProductDeal(deniedProductDeal);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Deal changes denied successfully!',
        alertType: 'success'
      });
      
      setTimeout(() => {
        router.push('/products/product-deal');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying product deal:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny product deal. Please try again.');
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
    router.push('/products/product-deal');
  };

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

  if (!selectedProductDeal && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>Product Deal not found</span>
        </div>
      </div>
    );
  }

  const renderApprovalTab = () => {
    if (!selectedProductDeal) return null;

    if (selectedProductDeal.status === StatusEnum.FOR_DELETION) {
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
            {selectedProductDeal.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedProductDeal.changeReason}</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleDeny}
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
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

    if (!selectedProductDeal.forApprovalVersion) return null;

    const approvalData = selectedProductDeal.forApprovalVersion;

    const normalizeValue = (val: unknown): string => {
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

    const isFieldChanged = (fieldName: string): boolean => {
      if (!selectedProductDeal?.forApprovalVersion) return false;

      const originalValue = (selectedProductDeal as unknown as Record<string, unknown>)[fieldName];
      const newValue = (selectedProductDeal.forApprovalVersion as unknown as Record<string, unknown>)[fieldName];

      if (!(fieldName in selectedProductDeal.forApprovalVersion)) return false;

      if (Array.isArray(originalValue) && Array.isArray(newValue)) {
        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
      }

      const normalizedOriginal = normalizeValue(originalValue);
      const normalizedNew = normalizeValue(newValue);

      const hasChanged = normalizedOriginal !== normalizedNew;

      return hasChanged;
    };

    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
      const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

      return (
        <div className="group">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
            <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`}></span>
            {label}
          </label>
          <div className={`w-full cursor-not-allowed rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm ${
            fieldChanged
              ? 'border-blue-500 bg-blue-50 text-gray-700'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}>
            {formatValue(value)}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
        {selectedProductDeal?.changeReason && (
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
              {selectedProductDeal.changeReason}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Product Deal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {renderReadOnlyField('Product Deal Name', approvalData.productDealName, 'bg-blue-500', 'productDealName')}
              {renderReadOnlyField('Minimum Quantity', approvalData.minQty, 'bg-blue-500', 'minQty')}
              {renderReadOnlyField('Additional Quantity', approvalData.additionalQty, 'bg-blue-500', 'additionalQty')}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && selectedProductDeal && ([StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(selectedProductDeal.status as StatusEnum)) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleDeny}
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
                onClick={handleApprove}
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

  const renderLogsTab = () => {
    if (!selectedProductDeal) return null;

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

          {selectedProductDeal?.activityLogs && selectedProductDeal.activityLogs.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
              <ul className="divide-y divide-gray-200 text-sm text-gray-700">
                {selectedProductDeal.activityLogs.map((log, index) => (
                  <li
                    key={index}
                    className="px-4 py-3"
                  >
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm italic text-gray-500">
              No activity logs available
            </p>
          )}
        </div>

        <div className="flex justify-end">
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <DeleteConfirmationModal
        show={showDeleteModal}
        productDeal={selectedProductDeal}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products/product-deal" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Product Deal
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {isLoading && !selectedProductDeal && (
        <div className="flex min-h-96 items-center justify-center">
          <div className="text-gray-600">Loading product deal details...</div>
        </div>
      )}

      {selectedProductDeal && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
              <div className="flex flex-nowrap gap-2">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    getTabColorClasses(selectedProductDeal.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Product Deal Information
                    {selectedProductDeal && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedProductDeal.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>

                {selectedProductDeal.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                      activeTab === 'approval'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Changes
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity Logs
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6">
              {activeTab === 'details' && (
                <ProductDealForm
                  isCreateMode={false}
                  selectedProductDeal={selectedProductDeal}
                  successMessage={null}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  isAdminUser={isAdminUser}
                />
              )}

              {activeTab === 'approval' && renderApprovalTab()}

              {activeTab === 'logs' && renderLogsTab()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

