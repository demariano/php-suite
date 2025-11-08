'use client';

import { AccountsDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import { AccountForm } from '../../../components';

interface AccountFormWrapperProps {
  isCreateMode: boolean;
  selectedAccount: AccountsDto | null;
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  activeTab: 'details' | 'approval' | 'logs';
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (account: AccountsDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export default function AccountFormWrapper({
  isCreateMode,
  selectedAccount,
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
}: AccountFormWrapperProps) {
  const [showChangeReasonRequired, setShowChangeReasonRequired] = useState(false);

  // Handle save - AccountForm handles sub-accounts directly
  const handleSave = (account: AccountsDto) => {
    onSave(account);
  };

  // Clear validation message when switching tabs or when account changes
  useEffect(() => {
    setShowChangeReasonRequired(false);
  }, [selectedAccount, activeTab]);

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
          {isCreateMode ? 'Create Account' : 'Edit Account'}
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
        
        {!isCreateMode && selectedAccount && (
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
        {/* Change Reason Required Message */}
        {showChangeReasonRequired && activeTab === 'details' && (
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
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '14px' }}>
                Change reason is required when making modifications to the account record. Please fill out the Change Reason field below.
              </span>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <AccountForm
            isCreateMode={isCreateMode}
            selectedAccount={selectedAccount}
            successMessage={successMessage}
            onSave={handleSave}
            onDelete={onDelete}
            onCancel={onCancel}
            isAdminUser={isAdminUser}
          />
        )}
        
        {/* Approval Version Tab */}
        {activeTab === 'approval' && !isCreateMode && selectedAccount && (
          <div>
            <div className="mb-5">
              {(selectedAccount.status === StatusEnum.FOR_APPROVAL || selectedAccount.status === StatusEnum.NEW_RECORD) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                  <span className="text-yellow-600 text-base">ℹ️</span>
                  <span className="text-yellow-800 text-sm">
                    These are the proposed changes awaiting approval
                  </span>
                </div>
              )}
              
              {selectedAccount?.forApprovalVersion ? (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)'
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

                  {/* Account Name */}
                  {selectedAccount.forApprovalVersion.accountName !== undefined && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={String(selectedAccount.forApprovalVersion.accountName)}
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
                  
                  {/* Account Type */}
                  {selectedAccount.forApprovalVersion.accountType !== undefined && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Account Type
                      </label>
                      <input
                        type="text"
                        value={String(selectedAccount.forApprovalVersion.accountType)}
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
                  {selectedAccount.forApprovalVersion.status !== undefined && (
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
                        value={String(selectedAccount.forApprovalVersion.status)}
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
                  
                  {/* Change Reason */}
                  {selectedAccount.forApprovalVersion.changeReason !== undefined && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Change Reason
                      </label>
                      <textarea
                        value={String(selectedAccount.forApprovalVersion.changeReason)}
                        readOnly
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: '#f9fafb',
                          color: '#6b7280',
                          fontWeight: '500',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Sub Accounts */}
                  {selectedAccount.forApprovalVersion.subAccounts !== undefined && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Sub Accounts
                      </label>
                      {Array.isArray(selectedAccount.forApprovalVersion.subAccounts) && selectedAccount.forApprovalVersion.subAccounts.length > 0 ? (
                        <div style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                          }}>
                            <thead style={{
                              backgroundColor: '#f9fafb',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              <tr>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  Sub Account Name
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAccount.forApprovalVersion.subAccounts.map((subAccount: string, index: number) => (
                                <tr
                                  key={index}
                                  style={{
                                    borderBottom: index < selectedAccount.forApprovalVersion.subAccounts.length - 1 ? '1px solid #e5e7eb' : 'none',
                                    transition: 'background-color 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                  }}
                                >
                                  <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    color: '#374151',
                                    fontWeight: '500'
                                  }}>
                                    {subAccount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '40px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}>
                          <div style={{
                            fontSize: '48px',
                            marginBottom: '16px'
                          }}>
                            📋
                          </div>
                          <p style={{
                            fontSize: '16px',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '8px'
                          }}>
                            No sub-accounts
                          </p>
                          <p style={{
                            fontSize: '14px',
                            margin: 0
                          }}>
                            No sub-accounts are pending approval.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Other fields that might be in forApprovalVersion */}
                  {Object.entries(selectedAccount.forApprovalVersion).map(([key, value]) => {
                    // Skip the fields we've already handled
                    if (key === 'accountName' || key === 'status' || key === 'accountType' || key === 'changeReason' || key === 'subAccounts') {
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
                <p className="text-gray-500 italic">
                  No pending approval changes
                </p>
              )}
            </div>
            
            <div className="flex justify-between mt-6">
              {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
              {isAdminUser && (selectedAccount?.status === StatusEnum.FOR_APPROVAL || selectedAccount?.status === StatusEnum.NEW_RECORD || selectedAccount?.status === StatusEnum.FOR_DELETION) && (
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
              
              {/* Cancel button - moved to right side */}
              <div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Activity Logs Tab */}
        {activeTab === 'logs' && !isCreateMode && (
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Recent Activity
              </h3>
              {selectedAccount?.activityLogs && selectedAccount.activityLogs.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                  {selectedAccount.activityLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`py-2 ${
                        index < selectedAccount.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

