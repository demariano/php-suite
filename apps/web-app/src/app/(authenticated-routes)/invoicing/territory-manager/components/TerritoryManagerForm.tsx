'use client';

import { StatusEnum, TerritoryManagerDto } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';

interface TerritoryManagerFormProps {
    isCreateMode: boolean;
    selectedTerritoryManager: TerritoryManagerDto | null;
    successMessage: string | null;
    onSave: (territoryManager: TerritoryManagerDto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
}

export default function TerritoryManagerForm({
    isCreateMode,
    selectedTerritoryManager,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    isAdminUser = false,
}: TerritoryManagerFormProps) {
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
    const [formData, setFormData] = useState({
        territoryManagerName: '',
        contactNo: '',
        changeReason: '',
    });

    // Set initial values when editing (only when user hasn't made selections)
    useEffect(() => {
        if (!isCreateMode && selectedTerritoryManager && !userHasMadeSelections) {
            setFormData({
                territoryManagerName: selectedTerritoryManager.territoryManagerName || '',
                contactNo: selectedTerritoryManager.contactNo || '',
                changeReason: selectedTerritoryManager.changeReason || '',
            });
        }
    }, [isCreateMode, selectedTerritoryManager, userHasMadeSelections]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const errors: string[] = [];

        if (!formData.territoryManagerName.trim()) {
            errors.push('Territory Manager Name is required.');
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
            const newTerritoryManager = {
                territoryManagerName: formData.territoryManagerName,
                contactNo: formData.contactNo,
                status: StatusEnum.NEW_RECORD,
            } as TerritoryManagerDto;
            onSave(newTerritoryManager);
        } else {
            // Determine status based on user role
            const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;

            const updatedTerritoryManager = {
                ...selectedTerritoryManager,
                territoryManagerName: formData.territoryManagerName,
                contactNo: formData.contactNo,
                status: newStatus,
                changeReason: formData.changeReason.trim() || undefined,
            } as TerritoryManagerDto;
            onSave(updatedTerritoryManager);
        }
    };

    const isFormDisabled = !isCreateMode && selectedTerritoryManager?.status !== StatusEnum.ACTIVE;

    return (
        <form onSubmit={handleSubmit}>
            {/* Success message */}
            {successMessage && (
                <div
                    style={{
                        backgroundColor: '#dcfce7',
                        border: '2px solid #16a34a',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        animation: 'pulse 2s infinite',
                    }}
                >
                    <div
                        style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#16a34a',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                        }}
                    >
                        ✓
                    </div>
                    <span
                        style={{
                            color: '#166534',
                            fontSize: '14px',
                            fontWeight: '600',
                        }}
                    >
                        {successMessage}
                    </span>
                </div>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
                <div
                    style={{
                        backgroundColor: '#fef2f2',
                        border: '2px solid #dc2626',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>Please fix the following errors:</span>
                    </div>
                    <ul
                        style={{
                            margin: 0,
                            paddingLeft: '20px',
                            color: '#dc2626',
                        }}
                    >
                        {validationErrors.map((error, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Change Reason Field - First component when displayed */}
            {!isCreateMode && !isAdminUser && (
                <ChangeReasonField
                    value={formData.changeReason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
                    disabled={selectedTerritoryManager?.status !== StatusEnum.ACTIVE}
                />
            )}

            {!isCreateMode &&
                selectedTerritoryManager &&
                (selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL ||
                    selectedTerritoryManager.status === StatusEnum.NEW_RECORD ||
                    selectedTerritoryManager.status === StatusEnum.FOR_DELETION) && (
                    <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                            ⚠
                        </div>
                        <span className="text-sm font-semibold">
                            {selectedTerritoryManager.status === StatusEnum.FOR_DELETION
                                ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                                : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
                        </span>
                    </div>
                )}

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600 m-0">Territory Manager Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Territory Manager Name
                                </label>
                                <input
                                    type="text"
                                    name="territoryManagerName"
                                    value={formData.territoryManagerName}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, territoryManagerName: e.target.value }));
                                        setUserHasMadeSelections(true);
                                    }}
                                    placeholder={isCreateMode ? 'Enter territory manager name' : ''}
                                    disabled={isFormDisabled}
                                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                        isFormDisabled
                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                            : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                    required
                                />
                            </div>
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Contact Number
                                </label>
                                <input
                                    type="text"
                                    name="contactNo"
                                    value={formData.contactNo}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, contactNo: e.target.value }));
                                        setUserHasMadeSelections(true);
                                    }}
                                    placeholder={isCreateMode ? 'Enter contact number' : ''}
                                    disabled={isFormDisabled}
                                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                        isFormDisabled
                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                            : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {!isCreateMode && selectedTerritoryManager?.status === StatusEnum.ACTIVE ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  selectedTerritoryManager?.status === StatusEnum.INACTIVE &&
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Reactivate
                    </button>
                ) : (
                    <div className="hidden sm:block" />
                )}

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {(isCreateMode || selectedTerritoryManager?.status === StatusEnum.ACTIVE) && (
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isCreateMode ? 'Create Territory Manager' : 'Save Changes'}
                        </button>
                    )}
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
        </form>
    );
}
