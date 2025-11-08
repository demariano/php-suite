'use client';

import { SalesTypeApi, SalesTypeDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import SalesTypeForm from '../../components/SalesTypeForm';

interface EditSalesTypePageProps {
  params: {
    id: string;
  };
}

export default function EditSalesTypePage({ params }: EditSalesTypePageProps) {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [selectedSalesType, setSelectedSalesType] = useState<SalesTypeDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchSalesType = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        const salesType = await SalesTypeApi.getSalesTypeById(params.id, userRole);
        setSelectedSalesType(salesType);

        if ((salesType.status === StatusEnum.FOR_APPROVAL || salesType.status === StatusEnum.NEW_RECORD || salesType.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
      } catch (err: any) {
        console.error('Failed to fetch sales type:', err);
        setError(err.message || 'Failed to load sales type details. Please try again.');
        setFlashNotification({
          title: 'Error!',
          message: err.message || 'Failed to load sales type details. Please try again.',
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesType();
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

  const handleSave = async (salesType: SalesTypeDto) => {
    if (!selectedSalesType) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      const updatedRecord = await SalesTypeApi.updateSalesType(salesType.salesTypeId, {
        ...salesType,
        status: salesType.status
      }, userRole);

      setSelectedSalesType(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Sales Type updated successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/sales-type');
    } catch (err: any) {
      console.error('Failed to save sales type:', err);
      setError(err.message || 'Failed to save sales type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to save sales type. Please try again.',
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
    if (!selectedSalesType) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await SalesTypeApi.deleteSalesType(selectedSalesType, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Sales Type deleted successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/sales-type');
    } catch (err: any) {
      console.error('Failed to delete sales type:', err);
      setError(err.message || 'Failed to delete sales type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to delete sales type. Please try again.',
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
    if (!selectedSalesType) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await SalesTypeApi.approveSalesType(selectedSalesType.salesTypeId, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Sales Type approved successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/sales-type');
    } catch (err: any) {
      console.error('Failed to approve sales type:', err);
      setError(err.message || 'Failed to approve sales type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to approve sales type. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDenyRecord = async () => {
    if (!selectedSalesType) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await SalesTypeApi.denySalesType(selectedSalesType.salesTypeId, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Sales Type denied successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/sales-type');
    } catch (err: any) {
      console.error('Failed to deny sales type:', err);
      setError(err.message || 'Failed to deny sales type. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to deny sales type. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/invoicing/sales-type');
  };

  if (isLoading && !selectedSalesType) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !selectedSalesType) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
        <button onClick={() => router.replace('/invoicing/sales-type')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Sales Types
        </button>
      </div>
    );
  }

  if (!selectedSalesType && !isLoading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Sales Type not found or could not be loaded.
        <button onClick={() => router.replace('/invoicing/sales-type')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Sales Types
        </button>
      </div>
    );
  }

  const approvalVersionData: SalesTypeDto = {
    ...selectedSalesType,
    ...selectedSalesType?.forApprovalVersion
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
          <a href="/invoicing/sales-type" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Sales Type
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Sales Type: {selectedSalesType?.salesTypeName}</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        {/* Tab Navigation */}
        <div className="flex border-b-2 border-gray-200 mb-5 bg-gray-50 rounded-t-xl p-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'details' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Details
          </button>

          {selectedSalesType && (selectedSalesType.status === StatusEnum.FOR_APPROVAL || selectedSalesType.status === StatusEnum.NEW_RECORD || selectedSalesType.status === StatusEnum.FOR_DELETION) && (
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'approval' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Approval Version
            </button>
          )}

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'logs' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Activity Logs
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'details' && selectedSalesType && (
            <SalesTypeForm
              isCreateMode={false}
              selectedSalesType={selectedSalesType}
              successMessage={null}
              onSave={handleSave}
              onDelete={handleDeleteClick}
              onCancel={handleCancel}
            />
          )}

          {activeTab === 'approval' && !isLoading && selectedSalesType && (
            <div>
              <div className="mb-5">
                {(selectedSalesType.status === StatusEnum.FOR_APPROVAL || selectedSalesType.status === StatusEnum.NEW_RECORD || selectedSalesType.status === StatusEnum.FOR_DELETION) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <span className="text-yellow-600 text-base">ℹ️</span>
                    <span className="text-yellow-800 text-sm">
                      {selectedSalesType.status === StatusEnum.FOR_DELETION ? 'This record is pending deletion approval.' : 'These are the proposed changes awaiting approval.'}
                    </span>
                  </div>
                )}

                {selectedSalesType?.forApprovalVersion ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-blue-600 text-lg">⏳</span>
                      <h3 className="text-base font-semibold text-gray-900 m-0">Pending Approval Details</h3>
                    </div>

                    {Object.entries(approvalVersionData).map(([key, value]) => {
                      if (
                        key === 'activityLogs' ||
                        key === 'forApprovalVersion' ||
                        key === 'PK' || key === 'SK' || key === 'GSI1PK' || key === 'GSI1SK' || key === 'GSI2PK' || key === 'GSI2SK' ||
                        key === 'status' || key === 'salesTypeId'
                      ) {
                        return null;
                      }

                      const originalValue = (selectedSalesType as any)[key];
                      const isChanged = originalValue !== value;

                      return (
                        <div key={key} className="mb-4">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <div className={`p-2 border rounded-md text-sm ${isChanged ? 'bg-blue-50 border-blue-300' : 'bg-gray-100 border-gray-300'}`}>
                            {String(value)}
                            {isChanged && (
                              <span className="ml-2 text-xs text-blue-600">(Original: {String(originalValue)})</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No pending approval changes.</p>
                )}
              </div>

              {isAdminUser && (selectedSalesType.status === StatusEnum.FOR_APPROVAL || selectedSalesType.status === StatusEnum.NEW_RECORD || selectedSalesType.status === StatusEnum.FOR_DELETION) && (
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleDenyRecord}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Deny Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveRecord}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Approve Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && !isLoading && selectedSalesType && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h3>
                {selectedSalesType?.activityLogs && selectedSalesType.activityLogs.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                    {selectedSalesType.activityLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`py-2 ${
                          index < selectedSalesType.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No activity logs available</p>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        show={showDeleteConfirm}
        salesType={selectedSalesType}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

