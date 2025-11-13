'use client';

import { ContractDto, CustomerDto, DeliveryStatusEnum, PaymentStatusEnum, ProductDealDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import DatePicker from '../../../components/DatePicker';
import SelectionField from '../../../customers/customer/components/SelectionField';
import CustomerSearchableSelectionModal from '../../../search-modals/CustomerSearchableSelectionModal';
import ProductDealSearchableSelectionModal from '../../../search-modals/ProductDealSearchableSelectionModal';

interface ContractFormProps {
  isCreateMode: boolean;
  selectedContract: ContractDto | null;
  successMessage: string | null;
  onSave: (contract: ContractDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  activeTab?: 'details' | 'approval';
}

export default function ContractForm({
  isCreateMode,
  selectedContract,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  activeTab = 'details'
}: ContractFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null);
  const [selectedProductDeal, setSelectedProductDeal] = useState<{id: string, name: string} | null>(null);
  const [productDealQty, setProductDealQty] = useState<{minQty?: number, additionalQty?: number} | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductDealModal, setShowProductDealModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTypingAmount, setIsTypingAmount] = useState(false);
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    contractNo: '',
    contractName: '',
    startDate: '',
    endDate: '',
    contractAmount: '',
    deliveryStatus: 'PENDING',
    paymentStatus: 'PENDING',
    deliveredAmount: '0',
    amountPaid: '0',
    invoicedAmount: '0',
    changeReason: ''
  });

  // Set initial values when editing (only when user hasn't made selections)
  useEffect(() => {
    if (!isCreateMode && selectedContract && !userHasMadeSelections) {
      // Use forApprovalVersion data when in approval tab, otherwise use regular contract data
      const contractData = activeTab === 'approval' && selectedContract.forApprovalVersion 
        ? {
            ...selectedContract,
            ...selectedContract.forApprovalVersion
          } as ContractDto
        : selectedContract;

      if (contractData.customerId && contractData.customerName) {
        setSelectedCustomer({
          id: contractData.customerId,
          name: contractData.customerName
        });
      }
      if (contractData.productDealId && contractData.productDealName) {
        setSelectedProductDeal({
          id: contractData.productDealId,
          name: contractData.productDealName
        });
      }
      if (contractData.productDealQty) {
        setProductDealQty({
          minQty: contractData.productDealQty.minQty ?? 0,
          additionalQty: contractData.productDealQty.additionalQty ?? 0
        });
      }
       // Initialize form data
       setFormData({
         contractNo: contractData.contractNo || '',
         contractName: contractData.contractName || '',
         startDate: contractData.startDate || '',
         endDate: contractData.endDate || '',
         contractAmount: contractData.contractAmount?.toString() || '',
         deliveryStatus: contractData.deliveryStatus || 'PENDING',
         paymentStatus: contractData.paymentStatus || 'PENDING',
         deliveredAmount: contractData.deliveredAmount?.toString() || '0',
         amountPaid: contractData.amountPaid?.toString() || '0',
         invoicedAmount: (contractData as { invoicedAmount?: number }).invoicedAmount?.toString() || '0',
         changeReason: contractData.changeReason || ''
       });
    }
  }, [isCreateMode, selectedContract, userHasMadeSelections, activeTab]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!selectedCustomer) {
      errors.push('Please select a customer.');
    }
    
    if (!selectedProductDeal) {
      errors.push('Please select a product deal.');
    }
    
    if (!formData.contractNo.trim()) {
      errors.push('Contract number is required.');
    }
    
    if (!formData.contractName.trim()) {
      errors.push('Contract name is required.');
    }
    
    if (!formData.startDate) {
      errors.push('Start date is required.');
    }
    
    if (!formData.endDate) {
      errors.push('End date is required.');
    }
    
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      errors.push('Start date must be before or equal to end date.');
    }
    
    // Validate change reason for non-admin users when not in create mode
    if (!isCreateMode && !isAdminUser && !formData.changeReason.trim()) {
      errors.push('Change reason is required.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
     // Clear validation errors if validation passes
     setValidationErrors([]);
     
     if (isCreateMode) {
       const newContract = {
         contractId: '', // Will be generated by backend
         contractNo: formData.contractNo,
         contractName: formData.contractName,
         customerId: selectedCustomer?.id || '',
         customerName: selectedCustomer?.name || '',
         startDate: formData.startDate,
         endDate: formData.endDate,
         contractAmount: parseFloat(removeCommas(formData.contractAmount)) || 0,
        productDealId: selectedProductDeal?.id || '',
        productDealName: selectedProductDeal?.name || '',
        productDealQty: selectedProductDeal ? {
          minQty: productDealQty?.minQty ?? 0,
          additionalQty: productDealQty?.additionalQty ?? 0
        } : undefined,
         deliveryStatus: formData.deliveryStatus as DeliveryStatusEnum,
         paymentStatus: formData.paymentStatus as PaymentStatusEnum,
         deliveredAmount: parseFloat(formData.deliveredAmount) || 0,
         amountPaid: parseFloat(formData.amountPaid) || 0,
         invoicedAmount: parseFloat(formData.invoicedAmount) || 0,
         status: StatusEnum.ACTIVE // Default status for new contracts
      };
      onSave(newContract as ContractDto);
    } else {
       const updatedContract = {
         ...selectedContract,
         contractNo: formData.contractNo,
         customerId: selectedCustomer?.id || '',
         customerName: selectedCustomer?.name || '',
         contractName: formData.contractName,
         startDate: formData.startDate,
         endDate: formData.endDate,
         contractAmount: parseFloat(removeCommas(formData.contractAmount)) || 0,
        productDealId: selectedProductDeal?.id || '',
        productDealName: selectedProductDeal?.name || '',
        productDealQty: selectedProductDeal ? {
          minQty: productDealQty?.minQty ?? 0,
          additionalQty: productDealQty?.additionalQty ?? 0
        } : undefined,
         deliveryStatus: formData.deliveryStatus as DeliveryStatusEnum,
         paymentStatus: formData.paymentStatus as PaymentStatusEnum,
         deliveredAmount: parseFloat(formData.deliveredAmount) || 0,
         amountPaid: parseFloat(formData.amountPaid) || 0,
         invoicedAmount: parseFloat(formData.invoicedAmount) || 0,
         changeReason: formData.changeReason,
         status: StatusEnum.ACTIVE
      };
      onSave(updatedContract as ContractDto);
    }
  };

  const handleCustomerSelect = (customer: CustomerDto) => {
    setSelectedCustomer({ id: customer.customerId || '', name: customer.customerName || '' });
    setUserHasMadeSelections(true);
  };

  const handleProductDealSelect = (productDeal: ProductDealDto) => {
    setSelectedProductDeal({ id: productDeal.productDealId || '', name: productDeal.productDealName || '' });
    setProductDealQty({
      minQty: productDeal.minQty ?? 0,
      additionalQty: productDeal.additionalQty ?? 0
    });
    setUserHasMadeSelections(true);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
  };

  const handleClearProductDeal = () => {
    setSelectedProductDeal(null);
    setProductDealQty(null);
  };

  // Number formatting utilities
  const formatNumberWithCommas = (value: string | number): string => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  const handleContractAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    // Only allow numbers and decimal point
    const numericValue = rawValue.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    setIsTypingAmount(true);
    setFormData(prev => ({ ...prev, contractAmount: cleanValue }));
  };

  // Auto-format when user stops typing (using timeout)
  useEffect(() => {
    if (formData.contractAmount && isTypingAmount) {
      const timer = setTimeout(() => {
        const numericValue = parseFloat(formData.contractAmount);
        if (!isNaN(numericValue)) {
          const formatted = formatNumberWithCommas(numericValue);
          setFormData(prev => ({ ...prev, contractAmount: formatted }));
          setIsTypingAmount(false);
        }
      }, 500); // Format after 0.5 seconds of no typing

      return () => clearTimeout(timer);
    }
  }, [formData.contractAmount, isTypingAmount]);

  const handleContractAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    if (rawValue) {
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        const formatted = formatNumberWithCommas(numericValue);
        setFormData(prev => ({ ...prev, contractAmount: formatted }));
      }
    }
    setIsTypingAmount(false);
  };

  // Get the display value for the input
  const getContractAmountDisplayValue = () => {
    return formData.contractAmount;
  };

  const handleContractAmountFocus = () => {
    if (formData.contractAmount) {
      const raw = removeCommas(formData.contractAmount);
      setFormData(prev => ({ ...prev, contractAmount: raw }));
    }
    setIsTypingAmount(true);
  };

  // Helper to determine if fields should be disabled
  const isFieldDisabled = (fieldName?: string) => {
    if (activeTab === 'approval') return true;
    if (!isCreateMode && selectedContract?.status && selectedContract.status !== StatusEnum.ACTIVE) return true;
    
    // Disable immutable fields in edit mode (details tab only)
    if (!isCreateMode && activeTab === 'details' && 
        (fieldName === 'contractNo' || fieldName === 'customer' || fieldName === 'productDeal')) {
      return true;
    }
    
    return false;
  };


  return (
    <>
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
            ✓
          </div>
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <span className="text-base">⚠️</span>
            <span>Please fix the following errors:</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pending approval or deletion warning - hide on approval tab since changeReason is already shown */}
      {!isCreateMode && selectedContract && activeTab !== 'approval' &&
       (selectedContract.status === StatusEnum.FOR_APPROVAL || selectedContract.status === StatusEnum.NEW_RECORD || selectedContract.status === StatusEnum.FOR_DELETION) && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
            ⚠
          </div>
          <span className="text-sm font-semibold">
            {selectedContract.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Record Fields Container */}
      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Basic Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contract Number */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Contract Number
                </label>
                <input
                  type="text"
                  name="contractNo"
                  value={formData.contractNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractNo: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter contract number' : ''}
                  disabled={isFieldDisabled('contractNo')}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled('contractNo')
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  required
                />
              </div>

              {/* Contract Name */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Contract Name
                </label>
                <input
                  type="text"
                  name="contractName"
                  value={formData.contractName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractName: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter contract name' : ''}
                  disabled={isFieldDisabled()}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled()
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  required
                />
              </div>

              {/* Customer */}
              <div className="group">
                <SelectionField
                  label="Customer"
                  selectedItem={selectedCustomer}
                  onSelect={() => setShowCustomerModal(true)}
                  onClear={handleClearCustomer}
                  buttonText="Select Customer"
                  disabled={isFieldDisabled('customer')}
                />
              </div>

              {/* Contract Amount */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Contract Amount
                </label>
                <input
                  type="text"
                  name="contractAmount"
                  value={getContractAmountDisplayValue()}
                  onChange={handleContractAmountChange}
                  onFocus={handleContractAmountFocus}
                  onBlur={handleContractAmountBlur}
                  placeholder={isCreateMode ? 'Enter contract amount' : ''}
                  disabled={isFieldDisabled()}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled()
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Start Date and End Date - Full width row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Start Date
                </label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                  placeholder="Select start date"
                  disabled={isFieldDisabled()}
                  maxDate={formData.endDate || undefined}
                  required
                />
              </div>
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  End Date
                </label>
                <DatePicker
                  value={formData.endDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                  placeholder="Select end date"
                  disabled={isFieldDisabled()}
                  minDate={formData.startDate || undefined}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Deal Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Product Deal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Deal */}
              <div className="group">
                <SelectionField
                  label="Product Deal"
                  selectedItem={selectedProductDeal}
                  onSelect={() => setShowProductDealModal(true)}
                  onClear={handleClearProductDeal}
                  buttonText="Select Product Deal"
                  disabled={isFieldDisabled('productDeal')}
                />
              </div>

              {/* Empty div for grid alignment */}
              <div></div>
            </div>

            {/* Product Deal Quantity Fields - Only show when productDealQty is available */}
            {productDealQty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Minimum Quantity
                  </label>
                  <input
                    type="text"
                    value={productDealQty.minQty?.toString() || '0'}
                    readOnly
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Additional Quantity
                  </label>
                  <input
                    type="text"
                    value={productDealQty.additionalQty?.toString() || '0'}
                    readOnly
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Status Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Status */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Payment Status
                </label>
                <input
                  type="text"
                  value={formData.paymentStatus}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
              {/* Amount Paid */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Amount Paid
                </label>
                <input
                  type="text"
                  value={formatNumberWithCommas(formData.amountPaid)}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
              {/* Delivery Status */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Delivery Status
                </label>
                <input
                  type="text"
                  value={formData.deliveryStatus}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
              {/* Delivered Amount */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Delivered Amount
                </label>
                <input
                  type="text"
                  value={formatNumberWithCommas(formData.deliveredAmount)}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
              {/* Invoiced Amount */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Invoiced Amount
                </label>
                <input
                  type="text"
                  value={formatNumberWithCommas(formData.invoicedAmount)}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {!isCreateMode && !isAdminUser && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600">
                  Change Reason
                </h3>
              </div>
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Change Reason and Modification Made
                </label>
                <textarea
                  name="changeReason"
                  value={formData.changeReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                  placeholder="Please explain the reason for this change..."
                  rows={3}
                  disabled={isFieldDisabled()}
                  className={`min-h-[80px] w-full resize-vertical rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled()
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  required={!isAdminUser}
                />
                <div className="mt-2 text-xs text-gray-500">
                  This field is required when making changes to the contract record.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Hide all buttons on approval tab - let modal handle buttons */}
        {activeTab === 'approval' ? (
          <div className="hidden sm:block" />
        ) : (
          <>
            {!isCreateMode && selectedContract?.status === StatusEnum.ACTIVE ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
            
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {(isCreateMode || selectedContract?.status === StatusEnum.ACTIVE) && (
                <button
                  type="submit"
                  disabled={isFieldDisabled()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isCreateMode ? 'Create Contract' : 'Save Changes'}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </form>

    {/* Customer Selection Modal */}
    <CustomerSearchableSelectionModal
      show={showCustomerModal}
      title="Select Customer"
      selectedValue={selectedCustomer?.id || null}
      onSelect={handleCustomerSelect}
      onClose={() => setShowCustomerModal(false)}
    />

    {/* Product Deal Selection Modal */}
    <ProductDealSearchableSelectionModal
      show={showProductDealModal}
      title="Select Product Deal"
      selectedValue={selectedProductDeal?.id || null}
      onSelect={handleProductDealSelect}
      onClose={() => setShowProductDealModal(false)}
    />
    </>
  );
}
