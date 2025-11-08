'use client';

import { extractErrorMessage, TownApi, TownDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TownForm from '../../components/TownForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditTownPageProps {
  params: {
    id: string;
  };
}

export default function EditTownPage({ params }: EditTownPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTown, setSelectedTown] = useState<TownDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch town details on component mount
  useEffect(() => {
    const fetchTown = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const town = await TownApi.getTownById(params.id, userRole);
        setSelectedTown(town);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((town.status === StatusEnum.FOR_APPROVAL || town.status === StatusEnum.NEW_RECORD || town.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching town:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load town details. Please try again.');
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
      fetchTown();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (town: TownDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing town
      const updatedTown = await TownApi.updateTown(params.id, {
        townId: town.townId,
        townName: town.townName,
        areaId: town.areaId,
        areaName: town.areaName,
        status: town.status,
        changeReason: town.changeReason
      }, userRole);
      
      setSelectedTown(updatedTown);
      setFlashNotification({
        title: 'Success!',
        message: 'Town updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to town list after a short delay
      setTimeout(() => {
        router.push('/customers/towns');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating town:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update town. Please try again.');
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
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTown) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await TownApi.deleteTown(selectedTown, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Town deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to town list after a short delay
      setTimeout(() => {
        router.push('/customers/towns');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting town:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete town. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTown) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedTown = await TownApi.approveTown(selectedTown.townId, userRole);
      setSelectedTown(approvedTown);
      setFlashNotification({
        title: 'Success!',
        message: 'Town approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to town list after a short delay
      setTimeout(() => {
        router.push('/customers/towns');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving town:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve town. Please try again.');
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
    if (!selectedTown) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedTown = await TownApi.denyTown(selectedTown.townId, userRole);
      setSelectedTown(deniedTown);
      setFlashNotification({
        title: 'Success!',
        message: 'Town changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to town list after a short delay
      setTimeout(() => {
        router.push('/customers/towns');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying town:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny town. Please try again.');
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
    router.push('/customers/towns');
  };

  if (!selectedTown && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Town not found</span>
        </div>
      </div>
    );
  }

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedTown || !selectedTown.forApprovalVersion) return null;
    
    const approvalData = selectedTown.forApprovalVersion;
    
    // Helper function to normalize values for comparison
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
    
    // Helper function to check if a field has changed
    const isFieldChanged = (fieldName: string): boolean => {
      if (!selectedTown?.forApprovalVersion) return false;
      
      const originalValue = (selectedTown as unknown as Record<string, unknown>)[fieldName];
      const newValue = (selectedTown.forApprovalVersion as unknown as Record<string, unknown>)[fieldName];
      
      if (!(fieldName in selectedTown.forApprovalVersion)) return false;
      
      if (Array.isArray(originalValue) && Array.isArray(newValue)) {
        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
      }
      
      const normalizedOriginal = normalizeValue(originalValue);
      const normalizedNew = normalizeValue(newValue);
      
      const hasChanged = normalizedOriginal !== normalizedNew;
      
      return hasChanged;
    };
    
    // Helper function to format display value
    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
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
              : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500'
          }`}>
            {formatValue(value)}
          </div>
        </div>
      );
    };
    
    return (
      <div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg">
        {/* Change Reason and Modification Made */}
        {selectedTown?.changeReason && (
          <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-700">
                Change Reason and Modification Made
              </h4>
            </div>
            <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed whitespace-pre-wrap font-mono leading-relaxed">
              {selectedTown.changeReason}
            </div>
          </div>
        )}
        
        {/* Town Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Town Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderReadOnlyField('Town Name', approvalData.townName, 'bg-blue-500', 'townName')}
              {renderReadOnlyField('Area', approvalData.areaName, 'bg-indigo-500', 'areaName')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
          {isAdminUser && (selectedTown?.status === StatusEnum.FOR_APPROVAL || selectedTown?.status === StatusEnum.NEW_RECORD || selectedTown?.status === StatusEnum.FOR_DELETION) ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div></div>
          )}
          
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    if (!selectedTown) return null;
    
    return (
      <div>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Recent Activity
          </h3>
          {selectedTown?.activityLogs && selectedTown.activityLogs.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
              {selectedTown.activityLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-2 ${
                    index < selectedTown.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No activity logs available
            </p>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <DeleteConfirmationModal
        show={showDeleteModal}
        town={selectedTown}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/towns" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Towns
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedTown && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading town details...</div>
        </div>
      )}

      {/* Town Form with Tabs */}
      {selectedTown && (
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b-2 border-blue-200 rounded-t-xl p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'details'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50 transform scale-105'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-blue-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Town Information
                  </span>
                </button>
                
                {selectedTown.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      activeTab === 'approval'
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/50 transform scale-105'
                        : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-teal-600'
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
                  className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'logs'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-105'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-green-600'
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
            <div className="p-6 bg-white">
            {activeTab === 'details' && (
              <TownForm
                isCreateMode={false}
                selectedTown={selectedTown}
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

