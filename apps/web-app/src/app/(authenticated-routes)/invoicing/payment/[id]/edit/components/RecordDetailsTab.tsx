'use client';

import { CollectionReceiptRangeApi, ContractApi, ContractDto, CustomerDto, PaymentDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import { ChangeReasonField } from '../../../../../components/ChangeReasonField';
import ContractSearchableSelectionModal from '../../../../../search-modals/ContractSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: PaymentDto;
  onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  isReadOnly?: boolean;
  onReceiptNumberError?: (error: string | null) => void;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  isReadOnly = false,
  onReceiptNumberError
}: RecordDetailsTabProps) {
  // State management for modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  // State for receipt number fetching
  const [isFetchingReceiptNumber, setIsFetchingReceiptNumber] = useState(false);
  const [receiptNumberError, setReceiptNumberError] = useState<string | null>(null);
  
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

      // Clear previous receipt number error
      setReceiptNumberError(null);
      onReceiptNumberError?.(null);

      // Auto-populate receipt number if customer has areaId and we're in create mode
      if (isCreateMode && customer.areaId && !formData.receiptNo) {
        setIsFetchingReceiptNumber(true);
        try {
          const nextReceiptNumber = await CollectionReceiptRangeApi.getNextAvailableReceiptNumber(customer.areaId);
          onFormDataChange({
            receiptNo: nextReceiptNumber.toString()
          });
          setReceiptNumberError(null);
          onReceiptNumberError?.(null);
        } catch (error: any) {
          console.error('Error fetching next receipt number:', error);
          const errorMessage = error?.response?.data?.message || error?.message || 'Unable to fetch receipt number. Please contact an administrator.';
          
          // Set error state
          setReceiptNumberError(errorMessage);
          onReceiptNumberError?.(errorMessage);
          
          // Clear receipt number
          onFormDataChange({
            receiptNo: ''
          });

          // Show notification
          setFlashNotification({
            title: 'Receipt Number Unavailable',
            message: errorMessage,
            alertType: 'error'
          });
        } finally {
          setIsFetchingReceiptNumber(false);
        }
      } else if (isCreateMode && !customer.areaId) {
        // Customer has no areaId - allow manual entry
        setReceiptNumberError(null);
        onReceiptNumberError?.(null);
      }
    } catch (error) {
      console.error('Error processing customer selection:', error);
    }
  };

  // Handle contract selection
  const handleContractSelect = async (contract: ContractDto) => {
    // Fetch full contract details to get contractType
    try {
      const fullContract = await ContractApi.getContractById(contract.contractId);
      onFormDataChange({
        contractId: contract.contractId,
        contractName: contract.contractName,
        contractNo: contract.contractNo
        // Note: contractType is not stored in PaymentDto, but will be fetched in PaymentInvoiceDetailsTab
        // This fetch ensures we have the latest contract data
      });
    } catch (error) {
      console.error('Error fetching contract details:', error);
      // Still update with basic contract info even if fetch fails
      onFormDataChange({
        contractId: contract.contractId,
        contractName: contract.contractName,
        contractNo: contract.contractNo
      });
    }
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
                      customerName: '',
                      receiptNo: '' // Clear receipt number when customer is cleared
                    });
                    // Clear receipt number error
                    setReceiptNumberError(null);
                    onReceiptNumberError?.(null);
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
            <div className="relative">
              <input
                type="text"
                value={formData.receiptNo || ''}
                onChange={(e) => {
                  onFormDataChange({ receiptNo: e.target.value });
                  // Clear error when user manually enters receipt number
                  if (e.target.value && receiptNumberError) {
                    setReceiptNumberError(null);
                    onReceiptNumberError?.(null);
                  }
                }}
                placeholder={isFetchingReceiptNumber ? "Fetching receipt number..." : "Enter receipt number"}
                disabled={isReadOnly || !isCreateMode || receiptNumberError !== null}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  (isReadOnly || !isCreateMode || receiptNumberError !== null)
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                    : receiptNumberError
                      ? 'border-red-300 bg-red-50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              />
              {isFetchingReceiptNumber && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            {receiptNumberError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
                <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 m-0">{receiptNumberError}</p>
              </div>
            )}
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
