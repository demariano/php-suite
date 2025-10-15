'use client';

import { AreaApi, CustomerDto, InvoiceDto, InvoiceStatusEnum, PaymentStatusEnum, PrintStatusEnum, ProductDealDto, ProductPriceTypeDto, SalesTypeDto, StatusEnum, TermsDto } from '@data-access/index';
import { useState } from 'react';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';
import ProductPriceTypeSearchableSelectionModal from '../../../../../search-modals/ProductPriceTypeSearchableSelectionModal';
import SalesTypeSearchableSelectionModal from '../../../../../search-modals/SalesTypeSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: InvoiceDto;
  onFormDataChange: (updatedData: Partial<InvoiceDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  onCustomerDealsChange?: (deals: ProductDealDto[]) => void;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  onCustomerDealsChange
}: RecordDetailsTabProps) {
  // State management for customer selection and modals
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [customerTerms, setCustomerTerms] = useState<TermsDto[]>([]);
  const [customerDeals, setCustomerDeals] = useState<ProductDealDto[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSalesTypeModal, setShowSalesTypeModal] = useState(false);
  const [showProductPriceTypeModal, setShowProductPriceTypeModal] = useState(false);

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerDto) => {
    try {
      setSelectedCustomer(customer);
      
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
      
      if (customer.customerDeals && Array.isArray(customer.customerDeals) && customer.customerDeals.length > 0) {
        console.log('Setting customer deals:', customer.customerDeals);
        setCustomerDeals(customer.customerDeals);
        onCustomerDealsChange?.(customer.customerDeals);
      } else {
        console.log('No customer deals found for customer:', customer.customerName);
        setCustomerDeals([]);
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
    onFormDataChange({
      salesTypeId: salesType.salesTypeId,
      salesTypeName: salesType.salesTypeName
    });
  };

  // Handle product price type selection
  const handleProductPriceTypeSelect = (productPriceType: ProductPriceTypeDto) => {
    onFormDataChange({
      productPriceTypeId: productPriceType.productPriceTypeId,
      productPriceTypeName: productPriceType.productPriceTypeName
    });
  };

  // Clear handlers
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerTerms([]);
    setCustomerDeals([]);
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
  const handleTermsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termsId = e.target.value;
    const selectedTerms = customerTerms.find(terms => terms.termsId === termsId);
    if (selectedTerms) {
      onFormDataChange({
        termsId: selectedTerms.termsId,
        termsName: selectedTerms.termsName
      });
    }
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

  const getInvoiceStatusBadge = (status: InvoiceStatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === InvoiceStatusEnum.DRAFT) {
      colorClasses = "!bg-gray-100 !text-gray-800";
    } else if (status === InvoiceStatusEnum.COMPLETED) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === InvoiceStatusEnum.DRAFT ? '#f3f4f6' : status === InvoiceStatusEnum.COMPLETED ? '#dcfce7' : '#f3f4f6', color: status === InvoiceStatusEnum.DRAFT ? '#6b7280' : status === InvoiceStatusEnum.COMPLETED ? '#166534' : '#6b7280' }}>
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
    if (status === PrintStatusEnum.PRINTED) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === PrintStatusEnum.NOT_PRINTED) {
      colorClasses = "!bg-gray-100 !text-gray-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === PrintStatusEnum.PRINTED ? '#dcfce7' : status === PrintStatusEnum.NOT_PRINTED ? '#f3f4f6' : '#f3f4f6', color: status === PrintStatusEnum.PRINTED ? '#166534' : status === PrintStatusEnum.NOT_PRINTED ? '#6b7280' : '#6b7280' }}>
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
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
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
          <input
            type="date"
            value={formData.invoiceDate || ''}
            onChange={(e) => onFormDataChange({ invoiceDate: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
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
            Customer Name *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.customerName || ''}
              readOnly
              onClick={() => setShowCustomerModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: formData.customerName ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: formData.customerName ? '#1f2937' : '#6b7280',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              placeholder="Click to select customer"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.customerName && (
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
              onClick={() => setShowSalesTypeModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: formData.salesTypeName ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: formData.salesTypeName ? '#1f2937' : '#6b7280',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              placeholder="Click to select sales type"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.salesTypeName && (
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
          <input
            type="text"
            value={formData.contractName || ''}
            onChange={(e) => onFormDataChange({ contractName: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
            placeholder="Enter contract name"
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
            Terms Name
          </label>
          <select
            value={formData.termsId || ''}
            onChange={handleTermsChange}
            disabled={customerTerms.length === 0}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: customerTerms.length === 0 ? '#f9fafb' : 'white',
              color: customerTerms.length === 0 ? '#6b7280' : '#1f2937'
            }}
          >
            <option value="">
              {customerTerms.length === 0 ? 'Select customer first' : 'Select terms'}
            </option>
            {customerTerms.map((terms) => (
              <option key={terms.termsId} value={terms.termsId}>
                {terms.termsName}
              </option>
            ))}
          </select>
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
              onClick={() => setShowProductPriceTypeModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: formData.productPriceTypeName ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: formData.productPriceTypeName ? '#1f2937' : '#6b7280',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              placeholder="Click to select product price type"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.productPriceTypeName && (
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
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
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
            Invoice Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getInvoiceStatusBadge(formData.invoiceStatus || InvoiceStatusEnum.DRAFT)}
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
            {getPrintStatusBadge(formData.printStatus || PrintStatusEnum.NOT_PRINTED)}
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

      {/* Change Reason for non-admin users */}
      {!isAdminUser && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Change Reason
          </label>
          <textarea
            value={formData.changeReason || ''}
            onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              minHeight: '100px',
              resize: 'vertical'
            }}
            placeholder="Enter reason for changes (required for approval)"
          />
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
    </div>
  );
}
