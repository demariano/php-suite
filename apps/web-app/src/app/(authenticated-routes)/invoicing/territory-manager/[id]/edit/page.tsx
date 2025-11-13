'use client';

import { AreaApi, AreaDto, StatusEnum, TerritoryManagerApi, TerritoryManagerDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import TerritoryManagerForm from '../../components/TerritoryManagerForm';

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
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
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

  if (error && !selectedTerritoryManager) {
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
        <button onClick={() => router.replace('/invoicing/territory-manager')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          Back to Territory Managers
        </button>
      </div>
    );
  }

  if (!selectedTerritoryManager && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="text-center text-gray-600">
          Territory Manager not found or could not be loaded.
          <button onClick={() => router.replace('/invoicing/territory-manager')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
            Back to Territory Managers
          </button>
        </div>
      </div>
    );
  }

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
    if (!selectedTerritoryManager?.forApprovalVersion) return false;
    
    const originalValue = (selectedTerritoryManager as any)[fieldName];
    const newValue = (selectedTerritoryManager.forApprovalVersion as any)[fieldName];
    
    if (!(fieldName in selectedTerritoryManager.forApprovalVersion)) return false;
    
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

  // Render approval tab
  const renderApprovalTab = () => {
    if (!selectedTerritoryManager) return null;

    // FOR_DELETION Status Handling
    if (selectedTerritoryManager.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="p-4 sm:p-6 bg-white">
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 shadow-sm">
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
              {selectedTerritoryManager.changeReason && (
                <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-700">Deletion Reason:</p>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedTerritoryManager.changeReason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isAdminUser && (
              <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
              </div>
            )}
          </div>
        </div>
      );
    }

    // FOR_APPROVAL and NEW_RECORD Status Handling
    if (!selectedTerritoryManager.forApprovalVersion) {
      return (
        <div className="p-4 sm:p-6 bg-white">
          <p className="text-gray-500 italic">No pending approval changes.</p>
        </div>
      );
    }

    const approvalData = selectedTerritoryManager.forApprovalVersion;

    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: any, fieldName?: string) => {
      const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;
      
      return (
        <div className="group">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            {label}
          </label>
          <div className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
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
      <div className="p-4 sm:p-6 bg-white">
        <div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
          {/* Change Reason and Modification Made */}
          {selectedTerritoryManager?.changeReason && (
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
              <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm whitespace-pre-wrap leading-relaxed">
                {selectedTerritoryManager.changeReason}
              </div>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600">
                  Territory Manager Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {approvalData.territoryManagerName !== undefined && renderReadOnlyField('Territory Manager Name', approvalData.territoryManagerName, 'territoryManagerName')}
                {approvalData.contactNo !== undefined && renderReadOnlyField('Contact Number', approvalData.contactNo, 'contactNo')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isAdminUser && (selectedTerritoryManager?.status === StatusEnum.FOR_APPROVAL || selectedTerritoryManager?.status === StatusEnum.NEW_RECORD) && (
            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isLoading ? 'Processing...' : 'Approve Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render logs tab
  const renderLogsTab = () => {
    if (!selectedTerritoryManager) return null;

    return (
      <div className="p-4 sm:p-6 bg-white">
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
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
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

      {/* Customer Form with Tabs */}
      {selectedTerritoryManager && (
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
              <div className="flex gap-2 flex-nowrap">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    getTabColorClasses(selectedTerritoryManager.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Territory Manager Information
                    {selectedTerritoryManager && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedTerritoryManager.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>
                
                {selectedTerritoryManager.status !== StatusEnum.ACTIVE && (
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
            <div className="p-4 sm:p-6 bg-white">

              {activeTab === 'details' && (
                <TerritoryManagerForm
                  isCreateMode={false}
                  selectedTerritoryManager={selectedTerritoryManager}
                  successMessage={null}
                  isAdminUser={isAdminUser}
                  onSave={handleSave}
                  onDelete={handleDeleteClick}
                  onCancel={handleCancel}
                />
              )}

              {activeTab === 'approval' && selectedTerritoryManager && renderApprovalTab()}

              {activeTab === 'logs' && selectedTerritoryManager && renderLogsTab()}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        show={showDeleteConfirm}
        territoryManager={selectedTerritoryManager}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

