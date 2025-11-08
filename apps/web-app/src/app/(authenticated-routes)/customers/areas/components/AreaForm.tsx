'use client';

import TownApi from '@data-access/api/town.api';
import { AreaDto, StatusEnum, TerritoryManagerDto, TownDto, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import TerritoryManagerSearchableSelectionModal from '../../../search-modals/TerritoryManagerSearchableSelectionModal';
import SelectionField from '../../customer/components/SelectionField';

interface AreaFormProps {
  isCreateMode: boolean;
  selectedArea: AreaDto | null;
  successMessage: string | null;
  onSave: (area: AreaDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  areaId?: string;
}

export default function AreaForm({
  isCreateMode,
  selectedArea,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  areaId
}: AreaFormProps) {
  const [selectedTerritoryManager, setSelectedTerritoryManager] = useState<{id: string, name: string} | null>(null);
  const [showTerritoryManagerModal, setShowTerritoryManagerModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [towns, setTowns] = useState<TownDto[]>([]);
  const [townsLoading, setTownsLoading] = useState(false);
  const [townsError, setTownsError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    areaName: '',
    changeReason: ''
  });

  // Get user role for API calls
  const getUserRole = () => {
    return env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
  };

  // Fetch towns for the area
  const fetchTownsForArea = async () => {
    const currentAreaId = areaId || selectedArea?.areaId;
    if (!currentAreaId || isCreateMode) {
      return;
    }

    try {
      setTownsLoading(true);
      setTownsError(null);

      // Get towns for all statuses
      const [activeResponse, pendingResponse, deletedResponse] = await Promise.all([
        TownApi.getTownsByAreaStatus(currentAreaId, StatusEnum.ACTIVE, getUserRole()),
        TownApi.getTownsByAreaStatus(currentAreaId, StatusEnum.FOR_APPROVAL, getUserRole()),
        TownApi.getTownsByAreaStatus(currentAreaId, StatusEnum.FOR_DELETION, getUserRole())
      ]);

      // Convert response objects to arrays
      const activeTownsArray = Object.values(activeResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      const pendingTownsArray = Object.values(pendingResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      const deletedTownsArray = Object.values(deletedResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      // Combine all towns
      const allTowns = [
        ...activeTownsArray,
        ...pendingTownsArray,
        ...deletedTownsArray
      ];

      setTowns(allTowns);
    } catch (err) {
      console.error('Error fetching towns for area:', err);
      setTownsError('Failed to load towns for this area. Please try again.');
    } finally {
      setTownsLoading(false);
    }
  };

  // Set initial values when editing (only when user hasn't made selections)
  useEffect(() => {
    if (!isCreateMode && selectedArea && !userHasMadeSelections) {
      if (selectedArea.territoryManagerId && selectedArea.territoryManagerName) {
        setSelectedTerritoryManager({
          id: selectedArea.territoryManagerId,
          name: selectedArea.territoryManagerName
        });
      }
      // Initialize form data
      setFormData({
        areaName: selectedArea.areaName || '',
        changeReason: selectedArea.changeReason || ''
      });
    }
  }, [isCreateMode, selectedArea, userHasMadeSelections]);

  // Fetch towns when areaId is available
  useEffect(() => {
    if (!isCreateMode && (areaId || selectedArea?.areaId)) {
      fetchTownsForArea();
    }
  }, [areaId, selectedArea?.areaId, isCreateMode]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const areaName = formData.areaName;
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!selectedTerritoryManager) {
      errors.push('Please select a territory manager.');
    }
    
    // Validate change reason for non-create mode (only required for non-admin users)
    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setValidationErrors([]);
    
    if (isCreateMode) {
      const newArea = {
        areaName: areaName,
        territoryManagerId: selectedTerritoryManager?.id || '',
        territoryManagerName: selectedTerritoryManager?.name || '',
        status: StatusEnum.ACTIVE, // Default status for new areas
        changeReason: '' // No change reason needed for new records
      };
      onSave(newArea as AreaDto);
    } else {
      const updatedArea = {
        ...selectedArea,
        areaName: areaName,
        territoryManagerId: selectedTerritoryManager?.id || '',
        territoryManagerName: selectedTerritoryManager?.name || '',
        status: StatusEnum.ACTIVE,
        changeReason: formData.changeReason || ''
      };
      onSave(updatedArea as AreaDto);
    }
  };

  const handleTerritoryManagerSelect = (territoryManager: TerritoryManagerDto) => {
    setSelectedTerritoryManager({ id: territoryManager.territoryManagerId, name: territoryManager.territoryManagerName });
    setUserHasMadeSelections(true);
  };

  const handleClearTerritoryManager = () => {
    setSelectedTerritoryManager(null);
  };

  // Status badge helper function with enhanced styling and readable text
  const getStatusBadge = (status: StatusEnum) => {
    // Convert status enum to readable text
    const getStatusText = (s: StatusEnum): string => {
      switch (s) {
        case StatusEnum.ACTIVE:
          return 'Active';
        case StatusEnum.FOR_APPROVAL:
          return 'For Approval';
        case StatusEnum.FOR_DELETION:
          return 'For Deletion';
        case StatusEnum.NEW_RECORD:
          return 'New Record';
        default:
          return s;
      }
    };

    const statusText = getStatusText(status);
    
    // Enhanced styling with shadows and better colors
    let badgeClasses = "";
    let dotColor = "";
    let bgColor = "";
    let textColor = "";
    
    if (status === StatusEnum.ACTIVE) {
      badgeClasses = "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/50";
      dotColor = "bg-white";
      bgColor = "#10b981";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      badgeClasses = "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/50";
      dotColor = "bg-white";
      bgColor = "#f59e0b";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_DELETION) {
      badgeClasses = "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/50";
      dotColor = "bg-white";
      bgColor = "#ef4444";
      textColor = "#ffffff";
    } else if (status === StatusEnum.NEW_RECORD) {
      badgeClasses = "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/50";
      dotColor = "bg-white";
      bgColor = "#3b82f6";
      textColor = "#ffffff";
    } else {
      badgeClasses = "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-500/50";
      dotColor = "bg-white";
      bgColor = "#6b7280";
      textColor = "#ffffff";
    }
    
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${badgeClasses}`} style={{ backgroundColor: bgColor, color: textColor }}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        {statusText}
      </span>
    );
  };

  return (
    <>
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '2px solid #16a34a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <span style={{
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontWeight: '600' }}>
              Please fix the following errors:
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#dc2626'
          }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Status Display for Edit Mode - Prominently displayed at top */}
      {!isCreateMode && selectedArea && (
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 shadow-md mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center">
              {getStatusBadge(selectedArea.status || StatusEnum.ACTIVE)}
            </div>
          </div>
        </div>
      )}
      
      {/* Details Container */}
      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Area Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Area Name */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Area Name
                </label>
                <input
                  type="text"
                  name="areaName"
                  value={formData.areaName}
                  onChange={(e) => setFormData(prev => ({ ...prev, areaName: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter area name' : ''}
                  disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Territory Manager */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Territory Manager *
                </label>
                <SelectionField
                  label=""
                  selectedItem={selectedTerritoryManager}
                  onSelect={() => setShowTerritoryManagerModal(true)}
                  onClear={handleClearTerritoryManager}
                  buttonText="Select Territory Manager"
                  disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Towns Section - Only show in edit mode when areaId exists */}
        {!isCreateMode && (areaId || selectedArea?.areaId) && (
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Towns in Area
                </h3>
              </div>
              
              {townsError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 text-sm font-semibold">{townsError}</span>
                  </div>
                </div>
              )}

              {townsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600 text-sm">Loading towns...</span>
                </div>
              ) : towns.length === 0 ? (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">🏘️</div>
                  <p className="text-gray-600 font-medium">No towns found</p>
                  <p className="text-gray-500 text-sm mt-1">This area doesn't have any towns yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const groupedTowns = {
                      [StatusEnum.ACTIVE]: towns.filter(town => town.status === StatusEnum.ACTIVE),
                      [StatusEnum.FOR_APPROVAL]: towns.filter(town => town.status === StatusEnum.FOR_APPROVAL),
                      [StatusEnum.FOR_DELETION]: towns.filter(town => town.status === StatusEnum.FOR_DELETION),
                      [StatusEnum.NEW_RECORD]: towns.filter(town => town.status === StatusEnum.NEW_RECORD),
                      other: towns.filter(town => ![StatusEnum.ACTIVE, StatusEnum.FOR_APPROVAL, StatusEnum.FOR_DELETION, StatusEnum.NEW_RECORD].includes(town.status))
                    };

                    return (
                      <>
                        {groupedTowns[StatusEnum.ACTIVE].length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              Active Towns ({groupedTowns[StatusEnum.ACTIVE].length})
                            </h4>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="divide-y divide-gray-200">
                                {groupedTowns[StatusEnum.ACTIVE].map((town, index) => (
                                  <div key={town.townId || index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-900">{town.townName || '-'}</span>
                                    {getStatusBadge(town.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {groupedTowns[StatusEnum.FOR_APPROVAL].length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                              Pending Approval ({groupedTowns[StatusEnum.FOR_APPROVAL].length})
                            </h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="divide-y divide-yellow-200">
                                {groupedTowns[StatusEnum.FOR_APPROVAL].map((town, index) => (
                                  <div key={town.townId || index} className="px-4 py-3 flex items-center justify-between hover:bg-yellow-100">
                                    <span className="text-sm font-medium text-yellow-900">{town.townName || '-'}</span>
                                    {getStatusBadge(town.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {groupedTowns[StatusEnum.NEW_RECORD].length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              New Records ({groupedTowns[StatusEnum.NEW_RECORD].length})
                            </h4>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="divide-y divide-blue-200">
                                {groupedTowns[StatusEnum.NEW_RECORD].map((town, index) => (
                                  <div key={town.townId || index} className="px-4 py-3 flex items-center justify-between hover:bg-blue-100">
                                    <span className="text-sm font-medium text-blue-900">{town.townName || '-'}</span>
                                    {getStatusBadge(town.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {groupedTowns[StatusEnum.FOR_DELETION].length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              Pending Deletion ({groupedTowns[StatusEnum.FOR_DELETION].length})
                            </h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="divide-y divide-red-200">
                                {groupedTowns[StatusEnum.FOR_DELETION].map((town, index) => (
                                  <div key={town.townId || index} className="px-4 py-3 flex items-center justify-between hover:bg-red-100">
                                    <span className="text-sm font-medium text-red-900">{town.townName || '-'}</span>
                                    {getStatusBadge(town.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {groupedTowns.other.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                              Other Status ({groupedTowns.other.length})
                            </h4>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="divide-y divide-gray-200">
                                {groupedTowns.other.map((town, index) => (
                                  <div key={town.townId || index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-100">
                                    <span className="text-sm font-medium text-gray-900">{town.townName || '-'}</span>
                                    {getStatusBadge(town.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Reason and Modification Made Field - Only show for non-create mode and non-admin users */}
        {!isCreateMode && !isAdminUser && (
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  Change Reason
                </h3>
              </div>
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  Change Reason and Modification Made
                </label>
                <textarea
                  name="changeReason"
                  value={formData.changeReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                  placeholder="Please explain the reason for this change..."
                  rows={3}
                  disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 resize-vertical min-h-[80px] ${
                    !isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-amber-300 group-hover:shadow-md'
                  }`}
                  required={!isAdminUser}
                />
                <div className="text-xs text-gray-500 mt-2">
                  This field is required when making changes to the area record.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
        {!isCreateMode && selectedArea?.status === StatusEnum.ACTIVE ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        ) : (
          <div></div>
        )}
        
        <div className="flex gap-3 items-center">
          {(isCreateMode || selectedArea?.status === StatusEnum.ACTIVE) && (
            <button
              type="submit"
              className="px-6 py-3 font-semibold rounded-xl shadow-lg transform transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCreateMode ? 'Create Area' : 'Save Changes'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    </form>

    {/* Territory Manager Selection Modal */}
    <TerritoryManagerSearchableSelectionModal
      show={showTerritoryManagerModal}
      title="Select Territory Manager"
      selectedValue={selectedTerritoryManager?.id || null}
      onSelect={handleTerritoryManagerSelect}
      onClose={() => setShowTerritoryManagerModal(false)}
    />
    </>
  );
}
