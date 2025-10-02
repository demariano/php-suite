'use client';

import { ProductClassDto, StatusEnum } from '@data-access/index';
import { useEffect } from 'react';
import ClassForm from './ClassForm';

interface ClassModalProps {
  show: boolean;
  isCreateMode: boolean;
  selectedClass: ProductClassDto | null;
  activeTab: 'details' | 'approval' | 'logs';
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (productClass: ProductClassDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
}

export default function ClassModal({
  show,
  isCreateMode,
  selectedClass,
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
}: ClassModalProps) {
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
        width: '500px',
        maxWidth: '90vw',
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
            {isCreateMode ? 'Create Class' : 'Edit Class'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        {!isCreateMode && (
          <div style={{
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              gap: '4px'
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
                  boxShadow: activeTab === 'details' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
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
              
              {!isCreateMode && selectedClass && (
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
          </div>
        )}
        
        {/* Tab Content */}
        <div>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <ClassForm
              isCreateMode={isCreateMode}
              selectedClass={selectedClass}
              successMessage={successMessage}
              onSave={onSave}
              onDelete={onDelete}
              onCancel={onClose}
            />
          )}
          
          {/* Approval Version Tab */}
          {activeTab === 'approval' && !isCreateMode && selectedClass && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                {(selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD) && (
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
                    <span style={{ color: '#f59e0b', fontSize: '16px' }}>ℹ️</span>
                    <span style={{ color: '#92400e', fontSize: '14px' }}>
                      These are the proposed changes awaiting approval
                    </span>
                  </div>
                )}
                
                {selectedClass?.forApprovalVersion ? (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px'
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
                        ⏳
                      </div>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        Pending Approval Details
                      </h3>
                    </div>

                    {/* Product Class Name */}
                    {selectedClass.forApprovalVersion.productClassName !== undefined && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px'
                        }}>
                          Class Name
                        </label>
                        <input
                          type="text"
                          value={String(selectedClass.forApprovalVersion.productClassName)}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: '#f9fafb',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Status */}
                    {selectedClass.forApprovalVersion.status !== undefined && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px'
                        }}>
                          Status
                        </label>
                        <input
                          type="text"
                          value={String(selectedClass.forApprovalVersion.status)}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: '#f9fafb',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Other fields that might be in forApprovalVersion */}
                    {Object.entries(selectedClass.forApprovalVersion).map(([key, value]) => {
                      // Skip the fields we've already handled
                      if (key === 'productClassName' || key === 'status') {
                        return null;
                      }
                      
                      return (
                        <div key={key} style={{ marginBottom: '20px' }}>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            {/* Convert camelCase to Title Case */}
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <input
                            type="text"
                            value={String(value)}
                            readOnly
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: '#f9fafb',
                              color: '#6b7280',
                              fontWeight: '500'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                    No pending approval changes
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                {isAdminUser && (selectedClass?.status === StatusEnum.FOR_APPROVAL || selectedClass?.status === StatusEnum.NEW_RECORD || selectedClass?.status === StatusEnum.FOR_DELETION) && (
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
                
                {/* Close button */}
                <div style={{ marginLeft: isAdminUser ? 'auto' : '' }}>
                  <button
                    type="button"
                    onClick={onClose}
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
            </div>
          )}
          
          {/* Activity Logs Tab */}
          {activeTab === 'logs' && !isCreateMode && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '12px'
                }}>
                  Recent Activity
                </h3>
                {selectedClass?.activityLogs && selectedClass.activityLogs.length > 0 ? (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '288px',
                    overflowY: 'auto'
                  }}>
                    {selectedClass.activityLogs.map((log, index) => (
                      <div 
                        key={index} 
                        style={{
                          padding: '8px 0',
                          borderBottom: index < selectedClass.activityLogs!.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                    No activity logs available
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={onClose}
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
        </div>
      </div>
    </div>
  );
}
