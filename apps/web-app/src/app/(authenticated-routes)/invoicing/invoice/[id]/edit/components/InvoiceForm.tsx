'use client';

import { CustomerProductDealDto, InvoiceDetailTypeEnum, InvoiceDto, PrintStatusEnum, StatusEnum, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import InvoiceDetailsTab from './InvoiceDetailsTab';
import RecordDetailsTab from './RecordDetailsTab';

interface InvoiceFormProps {
  isCreateMode: boolean;
  selectedInvoice: InvoiceDto | null;
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  activeTab: 'details' | 'approval' | 'logs';
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (invoice: InvoiceDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export default function InvoiceForm({
  isCreateMode,
  selectedInvoice,
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
}: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceDto>({
    invoiceId: '',
    docno: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    areaId: '',
    areaName: '',
    territoryManagerId: '',
    territoryManagerName: '',
    salesTypeId: '',
    salesTypeName: '',
    finalAmount: 0,
    invoiceAmount: 0,
    taxAmount: 0,
    contractId: '',
    contractName: '',
    termsId: '',
    termsName: '',
    productPriceTypeId: '',
    productPriceTypeName: '',
    status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
    paymentStatus: 'PENDING' as any,
    printStatus: PrintStatusEnum.PENDING,
    invoiceDetails: [],
    activityLogs: [],
    forApprovalVersion: {}
  });

  // State for customer deals
  const [customerDeals, setCustomerDeals] = useState<CustomerProductDealDto[]>([]);
  
  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Initialize form data when selectedInvoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setFormData({
        ...selectedInvoice,
        invoiceDetails: selectedInvoice.invoiceDetails || []
      });
    } else if (isCreateMode) {
      // Reset to default values for create mode
      setFormData({
        invoiceId: '',
        docno: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        customerId: '',
        customerName: '',
        areaId: '',
        areaName: '',
        territoryManagerId: '',
        territoryManagerName: '',
        salesTypeId: '',
        salesTypeName: '',
        finalAmount: 0,
        invoiceAmount: 0,
        taxAmount: 0,
        contractId: '',
        contractName: '',
        termsId: '',
        termsName: '',
        productPriceTypeId: '',
        productPriceTypeName: '',
        status: StatusEnum.NEW_RECORD,
        paymentStatus: 'PENDING' as any,
        printStatus: PrintStatusEnum.PENDING,
        invoiceDetails: [],
        activityLogs: [],
        forApprovalVersion: {}
      });
    }
  }, [selectedInvoice, isCreateMode]);

  // Validation function for invoice data
  const validateInvoice = (invoice: InvoiceDto): string | null => {
    // Rule 1: Document number is required
    if (!invoice.docno || invoice.docno.trim() === '') {
      return 'Document number is required and cannot be empty.';
    }

    // Rule 2: Customer must be selected
    if (!invoice.customerId || invoice.customerId.trim() === '') {
      return 'Please select a customer before saving the invoice.';
    }

    // Rule 3: Invoice details must not be empty
    if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
      return 'Please add at least one item to the invoice.';
    }

    // Rule 4: Invoice details cannot contain all free items
    const hasRegularItem = invoice.invoiceDetails.some(
      detail => detail.invoiceDetailType === InvoiceDetailTypeEnum.REGULAR_ITEM
    );
    if (!hasRegularItem) {
      return 'Invoice must contain at least one regular item (not all free items).';
    }

    // Rule 5: Invoice amount cannot be zero
    if (!invoice.invoiceAmount || invoice.invoiceAmount <= 0) {
      return 'Invoice amount must be greater than zero.';
    }

    // Rule 6: Final amount cannot be zero
    if (!invoice.finalAmount || invoice.finalAmount <= 0) {
      return 'Final amount must be greater than zero.';
    }

    return null; // All validations passed
  };

  const handleSave = () => {
    const validationError = validateInvoice(formData);
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

  const handleFormDataChange = (updatedData: Partial<InvoiceDto>) => {
    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  const handleCustomerDealsChange = (deals: CustomerProductDealDto[]) => {
    setCustomerDeals(deals);
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
          {isCreateMode ? 'Create Invoice' : 'Edit Invoice'}
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
        
        {!isCreateMode && selectedInvoice && selectedInvoice.status !== StatusEnum.ACTIVE && (
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
            <RecordDetailsTab
              formData={formData}
              onFormDataChange={handleFormDataChange}
              isCreateMode={isCreateMode}
              isAdminUser={isAdminUser}
              onCustomerDealsChange={handleCustomerDealsChange}
            />
            <InvoiceDetailsTab
              formData={formData}
              onFormDataChange={handleFormDataChange}
              isCreateMode={isCreateMode}
              customerDeals={customerDeals}
            />
          </div>
        )}
        
        {/* Approval Version Tab */}
        {activeTab === 'approval' && !isCreateMode && selectedInvoice && (
          <div>
            <div className="mb-5">
              {(selectedInvoice.status === StatusEnum.FOR_APPROVAL || selectedInvoice.status === StatusEnum.NEW_RECORD) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                  <span className="text-yellow-600 text-base">ℹ️</span>
                  <span className="text-yellow-800 text-sm">
                    These are the proposed changes awaiting approval
                  </span>
                </div>
              )}

              {/* Change Reason - Highlighted field */}
              {selectedInvoice?.changeReason && (
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
                    {selectedInvoice.changeReason}
                  </div>
                </div>
              )}
              
              {selectedInvoice?.forApprovalVersion ? (
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

                  {/* Display all fields from forApprovalVersion */}
                  {Object.entries(selectedInvoice.forApprovalVersion).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
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
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  No pending approval changes
                </p>
              )}
            </div>
            
            <div className="flex justify-between mt-6">
              {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
              {isAdminUser && (selectedInvoice?.status === StatusEnum.FOR_APPROVAL || selectedInvoice?.status === StatusEnum.NEW_RECORD || selectedInvoice?.status === StatusEnum.FOR_DELETION) && (
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
        )}
        
        {/* Activity Logs Tab */}
        {activeTab === 'logs' && !isCreateMode && (
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Recent Activity
              </h3>
              {selectedInvoice?.activityLogs && selectedInvoice.activityLogs.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                  {selectedInvoice.activityLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`py-2 ${
                        index < selectedInvoice.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
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
              {isLoading ? 'Saving...' : (isCreateMode ? 'Create Invoice' : 'Save Changes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
