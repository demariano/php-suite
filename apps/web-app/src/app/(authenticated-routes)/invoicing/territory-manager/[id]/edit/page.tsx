'use client';

import { AreaApi, AreaDto, StatusEnum, TerritoryManagerApi, TerritoryManagerDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TerritoryManagerForm from '../../components/TerritoryManagerForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditTerritoryManagerPageProps {
  params: {
    id: string;
  };
}

export default function EditTerritoryManagerPage({ params }: EditTerritoryManagerPageProps) {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const [selectedTerritoryManager, setSelectedTerritoryManager] = useState<TerritoryManagerDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs' | 'areas'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchTerritoryManager = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        const territoryManager = await TerritoryManagerApi.getTerritoryManagerById(params.id, userRole);
        setSelectedTerritoryManager(territoryManager);

        if ((territoryManager.status === StatusEnum.FOR_APPROVAL || territoryManager.status === StatusEnum.NEW_RECORD || territoryManager.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
      } catch (err: any) {
        console.error('Failed to fetch territory manager:', err);
        setError(err.message || 'Failed to load territory manager details. Please try again.');
        setFlashNotification({
          title: 'Error!',
          message: err.message || 'Failed to load territory manager details. Please try again.',
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerritoryManager();
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

  // Fetch areas when areas tab becomes active
  useEffect(() => {
    const fetchAreas = async () => {
      if (activeTab === 'areas' && selectedTerritoryManager?.territoryManagerId) {
        try {
          setAreasLoading(true);
          setAreasError(null);
          
          const userRole = env.BYPASS_AUTH === 'ENABLED' ? undefined : undefined;
          
          const response = await AreaApi.getAreasByTerritoryManagerId(
            selectedTerritoryManager.territoryManagerId,
            userRole
          );
          
          const areasData = response && typeof response === 'object' && 'data' in response 
            ? response.data 
            : Array.isArray(response) 
              ? response 
              : [];
          
          setAreas(areasData || []);
        } catch (error) {
          console.error('Error fetching areas:', error);
          setAreasError('Failed to load areas. Please try again.');
          setAreas([]);
        } finally {
          setAreasLoading(false);
        }
      }
    };

    fetchAreas();
  }, [activeTab, selectedTerritoryManager?.territoryManagerId, env.BYPASS_AUTH]);

  const handleSave = async (territoryManager: TerritoryManagerDto) => {
    if (!selectedTerritoryManager) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      const updatedRecord = await TerritoryManagerApi.updateTerritoryManager(territoryManager.territoryManagerId, {
        ...territoryManager,
        status: territoryManager.status
      }, userRole);

      setSelectedTerritoryManager(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Territory Manager updated successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/territory-manager');
    } catch (err: any) {
      console.error('Failed to save territory manager:', err);
      setError(err.message || 'Failed to save territory manager. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to save territory manager. Please try again.',
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
    if (!selectedTerritoryManager) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      await TerritoryManagerApi.deleteTerritoryManager(selectedTerritoryManager, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Territory Manager deleted successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/territory-manager');
    } catch (err: any) {
      console.error('Failed to delete territory manager:', err);
      setError(err.message || 'Failed to delete territory manager. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to delete territory manager. Please try again.',
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
    if (!selectedTerritoryManager) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await TerritoryManagerApi.approveTerritoryManager(selectedTerritoryManager.territoryManagerId, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Territory Manager approved successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/territory-manager');
    } catch (err: any) {
      console.error('Failed to approve territory manager:', err);
      setError(err.message || 'Failed to approve territory manager. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to approve territory manager. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDenyRecord = async () => {
    if (!selectedTerritoryManager) return;

    try {
      setIsLoading(true);
      setError(null);

      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      await TerritoryManagerApi.denyTerritoryManager(selectedTerritoryManager.territoryManagerId, userRole);

      setFlashNotification({
        title: 'Success!',
        message: 'Territory Manager denied successfully!',
        alertType: 'success'
      });
      router.replace('/invoicing/territory-manager');
    } catch (err: any) {
      console.error('Failed to deny territory manager:', err);
      setError(err.message || 'Failed to deny territory manager. Please try again.');
      setFlashNotification({
        title: 'Error!',
        message: err.message || 'Failed to deny territory manager. Please try again.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/invoicing/territory-manager');
  };

  if (isLoading && !selectedTerritoryManager) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !selectedTerritoryManager) {
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
        <button onClick={() => router.replace('/invoicing/territory-manager')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Territory Managers
        </button>
      </div>
    );
  }

  if (!selectedTerritoryManager && !isLoading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Territory Manager not found or could not be loaded.
        <button onClick={() => router.replace('/invoicing/territory-manager')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Territory Managers
        </button>
      </div>
    );
  }

  const approvalVersionData: TerritoryManagerDto = {
    ...selectedTerritoryManager,
    ...selectedTerritoryManager?.forApprovalVersion
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
          <a href="/invoicing/territory-manager" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Territory Manager
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Territory Manager: {selectedTerritoryManager?.territoryManagerName}</h1>

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

          {selectedTerritoryManager && (selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL || selectedTerritoryManager.status === StatusEnum.NEW_RECORD || selectedTerritoryManager.status === StatusEnum.FOR_DELETION) && (
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
            onClick={() => setActiveTab('areas')}
            className={`px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'areas' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Areas
          </button>

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
          {activeTab === 'details' && selectedTerritoryManager && (
            <TerritoryManagerForm
              isCreateMode={false}
              selectedTerritoryManager={selectedTerritoryManager}
              successMessage={null}
              onSave={handleSave}
              onDelete={handleDeleteClick}
              onCancel={handleCancel}
            />
          )}

          {activeTab === 'approval' && !isLoading && selectedTerritoryManager && (
            <div>
              <div className="mb-5">
                {(selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL || selectedTerritoryManager.status === StatusEnum.NEW_RECORD || selectedTerritoryManager.status === StatusEnum.FOR_DELETION) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <span className="text-yellow-600 text-base">ℹ️</span>
                    <span className="text-yellow-800 text-sm">
                      {selectedTerritoryManager.status === StatusEnum.FOR_DELETION ? 'This record is pending deletion approval.' : 'These are the proposed changes awaiting approval.'}
                    </span>
                  </div>
                )}

                {selectedTerritoryManager?.forApprovalVersion ? (
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
                        key === 'status' || key === 'territoryManagerId'
                      ) {
                        return null;
                      }

                      const originalValue = (selectedTerritoryManager as any)[key];
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

              {isAdminUser && (selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL || selectedTerritoryManager.status === StatusEnum.NEW_RECORD || selectedTerritoryManager.status === StatusEnum.FOR_DELETION) && (
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

          {activeTab === 'areas' && !isLoading && selectedTerritoryManager && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Assigned Areas</h3>
                {areasError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
                    {areasError}
                  </div>
                )}
                {areasLoading ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 flex items-center justify-center">
                    <div className="text-gray-500">Loading areas...</div>
                  </div>
                ) : areas && areas.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                    {areas.map((area, index) => (
                      <div 
                        key={area.areaId || index} 
                        className={`py-3 px-4 bg-white rounded-md border border-gray-200 mb-2 ${
                          index < areas.length - 1 ? '' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {area.areaName || 'Unnamed Area'}
                            </div>
                          </div>
                          <div className="ml-3">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase"
                              style={{ 
                                backgroundColor: area.status === StatusEnum.ACTIVE ? '#dcfce7' : 
                                               area.status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : 
                                               area.status === StatusEnum.FOR_DELETION ? '#fef2f2' : 
                                               area.status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6',
                                color: area.status === StatusEnum.ACTIVE ? '#166534' : 
                                       area.status === StatusEnum.FOR_APPROVAL ? '#92400e' : 
                                       area.status === StatusEnum.FOR_DELETION ? '#dc2626' : 
                                       area.status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280'
                              }}
                            >
                              {area.status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <p className="text-gray-500 italic text-center">
                      No areas assigned to this territory manager
                    </p>
                  </div>
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

          {activeTab === 'logs' && !isLoading && selectedTerritoryManager && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h3>
                {selectedTerritoryManager?.activityLogs && selectedTerritoryManager.activityLogs.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                    {selectedTerritoryManager.activityLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`py-2 ${
                          index < selectedTerritoryManager.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
        territoryManager={selectedTerritoryManager}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

