'use client';

import { AreaDto, StatusEnum, TerritoryManagerDto } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import TerritoryManagerSearchableSelectionModal from '../../../../../search-modals/TerritoryManagerSearchableSelectionModal';
import SelectionField from '../../../../customer/components/SelectionField';

interface AreaFormProps {
    isCreateMode: boolean;
    selectedArea: AreaDto | null;
    successMessage: string | null;
    onSave: (area: AreaDto) => void;
    onDelete: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    areaId?: string;
    onReactivate?: () => void;
    activeTab?: 'details' | 'logs';
    onTabChange?: (tab: 'details' | 'logs') => void;
    isLoading?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
}

const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-600 text-white shadow-sm',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white shadow-sm',
    [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.FOR_DEACTIVATION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white shadow-sm',
    [StatusEnum.INACTIVE]: 'bg-gray-500 text-white shadow-sm',
    [StatusEnum.DRAFT]: 'bg-blue-600 text-white shadow-sm',
};

const getStatusText = (status?: StatusEnum): string => {
    switch (status) {
        case StatusEnum.ACTIVE:
            return 'Active';
        case StatusEnum.FOR_APPROVAL:
            return 'For Approval';
        case StatusEnum.FOR_DELETION:
            return 'For Deletion';
        case StatusEnum.FOR_DEACTIVATION:
            return 'For Deactivation';
        case StatusEnum.INACTIVE:
            return 'Inactive';
        case StatusEnum.NEW_RECORD:
            return 'New Record';
        case StatusEnum.DRAFT:
            return 'Draft';
        default:
            return 'Active';
    }
};

const getTabClassName = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
        return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }

    return STATUS_TAB_CLASSES[status] ?? STATUS_TAB_CLASSES[StatusEnum.NEW_RECORD];
};

