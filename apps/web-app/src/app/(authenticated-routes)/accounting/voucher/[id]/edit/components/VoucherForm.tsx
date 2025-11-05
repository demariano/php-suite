'use client';

import { AccountTypeEnum, StatusEnum, VoucherDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
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
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px 8px 0 0',
        padding: '4px'
      }}>
        <button
          onClick={() => onTabChange('details')}
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
          title={(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE) ? 'View original voucher details (read-only)' : 'View and edit voucher details'}
          onMouseEnter={(e) => {
            if (activeTab !== 'details') {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#374151';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'details') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }
          }}
        >
          Details
        </button>
        
        {!isCreateMode && selectedVoucher && selectedVoucher.status !== StatusEnum.ACTIVE && (
          <button
            onClick={() => onTabChange('approval')}
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
            onMouseEnter={(e) => {
              if (activeTab !== 'approval') {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'approval') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Approval Version
          </button>
        )}
        
        {!isCreateMode && (
          <button
            onClick={() => onTabChange('logs')}
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
            onMouseEnter={(e) => {
              if (activeTab !== 'logs') {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'logs') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            Activity Logs
          </button>
        )}
      </div>
      
      {/* Tab Content */}
      <div>
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div>
            {/* Show read-only warning when voucher is pending approval */}
            {!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px 0 rgba(245, 158, 11, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#f59e0b',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    🔒
                  </div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#92400e',
                    margin: 0
                  }}>
                    Read-Only Mode
                  </h4>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#92400e',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  This voucher is pending approval. You can view the original details here, but cannot make changes. 
                  Use the "Approval Version" tab to see the proposed changes.
                </p>
              </div>
            )}
            
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
          
          return (
            <div>
              <div className="mb-5">
                {(selectedVoucher.status === StatusEnum.FOR_APPROVAL || selectedVoucher.status === StatusEnum.NEW_RECORD) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <span className="text-yellow-600 text-base">ℹ️</span>
                    <span className="text-yellow-800 text-sm">
                      These are the proposed changes awaiting approval
                    </span>
                  </div>
                )}

                {/* Change Reason - Highlighted field */}
                {selectedVoucher?.changeReason && (
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px 0 rgba(245, 158, 11, 0.1)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#f59e0b',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        📝
                      </div>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#92400e',
                        margin: 0
                      }}>
                        Change Reason
                      </h4>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#92400e',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedVoucher.changeReason}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Use the same components as Details tab but with merged data and read-only */}
              <RecordDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isAdminUser={isAdminUser}
                isReadOnly={true}
              />
              <VoucherDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isReadOnly={true}
              />
              <PaymentDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isReadOnly={true}
              />
              
              <div className="flex justify-between mt-6">
                {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                {isAdminUser && (selectedVoucher?.status === StatusEnum.FOR_APPROVAL || selectedVoucher?.status === StatusEnum.NEW_RECORD || selectedVoucher?.status === StatusEnum.FOR_DELETION) && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={onDeny}
                      disabled={isLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }
                      }}
                    >
                      {isLoading ? 'Processing...' : 'Deny Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={onApprove}
                      disabled={isLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                        }
                      }}
                    >
                      {isLoading ? 'Processing...' : 'Approve Changes'}
                    </button>
                  </div>
                )}
                
                {/* Close button - moved to right side */}
                <div>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
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
              {selectedVoucher?.activityLogs && selectedVoucher.activityLogs.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                  {selectedVoucher.activityLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`py-2 ${
                        index < selectedVoucher.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
                onClick={onCancel}
                className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons for Details Tab */}
      {activeTab === 'details' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div>
            {!isCreateMode && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? 0.7 : 1
                }}
                title={(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE) ? 'Delete button is disabled - voucher is pending approval' : 'Delete voucher'}
                onMouseEnter={(e) => {
                  if (!isLoading && !(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && !(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {isLoading ? 'Processing...' : 'Delete'}
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)}
              style={{
                padding: '10px 20px',
                backgroundColor: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: (isLoading || (!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) ? 0.7 : 1
              }}
              title={(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE) ? 'Save button is disabled - voucher is pending approval' : (isCreateMode ? 'Create voucher' : 'Save changes')}
              onMouseEnter={(e) => {
                if (!isLoading && !(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && !(!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE)) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isLoading ? 'Saving...' : (isCreateMode ? 'Create Voucher' : 'Save Changes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
