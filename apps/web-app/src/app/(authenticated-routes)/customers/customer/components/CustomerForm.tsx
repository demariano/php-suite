'use client';

import { CustomerDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import CustomerSearchableSelectionModal from '../../../search-modals/CustomerSearchableSelectionModal';
import SelectionField from './SelectionField';

// Types for inner tabs
type InnerTabType = 'record-details' | 'customer-terms' | 'customer-deals';

interface CustomerTermsDetailsDto {
  termsId: string;
  termsName?: string;
  days?: number;
}

interface CustomerDealsDetailsDto {
  productDealId: string;
  productDealName?: string;
  additionalQty?: number;
  minQty?: number;
}

interface CustomerFormProps {
  isCreateMode: boolean;
  selectedCustomer: CustomerDto | null;
  successMessage: string | null;
  onSave: (customer: CustomerDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  activeTab?: 'details' | 'approval';
}

export default function CustomerForm({
  isCreateMode,
  selectedCustomer,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  activeTab = 'details'
}: CustomerFormProps) {
  const [selectedTown, setSelectedTown] = useState<{id: string, name: string} | null>(null);
  const [selectedArea, setSelectedArea] = useState<{id: string, name: string} | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<{id: string, name: string} | null>(null);
  const [selectedType, setSelectedType] = useState<{id: string, name: string} | null>(null);
  const [showTownModal, setShowTownModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDealsModal, setShowDealsModal] = useState(false);
  const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Inner tabs state
  const [activeInnerTab, setActiveInnerTab] = useState<InnerTabType>('record-details');
  const [customerTerms, setCustomerTerms] = useState<CustomerTermsDetailsDto[]>([]);
  const [customerDeals, setCustomerDeals] = useState<CustomerDealsDetailsDto[]>([]);
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    address1: '',
    address2: '',
    balance: '0',
    contactNo: '',
    contactPerson: '',
    creditLimit: '0',
    customerCredit: '0',
    tinNumber: '',
    changeReason: ''
  });

  // Set initial values when editing (only when user hasn't made selections)
  useEffect(() => {
    if (!isCreateMode && selectedCustomer && !userHasMadeSelections) {
      if (selectedCustomer.townId && selectedCustomer.townName) {
        setSelectedTown({
          id: selectedCustomer.townId,
          name: selectedCustomer.townName
        });
      }
      if (selectedCustomer.areaId && selectedCustomer.areaName) {
        setSelectedArea({
          id: selectedCustomer.areaId,
          name: selectedCustomer.areaName
        });
      }
      if (selectedCustomer.customerClassificationId && selectedCustomer.customerClassificationName) {
        setSelectedClassification({
          id: selectedCustomer.customerClassificationId,
          name: selectedCustomer.customerClassificationName
        });
      }
      if (selectedCustomer.customerTypeId && selectedCustomer.customerTypeName) {
        setSelectedType({
          id: selectedCustomer.customerTypeId,
          name: selectedCustomer.customerTypeName
        });
      }
      // Initialize customer terms and deals
      if (selectedCustomer.customerTerms) {
        setCustomerTerms(selectedCustomer.customerTerms.map(term => ({
          termsId: term.termsId,
          termsName: term.termsName,
          days: term.days
        })));
      }
      if (selectedCustomer.customerDeals) {
        setCustomerDeals(selectedCustomer.customerDeals.map(deal => ({
          productDealId: deal.productDealId,
          productDealName: deal.productDealName,
          additionalQty: deal.additionalQty,
          minQty: deal.minQty
        })));
      }
      // Initialize form data
      setFormData({
        customerName: selectedCustomer.customerName || '',
        email: selectedCustomer.email || '',
        address1: selectedCustomer.address1 || '',
        address2: selectedCustomer.address2 || '',
        balance: selectedCustomer.balance?.toString() || '0',
        contactNo: selectedCustomer.contactNo || '',
        contactPerson: selectedCustomer.contactPerson || '',
        creditLimit: selectedCustomer.creditLimit?.toString() || '0',
        customerCredit: selectedCustomer.customerCredit?.toString() || '0',
        tinNumber: selectedCustomer.tinNumber || '',
        changeReason: selectedCustomer.changeReason || ''
      });
    }
  }, [isCreateMode, selectedCustomer, userHasMadeSelections]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.customerName.trim()) {
      errors.push('Customer name is required.');
    }
    
    if (selectedArea && !selectedTown) {
      errors.push('Please select a town.');
    }
    
    if (!selectedArea) {
      errors.push('Please select an area.');
    }
    
    if (!selectedClassification) {
      errors.push('Please select a customer classification.');
    }
    
    if (!selectedType) {
      errors.push('Please select a customer type.');
    }
    
    // Validate change reason for non-create mode (only required for non-admin users)
    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }

    // Check for duplicate terms
    const termsIds = customerTerms.map(term => term.termsId);
    const uniqueTermsIds = new Set(termsIds);
    if (termsIds.length !== uniqueTermsIds.size) {
      errors.push('Duplicate customer terms detected. Please remove duplicate terms.');
    }
    
    // Check for duplicate deals
    const dealIds = customerDeals.map(deal => deal.productDealId);
    const uniqueDealIds = new Set(dealIds);
    if (dealIds.length !== uniqueDealIds.size) {
      errors.push('Duplicate customer deals detected. Please remove duplicate deals.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setValidationErrors([]);
    
    if (isCreateMode) {
      const newCustomer = {
        customerName: formData.customerName,
        email: formData.email,
        address1: formData.address1,
        address2: formData.address2,
        balance: parseFloat(formData.balance) || 0,
        contactNo: formData.contactNo,
        contactPerson: formData.contactPerson,
        townId: selectedTown?.id || '',
        townName: selectedTown?.name || '',
        creditLimit: parseFloat(formData.creditLimit) || 0,
        customerCredit: parseFloat(formData.customerCredit) || 0,
        tinNumber: formData.tinNumber,
        areaId: selectedArea?.id || '',
        areaName: selectedArea?.name || '',
        customerClassificationId: selectedClassification?.id || '',
        customerClassificationName: selectedClassification?.name || '',
        customerTypeId: selectedType?.id || '',
        customerTypeName: selectedType?.name || '',
        status: StatusEnum.NEW_RECORD,
        customerTerms: customerTerms,
        customerDeals: customerDeals,
        changeReason: '' // No change reason needed for new records
      };
      
      // Debug logging
      console.log('CREATE - customerTerms being sent:', customerTerms);
      console.log('CREATE - customerDeals being sent:', customerDeals);
      console.log('CREATE - customerTerms length:', customerTerms.length);
      console.log('CREATE - customerDeals length:', customerDeals.length);
      console.log('CREATE - Full newCustomer payload:', newCustomer);
      
      onSave(newCustomer as CustomerDto);
    } else {
      const updatedCustomer = {
        ...selectedCustomer,
        customerName: formData.customerName,
        email: formData.email,
        address1: formData.address1,
        address2: formData.address2,
        balance: parseFloat(formData.balance) || 0,
        contactNo: formData.contactNo,
        contactPerson: formData.contactPerson,
        townId: selectedTown?.id || '',
        townName: selectedTown?.name || '',
        creditLimit: parseFloat(formData.creditLimit) || 0,
        customerCredit: parseFloat(formData.customerCredit) || 0,
        tinNumber: formData.tinNumber,
        areaId: selectedArea?.id || '',
        areaName: selectedArea?.name || '',
        customerClassificationId: selectedClassification?.id || '',
        customerClassificationName: selectedClassification?.name || '',
        customerTypeId: selectedType?.id || '',
        customerTypeName: selectedType?.name || '',
        status: StatusEnum.ACTIVE,
        customerTerms: customerTerms,
        customerDeals: customerDeals,
        changeReason: formData.changeReason || ''
      };
      
      // Debug logging
      console.log('customerTerms being sent:', customerTerms);
      console.log('customerDeals being sent:', customerDeals);
      console.log('customerTerms length:', customerTerms.length);
      console.log('customerDeals length:', customerDeals.length);
      console.log('Full updatedCustomer payload:', updatedCustomer);
      
      onSave(updatedCustomer as CustomerDto);
    }
  };

  const handleTownSelect = (id: string, name: string, additionalData?: any) => {
    setSelectedTown({ id, name });
    setUserHasMadeSelections(true);
  };

  const handleAreaSelect = (id: string, name: string, additionalData?: any) => {
    setSelectedArea({ id, name });
    // Clear town selection when area changes
    setSelectedTown(null);
    setUserHasMadeSelections(true);
  };

  const handleClassificationSelect = (id: string, name: string, additionalData?: any) => {
    setSelectedClassification({ id, name });
    setUserHasMadeSelections(true);
  };

  const handleTypeSelect = (id: string, name: string, additionalData?: any) => {
    setSelectedType({ id, name });
    setUserHasMadeSelections(true);
  };

  const handleClearTown = () => {
    setSelectedTown(null);
  };

  const handleClearArea = () => {
    setSelectedArea(null);
  };

  const handleClearClassification = () => {
    setSelectedClassification(null);
  };

  const handleClearType = () => {
    setSelectedType(null);
  };

  // Customer Terms management
  const addCustomerTerms = () => {
    setShowTermsModal(true);
  };

  const handleTermsSelect = (id: string, name: string, additionalData?: any) => {
    // Check if terms is already added
    const existingTerms = customerTerms.find(term => term.termsId === id);
    if (existingTerms) {
      // Add validation error for duplicate terms
      setValidationErrors(['This customer terms has already been added. Please select different terms.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newTerms: CustomerTermsDetailsDto = {
      termsId: id,
      termsName: name,
      days: additionalData?.days || 0 // Use actual days from the terms data
    };
    setCustomerTerms([...customerTerms, newTerms]);
  };

  const removeCustomerTerms = (index: number) => {
    setCustomerTerms(customerTerms.filter((_, i) => i !== index));
  };

  // Customer Deals management
  const addCustomerDeals = () => {
    setShowDealsModal(true);
  };

  const handleDealsSelect = (id: string, name: string, additionalData?: any) => {
    // Check if deal is already added
    const existingDeal = customerDeals.find(deal => deal.productDealId === id);
    if (existingDeal) {
      // Add validation error for duplicate deals
      setValidationErrors(['This customer deal has already been added. Please select a different deal.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newDeal: CustomerDealsDetailsDto = {
      productDealId: id,
      productDealName: name,
      additionalQty: additionalData?.additionalQty || 0,
      minQty: additionalData?.minQty || 0
    };
    setCustomerDeals([...customerDeals, newDeal]);
  };

  const removeCustomerDeals = (index: number) => {
    setCustomerDeals(customerDeals.filter((_, i) => i !== index));
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
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedCustomer && 
       (selectedCustomer.status === StatusEnum.FOR_APPROVAL || selectedCustomer.status === StatusEnum.NEW_RECORD || selectedCustomer.status === StatusEnum.FOR_DELETION) && (
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
            {selectedCustomer.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Details Container with Inner Tabs */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
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
            Customer Details
          </h3>
        </div>

        {/* Inner Tabs Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          {[
            { id: 'record-details', label: 'Record Details', icon: '📝' },
            { id: 'customer-terms', label: 'Customer Terms', icon: '📋' },
            { id: 'customer-deals', label: 'Customer Deals', icon: '🎯' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInnerTab(tab.id as InnerTabType)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeInnerTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeInnerTab === tab.id ? 'white' : '#6b7280',
                borderBottom: activeInnerTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeInnerTab === 'record-details' && (
          <div>
        {/* Basic Information */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Customer Name *
          </label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            placeholder={isCreateMode ? 'Enter customer name' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder={isCreateMode ? 'Enter email address' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Contact Number
          </label>
          <input
            type="tel"
            name="contactNo"
            value={formData.contactNo}
            onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
            placeholder={isCreateMode ? 'Enter contact number' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Contact Person
          </label>
          <input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
            placeholder={isCreateMode ? 'Enter contact person' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* Address Information */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Address 1
          </label>
          <input
            type="text"
            name="address1"
            value={formData.address1}
            onChange={(e) => setFormData(prev => ({ ...prev, address1: e.target.value }))}
            placeholder={isCreateMode ? 'Enter address 1' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Address 2
          </label>
          <input
            type="text"
            name="address2"
            value={formData.address2}
            onChange={(e) => setFormData(prev => ({ ...prev, address2: e.target.value }))}
            placeholder={isCreateMode ? 'Enter address 2' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* Selection Fields */}
        <SelectionField
          label="Area *"
          selectedItem={selectedArea}
          onSelect={() => setShowAreaModal(true)}
          onClear={handleClearArea}
          buttonText="Select Area"
        />

        <SelectionField
          label="Town *"
          selectedItem={selectedTown}
          onSelect={() => setShowTownModal(true)}
          onClear={handleClearTown}
          buttonText="Select Town"
          disabled={!selectedArea}
        />

        <SelectionField
          label="Customer Classification *"
          selectedItem={selectedClassification}
          onSelect={() => setShowClassificationModal(true)}
          onClear={handleClearClassification}
          buttonText="Select Classification"
        />

        <SelectionField
          label="Customer Type *"
          selectedItem={selectedType}
          onSelect={() => setShowTypeModal(true)}
          onClear={handleClearType}
          buttonText="Select Type"
        />

        {/* Financial Information */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Balance
          </label>
          <input
            type="number"
            name="balance"
            value={formData.balance}
            onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
            placeholder={isCreateMode ? 'Enter balance' : ''}
            min="0"
            step="0.01"
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Credit Limit
          </label>
          <input
            type="number"
            name="creditLimit"
            value={formData.creditLimit}
            onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: e.target.value }))}
            placeholder={isCreateMode ? 'Enter credit limit' : ''}
            min="0"
            step="0.01"
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            Customer Credit
          </label>
          <input
            type="number"
            name="customerCredit"
            value={formData.customerCredit}
            onChange={(e) => setFormData(prev => ({ ...prev, customerCredit: e.target.value }))}
            placeholder={isCreateMode ? 'Enter customer credit' : ''}
            min="0"
            step="0.01"
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
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
            TIN Number
          </label>
          <input
            type="text"
            name="tinNumber"
            value={formData.tinNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, tinNumber: e.target.value }))}
            placeholder={isCreateMode ? 'Enter TIN number' : ''}
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* Status Display for Edit Mode */}
        {!isCreateMode && selectedCustomer && (
          <div style={{ marginBottom: '20px' }}>
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
              {selectedCustomer.status || 'ACTIVE'}
            </div>
          </div>
        )}

        {/* Change Reason Field - Only show for non-create mode */}
        {!isCreateMode && (
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
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
                color: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
                transition: 'all 0.2s ease',
                resize: 'vertical',
                minHeight: '80px',
                cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
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
                : 'This field is required when making changes to the customer record.'
              }
            </div>
          </div>
        )}
      </div>
        )}

        {/* Customer Terms Tab */}
        {activeInnerTab === 'customer-terms' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Customer Terms
              </h4>
              <button
                type="button"
                onClick={addCustomerTerms}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }}
              >
                <span>+</span>
                Add Terms
              </button>
            </div>

            {customerTerms.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                <p>No customer terms added yet. Click "Add Terms" to get started.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {customerTerms.map((term, index) => (
                  <div key={index} style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {term.termsName || 'Unnamed Terms'}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeCustomerTerms(index)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                      >
                        <span>🗑️</span>
                        Remove
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Days
                        </label>
                        <div style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#374151'
                        }}>
                          {term.days || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customer Deals Tab */}
        {activeInnerTab === 'customer-deals' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Customer Deals
              </h4>
              <button
                type="button"
                onClick={addCustomerDeals}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }}
              >
                <span>+</span>
                Add Deal
              </button>
            </div>

            {customerDeals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
                <p>No customer deals added yet. Click "Add Deal" to get started.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {customerDeals.map((deal, index) => (
                  <div key={index} style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {deal.productDealName || 'Unnamed Deal'}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeCustomerDeals(index)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                      >
                        <span>🗑️</span>
                        Remove
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Minimum Quantity
                        </label>
                        <div style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#374151'
                        }}>
                          {deal.minQty || 0}
                        </div>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Additional Quantity
                        </label>
                        <div style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#374151'
                        }}>
                          {deal.additionalQty || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '24px'
      }}>
        {!isCreateMode && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedCustomer?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedCustomer?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedCustomer?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedCustomer?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedCustomer?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedCustomer?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCustomer?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
          >
            Delete
          </button>
        )}
        
        <div style={{
          display: 'flex',
          gap: '12px',
          marginLeft: 'auto'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedCustomer?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedCustomer?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Customer' : 'Save Changes'}
          </button>
        </div>
       </div>
     </form>

     {/* Searchable Selection Modals */}
     <CustomerSearchableSelectionModal
       show={showTownModal}
       title="Select Town"
       type="town"
       selectedValue={selectedTown?.id || null}
       areaId={selectedArea?.id}
       onSelect={handleTownSelect}
       onClose={() => setShowTownModal(false)}
     />

     <CustomerSearchableSelectionModal
       show={showAreaModal}
       title="Select Area"
       type="area"
       selectedValue={selectedArea?.id || null}
       onSelect={handleAreaSelect}
       onClose={() => setShowAreaModal(false)}
     />

     <CustomerSearchableSelectionModal
       show={showClassificationModal}
       title="Select Customer Classification"
       type="classification"
       selectedValue={selectedClassification?.id || null}
       onSelect={handleClassificationSelect}
       onClose={() => setShowClassificationModal(false)}
     />

     <CustomerSearchableSelectionModal
       show={showTypeModal}
       title="Select Customer Type"
       type="type"
       selectedValue={selectedType?.id || null}
       onSelect={handleTypeSelect}
       onClose={() => setShowTypeModal(false)}
     />

     <CustomerSearchableSelectionModal
       show={showTermsModal}
       title="Select Customer Terms"
       type="terms"
       selectedValue={null}
       onSelect={handleTermsSelect}
       onClose={() => setShowTermsModal(false)}
     />

     <CustomerSearchableSelectionModal
       show={showDealsModal}
       title="Select Customer Deal"
       type="deals"
       selectedValue={null}
       onSelect={handleDealsSelect}
       onClose={() => setShowDealsModal(false)}
     />
   </>
  );
}