// Helper function to format display value
const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function AreaForm({
    isCreateMode,
    selectedArea,
    successMessage,
    onSave,
    onDelete,
    onCancel,
    isAdminUser = false,
    areaId,
    onReactivate,
    activeTab = 'details',
    onTabChange,
    isLoading = false,
    onApprove,
    onDeny,
}: AreaFormProps) {
    const [selectedTerritoryManager, setSelectedTerritoryManager] = useState<{ id: string; name: string } | null>(null);
    const [showTerritoryManagerModal, setShowTerritoryManagerModal] = useState(false);
    const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [towns, setTowns] = useState<string[]>([]);
    const [newTownInput, setNewTownInput] = useState('');
    const [idPrefixManuallyEdited, setIdPrefixManuallyEdited] = useState(false);

    const currentStatus = selectedArea?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(
        () => (selectedArea?.forApprovalVersion ?? {}) as Record<string, unknown>,
        [selectedArea?.forApprovalVersion]
    );

    // CRITICAL: Field editing permissions based on status
    const canEditDetails = isCreateMode || currentStatus === StatusEnum.ACTIVE;

    // Helper to check if we're in an approval state (FOR_APPROVAL or NEW_RECORD)
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);

    // In create mode, we should show editable form fields, not the approval/diff UI
    const showApprovalUI = isApprovalState && !isCreateMode;

    // Check if we need to show deletion/deactivation card
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    // Form state for controlled inputs
    const [formData, setFormData] = useState({
        areaName: '',
        changeReason: '',
        idPrefix: '',
    });

    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
        (selectedArea ?? {}) as Record<string, unknown>,
        (selectedArea?.forApprovalVersion as Record<string, unknown>) ?? undefined
    );

    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
        const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                    {label}
                </label>
                <div
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                        fieldChanged
                            ? 'border-blue-500 bg-blue-50 text-gray-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}
                >
                    {formatValue(value)}
                </div>
            </div>
        );
    };

    // Helper to render inline field diff
    const renderFieldWithInlineDiff = (
        label: string,
        fieldName: string,
        currentValue: unknown,
        pendingValue: unknown,
        colorClass = 'bg-blue-500'
    ) => {
        const hasChange = isFieldChanged(fieldName);

        if (showApprovalUI && hasChange) {
            return (
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                        {label}
                    </label>
                    <div className="px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-xl text-sm font-medium">
                        <span className="line-through text-gray-500">{formatValue(currentValue)}</span>
                        <span className="mx-2 text-blue-600">→</span>
                        <span className="font-semibold text-blue-700">{formatValue(pendingValue)}</span>
                    </div>
                </div>
            );
        }

        // Normal display (read-only when not editable)
        // For NEW_RECORD status, data is in the main record (currentValue), not forApprovalVersion (pendingValue)
        // For FOR_APPROVAL status, pendingValue has the changes to approve
        const isNewRecord = currentStatus === StatusEnum.NEW_RECORD;
        const displayValue = showApprovalUI && !isNewRecord ? pendingValue : currentValue;
        return renderReadOnlyField(label, displayValue, colorClass, fieldName);
    };

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

    // Generate prefix ID from area name (minimum 3 letters)
    const generatePrefixId = (areaName: string): string => {
        if (!areaName || areaName.trim() === '') {
            return '';
        }

        const lettersOnly = areaName.replace(/[^a-zA-Z]/g, '').toUpperCase();

        if (lettersOnly.length === 0) {
            return 'XXX';
        }

        if (lettersOnly.length >= 3) {
            return lettersOnly.substring(0, Math.max(3, lettersOnly.length));
        } else {
            return lettersOnly.padEnd(3, 'X');
        }
    };

    // Set initial values when editing
    useEffect(() => {
        if (!isCreateMode && selectedArea && !userHasMadeSelections) {
            if (selectedArea.territoryManagerId && selectedArea.territoryManagerName) {
                setSelectedTerritoryManager({
                    id: selectedArea.territoryManagerId,
                    name: selectedArea.territoryManagerName,
                });
            }
            const existingIdPrefix = selectedArea.idPrefix || '';
            setFormData({
                areaName: selectedArea.areaName || '',
                changeReason: selectedArea.changeReason || '',
                idPrefix: existingIdPrefix,
            });
            if (selectedArea.towns && Array.isArray(selectedArea.towns)) {
                setTowns(selectedArea.towns);
            }
            setIdPrefixManuallyEdited(!!existingIdPrefix);
        }
    }, [isCreateMode, selectedArea, userHasMadeSelections]);

    // Auto-generate idPrefix when area name changes
    useEffect(() => {
        if (!idPrefixManuallyEdited && formData.areaName) {
            const generatedPrefix = generatePrefixId(formData.areaName);
            if (generatedPrefix) {
                setFormData((prev) => ({ ...prev, idPrefix: generatedPrefix }));
            }
        } else if (!formData.areaName && !idPrefixManuallyEdited) {
            setFormData((prev) => ({ ...prev, idPrefix: '' }));
        }
    }, [formData.areaName, idPrefixManuallyEdited]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const areaName = formData.areaName;

        const errors: string[] = [];

        if (!areaName || areaName.trim() === '') {
            errors.push('Area name is required.');
        }

        if (!selectedTerritoryManager) {
            errors.push('Please select a territory manager.');
        }

        if (formData.idPrefix && formData.idPrefix.trim().length > 0 && formData.idPrefix.trim().length < 3) {
            errors.push('ID Prefix must be at least 3 letters.');
        }

        if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
            errors.push('Please provide a reason for the change.');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);

        if (isCreateMode) {
            const status = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.NEW_RECORD;
            const newArea = {
                areaName: areaName.trim(),
                territoryManagerId: selectedTerritoryManager?.id || '',
                territoryManagerName: selectedTerritoryManager?.name || '',
                status,
                changeReason: '',
                towns: towns.filter((town) => town.trim() !== ''),
                idPrefix: formData.idPrefix.trim() || undefined,
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
                towns: towns.filter((town) => town.trim() !== ''),
                idPrefix: formData.idPrefix.trim() || undefined,
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

    // Render details tab content
    const renderDetailsTab = () => {
        return (
            <div className="space-y-6">
                {/* Change Reason for Users Editing ACTIVE records */}
                {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                    <ChangeReasonField
                        value={formData.changeReason}
                        onChange={(e) => {
                            setFormData((prev) => ({ ...prev, changeReason: e.target.value }));
                            setUserHasMadeSelections(true);
                        }}
                        disabled={!canEditDetails}
                    />
                )}

                {/* Change Reason Read-Only for approval states */}
                {showApprovalUI && selectedArea?.changeReason && (
                    <ChangeReasonReadOnly value={selectedArea.changeReason} />
                )}

                {/* Deletion/Deactivation Approval Card */}
                {showDeletionCard && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">
                                🗑️
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-800 m-0">
                                    {currentStatus === StatusEnum.FOR_DELETION
                                        ? 'Record Marked for Deletion'
                                        : 'Record Marked for Deactivation'}
                                </h3>
                                <p className="text-sm text-red-700">
                                    This record has been marked for{' '}
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'deletion' : 'deactivation'} and is
                                    awaiting approval.
                                </p>
                            </div>
                        </div>
                        {selectedArea?.changeReason && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-red-700">
                                    {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                                </p>
                                <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedArea.changeReason}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Area Information Section */}
                <div
                    className={`border-2 rounded-xl p-4 sm:p-6 ${
                        showApprovalUI ? 'border-green-400 bg-white' : 'border-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600 m-0">Area Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Show inline diffs for approval states, editable inputs otherwise */}
                        {showApprovalUI ? (
                            <>
                                {renderFieldWithInlineDiff(
                                    'Area Name',
                                    'areaName',
                                    selectedArea?.areaName,
                                    pendingVersion.areaName,
                                    'bg-blue-500'
                                )}
                                {renderFieldWithInlineDiff(
                                    'ID Prefix',
                                    'idPrefix',
                                    selectedArea?.idPrefix,
                                    pendingVersion.idPrefix,
                                    'bg-blue-500'
                                )}
                            </>
                        ) : (
                            <>
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
                                            setFormData((prev) => ({ ...prev, areaName: e.target.value }));
                                            setUserHasMadeSelections(true);
                                        }}
                                        placeholder={isCreateMode ? 'Enter area name' : ''}
                                        disabled={!canEditDetails}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditDetails
                                                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                {/* ID Prefix */}
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        ID Prefix
                                    </label>
                                    <input
                                        type="text"
                                        name="idPrefix"
                                        value={formData.idPrefix}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                                            setFormData((prev) => ({ ...prev, idPrefix: value }));
                                            setIdPrefixManuallyEdited(true);
                                            setUserHasMadeSelections(true);
                                        }}
                                        placeholder="Auto-generated from area name"
                                        disabled={!canEditDetails}
                                        maxLength={20}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditDetails
                                                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Minimum 3 letters. Auto-generated from area name, but can be edited manually.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Territory Manager */}
                        {showApprovalUI ? (
                            renderFieldWithInlineDiff(
                                'Territory Manager',
                                'territoryManagerName',
                                selectedArea?.territoryManagerName,
                                pendingVersion.territoryManagerName,
                                'bg-blue-500'
                            )
                        ) : (
                            <div className="group">
                                <SelectionField
                                    label="Territory Manager *"
                                    selectedItem={selectedTerritoryManager}
                                    onSelect={() => setShowTerritoryManagerModal(true)}
                                    onClear={handleClearTerritoryManager}
                                    buttonText="Select Territory Manager"
                                    disabled={!canEditDetails}
                                />
                            </div>
                        )}

                        {/* Status field - read-only in edit mode */}
                        {!isCreateMode && selectedArea && (
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                    Status
                                </label>
                                <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm bg-gray-50 text-gray-500">
                                    {getStatusText(selectedArea.status)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Towns Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600 m-0">Towns In Area</h3>
                        </div>

                        {/* Show towns as read-only in approval UI */}
                        {showApprovalUI ? (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    Towns ({(pendingVersion.towns as string[] || selectedArea?.towns || []).length})
                                </h4>
                                {((currentStatus === StatusEnum.NEW_RECORD ? selectedArea?.towns : pendingVersion.towns as string[]) || []).length === 0 ? (
                                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                                        <div className="mb-3 text-4xl">🏘️</div>
                                        <p className="font-medium text-gray-600">No towns added</p>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="divide-y divide-gray-200">
                                            {((currentStatus === StatusEnum.NEW_RECORD ? selectedArea?.towns : pendingVersion.towns as string[]) || []).map((town: string, index: number) => (
                                                <div
                                                    key={index}
                                                    className="px-4 py-3 flex items-center justify-between"
                                                >
                                                    <span className="text-sm font-medium text-gray-900">{town}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
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
                                            disabled={!canEditDetails}
                                            className={`flex-1 px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                                !canEditDetails
                                                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTown}
                                            disabled={
                                                !canEditDetails ||
                                                !newTownInput.trim() ||
                                                towns.includes(newTownInput.trim())
                                            }
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
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Towns ({towns.length})</h4>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="divide-y divide-gray-200">
                                                {towns.map((town, index) => (
                                                    <div
                                                        key={index}
                                                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                                                    >
                                                        <span className="text-sm font-medium text-gray-900">{town}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTown(index)}
                                                            disabled={!canEditDetails}
                                                            className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                            title="Remove town"
                                                        >
                                                            <svg
                                                                className="w-5 h-5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M6 18L18 6M6 6l12 12"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Render logs tab content
    const renderLogsTab = () => {
        if (isCreateMode || !selectedArea) return null;

        return (
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
                {renderActivityLogsTable(selectedArea.activityLogs, 'No activity logs available.')}
            </div>
        );
    };

    const detailsTabLabel = `Area Information - ${getStatusText(currentStatus)}`;

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

                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    type="button"
                                    onClick={() => onTabChange?.('details')}
                                    className={`${getTabClassName(
                                        currentStatus,
                                        activeTab === 'details'
                                    )} px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    {detailsTabLabel}
                                </button>
                                {!isCreateMode && (
                                    <button
                                        type="button"
                                        onClick={() => onTabChange?.('logs')}
                                        className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0 ${
                                            activeTab === 'logs'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-4 sm:p-6 bg-white space-y-6">
                            {activeTab === 'details' && renderDetailsTab()}
                            {!isCreateMode && activeTab === 'logs' && renderLogsTab()}

                            {/* Action Buttons - in Footer */}
                            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                {/* Left side - Delete/Reactivate */}
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
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                        Delete
                                    </button>
                                ) : !isCreateMode &&
                                  isAdminUser &&
                                  selectedArea?.status === StatusEnum.INACTIVE &&
                                  onReactivate ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onReactivate();
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        Reactivate
                                    </button>
                                ) : (
                                    <div className="hidden sm:block" />
                                )}

                                {/* Right side - Save/Approve/Deny/Cancel */}
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                    {/* Save/Create button - only when editable */}
                                    {(isCreateMode || currentStatus === StatusEnum.ACTIVE) && (
                                        <button
                                            type="submit"
                                            disabled={!canEditDetails || isLoading}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            {isCreateMode ? 'Create Area' : 'Save Changes'}
                                        </button>
                                    )}

                                    {/* Approval Buttons - shown when admin user and approval/deletion state (NOT in create mode) */}
                                    {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onDeny}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                                Deny
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onApprove}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                                Approve
                                            </button>
                                        </>
                                    )}

                                    {/* Cancel button */}
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
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
