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
        <div style={{
          backgroundColor: '#dcfce7',
          border: '2px solid #16a34a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <span style={{
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontWeight: '600' }}>
              Please fix the following errors:
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#dc2626'
          }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pending approval or deletion warning - hide on approval tab since changeReason is already shown */}
      {!isCreateMode && selectedContract && activeTab !== 'approval' &&
       (selectedContract.status === StatusEnum.FOR_APPROVAL || selectedContract.status === StatusEnum.NEW_RECORD || selectedContract.status === StatusEnum.FOR_DELETION) && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
          <span style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {selectedContract.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Record Fields Container */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)'
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
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Record Details
          </h3>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Contract Number *
          </label>
          <input
            type="text"
            name="contractNo"
            value={formData.contractNo}
            onChange={(e) => setFormData(prev => ({ ...prev, contractNo: e.target.value }))}
            placeholder={isCreateMode ? 'Enter contract number' : ''}
            disabled={isFieldDisabled('contractNo')}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isFieldDisabled() ? '#f9fafb' : 'white',
              color: isFieldDisabled() ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: isFieldDisabled() ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (!isFieldDisabled()) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Contract Name *
          </label>
          <input
            type="text"
            name="contractName"
            value={formData.contractName}
            onChange={(e) => setFormData(prev => ({ ...prev, contractName: e.target.value }))}
            placeholder={isCreateMode ? 'Enter contract name' : ''}
            disabled={isFieldDisabled()}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isFieldDisabled() ? '#f9fafb' : 'white',
              color: isFieldDisabled() ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: isFieldDisabled() ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (!isFieldDisabled()) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
        </div>

        <SelectionField
          label="Customer *"
          selectedItem={selectedCustomer}
          onSelect={() => setShowCustomerModal(true)}
          onClear={handleClearCustomer}
          buttonText="Select Customer"
          disabled={isFieldDisabled('customer')}
        />

        {/* Start Date and End Date - Side by side */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '20px' 
        }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Start Date *
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
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              End Date *
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

         <div style={{ marginBottom: '20px' }}>
           <label style={{
             display: 'block',
             fontSize: '14px',
             fontWeight: '600',
             color: '#374151',
             marginBottom: '8px'
           }}>
             Contract Amount *
           </label>
           <div style={{ position: 'relative' }}>
             <input
               type="text"
             name="contractAmount"
             value={getContractAmountDisplayValue()}
             onChange={handleContractAmountChange}
             onFocus={handleContractAmountFocus}
             onBlur={handleContractAmountBlur}
             placeholder={isCreateMode ? 'Enter contract amount' : ''}
             disabled={isFieldDisabled()}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isFieldDisabled() ? '#f9fafb' : 'white',
              color: isFieldDisabled() ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: isFieldDisabled() ? 'not-allowed' : 'text'
            }}
            required
          />
          </div>
        </div>

        <SelectionField
          label="Product Deal *"
          selectedItem={selectedProductDeal}
          onSelect={() => setShowProductDealModal(true)}
          onClear={handleClearProductDeal}
          buttonText="Select Product Deal"
          disabled={isFieldDisabled('productDeal')}
        />

        {/* Product Deal Quantity Fields - Only show when productDealQty is available */}
        {productDealQty && (
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '20px' 
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Minimum Quantity
              </label>
              <input
                type="text"
                value={productDealQty.minQty?.toString() || '0'}
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
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Additional Quantity
              </label>
              <input
                type="text"
                value={productDealQty.additionalQty?.toString() || '0'}
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
          </div>
        )}

        {/* Status Fields - Grouped layout */}
        {/* Payment Status + Amount Paid Row */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '20px' 
        }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Payment Status
            </label>
            <input
              type="text"
              value={formData.paymentStatus}
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
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Amount Paid
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(formData.amountPaid)}
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
        </div>

        {/* Delivery Status + Delivered Amount Row */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '20px' 
        }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Delivery Status
            </label>
            <input
              type="text"
              value={formData.deliveryStatus}
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
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Delivered Amount
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(formData.deliveredAmount)}
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
        </div>

         <div style={{ marginBottom: '20px' }}>
           <label style={{
             display: 'block',
             fontSize: '14px',
             fontWeight: '600',
             color: '#374151',
             marginBottom: '8px'
           }}>
             Invoiced Amount
           </label>
           <input
             type="text"
             value={formatNumberWithCommas(formData.invoicedAmount)}
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
        
        {/* Change Reason Field - Only show for non-create mode and non-admin users */}
        {!isCreateMode && !isAdminUser && (
          <div style={{ marginTop: '24px', marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Change Reason {!isAdminUser ? '*' : ''}
            </label>
            <textarea
              name="changeReason"
              value={formData.changeReason}
              onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
              placeholder="Please explain the reason for this change..."
              rows={3}
              disabled={isFieldDisabled()}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: isFieldDisabled() ? '#f9fafb' : 'white',
                color: isFieldDisabled() ? '#6b7280' : 'inherit',
                transition: 'all 0.2s ease',
                resize: 'vertical',
                minHeight: '80px',
                cursor: isFieldDisabled() ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {
                if (!isFieldDisabled()) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
              required={!isAdminUser}
            />
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              {isAdminUser 
                ? 'Optional field for documenting the reason for changes.' 
                : 'This field is required when making changes to the contract record.'
              }
            </div>
          </div>
        )}
        
        {!isCreateMode && selectedContract && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Status
            </label>
            <div style={{
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {selectedContract.status || 'ACTIVE'}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        {/* Hide all buttons on approval tab - let modal handle buttons */}
        {activeTab === 'approval' ? (
          <div></div>
        ) : (
          <>
            {!isCreateMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={selectedContract?.status !== StatusEnum.ACTIVE}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedContract?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
                  color: selectedContract?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
                  border: selectedContract?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
                  borderRadius: '6px',
                  cursor: selectedContract?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: selectedContract?.status !== StatusEnum.ACTIVE ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (selectedContract?.status === StatusEnum.ACTIVE) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedContract?.status === StatusEnum.ACTIVE) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                Delete
              </button>
            )}
            
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFieldDisabled()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isFieldDisabled() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isFieldDisabled() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: isFieldDisabled() ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isFieldDisabled()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFieldDisabled()) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {isCreateMode ? 'Create Contract' : 'Save Changes'}
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
