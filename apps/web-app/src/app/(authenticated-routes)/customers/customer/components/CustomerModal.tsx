'use client';

import { CustomerDto, StatusEnum } from '@data-access/index';
import { useEffect } from 'react';
import CustomerForm from './CustomerForm';

interface CustomerModalProps {
  show: boolean;
  isCreateMode: boolean;
  selectedCustomer: CustomerDto | null;
  activeTab: 'details' | 'approval' | 'logs';
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (customer: CustomerDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
}

export default function CustomerModal({
  show,
  isCreateMode,
  selectedCustomer,
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
}: CustomerModalProps) {
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
        width: '900px',
        maxWidth: '95vw',
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
            {isCreateMode ? 'Create Customer' : 'Edit Customer'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
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
          
          {!isCreateMode && selectedCustomer && selectedCustomer.status !== StatusEnum.ACTIVE && (
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
            <CustomerForm
              isCreateMode={isCreateMode}
              selectedCustomer={selectedCustomer}
              successMessage={successMessage}
              onSave={onSave}
              onDelete={onDelete}
              onCancel={onClose}
              isAdminUser={isAdminUser}
            />
          )}
          
          {/* Approval Version Tab */}
          {activeTab === 'approval' && !isCreateMode && selectedCustomer && (
            <div>
              <div className="mb-5">
                {(selectedCustomer.status === StatusEnum.FOR_APPROVAL || selectedCustomer.status === StatusEnum.NEW_RECORD) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <span className="text-yellow-600 text-base">ℹ️</span>
                    <span className="text-yellow-800 text-sm">
                      These are the proposed changes awaiting approval
                    </span>
                  </div>
                )}

                {/* Change Reason - Highlighted field */}
                {selectedCustomer?.changeReason && (
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
                      {selectedCustomer.changeReason}
                    </div>
                  </div>
                )}
                
                {selectedCustomer?.forApprovalVersion ? (
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

                    {/* Customer Name */}
                    {selectedCustomer.forApprovalVersion.customerName !== undefined && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px'
                        }}>
                          Customer Name
                        </label>
                        <input
                          type="text"
                          value={String(selectedCustomer.forApprovalVersion.customerName)}
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
                    {selectedCustomer.forApprovalVersion.status !== undefined && (
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
                          value={String(selectedCustomer.forApprovalVersion.status)}
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

                    {/* Customer Terms */}
                    {selectedCustomer.forApprovalVersion.customerTerms && selectedCustomer.forApprovalVersion.customerTerms.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px'
                        }}>
                          Customer Terms
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {selectedCustomer.forApprovalVersion.customerTerms.map((term: any, index: number) => (
                            <div key={index} style={{
                              border: '2px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '16px',
                              backgroundColor: 'white'
                            }}>
                              <h5 style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#1f2937',
                                margin: '0 0 16px 0'
                              }}>
                                {term.termsName || 'Unnamed Terms'}
                              </h5>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '4px'
                                  }}>
                                    Days
                                  </label>
                                  <input
                                    type="number"
                                    value={term.days || 0}
                                    readOnly
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      backgroundColor: '#f9fafb',
                                      color: '#374151'
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customer Deals */}
                    {selectedCustomer.forApprovalVersion.customerDeals && selectedCustomer.forApprovalVersion.customerDeals.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px'
                        }}>
                          Customer Deals
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {selectedCustomer.forApprovalVersion.customerDeals.map((deal: any, index: number) => (
                            <div key={index} style={{
                              border: '2px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '16px',
                              backgroundColor: 'white'
                            }}>
                              <h5 style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#1f2937',
                                margin: '0 0 16px 0'
                              }}>
                                {deal.productDealName || 'Unnamed Deal'}
                              </h5>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '4px'
                                  }}>
                                    Minimum Quantity
                                  </label>
                                  <input
                                    type="number"
                                    value={deal.minQty || 0}
                                    readOnly
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      backgroundColor: '#f9fafb',
                                      color: '#374151'
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '4px'
                                  }}>
                                    Additional Quantity
                                  </label>
                                  <input
                                    type="number"
                                    value={deal.additionalQty || 0}
                                    readOnly
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      backgroundColor: '#f9fafb',
                                      color: '#374151'
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other fields that might be in forApprovalVersion */}
                    {Object.entries(selectedCustomer.forApprovalVersion).map(([key, value]) => {
                      // Skip the fields we've already handled
                      if (key === 'customerName' || key === 'status' || key === 'customerTerms' || key === 'customerDeals') {
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
                {isAdminUser && (selectedCustomer?.status === StatusEnum.FOR_APPROVAL || selectedCustomer?.status === StatusEnum.NEW_RECORD || selectedCustomer?.status === StatusEnum.FOR_DELETION) && (
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
                    onClick={onClose}
                    className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
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
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Recent Activity
                </h3>
                {selectedCustomer?.activityLogs && selectedCustomer.activityLogs.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                    {selectedCustomer.activityLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`py-2 ${
                          index < selectedCustomer.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
                  onClick={onClose}
                  className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
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