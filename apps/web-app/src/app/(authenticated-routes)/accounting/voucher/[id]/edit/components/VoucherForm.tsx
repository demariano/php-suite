'use client';

import { AccountTypeEnum, StatusEnum, VoucherDto, useSessionStore } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useState } from 'react';
import { ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import PaymentDetailsTab from './PaymentDetailsTab';
import RecordDetailsTab from './RecordDetailsTab';
import VoucherDetailsTab from './VoucherDetailsTab';

interface VoucherFormProps {
  isCreateMode: boolean;
  selectedVoucher: VoucherDto | null;
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  activeTab: 'details' | 'approval' | 'logs';
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (voucher: VoucherDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export default function VoucherForm({
  isCreateMode,
  selectedVoucher,
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
}: VoucherFormProps) {
  const [formData, setFormData] = useState<VoucherDto>({
    voucherId: '',
    voucherNo: '',
    voucherDate: new Date().toISOString().split('T')[0],
    voucherAmount: 0,
    activityLogs: [],
    forApprovalVersion: {},
    changeReason: '',
    status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
    remarks: '',
    voucherDetails: [],
    paymentType: 'CASH' as any,
    bankName: '',
    chequeNo: '',
    chequeDate: '',
    totalAmount: 0,
    accountId: '',
    accountName: '',
    accountType: AccountTypeEnum.OTHERS,
    customerId: '',
    customerName: '',
    areaId: '',
    areaName: ''
  });

  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Initialize form data when selectedVoucher changes
  useEffect(() => {
    if (selectedVoucher) {
      setFormData({
        ...selectedVoucher,
        voucherDetails: selectedVoucher.voucherDetails || []
      });
    } else if (isCreateMode) {
      // Reset to default values for create mode
      setFormData({
        voucherId: '',
        voucherNo: '',
        voucherDate: new Date().toISOString().split('T')[0],
        voucherAmount: 0,
        activityLogs: [],
        forApprovalVersion: {},
        changeReason: '',
        status: StatusEnum.NEW_RECORD,
        remarks: '',
        voucherDetails: [],
        paymentType: 'CASH' as any,
        bankName: '',
        chequeNo: '',
        chequeDate: '',
        totalAmount: 0,
        accountId: '',
        accountName: '',
        accountType: AccountTypeEnum.OTHERS,
        customerId: '',
        customerName: '',
        areaId: '',
        areaName: ''
      });
    }
  }, [selectedVoucher, isCreateMode]);

  // Validation function for voucher data
  const validateVoucher = (voucher: VoucherDto): string | null => {
    // Rule 1: Document number is required
    if (!voucher.voucherNo || voucher.voucherNo.trim() === '') {
      return 'Voucher number is required and cannot be empty.';
    }

    // Rule 2: Account must be selected
    if (!voucher.accountId || voucher.accountId.trim() === '') {
      return 'Please select an account before saving the voucher.';
    }

    // Rule 3: Voucher details must not be empty
    if (!voucher.voucherDetails || voucher.voucherDetails.length === 0) {
      return 'Please add at least one voucher detail item.';
    }

    // Rule 4: Total amount cannot be zero
    if (!voucher.totalAmount || voucher.totalAmount <= 0) {
      return 'Total amount must be greater than zero.';
    }

    // Rule 5: Change reason required for non-admin users editing existing vouchers
    if (!isCreateMode && !isAdminUser) {
      if (!voucher.changeReason || voucher.changeReason.trim() === '') {
        return 'Change reason is required when modifying a voucher.';
      }
      if (voucher.changeReason.trim().length < 10) {
        return 'Change reason must be at least 10 characters when modifying a voucher.';
      }
    }

    return null; // All validations passed
  };

  const handleSave = () => {
    const validationError = validateVoucher(formData);
    if (validationError) {
      setFlashNotification({
        title: 'Validation Error',
        message: validationError,
        alertType: 'error',
      });
      return;
    }
    onSave(formData);
  };

  const handleFormDataChange = (updatedData: Partial<VoucherDto>) => {
    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));
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

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
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
          {isCreateMode ? 'Create Voucher' : 'Edit Voucher'}
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
        <div className="flex gap-2 flex-nowrap">
          <button
            onClick={() => onTabChange('details')}
            className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'details'
                ? getTabColorClasses(formData.status || StatusEnum.ACTIVE, true)
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Voucher Information
              {!isCreateMode && selectedVoucher && (
                <>
                  <span className="mx-1">-</span>
                  <span>{getStatusText(formData.status || StatusEnum.ACTIVE)}</span>
                </>
              )}
            </span>
          </button>
          
          {!isCreateMode && selectedVoucher && formData.status !== StatusEnum.ACTIVE && (
            <button
              onClick={() => onTabChange('approval')}
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
          
          {!isCreateMode && (
            <button
              onClick={() => onTabChange('logs')}
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
          )}
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div>
            <RecordDetailsTab
              formData={formData}
              onFormDataChange={handleFormDataChange}
              isCreateMode={isCreateMode}
              isAdminUser={isAdminUser}
              isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
            />
            <VoucherDetailsTab
              formData={formData}
              onFormDataChange={handleFormDataChange}
              isCreateMode={isCreateMode}
              isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
            />
            <PaymentDetailsTab
              formData={formData}
              onFormDataChange={handleFormDataChange}
              isCreateMode={isCreateMode}
              isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
            />
          </div>
        )}
        
        {/* Approval Version Tab */}
        {activeTab === 'approval' && !isCreateMode && selectedVoucher && (() => {
          // Merge original voucher data with forApprovalVersion changes
          const approvalVersionData: VoucherDto = {
            ...selectedVoucher,
            ...selectedVoucher.forApprovalVersion
          };
          
          // Use shared field change detection utility
          const isFieldChanged = createFieldChangeDetector(
            selectedVoucher as Record<string, unknown>,
            selectedVoucher.forApprovalVersion as Record<string, unknown> | undefined
          );
          
          // Helper function to check if arrays have changes
          const hasArrayChanges = (fieldName: string): boolean => {
            if (!selectedVoucher?.forApprovalVersion) return false;
            const originalValue = (selectedVoucher as any)[fieldName];
            const newValue = (selectedVoucher.forApprovalVersion as any)[fieldName];
            
            if (!originalValue && !newValue) return false;
            if (!originalValue || !newValue) return true;
            if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;
            
            // Normalize arrays for comparison (exclude metadata fields)
            const normalizeArray = (arr: any[], idField: string) => {
              return arr.map(item => {
                const normalized: any = {};
                Object.keys(item).forEach(key => {
                  if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
                    normalized[key] = item[key];
                  }
                });
                return normalized;
              }).sort((a, b) => (a[idField] || '').toString().localeCompare((b[idField] || '').toString()));
            };
            
            if (fieldName === 'voucherDetails') {
              const normalizedOriginal = normalizeArray(originalValue, 'subAccount');
              const normalizedNew = normalizeArray(newValue, 'subAccount');
              return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
            }
            
            return JSON.stringify(originalValue) !== JSON.stringify(newValue);
          };
          
          return (
            <div>
              {/* Change Reason - Highlighted field */}
              <div className="mb-5">
                <ChangeReasonReadOnly value={selectedVoucher?.changeReason} />
              </div>
              
              {/* Use the same components as Details tab but with merged data and read-only */}
              <RecordDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isAdminUser={isAdminUser}
                isReadOnly={true}
                isFieldChanged={isFieldChanged}
              />
              <VoucherDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isReadOnly={true}
                selectedVoucher={selectedVoucher}
                hasArrayChanges={hasArrayChanges}
              />
              <PaymentDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isReadOnly={true}
                isFieldChanged={isFieldChanged}
              />
              
              <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                {isAdminUser && (selectedVoucher?.status === StatusEnum.FOR_APPROVAL || selectedVoucher?.status === StatusEnum.NEW_RECORD || selectedVoucher?.status === StatusEnum.FOR_DELETION) ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={onDeny}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                
                {/* Close button */}
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
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
              {renderActivityLogsTable(selectedVoucher?.activityLogs, 'No activity logs available')}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {activeTab !== 'approval' && (
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {!isCreateMode && selectedVoucher?.status === StatusEnum.ACTIVE ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {(isCreateMode || selectedVoucher?.status === StatusEnum.ACTIVE) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isLoading ? 'Saving...' : (isCreateMode ? 'Create Voucher' : 'Save Changes')}
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
      )}
    </div>
  );
}
