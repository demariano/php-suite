'use client';

import {
    AreaDto,
    CustomerClassificationDto,
    CustomerDto,
    CustomerTypeDto,
    StatusEnum,
    TermsDto,
} from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';
import { useNumberFormatting } from '../../../components/NumberFormatting';
import {
    AreaSearchableSelectionModal,
    CustomerClassificationSearchableSelectionModal,
    CustomerTypeSearchableSelectionModal,
    ProductSearchableSelectionModal,
    TermsSearchableSelectionModal,
    TownSelectionModal,
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
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    activeTab?: 'details' | 'approval';
    onApprove?: () => void;
    onDeny?: () => void;
}

export default function CustomerForm({
    isCreateMode,
    selectedCustomer,
    successMessage,
    onSave,
    onDelete,
    onReactivate,
    onCancel,
    isAdminUser = false,
    activeTab = 'details',
    onApprove,
    onDeny,
}: CustomerFormProps) {
    const [selectedArea, setSelectedArea] = useState<{ id: string; name: string } | null>(null);
    const [selectedClassification, setSelectedClassification] = useState<{ id: string; name: string } | null>(null);
    const [selectedType, setSelectedType] = useState<{ id: string; name: string } | null>(null);
    const [townName, setTownName] = useState<string>('');
    const [areaTowns, setAreaTowns] = useState<string[]>([]);
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showClassificationModal, setShowClassificationModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showDealsModal, setShowDealsModal] = useState(false);
    const [showTownModal, setShowTownModal] = useState(false);
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
        changeReason: '',
    });

    // Number formatting hooks for monetary fields
    const balanceFormatting = useNumberFormatting(formData.balance);
    const creditLimitFormatting = useNumberFormatting(formData.creditLimit);
    const customerCreditFormatting = useNumberFormatting(formData.customerCredit);

    // CRITICAL: Field editing permissions based on status
    // INACTIVE records cannot have fields edited (only reactivation allowed)
    // See ACCOUNTS_MODULE_REFERENCE.md - Form Field State for INACTIVE Records
    // - Create mode: All fields editable
    // - ACTIVE status: All fields editable
    // - INACTIVE status: No fields editable (only REACTIVATE button enabled)
    // - Other statuses: Not editable
    const canEditFields = isCreateMode || selectedCustomer?.status === StatusEnum.ACTIVE;

    // Set initial values when editing (only when user hasn't made selections)
    useEffect(() => {
        if (!isCreateMode && selectedCustomer && !userHasMadeSelections) {
            if (selectedCustomer.townName) {
                setTownName(selectedCustomer.townName);
            }
            if (selectedCustomer.areaId && selectedCustomer.areaName) {
                setSelectedArea({
                    id: selectedCustomer.areaId,
                    name: selectedCustomer.areaName,
                });
            }
            if (selectedCustomer.townName) {
                setTownName(selectedCustomer.townName);
            }
            if (selectedCustomer.customerClassificationId && selectedCustomer.customerClassificationName) {
                setSelectedClassification({
                    id: selectedCustomer.customerClassificationId,
                    name: selectedCustomer.customerClassificationName,
                });
            }
            if (selectedCustomer.customerTypeId && selectedCustomer.customerTypeName) {
                setSelectedType({
                    id: selectedCustomer.customerTypeId,
                    name: selectedCustomer.customerTypeName,
                });
            }
            // Initialize customer terms and deals
            if (selectedCustomer.customerTerms) {
                setCustomerTerms(
                    selectedCustomer.customerTerms.map((term) => ({
                        termsId: term.termsId,
                        termsName: term.termsName,
                        days: term.days,
                    }))
                );
            }
            if (selectedCustomer.customerProductDeals) {
                setCustomerDeals(
                    selectedCustomer.customerProductDeals.map((deal) => ({
                        productId: deal.productId,
                        productName: deal.productName,
                        productDealId: deal.productDealId,
                        productDealName: deal.productDealName,
                        additionalQty: deal.additionalQty,
                        minQty: deal.minQty,
                    }))
                );
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
                changeReason: selectedCustomer.changeReason || '',
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

        // Town is now optional text input, no validation needed

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
        const termsIds = customerTerms.map((term) => term.termsId);
        const uniqueTermsIds = new Set(termsIds);
        if (termsIds.length !== uniqueTermsIds.size) {
            errors.push('Duplicate customer terms detected. Please remove duplicate terms.');
        }

        // Check for duplicate deals using composite key (productId + productDealId)
        const dealKeys = customerDeals.map((deal) => `${deal.productId}|${deal.productDealId}`);
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
                townId: '',
                townName: townName || '',
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
                changeReason: '', // No change reason needed for new records
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
                townId: '',
                townName: townName || '',
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
                changeReason: formData.changeReason || '',
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

    const handleAreaSelect = (area: AreaDto) => {
        setSelectedArea({ id: area.areaId, name: area.areaName || '' });
        setAreaTowns(area.towns || []);
        setTownName(''); // Clear town when area changes
        setUserHasMadeSelections(true);
    };

    const handleClassificationSelect = (classification: CustomerClassificationDto) => {
        setSelectedClassification({
            id: classification.customerClassificationId,
            name: classification.customerClassificationName || '',
        });
        setUserHasMadeSelections(true);
    };

    const handleTypeSelect = (customerType: CustomerTypeDto) => {
        setSelectedType({ id: customerType.customerTypeId, name: customerType.customerTypeName || '' });
        setUserHasMadeSelections(true);
    };

    const handleClearArea = () => {
        setSelectedArea(null);
        setAreaTowns([]);
        setTownName(''); // Clear town when area is cleared
    };

    const handleClearClassification = () => {
        setSelectedClassification(null);
    };

    const handleClearType = () => {
        setSelectedType(null);
    };

    const handleClearTown = () => {
        setTownName('');
        setUserHasMadeSelections(true);
    };

    // Customer Terms management
    const addCustomerTerms = () => {
        setShowTermsModal(true);
    };

    const handleTermsSelect = (terms: TermsDto) => {
        // Check if terms is already added
        const existingTerms = customerTerms.find((term) => term.termsId === terms.termsId);
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
            days: terms.days || 0, // Use actual days from the terms data
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

    const handleDealsSelect = (product: {
        productId: string;
        productName?: string;
        productDeals?: { productDealId: string; productDealName?: string; additionalQty?: number; minQty?: number }[];
        selectedDealId?: string;
    }) => {
        // Find the selected deal - use selectedDealId if provided, otherwise use first deal
        const selectedDeal = product.selectedDealId
            ? product.productDeals?.find((d: { productDealId: string }) => d.productDealId === product.selectedDealId)
            : product.productDeals && product.productDeals.length > 0
            ? product.productDeals[0]
            : null;

        // Check if this specific product deal combination is already added
        const existingDeal = customerDeals.find(
            (customerDeal) =>
                customerDeal.productId === product.productId &&
                customerDeal.productDealId === selectedDeal?.productDealId
        );
        if (existingDeal) {
            // Add validation error for duplicate product deal combinations
            setValidationErrors([
                'This product deal combination has already been added. Please select a different product or deal.',
            ]);
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
            minQty: selectedDeal?.minQty || 0,
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
                    <div
                        style={{
                            backgroundColor: '#dcfce7',
                            border: '2px solid #16a34a',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            animation: 'pulse 2s infinite',
                        }}
                    >
                        <div
                            style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#16a34a',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            ✓
                        </div>
                        <span
                            style={{
                                color: '#166534',
                                fontSize: '14px',
                                fontWeight: '600',
                            }}
                        >
                            {successMessage}
                        </span>
                    </div>
                )}

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                    <div
                        style={{
                            backgroundColor: '#fef2f2',
                            border: '2px solid #dc2626',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '8px',
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <span style={{ color: '#dc2626', fontWeight: '600' }}>
                                Please fix the following errors:
                            </span>
                        </div>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '20px',
                                color: '#dc2626',
                            }}
                        >
                            {validationErrors.map((error, index) => (
                                <li key={index} style={{ marginBottom: '4px' }}>
                                    {error}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Change Reason Field - First component when displayed */}
                {!isCreateMode && !isAdminUser && (
                    <ChangeReasonField
                        value={formData.changeReason}
                        onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
                        disabled={!canEditFields}
                    />
                )}

                {/* Details Container */}
                <div className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-blue-600">Basic Information</h3>
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
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                                        }
                                        placeholder={isCreateMode ? 'Enter customer name' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                {/* Email */}
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder={isCreateMode ? 'Enter email address' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                {/* Contact Number */}
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Contact Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="contactNo"
                                        value={formData.contactNo}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, contactNo: e.target.value }))
                                        }
                                        placeholder={isCreateMode ? 'Enter contact number' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                {/* Contact Person */}
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                                        }
                                        placeholder={isCreateMode ? 'Enter contact person' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-blue-600">Address Information</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Address 1
                                    </label>
                                    <input
                                        type="text"
                                        name="address1"
                                        value={formData.address1}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, address1: e.target.value }))}
                                        placeholder={isCreateMode ? 'Enter address 1' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Address 2
                                    </label>
                                    <input
                                        type="text"
                                        name="address2"
                                        value={formData.address2}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, address2: e.target.value }))}
                                        placeholder={isCreateMode ? 'Enter address 2' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                {/* TIN Number */}
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        TIN Number
                                    </label>
                                    <input
                                        type="text"
                                        name="tinNumber"
                                        value={formData.tinNumber}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, tinNumber: e.target.value }))
                                        }
                                        placeholder={isCreateMode ? 'Enter TIN number' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Classification Section */}
                    <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-blue-600">Location & Classification</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectionField
                                    label="Area"
                                    selectedItem={selectedArea}
                                    onSelect={() => setShowAreaModal(true)}
                                    onClear={handleClearArea}
                                    buttonText="Select Area"
                                    disabled={!canEditFields}
                                />

                                <SelectionField
                                    label="Town"
                                    selectedItem={townName ? { id: townName, name: townName } : null}
                                    onSelect={() => setShowTownModal(true)}
                                    onClear={handleClearTown}
                                    buttonText="Select Town"
                                    disabled={!canEditFields || !selectedArea}
                                />

                                <SelectionField
                                    label="Customer Classification"
                                    selectedItem={selectedClassification}
                                    onSelect={() => setShowClassificationModal(true)}
                                    onClear={handleClearClassification}
                                    buttonText="Select Classification"
                                    disabled={!canEditFields}
                                />

                                <SelectionField
                                    label="Customer Type"
                                    selectedItem={selectedType}
                                    onSelect={() => setShowTypeModal(true)}
                                    onClear={handleClearType}
                                    buttonText="Select Type"
                                    disabled={!canEditFields}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Information Section */}
                    <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-blue-600">Financial Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Balance (Auto-calculated)
                                    </label>
                                    <input
                                        type="text"
                                        name="balance"
                                        value={balanceFormatting.value}
                                        onChange={(e) => {
                                            balanceFormatting.onChange(e);
                                            setFormData((prev) => ({ ...prev, balance: e.target.value }));
                                        }}
                                        onFocus={balanceFormatting.onFocus}
                                        onBlur={(e) => {
                                            balanceFormatting.onBlur(e);
                                            setFormData((prev) => ({
                                                ...prev,
                                                balance: balanceFormatting.numericValue.toString(),
                                            }));
                                        }}
                                        placeholder="Populated by internal process"
                                        disabled={true}
                                        className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 border-gray-200 bg-white text-gray-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Credit Limit
                                    </label>
                                    <input
                                        type="text"
                                        name="creditLimit"
                                        value={creditLimitFormatting.value}
                                        onChange={(e) => {
                                            creditLimitFormatting.onChange(e);
                                            setFormData((prev) => ({ ...prev, creditLimit: e.target.value }));
                                        }}
                                        onFocus={creditLimitFormatting.onFocus}
                                        onBlur={(e) => {
                                            creditLimitFormatting.onBlur(e);
                                            setFormData((prev) => ({
                                                ...prev,
                                                creditLimit: creditLimitFormatting.numericValue.toString(),
                                            }));
                                        }}
                                        placeholder={isCreateMode ? 'Enter credit limit' : ''}
                                        disabled={!canEditFields}
                                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                                            !canEditFields
                                                ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                                        }`}
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Customer Credit (Auto-calculated)
                                    </label>
                                    <input
                                        type="text"
                                        name="customerCredit"
                                        value={customerCreditFormatting.value}
                                        onChange={(e) => {
                                            customerCreditFormatting.onChange(e);
                                            setFormData((prev) => ({ ...prev, customerCredit: e.target.value }));
                                        }}
                                        onFocus={customerCreditFormatting.onFocus}
                                        onBlur={(e) => {
                                            customerCreditFormatting.onBlur(e);
                                            setFormData((prev) => ({
                                                ...prev,
                                                customerCredit: customerCreditFormatting.numericValue.toString(),
                                            }));
                                        }}
                                        placeholder="Populated by internal process"
                                        disabled={true}
                                        className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 border-gray-200 bg-white text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Terms Section */}
                    <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-blue-600">Customer Terms</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addCustomerTerms}
                                    disabled={!canEditFields}
                                    className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                                        !canEditFields
                                            ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
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
                                                                disabled={
                                                                    !isCreateMode &&
                                                                    selectedCustomer?.status !== StatusEnum.ACTIVE
                                                                }
                                                                className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                                                    !isCreateMode &&
                                                                    selectedCustomer?.status !== StatusEnum.ACTIVE
                                                                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                                                        : 'bg-red-600 hover:bg-red-700'
                                                                }`}
                                                                title="Remove"
                                                            >
                                                                <svg
                                                                    className="w-5 h-5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
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
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-blue-600">Product Deals</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addCustomerDeals}
                                    disabled={!canEditFields}
                                    className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                                        !canEditFields
                                            ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
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
                                                                disabled={
                                                                    !isCreateMode &&
                                                                    selectedCustomer?.status !== StatusEnum.ACTIVE
                                                                }
                                                                className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                                                    !isCreateMode &&
                                                                    selectedCustomer?.status !== StatusEnum.ACTIVE
                                                                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                                                                        : 'bg-red-600 hover:bg-red-700'
                                                                }`}
                                                                title="Remove"
                                                            >
                                                                <svg
                                                                    className="w-5 h-5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
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
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        {!isCreateMode && selectedCustomer?.status === StatusEnum.ACTIVE ? (
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
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                                Delete
                            </button>
                        ) : !isCreateMode &&
                          selectedCustomer?.status === StatusEnum.INACTIVE &&
                          isAdminUser &&
                          onReactivate ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onReactivate();
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Reactivate
                            </button>
                        ) : (
                            <div className="hidden sm:block" />
                        )}

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            {/* Save button disabled for INACTIVE records (only reactivation allowed) */}
                            {(isCreateMode || (canEditFields && selectedCustomer?.status !== StatusEnum.INACTIVE)) && (
                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {isCreateMode ? 'Create Customer' : 'Save Changes'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* Searchable Selection Modals */}

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

            <TownSelectionModal
                show={showTownModal}
                towns={areaTowns}
                selectedTown={townName}
                onSelect={(town) => {
                    setTownName(town);
                    setUserHasMadeSelections(true);
                    setShowTownModal(false);
                }}
                onCancel={() => setShowTownModal(false)}
            />
        </>
    );
}
