'use client';

import { AreaApi, AreaDto, StatusEnum, useEnv } from '@data-access/index';
import { TerritoryManagerDto } from '@data-access/types/territory-manager.types';
import { useEffect, useState } from 'react';
import TerritoryManagerForm from './TerritoryManagerForm';

interface TerritoryManagerModalProps {
  show: boolean;
  isCreateMode: boolean;
  selectedTerritoryManager: TerritoryManagerDto | null;
  activeTab: 'details' | 'approval' | 'logs' | 'areas';
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTabChange: (tab: 'details' | 'approval' | 'logs' | 'areas') => void;
  onSave: (territoryManager: TerritoryManagerDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
}

export default function TerritoryManagerModal({
  show,
  isCreateMode,
  selectedTerritoryManager,
  activeTab,
  successMessage,
  isAdminUser,
  isLoading,
  onClose,
  onTabChange,
  onSave,
  onDelete,
  onApprove,
  onDeny
}: TerritoryManagerModalProps) {
  const { env } = useEnv();
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onClose]);

  // Fetch areas when areas tab becomes active
  useEffect(() => {
    const fetchAreas = async () => {
      if (activeTab === 'areas' && selectedTerritoryManager?.territoryManagerId) {
        try {
          setAreasLoading(true);
          setAreasError(null);
          
          // SECURITY: Only get user role if BYPASS_AUTH is enabled
          const userRole = env.BYPASS_AUTH === 'ENABLED' ? undefined : undefined;
          
          const response = await AreaApi.getAreasByTerritoryManagerId(
            selectedTerritoryManager.territoryManagerId,
            userRole
          );
          
          console.log('Areas API response:', response);
          console.log('Response type:', typeof response);
          console.log('Response has data:', response && typeof response === 'object' && 'data' in response);
          
          // Handle the response format - check if it has a data property (standard paginated response)
          const areasData = response && typeof response === 'object' && 'data' in response 
            ? response.data 
            : Array.isArray(response) 
              ? response 
              : [];
          
          console.log('Processed areas data:', areasData);
          console.log('Areas data length:', areasData ? areasData.length : 'undefined');
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

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {isCreateMode ? 'Create Territory Manager' : 'Edit Territory Manager'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
          <div className="flex gap-2 flex-nowrap">
          <button
            onClick={() => onTabChange('details')}
            className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'details'
                ? selectedTerritoryManager?.status === StatusEnum.ACTIVE
                  ? 'bg-green-600 text-white shadow-sm'
                  : selectedTerritoryManager?.status === StatusEnum.FOR_APPROVAL
                  ? 'bg-yellow-500 text-white shadow-sm'
                  : selectedTerritoryManager?.status === StatusEnum.FOR_DELETION
                  ? 'bg-red-600 text-white shadow-sm'
                  : selectedTerritoryManager?.status === StatusEnum.NEW_RECORD
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  <span>
                    {selectedTerritoryManager.status === StatusEnum.ACTIVE
                      ? 'Active'
                      : selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL
                      ? 'For Approval'
                      : selectedTerritoryManager.status === StatusEnum.FOR_DELETION
                      ? 'For Deletion'
                      : selectedTerritoryManager.status === StatusEnum.NEW_RECORD
                      ? 'New Record'
                      : selectedTerritoryManager.status}
                  </span>
                </>
              )}
            </span>
          </button>
          
          {!isCreateMode && selectedTerritoryManager && selectedTerritoryManager.status !== StatusEnum.ACTIVE && (
            <button
              onClick={() => onTabChange('approval')}
              className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'approval'
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600'
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
          
          {!isCreateMode && (
            <button
              onClick={() => onTabChange('areas')}
              className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'areas'
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Areas
              </span>
            </button>
          )}
          
          {!isCreateMode && (
            <button
              onClick={() => onTabChange('logs')}
              className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Logs
              </span>
            </button>
          )}
          </div>
        </div>
        
        {/* Tab Content */}
        <div>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <TerritoryManagerForm
              isCreateMode={isCreateMode}
              selectedTerritoryManager={selectedTerritoryManager}
              successMessage={successMessage}
              onSave={onSave}
              onDelete={onDelete}
              onCancel={onClose}
            />
          )}
          
          {/* Approval Version Tab */}
          {activeTab === 'approval' && !isCreateMode && selectedTerritoryManager && (() => {
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
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      {isAdminUser ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <button
                            type="button"
                            onClick={onDeny}
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
                            onClick={onApprove}
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
                        onClick={onClose}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    </div>
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
                  <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    {isAdminUser && (selectedTerritoryManager?.status === StatusEnum.FOR_APPROVAL || selectedTerritoryManager?.status === StatusEnum.NEW_RECORD) ? (
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <button
                          type="button"
                          onClick={onDeny}
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
                          onClick={onApprove}
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
                      onClick={onClose}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Areas Tab */}
          {activeTab === 'areas' && !isCreateMode && (() => {
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

            return (
              <div className="p-4 sm:p-6 bg-white">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-gray-800 mb-3">
                    Assigned Areas
                  </h3>
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
                                {getStatusText(area.status || StatusEnum.ACTIVE)}
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
                    onClick={onClose}
                    className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
          
          {/* Activity Logs Tab */}
          {activeTab === 'logs' && !isCreateMode && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Recent Activity
                </h3>
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
                  <p className="text-gray-500 italic">
                    No activity logs available
                  </p>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
