'use client';

import { AreaApi, ContractApi, ContractDto, ContractTypeEnum, CustomerDto, DeliveryStatusEnum, extractErrorMessage, PaymentStatusEnum, RebateClaimedStatusEnum, RebateTypeEnum, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';
import DatePicker from '../../../components/DatePicker';
import SelectionField from '../../../customers/customer/components/SelectionField';
import CustomerSearchableSelectionModal from '../../../search-modals/CustomerSearchableSelectionModal';
import ProductSearchableSelectionModal from '../../../search-modals/ProductSearchableSelectionModal';

interface ContractDealsDetailsDto {
  productId: string;
  productName?: string;
  productDealId: string;
  productDealName?: string;
  additionalQty?: number;
  minQty?: number;
}

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
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string, areaId?: string, areaName?: string} | null>(null);
  const [areaPrefixId, setAreaPrefixId] = useState<string | undefined>(undefined);
  const [contractProductDeals, setContractProductDeals] = useState<ContractDealsDetailsDto[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDealsModal, setShowDealsModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTypingAmount, setIsTypingAmount] = useState(false);
  const [isComputingRebate, setIsComputingRebate] = useState(false);
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState<{
    contractNo: string;
    contractName: string;
    startDate: string;
    endDate: string;
    contractType: ContractTypeEnum | '';
    contractAmount: string;
    deliveryStatus: string;
    paymentStatus: string;
    deliveredAmount: string;
    amountPaid: string;
    invoicedAmount: string;
    changeReason: string;
    rebateType: RebateTypeEnum | '';
    rebatePercentage: string;
    rebateAmount: string;
    rebateClaimedAmount: string;
    rebateClaimedStatus: string;
  }>({
    contractNo: '',
    contractName: '',
    startDate: '',
    endDate: '',
    contractType: ContractTypeEnum.REGULAR,
    contractAmount: '',
    deliveryStatus: 'PENDING',
    paymentStatus: 'PENDING',
    deliveredAmount: '0',
    amountPaid: '0',
    invoicedAmount: '0',
    changeReason: '',
    rebateType: RebateTypeEnum.NONE,
    rebatePercentage: '',
    rebateAmount: '',
    rebateClaimedAmount: '',
    rebateClaimedStatus: ''
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
          name: contractData.customerName,
          areaId: contractData.areaId,
          areaName: contractData.areaName
        });
      }
      if (contractData.contractProductDeals) {
        setContractProductDeals(contractData.contractProductDeals.map(deal => ({
          productId: deal.productId,
          productName: deal.productName,
          productDealId: deal.productDealId,
          productDealName: deal.productDealName,
          additionalQty: deal.additionalQty,
          minQty: deal.minQty
        })));
      }
       // Initialize form data
       setFormData({
         contractNo: contractData.contractNo || '',
         contractName: contractData.contractName || '',
         startDate: contractData.startDate || '',
         endDate: contractData.endDate || '',
         contractType: contractData.contractType || ContractTypeEnum.REGULAR,
         contractAmount: contractData.contractAmount?.toString() || '',
         deliveryStatus: contractData.deliveryStatus || 'PENDING',
         paymentStatus: contractData.paymentStatus || 'PENDING',
         deliveredAmount: contractData.deliveredAmount?.toString() || '0',
         amountPaid: contractData.amountPaid?.toString() || '0',
         invoicedAmount: (contractData as { invoicedAmount?: number }).invoicedAmount?.toString() || '0',
         changeReason: contractData.changeReason || '',
         rebateType: (contractData.rebateType || RebateTypeEnum.NONE) as RebateTypeEnum,
         rebatePercentage: contractData.rebatePercentage?.toString() || '',
         rebateAmount: contractData.rebateAmount?.toString() || '',
         rebateClaimedAmount: contractData.rebateClaimedAmount?.toString() || '',
         rebateClaimedStatus: contractData.rebateClaimedStatus || ''
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
    
    if (contractProductDeals.length === 0) {
      errors.push('Please add at least one product deal.');
    }
    
    // Validate for duplicate product deal combinations
    const dealKeys = contractProductDeals.map(deal => `${deal.productId}|${deal.productDealId}`);
    const uniqueDealKeys = new Set(dealKeys);
    if (dealKeys.length !== uniqueDealKeys.size) {
      errors.push('Duplicate contract deals detected. Please remove duplicate deals.');
    }
    
    // Contract number validation - only required in update mode (it's auto-generated in create mode)
    if (!isCreateMode && !formData.contractNo.trim()) {
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
    
    // Validate rebate percentage - should not exceed 99% when rebate type is PERCENTAGE
    if (formData.rebateType === RebateTypeEnum.PERCENTAGE && formData.rebatePercentage) {
      const rebatePercentageValue = parseFloat(formData.rebatePercentage);
      if (!isNaN(rebatePercentageValue) && rebatePercentageValue > 99) {
        errors.push('Rebate percentage cannot exceed 99%.');
      }
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
         // contractNo is auto-generated by backend using areaPrefixId
         contractName: formData.contractName,
         customerId: selectedCustomer?.id || '',
         customerName: selectedCustomer?.name || '',
         areaId: selectedCustomer?.areaId,
         areaName: selectedCustomer?.areaName,
        areaPrefixId: areaPrefixId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        contractType: formData.contractType ? (formData.contractType as ContractTypeEnum) : ContractTypeEnum.REGULAR,
        contractAmount: parseFloat(removeCommas(formData.contractAmount)) || 0,
         contractProductDeals: contractProductDeals,
         deliveryStatus: formData.deliveryStatus as DeliveryStatusEnum,
         paymentStatus: formData.paymentStatus as PaymentStatusEnum,
         deliveredAmount: parseFloat(formData.deliveredAmount) || 0,
         amountPaid: parseFloat(formData.amountPaid) || 0,
         invoicedAmount: parseFloat(formData.invoicedAmount) || 0,
         rebateType: formData.rebateType ? (formData.rebateType as RebateTypeEnum) : undefined,
         rebatePercentage: formData.rebatePercentage ? parseFloat(formData.rebatePercentage) : undefined,
         rebateAmount: formData.rebateAmount ? parseFloat(removeCommas(formData.rebateAmount)) : undefined,
         rebateClaimedAmount: formData.rebateClaimedAmount ? parseFloat(formData.rebateClaimedAmount) : undefined,
         rebateClaimedStatus: formData.rebateClaimedStatus ? (formData.rebateClaimedStatus as RebateClaimedStatusEnum) : undefined,
         status: StatusEnum.ACTIVE // Default status for new contracts
       };
       onSave(newContract as ContractDto);
    } else {
       const updatedContract = {
         ...selectedContract,
         contractNo: formData.contractNo,
         customerId: selectedCustomer?.id || '',
         customerName: selectedCustomer?.name || '',
         areaId: selectedCustomer?.areaId,
         areaName: selectedCustomer?.areaName,
        contractName: formData.contractName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        contractType: formData.contractType ? (formData.contractType as ContractTypeEnum) : undefined,
        contractAmount: parseFloat(removeCommas(formData.contractAmount)) || 0,
         contractProductDeals: contractProductDeals,
         deliveryStatus: formData.deliveryStatus as DeliveryStatusEnum,
         paymentStatus: formData.paymentStatus as PaymentStatusEnum,
         deliveredAmount: parseFloat(formData.deliveredAmount) || 0,
         amountPaid: parseFloat(formData.amountPaid) || 0,
         invoicedAmount: parseFloat(formData.invoicedAmount) || 0,
         rebateType: formData.rebateType ? (formData.rebateType as RebateTypeEnum) : undefined,
         rebatePercentage: formData.rebatePercentage ? parseFloat(formData.rebatePercentage) : undefined,
         rebateAmount: formData.rebateAmount ? parseFloat(removeCommas(formData.rebateAmount)) : undefined,
         rebateClaimedAmount: formData.rebateClaimedAmount ? parseFloat(formData.rebateClaimedAmount) : undefined,
         rebateClaimedStatus: formData.rebateClaimedStatus ? (formData.rebateClaimedStatus as RebateClaimedStatusEnum) : undefined,
         changeReason: formData.changeReason,
         status: StatusEnum.ACTIVE
      };
      onSave(updatedContract as ContractDto);
    }
  };

  const handleCustomerSelect = async (customer: CustomerDto) => {
    setSelectedCustomer({ 
      id: customer.customerId || '', 
      name: customer.customerName || '',
      areaId: customer.areaId,
      areaName: customer.areaName
    });
    setUserHasMadeSelections(true);

    // Fetch area to get the prefixId
    if (customer.areaId) {
      try {
        const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
          ? authedUser?.userRole
          : undefined;
        const area = await AreaApi.getAreaById(customer.areaId, userRole);
        setAreaPrefixId(area.idPrefix);
      } catch (error) {
        console.error('Failed to fetch area prefix:', error);
        setAreaPrefixId(undefined);
      }
    } else {
      setAreaPrefixId(undefined);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setAreaPrefixId(undefined);
  };

  // Contract Deals management
  const addContractDeals = () => {
    setShowDealsModal(true);
  };

  const handleDealsSelect = (product: { productId: string; productName?: string; productDeals?: { productDealId: string; productDealName?: string; additionalQty?: number; minQty?: number }[]; selectedDealId?: string }) => {
    // Find the selected deal - use selectedDealId if provided, otherwise use first deal
    const selectedDeal = product.selectedDealId 
      ? product.productDeals?.find((d: { productDealId: string }) => d.productDealId === product.selectedDealId)
      : (product.productDeals && product.productDeals.length > 0 ? product.productDeals[0] : null);
    
    // Check if this specific product deal combination is already added
    const existingDeal = contractProductDeals.find(contractDeal => 
      contractDeal.productId === product.productId && 
      contractDeal.productDealId === selectedDeal?.productDealId
    );
    if (existingDeal) {
      // Add validation error for duplicate product deal combinations
      setValidationErrors(['This product deal combination has already been added. Please select a different product or deal.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newDeal: ContractDealsDetailsDto = {
      productId: product.productId,
      productName: product.productName,
      productDealId: selectedDeal?.productDealId || '',
      productDealName: selectedDeal?.productDealName || '',
      additionalQty: selectedDeal?.additionalQty || 0,
      minQty: selectedDeal?.minQty || 0
    };
    setContractProductDeals([...contractProductDeals, newDeal]);
  };

  const removeContractDeals = (index: number) => {
    setContractProductDeals(contractProductDeals.filter((_, i) => i !== index));
  };

  const handleComputeRebate = async () => {
    if (!selectedContract || isCreateMode) return;

    try {
      setIsComputingRebate(true);
      setValidationErrors([]);

      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development')
        ? authedUser?.userRole
        : undefined;

      const updatedContract = await ContractApi.computeRebate(selectedContract.contractId, userRole);

      // Update form data with the updated contract
      if (updatedContract) {
        setFormData(prev => ({
          ...prev,
          rebateAmount: updatedContract.rebateAmount?.toString() || prev.rebateAmount,
          rebateClaimedAmount: updatedContract.rebateClaimedAmount?.toString() || prev.rebateClaimedAmount,
          rebateClaimedStatus: updatedContract.rebateClaimedStatus || prev.rebateClaimedStatus
        }));

        // Call onSave to refresh the contract data in the parent component
        onSave(updatedContract);
      }
    } catch (err: unknown) {
      console.error('Failed to compute rebate:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to compute rebate. Please try again.');
      setValidationErrors([errorMessage]);
    } finally {
      setIsComputingRebate(false);
    }
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
        (fieldName === 'contractNo' || fieldName === 'customer')) {
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
      
      {/* Change Reason Field - First component when displayed */}
      {!isCreateMode && !isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason}
          onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
          disabled={selectedContract?.status !== StatusEnum.ACTIVE}
        />
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

              {/* Contract Number - Only shown in update mode, read-only */}
              {!isCreateMode && (
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Contract Number
                  </label>
                  <input
                    type="text"
                    name="contractNo"
                    value={formData.contractNo}
                    readOnly
                    className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Contract number is auto-generated and cannot be modified.
                  </p>
                </div>
              )}

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
            {/* Contract Type - Full width row */}
            <div className="grid grid-cols-1 gap-6 mt-6">
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Contract Type
                </label>
                <select
                  name="contractType"
                  value={formData.contractType || ContractTypeEnum.REGULAR}
                  onChange={(e) => {
                    const newContractType = (e.target.value || ContractTypeEnum.REGULAR) as ContractTypeEnum;
                    setFormData(prev => ({
                      ...prev,
                      contractType: newContractType
                    }));
                  }}
                  disabled={isFieldDisabled()}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled()
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                >
                  <option value={ContractTypeEnum.REGULAR}>Regular</option>
                  <option value={ContractTypeEnum.CONTRACT_PER_INVOICE}>Contract Per Invoice</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product Deals Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600">
                  Product Deals
                </h3>
              </div>
              <button
                type="button"
                onClick={addContractDeals}
                disabled={!isCreateMode && selectedContract?.status !== StatusEnum.ACTIVE}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                  !isCreateMode && selectedContract?.status !== StatusEnum.ACTIVE
                    ? 'bg-gray-500 cursor-not-allowed opacity-60'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Deal
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              {contractProductDeals.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-base">
                  No contract deals added yet. Click &quot;Add Deal&quot; to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                          Product Deal Name
                        </th>
                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                          Minimum Quantity
                        </th>
                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                          Additional Quantity
                        </th>
                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contractProductDeals.map((deal, index) => (
                        <tr 
                          key={index}
                          className="transition-all duration-200 bg-white hover:bg-gray-50"
                        >
                          <td className="px-6 py-5 text-sm font-medium text-gray-900">
                            {deal.productName || '-'}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600">
                            {deal.productDealName || '-'}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600">
                            {deal.minQty || 0}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600">
                            {deal.additionalQty || 0}
                          </td>
                          <td className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => removeContractDeals(index)}
                              disabled={!isCreateMode && selectedContract?.status !== StatusEnum.ACTIVE}
                              className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                !isCreateMode && selectedContract?.status !== StatusEnum.ACTIVE
                                  ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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

        {/* Rebate Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Rebate Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rebate Type */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Rebate Type
                </label>
                <select
                  name="rebateType"
                  value={formData.rebateType || RebateTypeEnum.NONE}
                  onChange={(e) => {
                    const newRebateType = (e.target.value || RebateTypeEnum.NONE) as RebateTypeEnum;
                    setFormData(prev => ({
                      ...prev,
                      rebateType: newRebateType,
                      // Clear opposite field when switching types
                      rebatePercentage: newRebateType !== RebateTypeEnum.PERCENTAGE ? '' : prev.rebatePercentage,
                      rebateAmount: newRebateType !== RebateTypeEnum.AMOUNT ? '' : prev.rebateAmount
                    }));
                  }}
                  disabled={isFieldDisabled()}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFieldDisabled()
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                >
                  <option value={RebateTypeEnum.NONE}>None</option>
                  <option value={RebateTypeEnum.PERCENTAGE}>Percentage</option>
                  <option value={RebateTypeEnum.AMOUNT}>Amount</option>
                </select>
              </div>

              {/* Rebate Percentage - Only visible when rebateType is PERCENTAGE */}
              {(formData.rebateType === RebateTypeEnum.PERCENTAGE) && (
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Rebate Percentage
                  </label>
                  <input
                    type="number"
                    name="rebatePercentage"
                    value={formData.rebatePercentage}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent values over 99
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) <= 99)) {
                        setFormData(prev => ({ ...prev, rebatePercentage: value }));
                        // Clear validation errors if value is valid
                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) <= 99)) {
                          setValidationErrors([]);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value > 99) {
                        setFormData(prev => ({ ...prev, rebatePercentage: '99' }));
                        setValidationErrors(['Rebate percentage cannot exceed 99%.']);
                      } else if (!isNaN(value) && value <= 99) {
                        // Clear errors if value is valid
                        setValidationErrors([]);
                      }
                    }}
                    placeholder="Enter rebate percentage (max 99%)"
                    min="0"
                    max="99"
                    step="0.01"
                    disabled={isFieldDisabled()}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                      isFieldDisabled()
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }`}
                  />
                </div>
              )}

              {/* Rebate Amount - Only visible when rebateType is AMOUNT */}
              {(formData.rebateType === RebateTypeEnum.AMOUNT) && (
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Rebate Amount
                  </label>
                  <input
                    type="text"
                    name="rebateAmount"
                    value={formData.rebateAmount}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value);
                      const numericValue = rawValue.replace(/[^0-9.]/g, '');
                      const parts = numericValue.split('.');
                      const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
                      setFormData(prev => ({ ...prev, rebateAmount: cleanValue }));
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value);
                      if (rawValue) {
                        const numericValue = parseFloat(rawValue);
                        if (!isNaN(numericValue)) {
                          const formatted = formatNumberWithCommas(numericValue);
                          setFormData(prev => ({ ...prev, rebateAmount: formatted }));
                        }
                      }
                    }}
                    placeholder="Enter rebate amount"
                    disabled={isFieldDisabled()}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                      isFieldDisabled()
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }`}
                  />
                </div>
              )}

              {/* Empty div for grid alignment when rebate type is not PERCENTAGE or AMOUNT */}
              {formData.rebateType !== RebateTypeEnum.PERCENTAGE && formData.rebateType !== RebateTypeEnum.AMOUNT && formData.rebateType !== RebateTypeEnum.NONE && (
                <div></div>
              )}

              {/* Rebate Claimed Amount - Always visible, read-only */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Rebate Claimed Amount
                </label>
                <input
                  type="text"
                  value={formatNumberWithCommas(formData.rebateClaimedAmount)}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>

              {/* Rebate Claimed Status - Always visible, read-only */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Rebate Claimed Status
                </label>
                <input
                  type="text"
                  value={formData.rebateClaimedStatus || '-'}
                  readOnly
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Compute Rebate Button */}
            {!isCreateMode && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleComputeRebate}
                  disabled={
                    formData.rebateType === RebateTypeEnum.NONE ||
                    !formData.rebateType ||
                    formData.rebateClaimedStatus === RebateClaimedStatusEnum.CLAIMED ||
                    isComputingRebate ||
                    isFieldDisabled()
                  }
                  className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    formData.rebateType === RebateTypeEnum.NONE ||
                    !formData.rebateType ||
                    formData.rebateClaimedStatus === RebateClaimedStatusEnum.CLAIMED ||
                    isComputingRebate ||
                    isFieldDisabled()
                      ? 'cursor-not-allowed bg-gray-400 opacity-70'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isComputingRebate ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Computing...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Compute Rebate
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
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

    {/* Product Deals Selection Modal */}
    <ProductSearchableSelectionModal
      show={showDealsModal}
      title="Select Product"
      selectedValue={null}
      onSelect={handleDealsSelect}
      onClose={() => setShowDealsModal(false)}
    />
    </>
  );
}
