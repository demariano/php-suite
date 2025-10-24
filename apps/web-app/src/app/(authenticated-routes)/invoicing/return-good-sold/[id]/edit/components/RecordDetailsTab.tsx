'use client';

import { CustomerDto, InvoiceDto, ReturnGoodSoldDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';
import InvoiceSearchableSelectionModal from '../../../../../search-modals/InvoiceSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: ReturnGoodSoldDto;
  onFormDataChange: (updatedData: Partial<ReturnGoodSoldDto>) => void;
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  
  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerDto) => {
    try {
      // Update form data with customer info
      onFormDataChange({
        customerId: customer.customerId,
        customerName: customer.customerName,
        // Clear invoice selection when customer changes
        invoiceId: '',
        originalInvoiceDetails: [],
        modifiedInvoiceDetails: []
      });

      // Clear selected invoice
      setSelectedInvoice(null);
      
      setFlashNotification({
        title: 'Success',
        message: 'Customer selected. Please select an invoice.',
        alertType: 'info'
      });
    } catch (error) {
      console.error('Error processing customer selection:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to select customer',
        alertType: 'error'
      });
    }
  };

  // Handle invoice selection
  const handleInvoiceSelect = async (invoice: InvoiceDto) => {
    try {
        // Update form data with invoice info and populate customer and original invoice details
        onFormDataChange({
          invoiceId: invoice.invoiceId,
          invoiceDocno: invoice.docno, // Populate invoice document number
          customerId: invoice.customerId, // Auto-populate customer ID
          customerName: invoice.customerName, // Auto-populate customer name
          productPriceTypeId: invoice.productPriceTypeId, // Extract product price type ID
          productPriceTypeName: invoice.productPriceTypeName, // Extract product price type name
          originalInvoiceDetails: invoice.invoiceDetails || [],
          // Clear modified details when selecting a new invoice
          modifiedInvoiceDetails: []
        });

      setSelectedInvoice(invoice);
      
      setFlashNotification({
        title: 'Success',
        message: 'Invoice selected. Customer and original invoice details loaded.',
        alertType: 'success'
      });
    } catch (error) {
      console.error('Error processing invoice selection:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to select invoice',
        alertType: 'error'
      });
    }
  };

  // Clear customer selection
  const handleClearCustomer = () => {
    onFormDataChange({
      customerId: '',
      customerName: '',
      invoiceId: '',
      originalInvoiceDetails: [],
      modifiedInvoiceDetails: []
    });
    setSelectedInvoice(null);
  };

  // Clear invoice selection
  const handleClearInvoice = () => {
    onFormDataChange({
      invoiceId: '',
      originalInvoiceDetails: [],
      modifiedInvoiceDetails: []
    });
    setSelectedInvoice(null);
  };

  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px'
      }}>
        Return Good Sold Details
      </h3>

      {/* Change Reason Field - Only for non-admin users editing existing records */}
      {!isCreateMode && !isAdminUser && !isReadOnly && (
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
              Change Reason *
            </h4>
          </div>
          <textarea
            value={formData.changeReason || ''}
            onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
            placeholder="Please provide a reason for the changes (minimum 10 characters)"
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#92400e',
              lineHeight: '1.5',
              backgroundColor: 'white',
              outline: 'none',
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#d97706';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{
            fontSize: '12px',
            color: '#92400e',
            marginTop: '8px',
            fontStyle: 'italic'
          }}>
            Minimum 10 characters required
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Invoice Selection */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Invoice *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.invoiceDocno || (formData.invoiceId ? 'Loading invoice...' : '')}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowInvoiceModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.invoiceId && isCreateMode && !isReadOnly) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.invoiceId ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Invoice cannot be changed" : "Click to select invoice"}
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
            
            {formData.invoiceId && isCreateMode && !isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearInvoice();
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
                title="Clear invoice selection"
              >
                ×
              </button>
            )}
          </div>
          {selectedInvoice && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <p>Invoice: {selectedInvoice.docno}</p>
              <p>Date: {selectedInvoice.invoiceDate}</p>
              <p>Amount: ₱{selectedInvoice.finalAmount?.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Customer Name (Read-only) */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Customer Name
          </label>
          <input
            type="text"
            value={formData.customerName || ''}
            readOnly
            disabled
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f3f4f6',
              color: formData.customerName ? '#1f2937' : '#6b7280',
              cursor: 'not-allowed',
              opacity: 0.6
            }}
            placeholder="Customer name (auto-filled from invoice)"
          />
        </div>

        {/* RGS Document Number */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            RGS Doc No *
          </label>
          <input
            type="text"
            value={formData.rgsDocno || ''}
            onChange={(e) => onFormDataChange({ rgsDocno: e.target.value })}
            disabled={!isCreateMode || isReadOnly}
            readOnly={!isCreateMode}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : 'white',
              cursor: (!isCreateMode || isReadOnly) ? 'not-allowed' : 'text',
              opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
            }}
            placeholder="Enter RGS document number"
          />
        </div>

        {/* Date Returned */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Date Returned *
          </label>
          <DatePicker
            value={formData.dateReturned || ''}
            onChange={(date) => onFormDataChange({ dateReturned: date })}
            placeholder="Select return date"
            disabled={isReadOnly}
          />
        </div>

      </div>

      {/* Customer Selection Modal */}
      <CustomerSearchableSelectionModal
        show={showCustomerModal}
        title="Select Customer"
        selectedValue={formData.customerId || null}
        onSelect={handleCustomerSelect}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* Invoice Selection Modal */}
      <InvoiceSearchableSelectionModal
        show={showInvoiceModal}
        title="Select Invoice"
        selectedValue={formData.invoiceId || null}
        onSelect={handleInvoiceSelect}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}

