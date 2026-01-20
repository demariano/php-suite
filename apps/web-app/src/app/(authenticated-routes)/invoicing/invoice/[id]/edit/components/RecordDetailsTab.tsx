'use client';

import {
    AreaApi,
    ContractApi,
    ContractDto,
    ContractProductDealDto,
    CustomerApi,
    CustomerDto,
    CustomerProductDealDto,
    InvoiceDto,
    PaymentStatusEnum,
    PrintStatusEnum,
    ProductPriceTypeDto,
    SalesTypeApi,
    SalesTypeDto,
    StatusEnum,
    StockApi,
    TermsDto,
    useSessionStore,
} from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../../components';
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
    onContractProductDealsChange?: (productDeals: ContractProductDealDto[] | null) => void;
    isReadOnly?: boolean;
}

export default function RecordDetailsTab({
    formData,
    onFormDataChange,
    isCreateMode,
    isAdminUser,
    onCustomerDealsChange,
    onContractProductDealsChange,
    isReadOnly = false,
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
                                contractName: '',
                            });
                            onContractProductDealsChange?.(null);
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
                areaName: customer.areaName,
            });

            // Store customer terms and deals
            if (customer.customerTerms && Array.isArray(customer.customerTerms) && customer.customerTerms.length > 0) {
                console.log('Setting customer terms:', customer.customerTerms);
                setCustomerTerms(customer.customerTerms);
            } else {
                console.log('No customer terms found for customer:', customer.customerName);
                setCustomerTerms([]);
            }

            if (
                customer.customerProductDeals &&
                Array.isArray(customer.customerProductDeals) &&
                customer.customerProductDeals.length > 0
            ) {
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
                            territoryManagerName: area.territoryManagerName || '',
                        });
                        console.log('Territory manager updated:', {
                            territoryManagerId: area.territoryManagerId,
                            territoryManagerName: area.territoryManagerName,
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
            salesTypeName: salesType.salesTypeName,
        });
    };

    // Handle product price type selection
    const handleProductPriceTypeSelect = (productPriceType: ProductPriceTypeDto) => {
        if (!isCreateMode) return;
        onFormDataChange({
            productPriceTypeId: productPriceType.productPriceTypeId,
            productPriceTypeName: productPriceType.productPriceTypeName,
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
            customerId: '',
            customerName: '',
            areaId: '',
            areaName: '',
            territoryManagerId: '',
            territoryManagerName: '',
            termsId: '',
            termsName: '',
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
            termsName: terms.termsName,
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
            // Fetch full contract details to get contractProductDeals
            const fullContract = await ContractApi.getContractById(contract.contractId);

            // Update form data with contract info
            onFormDataChange({
                contractId: contract.contractId,
                contractName: contract.contractName,
            });

            // Pass contract's productDeals array to parent
            if (fullContract.contractProductDeals && fullContract.contractProductDeals.length > 0) {
                onContractProductDealsChange?.(fullContract.contractProductDeals);
            } else {
                onContractProductDealsChange?.(null);
            }
        } catch (error) {
            console.error('Error processing contract selection:', error);
            setFlashNotification({
                title: 'Error',
                message: 'Failed to load contract details. Please try again.',
                alertType: 'error',
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
        onContractProductDealsChange?.(null);
    };

    // Handle customer change confirmation
    const handleConfirmCustomerChange = async () => {
        try {
            // Clear invoice details and reset amounts
            onFormDataChange({
                invoiceDetails: [],
                invoiceAmount: 0,
                taxAmount: 0,
                finalAmount: 0,
                totalAmountPaid: 0,
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
                alertType: 'error',
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
            // Clear invoice details and reset amounts
            onFormDataChange({
                invoiceDetails: [],
                invoiceAmount: 0,
                taxAmount: 0,
                finalAmount: 0,
                totalAmountPaid: 0,
            });

            // Process the pending contract action
            if (pendingContractAction) {
                await processContractSelection(pendingContractAction);
            } else {
                // Clear contract and update contractSales flag
                onFormDataChange({
                    contractId: '',
                    contractName: '',
                    contractSales: false,
                });
                onContractProductDealsChange?.(null);
            }

            // Close confirmation modal and reset pending action
            setShowContractChangeConfirmation(false);
            setPendingContractAction(null);
        } catch (error) {
            console.error('Error processing contract change:', error);
            setFlashNotification({
                title: 'Error',
                message: 'Failed to process contract change. Please try again.',
                alertType: 'error',
            });
        }
    };

    // Handle cancel contract change
    const handleCancelContractChange = () => {
        setShowContractChangeConfirmation(false);
        setPendingContractAction(null);
    };

    const getStatusBadge = (status: StatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === StatusEnum.ACTIVE) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else if (status === StatusEnum.FOR_APPROVAL) {
            colorClasses = '!bg-yellow-100 !text-yellow-800';
        } else if (status === StatusEnum.FOR_DELETION) {
            colorClasses = '!bg-red-100 !text-red-800';
        } else if (status === StatusEnum.NEW_RECORD) {
            colorClasses = '!bg-blue-100 !text-blue-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === StatusEnum.ACTIVE
                            ? '#dcfce7'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#fef3c7'
                            : status === StatusEnum.FOR_DELETION
                            ? '#fef2f2'
                            : status === StatusEnum.NEW_RECORD
                            ? '#dbeafe'
                            : '#f3f4f6',
                    color:
                        status === StatusEnum.ACTIVE
                            ? '#166534'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#92400e'
                            : status === StatusEnum.FOR_DELETION
                            ? '#dc2626'
                            : status === StatusEnum.NEW_RECORD
                            ? '#1e40af'
                            : '#6b7280',
                }}
            >
                {status}
            </span>
        );
    };

    const getPaymentStatusBadge = (status: PaymentStatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === PaymentStatusEnum.PENDING) {
            colorClasses = '!bg-yellow-100 !text-yellow-800';
        } else if (status === PaymentStatusEnum.PARTIAL) {
            colorClasses = '!bg-orange-100 !text-orange-800';
        } else if (status === PaymentStatusEnum.PAID) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === PaymentStatusEnum.PENDING
                            ? '#fef3c7'
                            : status === PaymentStatusEnum.PARTIAL
                            ? '#fed7aa'
                            : status === PaymentStatusEnum.PAID
                            ? '#dcfce7'
                            : '#f3f4f6',
                    color:
                        status === PaymentStatusEnum.PENDING
                            ? '#92400e'
                            : status === PaymentStatusEnum.PARTIAL
                            ? '#c2410c'
                            : status === PaymentStatusEnum.PAID
                            ? '#166534'
                            : '#6b7280',
                }}
            >
                {status}
            </span>
        );
    };

    const getPrintStatusBadge = (status: PrintStatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === PrintStatusEnum.COMPLETED) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else if (status === PrintStatusEnum.PENDING) {
            colorClasses = '!bg-gray-100 !text-gray-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === PrintStatusEnum.COMPLETED
                            ? '#dcfce7'
                            : status === PrintStatusEnum.PENDING
                            ? '#f3f4f6'
                            : '#f3f4f6',
                    color:
                        status === PrintStatusEnum.COMPLETED
                            ? '#166534'
                            : status === PrintStatusEnum.PENDING
                            ? '#6b7280'
                            : '#6b7280',
                }}
            >
                {status}
            </span>
        );
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

            {/* Basic Information Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!isCreateMode && (
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Document Number
                            </label>
                            <input
                                type="text"
                                value={formData.docno || ''}
                                readOnly
                                className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500"
                                placeholder="Document number (auto-generated)"
                            />
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Invoice Date *
                        </label>
                        <DatePicker
                            value={formData.invoiceDate || ''}
                            onChange={(date) => onFormDataChange({ invoiceDate: date })}
                            placeholder="Select invoice date"
                            disabled={!isCreateMode || isReadOnly}
                        />
                    </div>

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
                                    formData.customerName && isCreateMode && !isReadOnly ? 'pr-10' : ''
                                } ${
                                    !isCreateMode || isReadOnly
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                                placeholder={
                                    !isCreateMode || isReadOnly
                                        ? 'Customer cannot be changed'
                                        : 'Click to select customer'
                                }
                            />

                            {formData.customerName && isCreateMode && !isReadOnly && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearCustomer();
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                                    title="Clear customer selection"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Area Name
                        </label>
                        <input
                            type="text"
                            value={formData.areaName || ''}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                            placeholder="Auto-populated from customer"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Territory Manager
                        </label>
                        <input
                            type="text"
                            value={formData.territoryManagerName || ''}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                            placeholder="Auto-populated from area"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Sales Type
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.salesTypeName || ''}
                                readOnly
                                onClick={() => isCreateMode && !isReadOnly && setShowSalesTypeModal(true)}
                                disabled={!isCreateMode || isReadOnly}
                                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                    formData.salesTypeName && isCreateMode && !isReadOnly ? 'pr-10' : ''
                                } ${
                                    !isCreateMode || isReadOnly
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                                placeholder={
                                    !isCreateMode || isReadOnly
                                        ? 'Sales type cannot be changed'
                                        : 'Click to select sales type'
                                }
                            />

                            {isCreateMode && !isReadOnly && formData.salesTypeName && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearSalesType();
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                                    title="Clear sales type selection"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="group">
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
                                    const isEnabled =
                                        formData.customerId &&
                                        formData.contractSales === true &&
                                        isCreateMode &&
                                        !isReadOnly;
                                    if (isEnabled) {
                                        setShowContractModal(true);
                                    }
                                }}
                                disabled={
                                    !formData.customerId ||
                                    formData.contractSales !== true ||
                                    !isCreateMode ||
                                    isReadOnly
                                }
                                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                    formData.contractName &&
                                    formData.customerId &&
                                    formData.contractSales === true &&
                                    isCreateMode &&
                                    !isReadOnly
                                        ? 'pr-10'
                                        : ''
                                } ${
                                    !formData.customerId ||
                                    formData.contractSales !== true ||
                                    !isCreateMode ||
                                    isReadOnly
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                                placeholder={
                                    !formData.customerId
                                        ? 'Select customer first'
                                        : formData.contractSales !== true
                                        ? 'Select sales type with contract sales enabled'
                                        : !isCreateMode || isReadOnly
                                        ? 'Contract cannot be changed'
                                        : 'Click to select contract'
                                }
                            />

                            {formData.contractName &&
                                formData.customerId &&
                                formData.contractSales === true &&
                                isCreateMode &&
                                !isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearContract();
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                                        title="Clear contract selection"
                                    >
                                        ×
                                    </button>
                                )}
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Terms Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.termsName || ''}
                                readOnly
                                onClick={() =>
                                    isCreateMode && !isReadOnly && customerTerms.length > 0 && setShowTermsModal(true)
                                }
                                disabled={!isCreateMode || customerTerms.length === 0 || isReadOnly}
                                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                    formData.termsName && isCreateMode && !isReadOnly && customerTerms.length > 0
                                        ? 'pr-10'
                                        : ''
                                } ${
                                    !isCreateMode || customerTerms.length === 0 || isReadOnly
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                                placeholder={
                                    !isCreateMode || isReadOnly
                                        ? 'Terms cannot be changed'
                                        : customerTerms.length === 0
                                        ? 'Select customer first'
                                        : 'Click to select terms'
                                }
                            />

                            {formData.termsName && isCreateMode && !isReadOnly && customerTerms.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearTerms();
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                                    title="Clear terms selection"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Product Price Type
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.productPriceTypeName || ''}
                                readOnly
                                onClick={() => isCreateMode && !isReadOnly && setShowProductPriceTypeModal(true)}
                                disabled={!isCreateMode || isReadOnly}
                                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                    formData.productPriceTypeName && isCreateMode && !isReadOnly ? 'pr-10' : ''
                                } ${
                                    !isCreateMode || isReadOnly
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 opacity-60'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                                placeholder={
                                    !isCreateMode || isReadOnly
                                        ? 'Product price type cannot be changed'
                                        : 'Click to select product price type'
                                }
                            />

                            {isCreateMode && !isReadOnly && formData.productPriceTypeName && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearProductPriceType();
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 text-base font-bold z-10 transition-colors duration-200 hover:text-red-600"
                                    title="Clear product price type selection"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Calculated Amounts Section */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-blue-600 m-0">Calculated Amounts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Invoice Amount
                        </label>
                        <input
                            type="number"
                            value={formData.invoiceAmount || 0}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Tax Amount
                        </label>
                        <input
                            type="number"
                            value={formData.taxAmount || 0}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Final Amount
                        </label>
                        <input
                            type="number"
                            value={formData.finalAmount || 0}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Total Amount Paid
                        </label>
                        <input
                            type="number"
                            value={formData.totalAmountPaid || 0}
                            readOnly
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 shadow-sm cursor-not-allowed"
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
