'use client';

import { AreaDto, StatusEnum, TerritoryManagerDto, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';
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
  const [towns, setTowns] = useState<string[]>([]);
  const [newTownInput, setNewTownInput] = useState('');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    areaName: '',
    changeReason: ''
  });

  // Handle adding a new town
  const handleAddTown = () => {
    const trimmedTown = newTownInput.trim();
    if (trimmedTown && !towns.includes(trimmedTown)) {
      setTowns([...towns, trimmedTown]);
      setNewTownInput('');
      setUserHasMadeSelections(true);
    }
  };

  // Handle removing a town
  const handleRemoveTown = (index: number) => {
    setTowns(towns.filter((_, i) => i !== index));
    setUserHasMadeSelections(true);
  };

  // Handle town input key press
  const handleTownInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTown();
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
      // Initialize towns from selectedArea
      if (selectedArea.towns && Array.isArray(selectedArea.towns)) {
        setTowns(selectedArea.towns);
      }
    }
  }, [isCreateMode, selectedArea, userHasMadeSelections]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const areaName = formData.areaName;
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!areaName || areaName.trim() === '') {
      errors.push('Area name is required.');
    }
    
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
      const status = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.NEW_RECORD;
      const newArea = {
        areaName: areaName.trim(),
        territoryManagerId: selectedTerritoryManager?.id || '',
        territoryManagerName: selectedTerritoryManager?.name || '',
        status,
        changeReason: '',
        towns: towns.filter(town => town.trim() !== '')
      };
      onSave(newArea as AreaDto);
    } else {
      const trimmedReason = formData.changeReason.trim();
      const updatedArea = {
        ...selectedArea,
        areaName: areaName.trim(),
        territoryManagerId: selectedTerritoryManager?.id || '',
        territoryManagerName: selectedTerritoryManager?.name || '',
        status: selectedArea?.status ?? StatusEnum.ACTIVE,
        changeReason: trimmedReason,
        towns: towns.filter(town => town.trim() !== '')
      };
      onSave(updatedArea as AreaDto);
    }
  };

  const handleTerritoryManagerSelect = (territoryManager: TerritoryManagerDto) => {
    setSelectedTerritoryManager({
      id: territoryManager.territoryManagerId,
      name: territoryManager.territoryManagerName || '',
    });
    setUserHasMadeSelections(true);
  };

  const handleClearTerritoryManager = () => {
    setSelectedTerritoryManager(null);
    setUserHasMadeSelections(true);
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
      badgeClasses = "bg-green-600 text-white shadow-sm";
      dotColor = "bg-white";
      bgColor = "#10b981";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      badgeClasses = "bg-yellow-500 text-white shadow-sm";
      dotColor = "bg-white";
      bgColor = "#f59e0b";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_DELETION) {
      badgeClasses = "bg-red-600 text-white shadow-sm";
      dotColor = "bg-white";
      bgColor = "#ef4444";
      textColor = "#ffffff";
    } else if (status === StatusEnum.NEW_RECORD) {
      badgeClasses = "bg-blue-600 text-white shadow-sm";
      dotColor = "bg-white";
      bgColor = "#3b82f6";
      textColor = "#ffffff";
    } else {
      badgeClasses = "bg-gray-500 text-white shadow-sm";
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
            ✓
          </div>
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <span className="text-base">⚠️</span>
            <span>Please fix the following errors:</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Change Reason Field - First component when displayed */}
      {!isCreateMode && !isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, changeReason: e.target.value }));
            setUserHasMadeSelections(true);
          }}
          disabled={selectedArea?.status !== StatusEnum.ACTIVE}
        />
      )}
      
      {/* Details Container */}
      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
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
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, areaName: e.target.value }));
                    setUserHasMadeSelections(true);
                  }}
                  placeholder={isCreateMode ? 'Enter area name' : ''}
                  disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Territory Manager */}
              <div className="group">
                <SelectionField
                  label="Territory Manager *"
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

        {/* Towns Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600 m-0">
                Towns In Area
              </h3>
            </div>

            {/* Add Town Input */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Add Town
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTownInput}
                  onChange={(e) => setNewTownInput(e.target.value)}
                  onKeyPress={handleTownInputKeyPress}
                  placeholder="Enter town name and press Enter or click Add"
                  disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                  className={`flex-1 px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddTown}
                  disabled={(!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE) || !newTownInput.trim() || towns.includes(newTownInput.trim())}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Towns List */}
            {towns.length === 0 ? (
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                <div className="mb-3 text-4xl">🏘️</div>
                <p className="font-medium text-gray-600">No towns added</p>
                <p className="mt-1 text-sm text-gray-500">Add towns using the input above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Towns ({towns.length})
                </h4>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="divide-y divide-gray-200">
                    {towns.map((town, index) => (
                      <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <span className="text-sm font-medium text-gray-900">{town}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTown(index)}
                          disabled={!isCreateMode && selectedArea?.status !== StatusEnum.ACTIVE}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          title="Remove town"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {!isCreateMode && selectedArea?.status === StatusEnum.ACTIVE ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {(isCreateMode || selectedArea?.status === StatusEnum.ACTIVE) && (
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
