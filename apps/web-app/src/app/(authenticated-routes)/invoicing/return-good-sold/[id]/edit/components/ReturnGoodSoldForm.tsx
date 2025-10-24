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

  // Determine which buttons to show
  const showSaveButton = isCreateMode || (!isReadOnly && formData.status === StatusEnum.ACTIVE);
  const showDeleteButton = !isCreateMode && !isReadOnly && formData.status === StatusEnum.ACTIVE;
  const showApproveButton = !isCreateMode && isAdminUser && (
    formData.status === StatusEnum.FOR_APPROVAL || 
    formData.status === StatusEnum.FOR_DELETION || 
    formData.status === StatusEnum.NEW_RECORD
  );
  const showDenyButton = showApproveButton;

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
          {isCreateMode ? 'Create Return Good Sold' : 'Edit Return Good Sold'}
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
        
        {!isCreateMode && (formData.status === StatusEnum.FOR_APPROVAL || formData.status === StatusEnum.FOR_DELETION || formData.status === StatusEnum.NEW_RECORD) && (
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
            Approval
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
        {activeTab === 'details' && (
          <div>
            {/* Show read-only warning when record is pending approval */}
            {!isCreateMode && formData.status !== StatusEnum.ACTIVE && (
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
                  This return good sold record is pending approval. You can view the original details here, but cannot make changes. 
                  Use the "Approval" tab to see the proposed changes.
                </p>
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
          </div>
        )}

        {activeTab === 'approval' && !isCreateMode && selectedRecord && (() => {
          // Merge original record data with forApprovalVersion changes
          const approvalVersionData: ReturnGoodSoldDto = {
            ...selectedRecord,
            ...selectedRecord.forApprovalVersion
          };
          
          return (
            <div>
              <div style={{ marginBottom: '20px' }}>
                {(selectedRecord.status === StatusEnum.FOR_APPROVAL || selectedRecord.status === StatusEnum.NEW_RECORD) && (
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ color: '#92400e', fontSize: '16px' }}>ℹ️</span>
                    <span style={{ color: '#92400e', fontSize: '14px' }}>
                      These are the proposed changes awaiting approval
                    </span>
                  </div>
                )}

                {/* Change Reason - Highlighted field */}
                {selectedRecord?.changeReason && (
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
                      {selectedRecord.changeReason}
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
              <InvoiceDetailsTab
                formData={approvalVersionData}
                onFormDataChange={() => {}} // No-op since read-only
                isCreateMode={false}
                isReadOnly={true}
              />
            </div>
          );
        })()}

        {activeTab === 'logs' && !isCreateMode && (
          <ActivityLogsTab
            activityLogs={formData.activityLogs || []}
          />
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
                disabled={isLoading || isReadOnly}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (isLoading || isReadOnly) ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isLoading || isReadOnly) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: (isLoading || isReadOnly) ? 0.7 : 1
                }}
                title={isReadOnly ? 'Delete button is disabled - record is read-only' : 'Delete record'}
                onMouseEnter={(e) => {
                  if (!isLoading && !isReadOnly) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && !isReadOnly) {
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
              onClick={handleSaveClick}
              disabled={isLoading || isReadOnly}
              style={{
                padding: '10px 20px',
                backgroundColor: (isLoading || isReadOnly) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isLoading || isReadOnly) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: (isLoading || isReadOnly) ? 0.7 : 1
              }}
              title={isReadOnly ? 'Save button is disabled - record is read-only' : (isCreateMode ? 'Create record' : 'Save changes')}
              onMouseEnter={(e) => {
                if (!isLoading && !isReadOnly) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && !isReadOnly) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isLoading ? 'Saving...' : (isCreateMode ? 'Create Record' : 'Save Changes')}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons for Approval Tab */}
      {activeTab === 'approval' && !isCreateMode && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div>
            {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
            {isAdminUser && (formData.status === StatusEnum.FOR_APPROVAL || formData.status === StatusEnum.NEW_RECORD || formData.status === StatusEnum.FOR_DELETION) && (
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
          </div>
          
          {/* Close button - moved to right side */}
          <div>
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons for Logs Tab */}
      {activeTab === 'logs' && !isCreateMode && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
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
            Close
          </button>
        </div>
      )}
    </div>
  );
}

