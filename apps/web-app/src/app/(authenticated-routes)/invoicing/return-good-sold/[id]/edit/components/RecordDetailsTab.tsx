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
    <div className="space-y-6">
      {!isCreateMode && !isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason || ''}
          onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
          disabled={isReadOnly}
        />
      )}

      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600 m-0">
              Basic Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice Selection */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Invoice
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.invoiceDocno || (formData.invoiceId ? 'Loading invoice...' : '')}
                  readOnly
                  onClick={() => isCreateMode && !isReadOnly && setShowInvoiceModal(true)}
                  disabled={!isCreateMode || isReadOnly}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode || isReadOnly
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                      : 'border-gray-200 bg-white text-gray-700 cursor-pointer group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  } ${formData.invoiceId && isCreateMode && !isReadOnly ? 'pr-10' : ''}`}
                  placeholder={(!isCreateMode || isReadOnly) ? "Invoice cannot be changed" : "Click to select invoice"}
                />
                
                {formData.invoiceId && isCreateMode && !isReadOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearInvoice();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 bg-transparent border-none cursor-pointer text-gray-600 hover:text-red-600 transition-colors duration-200 z-10"
                    title="Clear invoice selection"
                  >
                    ×
                  </button>
                )}
              </div>
              {selectedInvoice && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Invoice: {selectedInvoice.docno}</p>
                  <p>Date: {selectedInvoice.invoiceDate}</p>
                  <p>Amount: ₱{selectedInvoice.finalAmount?.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Customer Name (Read-only) */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName || ''}
                readOnly
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 text-gray-500 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed opacity-60"
                placeholder="Customer name (auto-filled from invoice)"
              />
            </div>

            {/* RGS Document Number */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                RGS Doc No
              </label>
              <input
                type="text"
                value={formData.rgsDocno || ''}
                onChange={(e) => onFormDataChange({ rgsDocno: e.target.value })}
                disabled={!isCreateMode || isReadOnly}
                readOnly={!isCreateMode}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  !isCreateMode || isReadOnly
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
                placeholder="Enter RGS document number"
              />
            </div>

            {/* Date Returned */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Date Returned
              </label>
              <DatePicker
                value={formData.dateReturned || ''}
                onChange={(date) => onFormDataChange({ dateReturned: date })}
                placeholder="Select return date"
                disabled={isReadOnly}
              />
            </div>
          </div>
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
