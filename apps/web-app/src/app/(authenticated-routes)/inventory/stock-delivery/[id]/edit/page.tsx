'use client';

import { extractErrorMessage, StatusEnum, StockDeliveryApi, StockDeliveryDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import StockDeliveryForm from './components/StockDeliveryForm';

interface EditStockDeliveryPageProps {
  params: {
    id: string;
  };
}

export default function EditStockDeliveryPage({ params }: EditStockDeliveryPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStockDelivery, setSelectedStockDelivery] = useState<StockDeliveryDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch stock delivery details on component mount
  useEffect(() => {
    const fetchStockDelivery = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const stockDelivery = await StockDeliveryApi.getStockDeliveryById(params.id);
        setSelectedStockDelivery(stockDelivery);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((stockDelivery.status === StatusEnum.FOR_APPROVAL || stockDelivery.status === StatusEnum.NEW_RECORD || stockDelivery.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching stock delivery:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load stock delivery details. Please try again.');
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
      fetchStockDelivery();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (stockDelivery: StockDeliveryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing stock delivery
      const updatedStockDelivery = await StockDeliveryApi.updateStockDelivery(params.id, {
        docno: stockDelivery.docno,
        dateReceived: stockDelivery.dateReceived,
        supplierId: stockDelivery.supplierId,
        supplierName: stockDelivery.supplierName,
        status: stockDelivery.status,
        deliveryDetails: stockDelivery.deliveryDetails,
        changeReason: stockDelivery.changeReason
      }, userRole);
      
      setSelectedStockDelivery(updatedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating stock delivery:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update stock delivery. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStockDelivery) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await StockDeliveryApi.deleteStockDelivery(selectedStockDelivery, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting stock delivery:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete stock delivery. Please try again.');
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
    if (!selectedStockDelivery) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedStockDelivery = await StockDeliveryApi.approveStockDelivery(selectedStockDelivery.stockDeliveryId!, userRole);
      setSelectedStockDelivery(approvedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving stock delivery:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve stock delivery. Please try again.');
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
    if (!selectedStockDelivery) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedStockDelivery = await StockDeliveryApi.denyStockDelivery(selectedStockDelivery.stockDeliveryId!, userRole);
      setSelectedStockDelivery(deniedStockDelivery);
      setFlashNotification({
        title: 'Success!',
        message: 'Stock delivery changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to stock delivery list after a short delay
      setTimeout(() => {
        router.push('/inventory/stock-delivery');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying stock delivery:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny stock delivery. Please try again.');
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
    router.push('/inventory/stock-delivery');
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

  const renderApprovalTab = () => {
    if (!selectedStockDelivery) return null;

    if (selectedStockDelivery.status === StatusEnum.FOR_DELETION) {
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
            {selectedStockDelivery.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedStockDelivery.changeReason}</p>
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

    if (!selectedStockDelivery.forApprovalVersion) return null;

    const approvalData = selectedStockDelivery.forApprovalVersion;

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

    const hasArrayChanges = (fieldName: string): boolean => {
      if (!selectedStockDelivery?.forApprovalVersion) return false;
      const originalValue = (selectedStockDelivery as unknown as Record<string, unknown>)[fieldName];
      const newValue = (selectedStockDelivery.forApprovalVersion as unknown as Record<string, unknown>)[fieldName];
      
      if (!originalValue && !newValue) return false;
      if (!originalValue || !newValue) return true;
      if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;
      
      // Normalize arrays for comparison (exclude metadata fields)
      const normalizeArray = (arr: any[]) => {
        return arr.map(item => {
          const normalized: any = {};
          Object.keys(item).forEach(key => {
            if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
              normalized[key] = item[key];
            }
          });
          return normalized;
        }).sort((a, b) => {
          // Sort by productId and lotNo for consistent comparison
          const aKey = `${a.productId || ''}-${a.lotNo || ''}`;
          const bKey = `${b.productId || ''}-${b.lotNo || ''}`;
          return aKey.localeCompare(bKey);
        });
      };
      
      if (fieldName === 'deliveryDetails') {
        const normalizedOriginal = normalizeArray(originalValue);
        const normalizedNew = normalizeArray(newValue);
        return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
      }
      
      return JSON.stringify(originalValue) !== JSON.stringify(newValue);
    };

    const isFieldChanged = (fieldName: string): boolean => {
      if (!selectedStockDelivery?.forApprovalVersion) return false;

      const originalValue = (selectedStockDelivery as unknown as Record<string, unknown>)[fieldName];
      const newValue = (selectedStockDelivery.forApprovalVersion as unknown as Record<string, unknown>)[fieldName];

      if (!(fieldName in selectedStockDelivery.forApprovalVersion)) return false;

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
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-green-400 bg-white p-4 shadow-sm sm:p-6">
        {selectedStockDelivery?.changeReason && (
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
            <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm font-medium text-gray-500 shadow-sm whitespace-pre-wrap leading-relaxed">
              {selectedStockDelivery.changeReason}
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
                Stock Delivery Information
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderReadOnlyField('Document Number', approvalData.docno, 'bg-blue-500', 'docno')}
              {renderReadOnlyField('Date Received', approvalData.dateReceived, 'bg-blue-500', 'dateReceived')}
              {renderReadOnlyField('Supplier Name', approvalData.supplierName, 'bg-blue-500', 'supplierName')}
            </div>
          </div>
        </div>

        {/* Stock Items */}
        {(() => {
          const itemsChanged = hasArrayChanges('deliveryDetails');
          const originalItems = selectedStockDelivery.deliveryDetails;
          const newItems = (approvalData as any).deliveryDetails;
          const originalHasItems = originalItems && Array.isArray(originalItems) && originalItems.length > 0;
          const newHasItems = newItems && Array.isArray(newItems) && newItems.length > 0;
          const allRemoved = originalHasItems && !newHasItems;
          
          // Render if there are changes OR if new array has items
          if (!itemsChanged && !newHasItems) return null;
          
          return (
            <div className="mt-6">
              <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h-10a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2zM9 10h6M9 14h6M9 18h6" />
                    </svg>
                  </div>
                  <h4 className={`text-base font-bold ${itemsChanged ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700' : 'text-blue-600'}`}>
                    Stock Items
                  </h4>
                </div>
                {allRemoved ? (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          All Stock Items records have been removed
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          {originalItems.length} record{originalItems.length !== 1 ? 's' : ''} will be deleted upon approval
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    {!newHasItems ? (
                      <div className="p-10 text-center text-gray-500 text-base">
                        No stock items in pending changes.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-white border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Stock Type
                              </th>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Lot No
                              </th>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Exp. Date
                              </th>
                              <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(newItems as any[]).map((item: any, index: number) => (
                              <tr 
                                key={index}
                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                              >
                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                  {item.productName || '-'}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-600">
                                  {item.productUnitName || '-'}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-600">
                                  {item.stockTypeName || '-'}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-600">
                                  {item.lotNo || '-'}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-600">
                                  {item.expirationDate || '-'}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-600">
                                  {item.qty || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && selectedStockDelivery && ([StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(selectedStockDelivery.status as StatusEnum)) ? (
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
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
    if (!selectedStockDelivery) return null;

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

          {renderActivityLogsTable(selectedStockDelivery?.activityLogs)}
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

  if (!selectedStockDelivery && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>Stock delivery not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
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
          <a href="/inventory/stock-delivery" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Stock Deliveries
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {isLoading && !selectedStockDelivery && (
        <div className="flex min-h-96 items-center justify-center">
          <div className="text-gray-600">Loading stock delivery details...</div>
        </div>
      )}

      {selectedStockDelivery && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
              <div className="flex flex-nowrap gap-2">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    getTabColorClasses(selectedStockDelivery.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Stock Delivery Information
                    {selectedStockDelivery && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedStockDelivery.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>

                {selectedStockDelivery.status !== StatusEnum.ACTIVE && (
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
                <StockDeliveryForm
                  isCreateMode={false}
                  selectedStockDelivery={selectedStockDelivery}
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
