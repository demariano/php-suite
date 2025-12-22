'use client';

import { AreaApi, AreaDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createFieldChangeDetector } from '../../../../utils/fieldChangeDetection';
import AreaForm from '../../components/AreaForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';

interface EditAreaPageProps {
  params: {
    id: string;
  };
}

export default function EditAreaPage({ params }: EditAreaPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch area details on component mount
  useEffect(() => {
    const fetchArea = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const area = await AreaApi.getAreaById(params.id, userRole);
        setSelectedArea(area);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((area.status === StatusEnum.FOR_APPROVAL || area.status === StatusEnum.NEW_RECORD || area.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching area:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load area details. Please try again.');
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
      fetchArea();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (area: AreaDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing area
      const updatedArea = await AreaApi.updateArea(params.id, {
        areaId: area.areaId,
        areaName: area.areaName,
        territoryManagerId: area.territoryManagerId,
        territoryManagerName: area.territoryManagerName,
        status: area.status,
        changeReason: area.changeReason,
        towns: area.towns,
        idPrefix: area.idPrefix
      }, userRole);
      
      setSelectedArea(updatedArea);
      setFlashNotification({
        title: 'Success!',
        message: 'Area updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to area list after a short delay
      setTimeout(() => {
        router.push('/customers/areas');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating area:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update area. Please try again.');
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
    if (!selectedArea) {
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedArea) {
      return;
    }
    
    setShowDeleteModal(false);
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await AreaApi.deleteArea(selectedArea, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Area deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to area list after a short delay
      setTimeout(() => {
        router.push('/customers/areas');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting area:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete area. Please try again.');
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
    if (!selectedArea) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedArea = await AreaApi.approveArea(selectedArea.areaId, userRole);
      setSelectedArea(approvedArea);
      setFlashNotification({
        title: 'Success!',
        message: 'Area approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to area list after a short delay
      setTimeout(() => {
        router.push('/customers/areas');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving area:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve area. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = () => {
    setShowDenyDialog(true);
  };

  const handleDenyConfirm = async (approverMessage: string) => {
    if (!selectedArea) return;
    
    try {
      setIsLoading(true);
      setShowDenyDialog(false);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record with approverMessage
      const deniedArea = await AreaApi.denyArea(selectedArea.areaId, approverMessage, userRole);
      setSelectedArea(deniedArea);
      setFlashNotification({
        title: 'Success!',
        message: 'Area changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to area list after a short delay
      setTimeout(() => {
        router.push('/customers/areas');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying area:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny area. Please try again.');
      setFlashNotification({
        title: 'Error',
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
    router.push('/customers/areas');
  };

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

  // Helper function to get tab color based on status
  const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
      return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600';
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

  if (!selectedArea && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>Area not found</span>
        </div>
      </div>
    );
  }

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedArea) return null;
    
    // If status is FOR_DELETION, show deletion message instead of approval version
    if (selectedArea.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                <p className="text-sm text-red-700 mt-1">This record has been marked for deletion and is awaiting approval.</p>
              </div>
            </div>
            {selectedArea.changeReason && (
              <div className="mt-6 p-4 bg-white border-2 border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-2">Deletion Reason:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{selectedArea.changeReason}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    if (!selectedArea.forApprovalVersion) return null;
    
    const approvalData = selectedArea.forApprovalVersion;
    
    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
      selectedArea as Record<string, unknown>,
      selectedArea.forApprovalVersion as Record<string, unknown> | undefined
    );
    
    // Helper function to format display value
    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: unknown, fieldName?: string) => {
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
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Change Reason and Modification Made */}
        {selectedArea?.changeReason && (
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
              {selectedArea.changeReason}
            </div>
          </div>
        )}
        
        {/* Area Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Area Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderReadOnlyField('Area Name', approvalData.areaName, 'areaName')}
              {renderReadOnlyField('Territory Manager', approvalData.territoryManagerName, 'territoryManagerName')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && (selectedArea?.status === StatusEnum.FOR_APPROVAL || selectedArea?.status === StatusEnum.NEW_RECORD || selectedArea?.status === StatusEnum.FOR_DELETION) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    if (!selectedArea) return null;
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="m-0 text-base font-bold text-blue-600">Activity Logs</h3>
          </div>

          {renderActivityLogsTable(selectedArea?.activityLogs)}
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
      {/* Breadcrumbs */}
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/areas" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Areas
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedArea && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading area details...</div>
        </div>
      )}

      {/* Area Form with Tabs */}
      {selectedArea && (
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
              <div className="flex gap-2 flex-nowrap">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    getTabColorClasses(selectedArea.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Area Information
                    {selectedArea && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedArea.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>
                
                {selectedArea.status !== StatusEnum.ACTIVE && (
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
                <AreaForm
                  isCreateMode={false}
                  selectedArea={selectedArea}
                  successMessage={null}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  isAdminUser={isAdminUser}
                  areaId={selectedArea.areaId}
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
        area={selectedArea}
        onConfirm={handleDenyConfirm}
        onCancel={handleDenyCancel}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        area={selectedArea}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

