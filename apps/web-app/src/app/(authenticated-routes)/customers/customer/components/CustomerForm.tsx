'use client';

import { AreaDto, CustomerClassificationDto, CustomerDto, CustomerTypeDto, StatusEnum, TermsDto, TownDto } from '@data-access/index';
import { useEffect, useState } from 'react';
import { useNumberFormatting } from '../../../components/NumberFormatting';
import {
  AreaSearchableSelectionModal,
  CustomerClassificationSearchableSelectionModal,
  CustomerTypeSearchableSelectionModal,
  ProductSearchableSelectionModal,
  TermsSearchableSelectionModal,
  TownSearchableSelectionModal
} from '../../../search-modals';
import SelectionField from './SelectionField';

interface CustomerTermsDetailsDto {
  termsId: string;
  termsName?: string;
  days?: number;
}

interface CustomerDealsDetailsDto {
  productId: string;
  productName?: string;
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

  // Number formatting hooks for monetary fields
  const balanceFormatting = useNumberFormatting(formData.balance);
  const creditLimitFormatting = useNumberFormatting(formData.creditLimit);
  const customerCreditFormatting = useNumberFormatting(formData.customerCredit);

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
      if (selectedCustomer.customerProductDeals) {
        setCustomerDeals(selectedCustomer.customerProductDeals.map(deal => ({
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
    
    // Check for duplicate deals using composite key (productId + productDealId)
    const dealKeys = customerDeals.map(deal => `${deal.productId}|${deal.productDealId}`);
    const uniqueDealKeys = new Set(dealKeys);
    if (dealKeys.length !== uniqueDealKeys.size) {
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
        customerProductDeals: customerDeals,
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
        customerProductDeals: customerDeals,
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

  const handleTownSelect = (town: TownDto) => {
    setSelectedTown({ id: town.townId, name: town.townName || '' });
    setUserHasMadeSelections(true);
  };

  const handleAreaSelect = (area: AreaDto) => {
    setSelectedArea({ id: area.areaId, name: area.areaName || '' });
    // Clear town selection when area changes
    setSelectedTown(null);
    setUserHasMadeSelections(true);
  };

  const handleClassificationSelect = (classification: CustomerClassificationDto) => {
    setSelectedClassification({ id: classification.customerClassificationId, name: classification.customerClassificationName || '' });
    setUserHasMadeSelections(true);
  };

  const handleTypeSelect = (customerType: CustomerTypeDto) => {
    setSelectedType({ id: customerType.customerTypeId, name: customerType.customerTypeName || '' });
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

  const handleTermsSelect = (terms: TermsDto) => {
    // Check if terms is already added
    const existingTerms = customerTerms.find(term => term.termsId === terms.termsId);
    if (existingTerms) {
      // Add validation error for duplicate terms
      setValidationErrors(['This customer terms has already been added. Please select different terms.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newTerms: CustomerTermsDetailsDto = {
      termsId: terms.termsId,
      termsName: terms.termsName,
      days: terms.days || 0 // Use actual days from the terms data
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

  const handleDealsSelect = (product: { productId: string; productName?: string; productDeals?: { productDealId: string; productDealName?: string; additionalQty?: number; minQty?: number }[]; selectedDealId?: string }) => {
    // Find the selected deal - use selectedDealId if provided, otherwise use first deal
    const selectedDeal = product.selectedDealId 
      ? product.productDeals?.find((d: { productDealId: string }) => d.productDealId === product.selectedDealId)
      : (product.productDeals && product.productDeals.length > 0 ? product.productDeals[0] : null);
    
    // Check if this specific product deal combination is already added
    const existingDeal = customerDeals.find(customerDeal => 
      customerDeal.productId === product.productId && 
      customerDeal.productDealId === selectedDeal?.productDealId
    );
    if (existingDeal) {
      // Add validation error for duplicate product deal combinations
      setValidationErrors(['This product deal combination has already been added. Please select a different product or deal.']);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    const newDeal: CustomerDealsDetailsDto = {
      productId: product.productId,
      productName: product.productName,
      productDealId: selectedDeal?.productDealId || '',
      productDealName: selectedDeal?.productDealName || '',
      additionalQty: selectedDeal?.additionalQty || 0,
      minQty: selectedDeal?.minQty || 0
    };
    setCustomerDeals([...customerDeals, newDeal]);
  };

  const removeCustomerDeals = (index: number) => {
    setCustomerDeals(customerDeals.filter((_, i) => i !== index));
  };

  // Status badge helper function with enhanced styling and readable text
  const getStatusBadge = (status: StatusEnum) => {
    // Convert status enum to readable text
    const getStatusText = (s: StatusEnum): string => {
      switch (s) {
        case StatusEnum.ACTIVE:
          return 'Active';
        case StatusEnum.FOR_APPROVAL:
          return 'For Approval';
        case StatusEnum.FOR_DELETION:
          return 'For Deletion';
        case StatusEnum.NEW_RECORD:
          return 'New Record';
        default:
          return s;
      }
    };

    const statusText = getStatusText(status);
    
    // Enhanced styling with shadows and better colors
    let badgeClasses = "";
    let dotColor = "";
    let bgColor = "";
    let textColor = "";
    
    if (status === StatusEnum.ACTIVE) {
      badgeClasses = "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/50";
      dotColor = "bg-white";
      bgColor = "#10b981";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      badgeClasses = "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/50";
      dotColor = "bg-white";
      bgColor = "#f59e0b";
      textColor = "#ffffff";
    } else if (status === StatusEnum.FOR_DELETION) {
      badgeClasses = "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/50";
      dotColor = "bg-white";
      bgColor = "#ef4444";
      textColor = "#ffffff";
    } else if (status === StatusEnum.NEW_RECORD) {
      badgeClasses = "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/50";
      dotColor = "bg-white";
      bgColor = "#3b82f6";
      textColor = "#ffffff";
    } else {
      badgeClasses = "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-500/50";
      dotColor = "bg-white";
      bgColor = "#6b7280";
      textColor = "#ffffff";
    }
    
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${badgeClasses}`} style={{ backgroundColor: bgColor, color: textColor }}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        {statusText}
      </span>
    );
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
      
      {/* Status Display for Edit Mode - Prominently displayed at top */}
      {!isCreateMode && selectedCustomer && (
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 shadow-md mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center">
              {getStatusBadge(selectedCustomer.status || StatusEnum.ACTIVE)}
            </div>
          </div>
        </div>
      )}
      
      {/* Details Container */}
      <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Basic Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Name */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter customer name' : ''}
                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Email */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter email address' : ''}
                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-indigo-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Contact Number */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter contact number' : ''}
                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-purple-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              {/* Contact Person */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter contact person' : ''}
                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-green-300 group-hover:shadow-md'
                  }`}
                />
              </div>
            </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    Address Information
                  </h3>
                </div>
                <div className="space-y-4">
                <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                Address 1
              </label>
              <input
                type="text"
                name="address1"
                value={formData.address1}
                onChange={(e) => setFormData(prev => ({ ...prev, address1: e.target.value }))}
                placeholder={isCreateMode ? 'Enter address 1' : ''}
                disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                    ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-pink-300 group-hover:shadow-md'
                }`}
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                Address 2
              </label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={(e) => setFormData(prev => ({ ...prev, address2: e.target.value }))}
                placeholder={isCreateMode ? 'Enter address 2' : ''}
                disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                    ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-rose-300 group-hover:shadow-md'
                }`}
              />
            </div>

              {/* TIN Number */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                  TIN Number
                </label>
                <input
                  type="text"
                  name="tinNumber"
                  value={formData.tinNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, tinNumber: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter TIN number' : ''}
                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                      ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-teal-300 group-hover:shadow-md'
                  }`}
                />
              </div>
              </div>
            </div>
            </div>

            {/* Location & Classification Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Location & Classification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectionField
              label="Area"
              selectedItem={selectedArea}
              onSelect={() => setShowAreaModal(true)}
              onClear={handleClearArea}
              buttonText="Select Area"
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            />

            <SelectionField
              label="Town"
              selectedItem={selectedTown}
              onSelect={() => setShowTownModal(true)}
              onClear={handleClearTown}
              buttonText="Select Town"
              disabled={(!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE) || !selectedArea}
            />

            <SelectionField
              label="Customer Classification"
              selectedItem={selectedClassification}
              onSelect={() => setShowClassificationModal(true)}
              onClear={handleClearClassification}
              buttonText="Select Classification"
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            />

            <SelectionField
              label="Customer Type"
              selectedItem={selectedType}
              onSelect={() => setShowTypeModal(true)}
              onClear={handleClearType}
              buttonText="Select Type"
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
            />
              </div>
                </div>
              </div>

            {/* Financial Information Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Financial Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Balance
            </label>
            <input
              type="text"
              name="balance"
              value={balanceFormatting.value}
              onChange={(e) => {
                balanceFormatting.onChange(e);
                setFormData(prev => ({ ...prev, balance: e.target.value }));
              }}
              onFocus={balanceFormatting.onFocus}
              onBlur={(e) => {
                balanceFormatting.onBlur(e);
                setFormData(prev => ({ ...prev, balance: balanceFormatting.numericValue.toString() }));
              }}
              placeholder={isCreateMode ? 'Enter balance' : ''}
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                  ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-emerald-300 group-hover:shadow-md'
              }`}
            />
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
              Credit Limit
            </label>
            <input
              type="text"
              name="creditLimit"
              value={creditLimitFormatting.value}
              onChange={(e) => {
                creditLimitFormatting.onChange(e);
                setFormData(prev => ({ ...prev, creditLimit: e.target.value }));
              }}
              onFocus={creditLimitFormatting.onFocus}
              onBlur={(e) => {
                creditLimitFormatting.onBlur(e);
                setFormData(prev => ({ ...prev, creditLimit: creditLimitFormatting.numericValue.toString() }));
              }}
              placeholder={isCreateMode ? 'Enter credit limit' : ''}
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                  ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-cyan-300 group-hover:shadow-md'
              }`}
            />
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
              Customer Credit
            </label>
            <input
              type="text"
              name="customerCredit"
              value={customerCreditFormatting.value}
              onChange={(e) => {
                customerCreditFormatting.onChange(e);
                setFormData(prev => ({ ...prev, customerCredit: e.target.value }));
              }}
              onFocus={customerCreditFormatting.onFocus}
              onBlur={(e) => {
                customerCreditFormatting.onBlur(e);
                setFormData(prev => ({ ...prev, customerCredit: customerCreditFormatting.numericValue.toString() }));
              }}
              placeholder={isCreateMode ? 'Enter customer credit' : ''}
              disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                  ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 group-hover:border-sky-300 group-hover:shadow-md'
              }`}
            />
          </div>
        </div>
              </div>
            </div>

            {/* Change Reason and Modification Made Field - Only show for non-create mode and non-admin users */}
            {!isCreateMode && !isAdminUser && (
              <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Change Reason and Modification Made
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
                  This field is required when making changes to the customer record.
                </div>
              </div>
            )}

            {/* Customer Terms Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Customer Terms
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomerTerms}
                    disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                    className={`px-4 py-2 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 ${
                      !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Terms
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {customerTerms.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 text-base">
                      No customer terms added yet. Click &quot;Add Terms&quot; to get started.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-white border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                              Terms Name
                            </th>
                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                              Days
                            </th>
                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {customerTerms.map((term, index) => (
                            <tr 
                              key={index}
                              className="transition-all duration-200 bg-white hover:bg-gray-50"
                            >
                              <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                {term.termsName || 'Unnamed Terms'}
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600">
                                {term.days || 0}
                              </td>
                              <td className="px-6 py-5">
                                <button
                                  type="button"
                                  onClick={() => removeCustomerTerms(index)}
                                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                                  className={`p-2 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center ${
                                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                                      ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                                      : 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105'
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

            {/* Product Deals Section */}
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Product Deals
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomerDeals}
                    disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                    className={`px-4 py-2 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 ${
                      !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Deal
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {customerDeals.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 text-base">
                      No customer deals added yet. Click &quot;Add Deal&quot; to get started.
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
                          {customerDeals.map((deal, index) => (
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
                                  onClick={() => removeCustomerDeals(index)}
                                  disabled={!isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE}
                                  className={`p-2 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center ${
                                    !isCreateMode && selectedCustomer?.status !== StatusEnum.ACTIVE
                                      ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                                      : 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105'
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
      </div>

        {/* Action Buttons */}
        {activeTab !== 'approval' && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
            {!isCreateMode && selectedCustomer?.status === StatusEnum.ACTIVE ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            ) : (
              <div></div>
            )}
            
            <div className="flex gap-3 items-center">
              {(isCreateMode || selectedCustomer?.status === StatusEnum.ACTIVE) && (
                <button
                  type="submit"
                  className="px-6 py-3 font-semibold rounded-xl shadow-lg transform transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isCreateMode ? 'Create Customer' : 'Save Changes'}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        )}
     </form>

     {/* Searchable Selection Modals */}
     <TownSearchableSelectionModal
       show={showTownModal}
       title="Select Town"
       areaId={selectedArea?.id || ''}
       selectedValue={selectedTown?.id || null}
       onSelect={handleTownSelect}
       onClose={() => setShowTownModal(false)}
     />

     <AreaSearchableSelectionModal
       show={showAreaModal}
       title="Select Area"
       selectedValue={selectedArea?.id || null}
       onSelect={handleAreaSelect}
       onClose={() => setShowAreaModal(false)}
     />

     <CustomerClassificationSearchableSelectionModal
       show={showClassificationModal}
       title="Select Customer Classification"
       selectedValue={selectedClassification?.id || null}
       onSelect={handleClassificationSelect}
       onClose={() => setShowClassificationModal(false)}
     />

     <CustomerTypeSearchableSelectionModal
       show={showTypeModal}
       title="Select Customer Type"
       selectedValue={selectedType?.id || null}
       onSelect={handleTypeSelect}
       onClose={() => setShowTypeModal(false)}
     />

     <TermsSearchableSelectionModal
       show={showTermsModal}
       title="Select Customer Terms"
       selectedValue={null}
       onSelect={handleTermsSelect}
       onClose={() => setShowTermsModal(false)}
     />

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
