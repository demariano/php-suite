'use client';

import { ContractDto, CustomerDto, PaymentDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import ContractSearchableSelectionModal from '../../../../../search-modals/ContractSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: PaymentDto;
  onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  isReadOnly?: boolean;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  isReadOnly = false
}: RecordDetailsTabProps) {
  // State management for modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerDto) => {
    try {
      // Update form data with customer info
      onFormDataChange({
        customerId: customer.customerId,
        customerName: customer.customerName
      });

      // Clear contract selection when customer changes
      onFormDataChange({
        contractId: '',
        contractName: '',
        contractNo: ''
      });
    } catch (error) {
      console.error('Error processing customer selection:', error);
    }
  };

  // Handle contract selection
  const handleContractSelect = (contract: ContractDto) => {
    onFormDataChange({
      contractId: contract.contractId,
      contractName: contract.contractName,
      contractNo: contract.contractNo
    });
  };


  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px',
        margin: '0 0 16px 0'
      }}>
        Payment Details
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Customer Selection */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Customer Name *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.customerName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowCustomerModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.customerName && isCreateMode && !isReadOnly) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.customerName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Customer cannot be changed" : "Click to select customer"}
              onMouseEnter={(e) => {
                if (isCreateMode && !isReadOnly) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.customerName && isCreateMode && !isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFormDataChange({
                    customerId: '',
                    customerName: ''
                  });
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Payment Date */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            Payment Date *
          </label>
          <DatePicker
            value={formData.paymentDate || ''}
            onChange={(date) => onFormDataChange({ paymentDate: date })}
            disabled={isReadOnly}
            placeholder="Select payment date"
          />
        </div>

        {/* Receipt Number */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            Receipt Number *
          </label>
          <input
            type="text"
            value={formData.receiptNo || ''}
            onChange={(e) => onFormDataChange({ receiptNo: e.target.value })}
            placeholder="Enter receipt number"
            disabled={isReadOnly || !isCreateMode}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: (isReadOnly || !isCreateMode) ? '#f9fafb' : 'white',
              color: (isReadOnly || !isCreateMode) ? '#6b7280' : '#1f2937'
            }}
          />
        </div>

        {/* Payment Amount (Read-only) */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            Payment Amount
          </label>
          <input
            type="text"
            value={formData.paymentAmount ? `$${formData.paymentAmount.toFixed(2)}` : '$0.00'}
            readOnly
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280'
            }}
          />
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            margin: '4px 0 0 0'
          }}>
            Calculated from payment details
          </p>
        </div>

        {/* Contract Payment Checkbox */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            cursor: isReadOnly ? 'default' : 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.contractPayment || false}
              onChange={(e) => onFormDataChange({ contractPayment: e.target.checked })}
              disabled={isReadOnly}
              style={{
                width: '16px',
                height: '16px',
                cursor: isReadOnly ? 'not-allowed' : 'pointer'
              }}
            />
            Contract Payment
          </label>
        </div>

        {/* Contract Selection (only if contract payment is enabled) */}
        {formData.contractPayment && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Contract Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={formData.contractName || ''}
                readOnly
                onClick={() => {
                  const isEnabled = formData.customerId && formData.contractPayment && isCreateMode && !isReadOnly;
                  if (isEnabled) {
                    setShowContractModal(true);
                  }
                }}
                disabled={!formData.customerId || !formData.contractPayment || !isCreateMode || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: (formData.contractName && formData.customerId && formData.contractPayment && isCreateMode && !isReadOnly) ? '40px' : '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: (!formData.customerId || !formData.contractPayment || !isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                  color: formData.contractName ? '#1f2937' : '#6b7280',
                  cursor: (formData.customerId && formData.contractPayment && isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  opacity: (!formData.customerId || !formData.contractPayment || !isCreateMode || isReadOnly) ? 0.6 : 1
                }}
                placeholder={
                  !formData.customerId 
                    ? "Select customer first" 
                    : !formData.contractPayment 
                      ? "Enable contract payment first" 
                      : (!isCreateMode || isReadOnly) 
                        ? "Contract cannot be changed" 
                        : "Click to select contract"
                }
                onMouseEnter={(e) => {
                  if (formData.customerId && formData.contractPayment && isCreateMode && !isReadOnly) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              
              {formData.contractName && formData.customerId && formData.contractPayment && isCreateMode && !isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormDataChange({
                      contractId: '',
                      contractName: '',
                      contractNo: ''
                    });
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="Clear contract selection"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Change Reason (only for non-admin users editing existing payments) */}
        {!isCreateMode && !isAdminUser && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Change Reason *
            </label>
            <textarea
              value={formData.changeReason || ''}
              onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
              placeholder="Explain the reason for this change (minimum 10 characters)"
              disabled={isReadOnly}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: isReadOnly ? '#f9fafb' : 'white',
                color: isReadOnly ? '#6b7280' : '#1f2937',
                resize: 'vertical'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '4px 0 0 0'
            }}>
              {formData.changeReason?.length || 0} characters (minimum 10 required)
            </p>
          </div>
        )}
      </div>

      {/* Customer Selection Modal */}
      <CustomerSearchableSelectionModal
        show={showCustomerModal}
        title="Select Customer"
        selectedValue={formData.customerId || null}
        onSelect={handleCustomerSelect}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* Contract Selection Modal */}
      <ContractSearchableSelectionModal
        show={showContractModal}
        title="Select Contract"
        selectedValue={formData.contractId || null}
        customerId={formData.customerId}
        onSelect={handleContractSelect}
        onClose={() => setShowContractModal(false)}
      />
    </div>
  );
}
