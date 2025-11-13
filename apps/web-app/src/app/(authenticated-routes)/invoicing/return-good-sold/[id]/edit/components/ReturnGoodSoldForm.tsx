'use client';

import { ReturnGoodSoldDto, StatusEnum, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import ActivityLogsTab from './ActivityLogsTab';
import InvoiceDetailsTab from './InvoiceDetailsTab';
import RecordDetailsTab from './RecordDetailsTab';

interface ReturnGoodSoldFormProps {
  isCreateMode: boolean;
  selectedRecord: ReturnGoodSoldDto | null;
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  activeTab: 'details' | 'approval' | 'logs';
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (record: ReturnGoodSoldDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export default function ReturnGoodSoldForm({
  isCreateMode,
  selectedRecord,
  successMessage,
  isAdminUser,
  isLoading,
  activeTab,
  onTabChange,
  onSave,
  onDelete,
  onApprove,
  onDeny,
  onCancel
}: ReturnGoodSoldFormProps) {
  const [formData, setFormData] = useState<ReturnGoodSoldDto>({
    returnGoodSoldId: '',
    invoiceId: '',
    customerId: '',
    customerName: '',
    invoiceDocno: '',
    rgsDocno: '',
    dateReturned: new Date().toISOString().split('T')[0],
    originalInvoiceDetails: [],
    modifiedInvoiceDetails: [],
    status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
    activityLogs: [],
    forApprovalVersion: {},
    changeReason: ''
  });

  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Initialize form data when selectedRecord changes
  useEffect(() => {
    if (selectedRecord) {
      setFormData({
        ...selectedRecord,
        originalInvoiceDetails: selectedRecord.originalInvoiceDetails || [],
        modifiedInvoiceDetails: selectedRecord.modifiedInvoiceDetails || []
      });
    } else if (isCreateMode) {
      // Reset to default values for create mode
      setFormData({
        returnGoodSoldId: '',
        invoiceId: '',
        customerId: '',
        customerName: '',
        invoiceDocno: '',
        rgsDocno: '',
        dateReturned: new Date().toISOString().split('T')[0],
        originalInvoiceDetails: [],
        modifiedInvoiceDetails: [],
        status: StatusEnum.NEW_RECORD,
        activityLogs: [],
        forApprovalVersion: {},
        changeReason: ''
      });
    }
  }, [selectedRecord, isCreateMode]);

  // Determine if form should be read-only
  const isReadOnly = !isCreateMode && (
    (!isAdminUser && (formData.status === StatusEnum.FOR_APPROVAL || formData.status === StatusEnum.FOR_DELETION)) ||
    (isAdminUser && (formData.status === StatusEnum.FOR_APPROVAL || formData.status === StatusEnum.FOR_DELETION || formData.status === StatusEnum.NEW_RECORD))
  );

  const handleFormDataChange = (updates: Partial<ReturnGoodSoldDto>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSaveClick = () => {
    // Validation
    if (!formData.invoiceId) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please select an invoice first',
        alertType: 'error'
      });
      return;
    }

    if (!formData.rgsDocno || formData.rgsDocno.trim() === '') {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please enter a RGS document number',
        alertType: 'error'
      });
      return;
    }

    if (!formData.dateReturned) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please select a return date',
        alertType: 'error'
      });
      return;
    }

    if (formData.modifiedInvoiceDetails.length === 0) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please add at least one modified invoice detail',
        alertType: 'error'
      });
      return;
    }

    // Rule: Change reason required for non-admin users when editing (not creating)
    if (!isCreateMode && !isAdminUser) {
      if (!formData.changeReason || formData.changeReason.trim() === '') {
        setFlashNotification({
          title: 'Validation Error',
          message: 'Change reason is required when modifying a return good sold record.',
          alertType: 'error'
        });
        return;
      }
      if (formData.changeReason.trim().length < 10) {
        setFlashNotification({
          title: 'Validation Error',
          message: 'Change reason must be at least 10 characters when modifying a return good sold record.',
          alertType: 'error'
        });
        return;
      }
    }

    // Call the save handler
    onSave(formData);
  };

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
    if (!selectedRecord?.forApprovalVersion) return false;
    
    const originalValue = (selectedRecord as any)[fieldName];
    const newValue = (selectedRecord.forApprovalVersion as any)[fieldName];
    
    if (!(fieldName in selectedRecord.forApprovalVersion)) return false;
    
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
  const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
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
            : 'border-gray-200 bg-gray-50 text-gray-500'
        }`}>
          {formatValue(value)}
        </div>
      </div>
    );
  };

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedRecord) return null;
    
    // If status is FOR_DELETION, show deletion message instead of approval version
    if (selectedRecord.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
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
            {selectedRecord.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-700">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedRecord.changeReason}</p>
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
              onClick={onCancel}
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
    if (!selectedRecord.forApprovalVersion) return null;
    
    const approvalVersionData: ReturnGoodSoldDto = {
      ...selectedRecord,
      ...selectedRecord.forApprovalVersion
    };
    
    return (
      <div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
        {/* Change Reason and Modification Made */}
        {selectedRecord?.changeReason && (
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
            <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed whitespace-pre-wrap font-mono leading-relaxed">
              {selectedRecord.changeReason}
            </div>
          </div>
        )}
        
        {/* Use the same components as Details tab but with merged data and read-only */}
        <RecordDetailsTab
          formData={approvalVersionData}
          onFormDataChange={() => {}} // No-op since read-only
          isCreateMode={false}
          isAdminUser={isAdminUser}
          isReadOnly={true}
        />
        <InvoiceDetailsTab
          formData={approvalVersionData}
          onFormDataChange={() => {}} // No-op since read-only
          isCreateMode={false}
          isReadOnly={true}
        />

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && (selectedRecord?.status === StatusEnum.FOR_APPROVAL || selectedRecord?.status === StatusEnum.NEW_RECORD || selectedRecord?.status === StatusEnum.FOR_DELETION) ? (
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
            onClick={onCancel}
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
    if (!selectedRecord) return null;
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="m-0 text-base font-bold text-blue-600">
              Activity Logs
            </h3>
          </div>
          
          {selectedRecord?.activityLogs && selectedRecord.activityLogs.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
              <ul className="divide-y divide-gray-200 text-sm text-gray-700">
                {selectedRecord.activityLogs.map((log, index) => (
                  <li 
                    key={index} 
                    className="px-4 py-3"
                  >
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm italic text-gray-500">
              No activity logs available
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Success message */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
            ✓
          </div>
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div>
          {/* Show read-only warning when record is pending approval */}
          {!isCreateMode && formData.status !== StatusEnum.ACTIVE && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                ⚠
              </div>
              <span className="text-sm font-semibold">
                {formData.status === StatusEnum.FOR_DELETION 
                  ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                  : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
              </span>
            </div>
          )}
          
          <RecordDetailsTab
            formData={formData}
            onFormDataChange={handleFormDataChange}
            isCreateMode={isCreateMode}
            isAdminUser={isAdminUser}
            isReadOnly={isReadOnly}
          />

          <InvoiceDetailsTab
            formData={formData}
            onFormDataChange={handleFormDataChange}
            isCreateMode={isCreateMode}
            isReadOnly={isReadOnly}
          />

          {/* Action Buttons for Details Tab */}
          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {!isCreateMode && formData.status === StatusEnum.ACTIVE ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isLoading || isReadOnly}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isLoading ? 'Processing...' : 'Delete'}
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
            
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {(isCreateMode || formData.status === StatusEnum.ACTIVE) && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={isLoading || isReadOnly}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isLoading ? 'Saving...' : (isCreateMode ? 'Create Record' : 'Save Changes')}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approval' && !isCreateMode && renderApprovalTab()}

      {activeTab === 'logs' && !isCreateMode && renderLogsTab()}
    </>
  );
}
