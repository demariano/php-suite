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
            Customer Information
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
          {activeTab === 'approval' && !isCreateMode && selectedCustomer && (() => {
            // DEBUG: Log the full customer data structure
            console.log('=== APPROVAL TAB DEBUG ===');
            console.log('selectedCustomer:', selectedCustomer);
            console.log('selectedCustomer.forApprovalVersion:', selectedCustomer.forApprovalVersion);
            console.log('selectedCustomer keys:', Object.keys(selectedCustomer));
            if (selectedCustomer.forApprovalVersion) {
              console.log('forApprovalVersion keys:', Object.keys(selectedCustomer.forApprovalVersion));
            }
            
            // DEBUG: Log specific fields we're checking
            console.log('=== FIELD VALUES DEBUG ===');
            console.log('contactNo - original:', selectedCustomer.contactNo, 'type:', typeof selectedCustomer.contactNo);
            console.log('contactNo - new:', selectedCustomer.forApprovalVersion?.contactNo, 'type:', typeof selectedCustomer.forApprovalVersion?.contactNo);
            console.log('tinNumber - original:', selectedCustomer.tinNumber, 'type:', typeof selectedCustomer.tinNumber);
            console.log('tinNumber - new:', selectedCustomer.forApprovalVersion?.tinNumber, 'type:', typeof selectedCustomer.forApprovalVersion?.tinNumber);
            console.log('customerName - original:', selectedCustomer.customerName, 'type:', typeof selectedCustomer.customerName);
            console.log('customerName - new:', selectedCustomer.forApprovalVersion?.customerName, 'type:', typeof selectedCustomer.forApprovalVersion?.customerName);
            
            // Helper function to normalize values for comparison
            const normalizeValue = (val: any): string => {
              // Handle null and undefined
              if (val === null || val === undefined) return '';
              
              // Handle empty string
              if (val === '') return '';
              
              // Handle strings - trim whitespace
              if (typeof val === 'string') {
                const trimmed = val.trim();
                return trimmed === '' ? '' : trimmed;
              }
              
              // Handle numbers - convert to string
              if (typeof val === 'number') {
                return String(val);
              }
              
              // Handle booleans
              if (typeof val === 'boolean') {
                return String(val);
              }
              
              // Handle arrays and objects - stringify for comparison
              if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
                return JSON.stringify(val);
              }
              
              // Fallback: convert to string and trim
              return String(val).trim();
            };

            // Helper function to check if a field has changed
            const isFieldChanged = (fieldName: string): boolean => {
              if (!selectedCustomer?.forApprovalVersion) return false;
              
              // Get original value from the main customer object
              const originalValue = (selectedCustomer as any)[fieldName];
              // Get new value from forApprovalVersion
              const newValue = (selectedCustomer.forApprovalVersion as any)[fieldName];
              
              // Debug logging (can be removed after testing)
              if (process.env.NODE_ENV === 'development') {
                console.log(`[isFieldChanged] ${fieldName}:`, {
                  original: originalValue,
                  new: newValue,
                  originalType: typeof originalValue,
                  newType: typeof newValue,
                  originalInObject: fieldName in selectedCustomer,
                  newInForApproval: fieldName in selectedCustomer.forApprovalVersion
                });
              }
              
              // If newValue doesn't exist in forApprovalVersion, field hasn't changed
              if (!(fieldName in selectedCustomer.forApprovalVersion)) return false;
              
              // Handle array comparison
              if (Array.isArray(originalValue) && Array.isArray(newValue)) {
                const changed = JSON.stringify(originalValue) !== JSON.stringify(newValue);
                if (process.env.NODE_ENV === 'development' && changed) {
                  console.log(`[isFieldChanged] ${fieldName} ARRAY CHANGED`);
                }
                return changed;
              }
              
              // Normalize and compare
              const normalizedOriginal = normalizeValue(originalValue);
              const normalizedNew = normalizeValue(newValue);
              
              const hasChanged = normalizedOriginal !== normalizedNew;
              
              // Debug logging for comparison result
              if (process.env.NODE_ENV === 'development') {
                if (hasChanged) {
                  console.log(`[isFieldChanged] ${fieldName} CHANGED:`, {
                    normalizedOriginal: `"${normalizedOriginal}"`,
                    normalizedNew: `"${normalizedNew}"`,
                    originalRaw: originalValue,
                    newRaw: newValue
                  });
                } else {
                  console.log(`[isFieldChanged] ${fieldName} NOT CHANGED:`, {
                    normalizedOriginal: `"${normalizedOriginal}"`,
                    normalizedNew: `"${normalizedNew}"`
                  });
                }
              }
              
              return hasChanged;
            };

            // Helper function to check if arrays have changes
            const hasArrayChanges = (fieldName: string): boolean => {
              if (!selectedCustomer?.forApprovalVersion) return false;
              const originalValue = (selectedCustomer as any)[fieldName];
              const newValue = (selectedCustomer.forApprovalVersion as any)[fieldName];
              
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
                }).sort((a, b) => (a[idField] || '').localeCompare(b[idField] || ''));
              };
              
              if (fieldName === 'customerTerms') {
                const normalizedOriginal = normalizeArray(originalValue, 'termsId');
                const normalizedNew = normalizeArray(newValue, 'termsId');
                return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
              } else if (fieldName === 'customerProductDeals') {
                const normalizedOriginal = normalizeArray(originalValue, 'productDealId');
                const normalizedNew = normalizeArray(newValue, 'productDealId');
                return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
              }
              
              return JSON.stringify(originalValue) !== JSON.stringify(newValue);
            };

            return (
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

                  {/* Change Reason and Modification Made - Highlighted field */}
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
                        Change Reason and Modification Made
                      </h4>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#92400e',
                      lineHeight: '1.6',
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
                            border: isFieldChanged('customerName') ? '2px solid #3b82f6' : '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: isFieldChanged('customerName') ? '#eff6ff' : '#f9fafb',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        />
                      </div>
                    )}

                    {/* Email */}
                    {selectedCustomer.forApprovalVersion.email !== undefined && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px'
                        }}>
                          Email
                        </label>
                        <input
                          type="text"
                          value={String(selectedCustomer.forApprovalVersion.email ?? '')}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: isFieldChanged('email') ? '2px solid #3b82f6' : '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: isFieldChanged('email') ? '#eff6ff' : '#f9fafb',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        />
                      </div>
                    )}

                    {/* Contact Number */}
                    {selectedCustomer.forApprovalVersion.contactNo !== undefined && (() => {
                      const contactNoChanged = isFieldChanged('contactNo');
                      console.log('=== CONTACT NUMBER RENDER DEBUG ===');
                      console.log('contactNoChanged result:', contactNoChanged);
                      console.log('Will apply blue border:', contactNoChanged);
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            Contact Number
                          </label>
                          <input
                            type="text"
                            value={String(selectedCustomer.forApprovalVersion.contactNo ?? '')}
                            readOnly
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: contactNoChanged ? '2px solid #3b82f6' : '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: contactNoChanged ? '#eff6ff' : '#f9fafb',
                              color: '#6b7280',
                              fontWeight: '500'
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Contact Person */}
                    {selectedCustomer.forApprovalVersion.contactPerson !== undefined && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '8px'
                        }}>
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={String(selectedCustomer.forApprovalVersion.contactPerson ?? '')}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: isFieldChanged('contactPerson') ? '2px solid #3b82f6' : '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: isFieldChanged('contactPerson') ? '#eff6ff' : '#f9fafb',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        />
                      </div>
                    )}

                    {/* TIN Number */}
                    {selectedCustomer.forApprovalVersion.tinNumber !== undefined && (() => {
                      const tinNumberChanged = isFieldChanged('tinNumber');
                      console.log('=== TIN NUMBER RENDER DEBUG ===');
                      console.log('tinNumberChanged result:', tinNumberChanged);
                      console.log('Will apply blue border:', tinNumberChanged);
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            TIN Number
                          </label>
                          <input
                            type="text"
                            value={String(selectedCustomer.forApprovalVersion.tinNumber ?? '')}
                            readOnly
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: tinNumberChanged ? '2px solid #3b82f6' : '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: tinNumberChanged ? '#eff6ff' : '#f9fafb',
                              color: '#6b7280',
                              fontWeight: '500'
                            }}
                          />
                        </div>
                      );
                    })()}
                    
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
                      <div style={{ 
                        marginBottom: '20px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px',
                          padding: hasArrayChanges('customerTerms') ? '8px 12px' : '0',
                          backgroundColor: hasArrayChanges('customerTerms') ? '#eff6ff' : 'transparent',
                          borderRadius: hasArrayChanges('customerTerms') ? '6px' : '0',
                          border: hasArrayChanges('customerTerms') ? '2px solid #3b82f6' : 'none',
                          display: 'inline-block'
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

                    {/* Product Deals */}
                    {selectedCustomer.forApprovalVersion.customerProductDeals && selectedCustomer.forApprovalVersion.customerProductDeals.length > 0 && (
                      <div style={{ 
                        marginBottom: '20px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px',
                          padding: hasArrayChanges('customerProductDeals') ? '8px 12px' : '0',
                          backgroundColor: hasArrayChanges('customerProductDeals') ? '#eff6ff' : 'transparent',
                          borderRadius: hasArrayChanges('customerProductDeals') ? '6px' : '0',
                          border: hasArrayChanges('customerProductDeals') ? '2px solid #3b82f6' : 'none',
                          display: 'inline-block'
                        }}>
                          Product Deals
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {selectedCustomer.forApprovalVersion.customerProductDeals.map((productDeal: any, index: number) => (
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
                                {productDeal.productName && productDeal.productName !== productDeal.productDealName ? `${productDeal.productName} - ${productDeal.productDealName || 'Unnamed Deal'}` : (productDeal.productDealName || 'Unnamed Deal')}
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
                                    value={productDeal.minQty || 0}
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
                                    value={productDeal.additionalQty || 0}
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
                      if (key === 'customerName' || key === 'status' || key === 'customerTerms' || key === 'customerProductDeals' || 
                          key === 'email' || key === 'contactNo' || key === 'contactPerson' || key === 'tinNumber') {
                        return null;
                      }
                      
                      // Get original and new values
                      const originalValue = (selectedCustomer as any)[key];
                      const newValue = value;
                      
                      // Use the shared normalizeValue function
                      const normalizedOriginal = normalizeValue(originalValue);
                      const normalizedNew = normalizeValue(newValue);
                      
                      // Check if field has changed
                      const fieldChanged = normalizedOriginal !== normalizedNew;
                      
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
                            value={String(value ?? '')}
                            readOnly
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: fieldChanged ? '2px solid #3b82f6' : '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: fieldChanged ? '#eff6ff' : '#f9fafb',
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
                {isAdminUser && (selectedCustomer?.status === StatusEnum.FOR_APPROVAL || selectedCustomer?.status === StatusEnum.NEW_RECORD || selectedCustomer?.status === StatusEnum.FOR_DELETION) ? (
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
                ) : (
                  <div></div>
                )}
                
                {/* Close button - always visible on the right */}
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
            );
          })()}
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