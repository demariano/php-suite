'use client';

import { AreaApi, ContractApi, ContractDto, CustomerApi, CustomerDto, CustomerProductDealDto, InvoiceDto, PaymentStatusEnum, PrintStatusEnum, ProductDealQtyDto, ProductPriceTypeDto, SalesTypeApi, SalesTypeDto, StatusEnum, StockApi, TermsDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import ContractSearchableSelectionModal from '../../../../../search-modals/ContractSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';
import CustomerTermsSelectionModal from '../../../../../search-modals/CustomerTermsSelectionModal';
import ProductPriceTypeSearchableSelectionModal from '../../../../../search-modals/ProductPriceTypeSearchableSelectionModal';
import SalesTypeSearchableSelectionModal from '../../../../../search-modals/SalesTypeSearchableSelectionModal';
import ContractChangeConfirmationModal from './ContractChangeConfirmationModal';
import CustomerChangeConfirmationModal from './CustomerChangeConfirmationModal';

interface RecordDetailsTabProps {
  formData: InvoiceDto;
  onFormDataChange: (updatedData: Partial<InvoiceDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  onCustomerDealsChange?: (deals: CustomerProductDealDto[]) => void;
  onContractProductDealQtyChange?: (productDealQty: ProductDealQtyDto | null) => void;
  isReadOnly?: boolean;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  onCustomerDealsChange,
  onContractProductDealQtyChange,
  isReadOnly = false
}: RecordDetailsTabProps) {
  // State management for customer selection and modals
  const [customerTerms, setCustomerTerms] = useState<TermsDto[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSalesTypeModal, setShowSalesTypeModal] = useState(false);
  const [showProductPriceTypeModal, setShowProductPriceTypeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  // State for customer change confirmation
  const [showCustomerChangeConfirmation, setShowCustomerChangeConfirmation] = useState(false);
  const [pendingCustomerAction, setPendingCustomerAction] = useState<CustomerDto | null>(null);
  
  // State for contract change confirmation
  const [showContractChangeConfirmation, setShowContractChangeConfirmation] = useState(false);
  const [pendingContractAction, setPendingContractAction] = useState<ContractDto | null>(null);
  
  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Load customer data when editing existing invoice
  useEffect(() => {
    const loadCustomerData = async () => {
      if (formData.customerId && customerTerms.length === 0 && !isCreateMode) {
        try {
          const customer = await CustomerApi.getCustomerById(formData.customerId);
          if (customer.customerTerms && Array.isArray(customer.customerTerms)) {
            setCustomerTerms(customer.customerTerms);
          }
          if (customer.customerProductDeals && Array.isArray(customer.customerProductDeals)) {
            onCustomerDealsChange?.(customer.customerProductDeals);
          }
        } catch (error) {
          console.error('Error loading customer data:', error);
        }
      }
    };
    
    loadCustomerData();
  }, [formData.customerId, isCreateMode, customerTerms.length, onCustomerDealsChange]);

  // Set contractSales flag when salesTypeId changes
  useEffect(() => {
    const updateContractSalesFlag = async () => {
      if (formData.salesTypeId) {
        try {
          const salesType = await SalesTypeApi.getSalesTypeById(formData.salesTypeId);
          const newContractSales = salesType.contractSales || false;
          
          // If changing from contractSales=true to false, clear contract and show confirmation if items exist
          if (formData.contractSales === true && newContractSales === false) {
            if (formData.invoiceDetails && formData.invoiceDetails.length > 0) {
              setPendingContractAction(null);
              setShowContractChangeConfirmation(true);
              return;
            } else {
              // No items, just clear contract
              onFormDataChange({ 
                contractSales: newContractSales,
                contractId: '',
                contractName: ''
              });
              onContractProductDealQtyChange?.(null);
              return;
            }
          }
          
          onFormDataChange({ contractSales: newContractSales });
        } catch (error) {
          console.error('Error fetching sales type details:', error);
          onFormDataChange({ contractSales: false });
        }
      } else {
        onFormDataChange({ contractSales: false });
      }
    };
    
    updateContractSalesFlag();
  }, [formData.salesTypeId]);

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerDto) => {
    // Check if we have invoice details and we're in create mode
    if (formData.invoiceDetails && formData.invoiceDetails.length > 0 && isCreateMode) {
      setPendingCustomerAction(customer);
      setShowCustomerChangeConfirmation(true);
      return;
    }
    
    await processCustomerSelection(customer);
  };
  
  // Process customer selection (original logic)
  const processCustomerSelection = async (customer: CustomerDto) => {
    try {
      // Update form data with customer info
      onFormDataChange({
        customerId: customer.customerId,
        customerName: customer.customerName,
        areaId: customer.areaId,
        areaName: customer.areaName
      });

      // Store customer terms and deals
      if (customer.customerTerms && Array.isArray(customer.customerTerms) && customer.customerTerms.length > 0) {
        console.log('Setting customer terms:', customer.customerTerms);
        setCustomerTerms(customer.customerTerms);
      } else {
        console.log('No customer terms found for customer:', customer.customerName);
        setCustomerTerms([]);
      }
      
      if (customer.customerProductDeals && Array.isArray(customer.customerProductDeals) && customer.customerProductDeals.length > 0) {
        console.log('Setting customer product deals:', customer.customerProductDeals);
        onCustomerDealsChange?.(customer.customerProductDeals);
      } else {
        console.log('No customer product deals found for customer:', customer.customerName);
      }

      // Fetch area details to get territory manager
      if (customer.areaId) {
        try {
          console.log('Fetching area details for areaId:', customer.areaId);
          const area = await AreaApi.getAreaById(customer.areaId);
          console.log('Area details fetched:', area);
          
          // Defensive checks for area object and properties
          if (area && (area.territoryManagerId || area.territoryManagerName)) {
            onFormDataChange({
              territoryManagerId: area.territoryManagerId || '',
              territoryManagerName: area.territoryManagerName || ''
            });
            console.log('Territory manager updated:', {
              territoryManagerId: area.territoryManagerId,
              territoryManagerName: area.territoryManagerName
            });
          } else {
            console.warn('Area fetched but no territory manager data found:', area);
          }
        } catch (error) {
          console.error('Error fetching area details for areaId:', customer.areaId, error);
        }
      } else {
        console.log('No areaId found for customer:', customer.customerName);
      }
    } catch (error) {
      console.error('Error processing customer selection:', error);
    }
  };

  // Handle sales type selection
  const handleSalesTypeSelect = (salesType: SalesTypeDto) => {
    if (!isCreateMode) return;
    onFormDataChange({
      salesTypeId: salesType.salesTypeId,
      salesTypeName: salesType.salesTypeName
    });
  };

  // Handle product price type selection
  const handleProductPriceTypeSelect = (productPriceType: ProductPriceTypeDto) => {
    if (!isCreateMode) return;
    onFormDataChange({
      productPriceTypeId: productPriceType.productPriceTypeId,
      productPriceTypeName: productPriceType.productPriceTypeName
    });
  };

  // Clear handlers
  const handleClearCustomer = () => {
    // Check if we have invoice details and we're in create mode
    if (formData.invoiceDetails && formData.invoiceDetails.length > 0 && isCreateMode) {
      setPendingCustomerAction(null);
      setShowCustomerChangeConfirmation(true);
      return;
    }
    
    processClearCustomer();
  };
  
  // Process clear customer (original logic)
  const processClearCustomer = () => {
    setCustomerTerms([]);
    onFormDataChange({
      customerId: '', customerName: '',
      areaId: '', areaName: '',
      territoryManagerId: '', territoryManagerName: '',
      termsId: '', termsName: ''
    });
  };

  const handleClearSalesType = () => {
    onFormDataChange({ salesTypeId: '', salesTypeName: '' });
  };

  const handleClearProductPriceType = () => {
    onFormDataChange({ productPriceTypeId: '', productPriceTypeName: '' });
  };

  // Handle terms selection
  const handleTermsSelect = (terms: TermsDto) => {
    if (!isCreateMode) return;
    onFormDataChange({
      termsId: terms.termsId,
      termsName: terms.termsName
    });
  };

  const handleClearTerms = () => {
    onFormDataChange({ termsId: '', termsName: '' });
  };

  // Handle contract selection
  const handleContractSelect = async (contract: ContractDto) => {
    if (!isCreateMode) return;
    
    // Check if we have invoice details and we're in create mode
    if (formData.invoiceDetails && formData.invoiceDetails.length > 0 && isCreateMode) {
      setPendingContractAction(contract);
      setShowContractChangeConfirmation(true);
      return;
    }
    
    await processContractSelection(contract);
  };
  
  // Process contract selection (original logic)
  const processContractSelection = async (contract: ContractDto) => {
    try {
      // Fetch full contract details to get productDealQty
      const fullContract = await ContractApi.getContractById(contract.contractId);
      
      // Update form data with contract info
      onFormDataChange({
        contractId: contract.contractId,
        contractName: contract.contractName
      });
      
      // Pass contract's productDealQty to parent
      if (fullContract.productDealQty) {
        onContractProductDealQtyChange?.(fullContract.productDealQty);
      } else {
        onContractProductDealQtyChange?.(null);
      }
    } catch (error) {
      console.error('Error processing contract selection:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to load contract details. Please try again.',
        alertType: 'error'
      });
    }
  };

  const handleClearContract = () => {
    // Check if we have invoice details and we're in create mode
    if (formData.invoiceDetails && formData.invoiceDetails.length > 0 && isCreateMode) {
      setPendingContractAction(null);
      setShowContractChangeConfirmation(true);
      return;
    }
    
    processClearContract();
  };
  
  // Process clear contract (original logic)
  const processClearContract = () => {
    onFormDataChange({ contractId: '', contractName: '' });
    onContractProductDealQtyChange?.(null);
  };
  
  // Handle customer change confirmation
  const handleConfirmCustomerChange = async () => {
    try {
      // Restore stock quantities for all invoice details
      if (formData.invoiceDetails && formData.invoiceDetails.length > 0) {
        for (const detail of formData.invoiceDetails) {
          if (detail.stockId && detail.qty && detail.qty > 0) {
            try {
              // Calculate total quantity to restore (including associated free items)
              let totalQuantityToRestore = detail.qty;
              
              // If this is a regular item with a product deal, find and include the associated free item
              if (detail.productDealId) {
                const associatedFreeItem = formData.invoiceDetails.find(
                  item => item.invoiceDetailType === 'FREE_ITEM' &&
                          item.productId === detail.productId &&
                          item.lotNo === detail.lotNo &&
                          item.productDealId === detail.productDealId
                );
                if (associatedFreeItem && associatedFreeItem.qty) {
                  totalQuantityToRestore += associatedFreeItem.qty;
                }
              }
              
              await StockApi.updateAvailableQuantity(
                detail.stockId,
                { qty: -totalQuantityToRestore } // Negative value to restore stock
              );
            } catch (error) {
              console.error('Error restoring stock for item:', detail.productName, error);
              setFlashNotification({
                title: 'Stock Restoration Warning',
                message: `Failed to restore stock for ${detail.productName}. Please check stock levels manually.`,
                alertType: 'warning'
              });
            }
          }
        }
      }
      
      // Clear invoice details and reset amounts
      onFormDataChange({
        invoiceDetails: [],
        invoiceAmount: 0,
        taxAmount: 0,
        finalAmount: 0
      });
      
      // Process the pending customer action
      if (pendingCustomerAction) {
        await processCustomerSelection(pendingCustomerAction);
      } else {
        processClearCustomer();
      }
      
      // Close confirmation modal and reset pending action
      setShowCustomerChangeConfirmation(false);
      setPendingCustomerAction(null);
      
    } catch (error) {
      console.error('Error processing customer change:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to process customer change. Please try again.',
        alertType: 'error'
      });
    }
  };
  
  // Handle cancel customer change
  const handleCancelCustomerChange = () => {
    setShowCustomerChangeConfirmation(false);
    setPendingCustomerAction(null);
  };
  
  // Handle contract change confirmation
  const handleConfirmContractChange = async () => {
    try {
      // Restore stock quantities for all invoice details
      if (formData.invoiceDetails && formData.invoiceDetails.length > 0) {
        for (const detail of formData.invoiceDetails) {
          if (detail.stockId && detail.qty && detail.qty > 0) {
            try {
              // Calculate total quantity to restore (including associated free items)
              let totalQuantityToRestore = detail.qty;
              
              // If this is a regular item with a product deal, find and include the associated free item
              if (detail.productDealId) {
                const associatedFreeItem = formData.invoiceDetails.find(
                  item => item.invoiceDetailType === 'FREE_ITEM' &&
                          item.productId === detail.productId &&
                          item.lotNo === detail.lotNo &&
                          item.productDealId === detail.productDealId
                );
                if (associatedFreeItem && associatedFreeItem.qty) {
                  totalQuantityToRestore += associatedFreeItem.qty;
                }
              }
              
              await StockApi.updateAvailableQuantity(
                detail.stockId,
                { qty: -totalQuantityToRestore } // Negative value to restore stock
              );
            } catch (error) {
              console.error('Error restoring stock for item:', detail.productName, error);
              setFlashNotification({
                title: 'Stock Restoration Warning',
                message: `Failed to restore stock for ${detail.productName}. Please check stock levels manually.`,
                alertType: 'warning'
              });
            }
          }
        }
      }
      
      // Clear invoice details and reset amounts
      onFormDataChange({
        invoiceDetails: [],
        invoiceAmount: 0,
        taxAmount: 0,
        finalAmount: 0
      });
      
      // Process the pending contract action
      if (pendingContractAction) {
        await processContractSelection(pendingContractAction);
      } else {
        // Clear contract and update contractSales flag
        onFormDataChange({ 
          contractId: '', 
          contractName: '',
          contractSales: false
        });
        onContractProductDealQtyChange?.(null);
      }
      
      // Close confirmation modal and reset pending action
      setShowContractChangeConfirmation(false);
      setPendingContractAction(null);
      
    } catch (error) {
      console.error('Error processing contract change:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to process contract change. Please try again.',
        alertType: 'error'
      });
    }
  };
  
  // Handle cancel contract change
  const handleCancelContractChange = () => {
    setShowContractChangeConfirmation(false);
    setPendingContractAction(null);
  };

  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {status}
      </span>
    );
  };


  const getPaymentStatusBadge = (status: PaymentStatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === PaymentStatusEnum.PENDING) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === PaymentStatusEnum.PARTIAL) {
      colorClasses = "!bg-orange-100 !text-orange-800";
    } else if (status === PaymentStatusEnum.PAID) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === PaymentStatusEnum.PENDING ? '#fef3c7' : status === PaymentStatusEnum.PARTIAL ? '#fed7aa' : status === PaymentStatusEnum.PAID ? '#dcfce7' : '#f3f4f6', color: status === PaymentStatusEnum.PENDING ? '#92400e' : status === PaymentStatusEnum.PARTIAL ? '#c2410c' : status === PaymentStatusEnum.PAID ? '#166534' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  const getPrintStatusBadge = (status: PrintStatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === PrintStatusEnum.COMPLETED) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === PrintStatusEnum.PENDING) {
      colorClasses = "!bg-gray-100 !text-gray-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === PrintStatusEnum.COMPLETED ? '#dcfce7' : status === PrintStatusEnum.PENDING ? '#f3f4f6' : '#f3f4f6', color: status === PrintStatusEnum.COMPLETED ? '#166534' : status === PrintStatusEnum.PENDING ? '#6b7280' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px'
      }}>
        Invoice Details
      </h3>

      {/* Change Reason Field - Only for non-admin users editing existing invoices */}
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
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Document Number *
          </label>
          <input
            type="text"
            value={formData.docno || ''}
            onChange={(e) => onFormDataChange({ docno: e.target.value })}
            readOnly={!isCreateMode || isReadOnly}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode || isReadOnly) ? '#f9fafb' : 'white'
            }}
            placeholder="Enter document number"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Invoice Date *
          </label>
          <DatePicker
            value={formData.invoiceDate || ''}
            onChange={(date) => onFormDataChange({ invoiceDate: date })}
            placeholder="Select invoice date"
            disabled={!isCreateMode || isReadOnly}
          />
        </div>

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
                if (isCreateMode) {
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
                  handleClearCustomer();
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
                title="Clear customer selection"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Area Name
          </label>
          <input
            type="text"
            value={formData.areaName || ''}
            readOnly
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280'
            }}
            placeholder="Auto-populated from customer"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Territory Manager
          </label>
          <input
            type="text"
            value={formData.territoryManagerName || ''}
            readOnly
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280'
            }}
            placeholder="Auto-populated from area"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Sales Type
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.salesTypeName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowSalesTypeModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: formData.salesTypeName ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.salesTypeName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Sales type cannot be changed" : "Click to select sales type"}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {isCreateMode && !isReadOnly && formData.salesTypeName && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSalesType();
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
                title="Clear sales type selection"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div>
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
                const isEnabled = formData.customerId && formData.contractSales === true && isCreateMode && !isReadOnly;
                if (isEnabled) {
                  setShowContractModal(true);
                }
              }}
              disabled={!formData.customerId || formData.contractSales !== true || !isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.contractName && formData.customerId && formData.contractSales === true && isCreateMode && !isReadOnly) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!formData.customerId || formData.contractSales !== true || !isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.contractName ? '#1f2937' : '#6b7280',
                cursor: (formData.customerId && formData.contractSales === true && isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!formData.customerId || formData.contractSales !== true || !isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={
                !formData.customerId 
                  ? "Select customer first" 
                  : formData.contractSales !== true 
                    ? "Select sales type with contract sales enabled" 
                    : (!isCreateMode || isReadOnly) 
                      ? "Contract cannot be changed" 
                      : "Click to select contract"
              }
              onMouseEnter={(e) => {
                if (formData.customerId && formData.contractSales === true && isCreateMode && !isReadOnly) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.contractName && formData.customerId && formData.contractSales === true && isCreateMode && !isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearContract();
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

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Terms Name
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.termsName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && customerTerms.length > 0 && setShowTermsModal(true)}
              disabled={!isCreateMode || customerTerms.length === 0 || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.termsName && isCreateMode && !isReadOnly && customerTerms.length > 0) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly || customerTerms.length === 0) ? '#f9fafb' : '#f9fafb',
                color: formData.termsName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly && customerTerms.length > 0) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (isCreateMode && !isReadOnly && customerTerms.length > 0) ? 1 : 0.6
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Terms cannot be changed" : (customerTerms.length === 0 ? "Select customer first" : "Click to select terms")}
              onMouseEnter={(e) => {
                if (isCreateMode && customerTerms.length > 0) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.termsName && isCreateMode && !isReadOnly && customerTerms.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearTerms();
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
                title="Clear terms selection"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Product Price Type
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.productPriceTypeName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowProductPriceTypeModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: formData.productPriceTypeName ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.productPriceTypeName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Product price type cannot be changed" : "Click to select product price type"}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {isCreateMode && !isReadOnly && formData.productPriceTypeName && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearProductPriceType();
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
                title="Clear product price type selection"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getStatusBadge(formData.status || StatusEnum.ACTIVE)}
          </div>
        </div>


        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Payment Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getPaymentStatusBadge(formData.paymentStatus || PaymentStatusEnum.PENDING)}
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Print Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getPrintStatusBadge(formData.printStatus || PrintStatusEnum.PENDING)}
          </div>
        </div>
      </div>

      {/* Auto-calculated Amounts */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Calculated Amounts
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Invoice Amount
            </label>
            <input
              type="number"
              value={formData.invoiceAmount || 0}
              readOnly
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                fontWeight: '500'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Tax Amount
            </label>
            <input
              type="number"
              value={formData.taxAmount || 0}
              readOnly
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                fontWeight: '500'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Final Amount
            </label>
            <input
              type="number"
              value={formData.finalAmount || 0}
              readOnly
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                fontWeight: '500'
              }}
            />
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

      {/* Sales Type Selection Modal */}
      <SalesTypeSearchableSelectionModal
        show={showSalesTypeModal}
        title="Select Sales Type"
        selectedValue={formData.salesTypeId || null}
        onSelect={handleSalesTypeSelect}
        onClose={() => setShowSalesTypeModal(false)}
      />

      {/* Product Price Type Selection Modal */}
      <ProductPriceTypeSearchableSelectionModal
        show={showProductPriceTypeModal}
        title="Select Product Price Type"
        selectedValue={formData.productPriceTypeId || null}
        onSelect={handleProductPriceTypeSelect}
        onClose={() => setShowProductPriceTypeModal(false)}
      />
      
      {/* Customer Change Confirmation Modal */}
      <CustomerChangeConfirmationModal
        show={showCustomerChangeConfirmation}
        itemCount={formData.invoiceDetails?.length || 0}
        onConfirm={handleConfirmCustomerChange}
        onCancel={handleCancelCustomerChange}
      />
      
      {/* Contract Change Confirmation Modal */}
      <ContractChangeConfirmationModal
        show={showContractChangeConfirmation}
        itemCount={formData.invoiceDetails?.length || 0}
        onConfirm={handleConfirmContractChange}
        onCancel={handleCancelContractChange}
      />
      
      {/* Customer Terms Selection Modal */}
      <CustomerTermsSelectionModal
        show={showTermsModal}
        title="Select Terms"
        customerTerms={customerTerms}
        selectedValue={formData.termsId || null}
        onSelect={handleTermsSelect}
        onClose={() => setShowTermsModal(false)}
      />
      
      {/* Contract Selection Modal */}
      <ContractSearchableSelectionModal
        show={showContractModal}
        title="Select Contract"
        customerId={formData.customerId}
        selectedValue={formData.contractId || null}
        onSelect={handleContractSelect}
        onClose={() => setShowContractModal(false)}
      />
    </div>
  );
}
