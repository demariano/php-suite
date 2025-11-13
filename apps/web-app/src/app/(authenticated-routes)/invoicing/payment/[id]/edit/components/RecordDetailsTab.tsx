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
    <div className="space-y-6">
      {/* Payment Details Section */}
      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-blue-600">
            Payment Details
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Customer Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.customerName || ''}
                readOnly
                onClick={() => isCreateMode && !isReadOnly && setShowCustomerModal(true)}
                disabled={!isCreateMode || isReadOnly}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  (!isCreateMode || isReadOnly)
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 pr-4'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 pr-10'
                }`}
                placeholder={(!isCreateMode || isReadOnly) ? "Customer cannot be changed" : "Click to select customer"}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg cursor-pointer text-gray-600 p-1 rounded transition-all duration-200 hover:bg-gray-100 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Payment Date */}
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
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
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Receipt Number *
            </label>
            <input
              type="text"
              value={formData.receiptNo || ''}
              onChange={(e) => onFormDataChange({ receiptNo: e.target.value })}
              placeholder="Enter receipt number"
              disabled={isReadOnly || !isCreateMode}
              className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                (isReadOnly || !isCreateMode)
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                  : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            />
          </div>

          {/* Payment Amount (Read-only) */}
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Payment Amount
            </label>
            <input
              type="text"
              value={formData.paymentAmount ? `$${formData.paymentAmount.toFixed(2)}` : '$0.00'}
              readOnly
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Calculated from payment details
            </p>
          </div>

          {/* Contract Payment Checkbox */}
          <div className="col-span-1 md:col-span-2">
            <label className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={formData.contractPayment || false}
                onChange={(e) => onFormDataChange({ contractPayment: e.target.checked })}
                disabled={isReadOnly}
                className={`w-4 h-4 ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />
              Contract Payment
            </label>
          </div>

          {/* Contract Selection (only if contract payment is enabled) */}
          {formData.contractPayment && (
            <div className="col-span-1 md:col-span-2 group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Contract Name
              </label>
              <div className="relative">
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
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    (!formData.customerId || !formData.contractPayment || !isCreateMode || isReadOnly)
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 pr-4'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 pr-10'
                  }`}
                  placeholder={
                    !formData.customerId 
                      ? "Select customer first" 
                      : !formData.contractPayment 
                        ? "Enable contract payment first" 
                        : (!isCreateMode || isReadOnly) 
                          ? "Contract cannot be changed" 
                          : "Click to select contract"
                  }
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                    title="Clear contract selection"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      </div>

      {/* Change Reason Section - Only show for non-admin users when not in create mode */}
      {!isCreateMode && !isAdminUser && (
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Change Reason
            </h3>
          </div>
          <div className="group">
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              Change Reason and Modification Made
            </label>
            <textarea
              value={formData.changeReason || ''}
              onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
              placeholder="Explain the reason for this change (minimum 10 characters)"
              disabled={isReadOnly}
              rows={3}
              className={`min-h-[80px] w-full resize-vertical rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                isReadOnly
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                  : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            />
            <div className="mt-2 text-xs text-gray-500">
              {formData.changeReason?.length || 0} characters (minimum 10 required when making changes to the payment record)
            </div>
          </div>
        </div>
        </div>
      )}

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
