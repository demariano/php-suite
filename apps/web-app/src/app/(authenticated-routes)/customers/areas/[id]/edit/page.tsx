'use client';

import { AreaApi, AreaDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AreaForm from '../../components/AreaForm';
import AreaTownsTab from '../../components/AreaTownsTab';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditAreaPageProps {
  params: {
    id: string;
  };
}

export default function EditAreaPage({ params }: EditAreaPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs' | 'towns'>('details');
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
        status: area.status
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

  const handleDelete = async () => {
    if (!selectedArea) {
      return;
    }
    
    if (!confirm('Are you sure you want to delete this area?')) {
      return;
    }
    
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
  
  const handleDeny = async () => {
    if (!selectedArea) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedArea = await AreaApi.denyArea(selectedArea.areaId, userRole);
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

  const handleCancel = () => {
    router.push('/customers/areas');
  };

  if (!selectedArea && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Area not found</span>
        </div>
      </div>
    );
  }

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedArea) return null;
    
    return (
      <div>
        <div className="mb-5">
          {(selectedArea.status === StatusEnum.FOR_APPROVAL || selectedArea.status === StatusEnum.NEW_RECORD) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
              <span className="text-yellow-600 text-base">ℹ️</span>
              <span className="text-yellow-800 text-sm">
                These are the proposed changes awaiting approval
              </span>
            </div>
          )}
          
          {selectedArea?.forApprovalVersion ? (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 16px 0'
              }}>
                Pending Approval Details
              </h3>
              <p className="text-gray-600 text-sm">
                Review the pending changes above. Use the buttons below to approve or deny.
              </p>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No pending approval changes
            </p>
          )}
        </div>
        
        <div className="flex justify-between mt-6">
          {isAdminUser && (selectedArea?.status === StatusEnum.FOR_APPROVAL || selectedArea?.status === StatusEnum.NEW_RECORD || selectedArea?.status === StatusEnum.FOR_DELETION) ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="px-5 py-2.5 bg-red-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Deny Changes'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div></div>
          )}
          
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

  // Render logs tab content
  const renderLogsTab = () => {
    if (!selectedArea) return null;
    
    return (
      <div>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Recent Activity
          </h3>
          {selectedArea?.activityLogs && selectedArea.activityLogs.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
              {selectedArea.activityLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-2 ${
                    index < selectedArea.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
        <div>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e5e7eb',
            marginBottom: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px 8px 0 0',
            padding: '4px'
          }}>
            <button
              onClick={() => setActiveTab('details')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'details' ? 'white' : 'transparent',
                color: activeTab === 'details' ? '#1f2937' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'details' ? '600' : '500',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'details' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                marginRight: '4px'
              }}
            >
              Details
            </button>
            
            {selectedArea.status !== StatusEnum.ACTIVE && (
              <button
                onClick={() => setActiveTab('approval')}
                style={{
                  padding: '12px 20px',
                  backgroundColor: activeTab === 'approval' ? 'white' : 'transparent',
                  color: activeTab === 'approval' ? '#1f2937' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === 'approval' ? '600' : '500',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === 'approval' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                  marginRight: '4px'
                }}
              >
                Approval Version
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('towns')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'towns' ? 'white' : 'transparent',
                color: activeTab === 'towns' ? '#1f2937' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'towns' ? '600' : '500',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'towns' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                marginRight: '4px'
              }}
            >
              Towns
            </button>
            
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'logs' ? 'white' : 'transparent',
                color: activeTab === 'logs' ? '#1f2937' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'logs' ? '600' : '500',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'logs' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              Activity Logs
            </button>
          </div>
          
          {/* Tab Content */}
          <div>
            {activeTab === 'details' && (
              <AreaForm
                isCreateMode={false}
                selectedArea={selectedArea}
                successMessage={null}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={handleCancel}
              />
            )}
            
            {activeTab === 'approval' && renderApprovalTab()}
            
            {activeTab === 'towns' && (
              <AreaTownsTab area={selectedArea} />
            )}
            
            {activeTab === 'logs' && renderLogsTab()}
          </div>
        </div>
      )}
    </div>
  );
}

