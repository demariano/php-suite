'use client';

import { DateRangeSelector } from '@components-web';
import { ReportFilterParams } from '@data-access/types/report.types';
import { format, startOfYear } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { DateRange } from 'react-day-picker';
import AreaSearchableSelectionModal from '../../search-modals/AreaSearchableSelectionModal';
import ContractMultiSearchableSelectionModal from '../../search-modals/ContractMultiSearchableSelectionModal';
import CustomerMultiSearchableSelectionModal from '../../search-modals/CustomerMultiSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../search-modals/CustomerSearchableSelectionModal';
import ProductMultiSearchableSelectionModal from '../../search-modals/ProductMultiSearchableSelectionModal';
import SalesTypeMultiSearchableSelectionModal from '../../search-modals/SalesTypeMultiSearchableSelectionModal';
import SalesTypeSearchableSelectionModal from '../../search-modals/SalesTypeSearchableSelectionModal';
import { ReportFilterType } from '../config/reportRegistry';
import InvoiceAreaSelection from './InvoiceAreaSelection';

interface ReportFiltersProps {
    reportId?: string;
    filterType: ReportFilterType;
    supportsSeparateByArea?: boolean;
    separateByAreaDefault?: boolean;
    supportsMultiArea?: boolean;
    onGenerateReport?: () => void;
    onFiltersChange?: (filters: ReportFilterParams) => void;
}

const ReportFilters = ({
    reportId,
    filterType,
    supportsSeparateByArea,
    separateByAreaDefault,
    supportsMultiArea,
    onGenerateReport,
    onFiltersChange,
}: ReportFiltersProps) => {
    const defaultDateRange: DateRange = {
        from: startOfYear(new Date()),
        to: new Date(),
    };
    const [dateRange, setDateRange] = useState<DateRange>({
        from: defaultDateRange.from,
        to: defaultDateRange.to,
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // List filters state
    const [selectedArea, setSelectedArea] = useState('all');
    const [selectedAreaName, setSelectedAreaName] = useState('');
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [activeChecked, setActiveChecked] = useState(true);
    const [inactiveChecked, setInactiveChecked] = useState(false);

    // Invoice common filters (optional)
    const [selectedInvoiceAreaId, setSelectedInvoiceAreaId] = useState<string | null>(null);
    const [selectedInvoiceAreaName, setSelectedInvoiceAreaName] = useState<string>('');
    const [selectedInvoiceAreaIds, setSelectedInvoiceAreaIds] = useState<string[]>([]);
    const [selectedInvoiceAreaNames, setSelectedInvoiceAreaNames] = useState<string[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [selectedCustomerNames, setSelectedCustomerNames] = useState<string[]>([]);
    const [showCustomerMultiModal, setShowCustomerMultiModal] = useState(false);
    const [selectedSalesTypeId, setSelectedSalesTypeId] = useState<string | null>(null);
    const [selectedSalesTypeName, setSelectedSalesTypeName] = useState<string>('');
    const [showSalesTypeModal, setShowSalesTypeModal] = useState(false);
    const [selectedSalesTypeIds, setSelectedSalesTypeIds] = useState<string[]>([]);
    const [selectedSalesTypeNames, setSelectedSalesTypeNames] = useState<string[]>([]);
    const [showSalesTypeMultiModal, setShowSalesTypeMultiModal] = useState(false);

    // Contract filters (invoice reports)
    const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
    const [selectedContractNames, setSelectedContractNames] = useState<string[]>([]);
    const [showContractMultiModal, setShowContractMultiModal] = useState(false);

    const isInvoicePerDatePerArea = filterType === 'date-range-invoice' && reportId === 'invoice-per-date-per-area';
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<
        Array<{ productId: string; productName: string; lotNo: string }>
    >([]);

    const [separateByArea, setSeparateByArea] = useState<boolean>(separateByAreaDefault ?? false);

    const canGenerateReport = true;

    useEffect(() => {
        setSeparateByArea(separateByAreaDefault ?? false);
    }, [separateByAreaDefault, supportsSeparateByArea]);

    // Payment status (multi-select dropdown)
    // Must match PaymentStatusEnum values used by invoices.
    const ALL_PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERPAID'] as const;
    const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<string[]>([]); // [] => All
    const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
    const paymentStatusDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!showPaymentStatusDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = paymentStatusDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowPaymentStatusDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPaymentStatusDropdown(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showPaymentStatusDropdown]);

    // Method dropdown
    const [paymentMethod, setPaymentMethod] = useState('all');

    const clearAllFilters = () => {
        setDateRange({ from: defaultDateRange.from, to: defaultDateRange.to });
        setShowDatePicker(false);

        setSelectedArea('all');
        setSelectedAreaName('');
        setShowAreaModal(false);
        setActiveChecked(true);
        setInactiveChecked(false);

        setSelectedInvoiceAreaId(null);
        setSelectedInvoiceAreaName('');
        setSelectedInvoiceAreaIds([]);
        setSelectedInvoiceAreaNames([]);

        setSelectedCustomerId(null);
        setSelectedCustomerName('');
        setShowCustomerModal(false);
        setSelectedCustomerIds([]);
        setSelectedCustomerNames([]);
        setShowCustomerMultiModal(false);

        setSelectedSalesTypeId(null);
        setSelectedSalesTypeName('');
        setShowSalesTypeModal(false);
        setSelectedSalesTypeIds([]);
        setSelectedSalesTypeNames([]);
        setShowSalesTypeMultiModal(false);

        setSelectedContractIds([]);
        setSelectedContractNames([]);
        setShowContractMultiModal(false);

        setSelectedProducts([]);

        setSeparateByArea(separateByAreaDefault ?? false);

        setSelectedPaymentStatuses([]);
        setShowPaymentStatusDropdown(false);

        setPaymentMethod('all');
    };

    const formatDateDisplay = (d: Date) => format(d, 'MMM d, yyyy');

    const dateRangeDisplay =
        dateRange.from && dateRange.to
            ? `${formatDateDisplay(dateRange.from)} - ${formatDateDisplay(dateRange.to)}`
            : 'Select Date Range';

    const hasDateRange =
        filterType === 'date-range' ||
        filterType === 'date-range-salestype' ||
        filterType === 'date-range-customer' ||
        filterType === 'date-range-invoice' ||
        filterType === 'date-range-method';

    // Collect filters and notify parent
    useEffect(() => {
        if (!onFiltersChange) return;
        const filters: ReportFilterParams = {};

        if (hasDateRange && dateRange.from && dateRange.to) {
            filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
            filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
        }

        if (filterType === 'date-range-salestype' && selectedSalesTypeId) {
            filters.salesTypeId = selectedSalesTypeId;
        }
        if (filterType === 'date-range-customer' && selectedCustomerId) {
            filters.customerId = selectedCustomerId;
        }

        if (filterType === 'date-range-invoice') {
            if (selectedSalesTypeIds.length > 0) {
                filters.salesTypeIds = selectedSalesTypeIds;
                if (selectedSalesTypeIds.length === 1) {
                    filters.salesTypeId = selectedSalesTypeIds[0];
                }
            }
            if (selectedCustomerIds.length > 0) {
                filters.customerIds = selectedCustomerIds;
                if (selectedCustomerIds.length === 1) {
                    filters.customerId = selectedCustomerIds[0];
                }
            }
            if (supportsMultiArea) {
                if (selectedInvoiceAreaIds.length > 0) filters.areaIds = selectedInvoiceAreaIds;
            } else {
                if (selectedInvoiceAreaId) filters.areaId = selectedInvoiceAreaId;
            }

            if (supportsSeparateByArea) {
                filters.separateByArea = separateByArea;
            }

            if (selectedContractIds.length > 0) {
                filters.contractIds = selectedContractIds;
                if (selectedContractIds.length === 1) {
                    filters.contractId = selectedContractIds[0];
                }
            }
            if (isInvoicePerDatePerArea && selectedProducts.length > 0) {
                filters.productSelections = selectedProducts
                    .filter((p) => !!p.productId)
                    .map((p) => ({
                        productId: p.productId,
                        lotNo: p.lotNo?.trim() ? p.lotNo.trim() : undefined,
                    }));
            }

            if (isInvoicePerDatePerArea && selectedPaymentStatuses.length > 0) {
                filters.paymentStatus = selectedPaymentStatuses;
            }
        }
        if (filterType === 'date-range-method' && paymentMethod !== 'all') {
            filters.paymentMethod = paymentMethod;
        }
        if (filterType === 'list-area-status') {
            if (selectedArea !== 'all') filters.areaId = selectedArea;
            filters.activeStatus = activeChecked;
            filters.inactiveStatus = inactiveChecked;
        }

        onFiltersChange(filters);
    }, [
        dateRange,
        selectedSalesTypeId,
        selectedCustomerId,
        selectedSalesTypeIds,
        selectedCustomerIds,
        selectedInvoiceAreaId,
        selectedInvoiceAreaIds,
        paymentMethod,
        selectedContractIds,
        selectedPaymentStatuses,
        selectedArea,
        activeChecked,
        inactiveChecked,
        separateByArea,
        supportsSeparateByArea,
        supportsMultiArea,
        filterType,
        isInvoicePerDatePerArea,
        selectedProducts,
    ]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:underline"
                    title="Clear all filters"
                >
                    Clear all
                </button>
            </div>

            <div className="flex items-start gap-6 flex-wrap">
                {/* Date Range (for all date-range variants) */}
                {hasDateRange && (
                    <div className="flex items-end gap-4 flex-wrap">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                {dateRangeDisplay}
                            </button>

                            {showDatePicker && (
                                <DateRangeSelector
                                    dateRange={dateRange}
                                    onApply={(range) => {
                                        setDateRange(range);
                                        setShowDatePicker(false);
                                    }}
                                    onCancel={() => setShowDatePicker(false)}
                                    title="Select Date Range"
                                />
                            )}
                        </div>

                        <div className="self-end">
                            <button
                                onClick={() => {
                                    if (!canGenerateReport) return;
                                    onGenerateReport?.();
                                }}
                                disabled={!canGenerateReport}
                                title={
                                    !canGenerateReport
                                        ? 'Select at least one product before generating this report'
                                        : undefined
                                }
                                className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>
                )}

                {/* Sales Type (modal) */}
                {filterType === 'date-range-salestype' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sales Type</label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSalesTypeModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
                            >
                                <span className={!selectedSalesTypeId ? 'text-gray-400' : 'text-gray-900'}>
                                    {!selectedSalesTypeId ? 'All Types' : selectedSalesTypeName}
                                </span>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {!!selectedSalesTypeId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSalesTypeId(null);
                                        setSelectedSalesTypeName('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Clear selection"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <SalesTypeSearchableSelectionModal
                            show={showSalesTypeModal}
                            title="Select Sales Type"
                            selectedValue={selectedSalesTypeId}
                            onSelect={(salesType) => {
                                setSelectedSalesTypeId(salesType.salesTypeId || null);
                                setSelectedSalesTypeName(salesType.salesTypeName || salesType.salesTypeId || '');
                                setShowSalesTypeModal(false);
                            }}
                            onClose={() => setShowSalesTypeModal(false)}
                        />
                    </div>
                )}

                {/* Sales Type (multi-select, invoice reports) */}
                {filterType === 'date-range-invoice' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Sales Type</div>
                            {selectedSalesTypeIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSalesTypeIds([]);
                                        setSelectedSalesTypeNames([]);
                                    }}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowSalesTypeMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedSalesTypeIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedSalesTypeIds.length === 0
                                    ? 'All Types'
                                    : selectedSalesTypeIds.length === 1
                                    ? selectedSalesTypeNames[0] || selectedSalesTypeIds[0]
                                    : `${selectedSalesTypeIds.length} Types selected`}
                            </span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {selectedSalesTypeIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedSalesTypeIds.map((id, idx) => {
                                    const label = selectedSalesTypeNames[idx] || id;
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={label}
                                        >
                                            <span className="max-w-[220px] truncate">{label}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSalesTypeIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedSalesTypeNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove sales type"
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <SalesTypeMultiSearchableSelectionModal
                            show={showSalesTypeMultiModal}
                            title="Select Sales Types"
                            selectedValues={selectedSalesTypeIds}
                            onSelectMultiple={(salesTypes) => {
                                const ids = salesTypes.map((s) => s.salesTypeId).filter(Boolean) as string[];
                                const names = salesTypes
                                    .map((s) => s.salesTypeName || s.salesTypeId)
                                    .filter(Boolean) as string[];
                                setSelectedSalesTypeIds(ids);
                                setSelectedSalesTypeNames(names);
                                setShowSalesTypeMultiModal(false);
                            }}
                            onClose={() => setShowSalesTypeMultiModal(false)}
                        />
                    </div>
                )}

                {/* Contract (multi-select, invoice reports) */}
                {filterType === 'date-range-invoice' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Contract</div>
                            {selectedContractIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedContractIds([]);
                                        setSelectedContractNames([]);
                                    }}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowContractMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedContractIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedContractIds.length === 0
                                    ? 'All Contracts'
                                    : selectedContractIds.length === 1
                                    ? selectedContractNames[0] || selectedContractIds[0]
                                    : `${selectedContractIds.length} Contracts selected`}
                            </span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {selectedContractIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedContractIds.map((id, idx) => {
                                    const label = selectedContractNames[idx] || id;
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={label}
                                        >
                                            <span className="max-w-[220px] truncate">{label}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedContractIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedContractNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove contract"
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <ContractMultiSearchableSelectionModal
                            show={showContractMultiModal}
                            title="Select Contracts"
                            selectedValues={selectedContractIds}
                            onSelectMultiple={(contracts) => {
                                const ids = contracts.map((c) => c.contractId).filter(Boolean) as string[];
                                const names = contracts
                                    .map((c) => c.contractNo || c.contractName || c.contractId)
                                    .filter(Boolean) as string[];
                                setSelectedContractIds(ids);
                                setSelectedContractNames(names);
                                setShowContractMultiModal(false);
                            }}
                            onClose={() => setShowContractMultiModal(false)}
                        />
                    </div>
                )}

                {/* Customer (modal) */}
                {filterType === 'date-range-customer' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCustomerModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
                            >
                                <span className={!selectedCustomerId ? 'text-gray-400' : 'text-gray-900'}>
                                    {!selectedCustomerId ? 'All Customers' : selectedCustomerName}
                                </span>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {!!selectedCustomerId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCustomerId(null);
                                        setSelectedCustomerName('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Clear selection"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <CustomerSearchableSelectionModal
                            show={showCustomerModal}
                            title="Select Customer"
                            selectedValue={selectedCustomerId}
                            onSelect={(customer) => {
                                setSelectedCustomerId(customer.customerId || null);
                                setSelectedCustomerName(customer.customerName || customer.customerId || '');
                                setShowCustomerModal(false);
                            }}
                            onClose={() => setShowCustomerModal(false)}
                        />
                    </div>
                )}

                {/* Customer (multi-select, invoice reports) */}
                {filterType === 'date-range-invoice' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Customer</div>
                            {selectedCustomerIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCustomerIds([]);
                                        setSelectedCustomerNames([]);
                                    }}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowCustomerMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedCustomerIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedCustomerIds.length === 0
                                    ? 'All Customers'
                                    : selectedCustomerIds.length === 1
                                    ? selectedCustomerNames[0] || selectedCustomerIds[0]
                                    : `${selectedCustomerIds.length} Customers selected`}
                            </span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {selectedCustomerIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedCustomerIds.map((id, idx) => {
                                    const label = selectedCustomerNames[idx] || id;
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={label}
                                        >
                                            <span className="max-w-[220px] truncate">{label}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCustomerIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedCustomerNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove customer"
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <CustomerMultiSearchableSelectionModal
                            show={showCustomerMultiModal}
                            title="Select Customers"
                            selectedValues={selectedCustomerIds}
                            onSelectMultiple={(customers) => {
                                const ids = customers.map((c) => c.customerId).filter(Boolean) as string[];
                                const names = customers
                                    .map((c) => c.customerName || c.customerId)
                                    .filter(Boolean) as string[];
                                setSelectedCustomerIds(ids);
                                setSelectedCustomerNames(names);
                                setShowCustomerMultiModal(false);
                            }}
                            onClose={() => setShowCustomerMultiModal(false)}
                        />
                    </div>
                )}

                {/* Payment Status (multi-select dropdown) */}
                {filterType === 'date-range-invoice' && isInvoicePerDatePerArea && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Payment Status</div>
                            {selectedPaymentStatuses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPaymentStatuses([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div ref={paymentStatusDropdownRef} className="relative w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentStatusDropdown((v) => !v)}
                                    className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                >
                                    <span
                                        className={
                                            selectedPaymentStatuses.length === 0 ? 'text-gray-400' : 'text-gray-900'
                                        }
                                    >
                                        {selectedPaymentStatuses.length === 0
                                            ? 'All Statuses'
                                            : selectedPaymentStatuses.length === 1
                                            ? selectedPaymentStatuses[0]
                                            : `${selectedPaymentStatuses.length} Statuses selected`}
                                    </span>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>

                                {showPaymentStatusDropdown && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                        {ALL_PAYMENT_STATUSES.map((status) => {
                                            const checked = selectedPaymentStatuses.includes(status);
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                    onClick={() => {
                                                        setSelectedPaymentStatuses((prev) =>
                                                            prev.includes(status)
                                                                ? prev.filter((s) => s !== status)
                                                                : [...prev, status]
                                                        );
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        readOnly
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                                    />
                                                    {status}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPaymentStatuses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedPaymentStatuses.map((status) => (
                                    <span
                                        key={status}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        title={status}
                                    >
                                        <span className="max-w-[220px] truncate">{status}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedPaymentStatuses((prev) => prev.filter((s) => s !== status))
                                            }
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                            title="Remove status"
                                        >
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Method dropdown */}
                {filterType === 'date-range-method' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white min-w-[180px]"
                        >
                            <option value="all">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="bank-transfer">Bank Transfer</option>
                        </select>
                    </div>
                )}

                {/* Area + Status (for list reports like customer list) */}
                {filterType === 'list-area-status' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Area</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAreaModal(true)}
                                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
                                >
                                    <span className={selectedArea === 'all' ? 'text-gray-400' : 'text-gray-900'}>
                                        {selectedArea === 'all' ? 'All Areas' : selectedAreaName}
                                    </span>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                                {selectedArea !== 'all' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedArea('all');
                                            setSelectedAreaName('');
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Clear selection"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <AreaSearchableSelectionModal
                                show={showAreaModal}
                                title="Select Area"
                                selectedValue={selectedArea === 'all' ? null : selectedArea}
                                onSelect={(area) => {
                                    setSelectedArea(area.areaId);
                                    setSelectedAreaName(area.areaName || area.areaId);
                                    setShowAreaModal(false);
                                }}
                                onClose={() => setShowAreaModal(false)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Status</label>
                            <div className="flex flex-col gap-1.5">
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={activeChecked}
                                        onChange={(e) => setActiveChecked(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                    />
                                    Active
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inactiveChecked}
                                        onChange={(e) => setInactiveChecked(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                    />
                                    Inactive
                                </label>
                            </div>
                        </div>
                    </>
                )}

                {!hasDateRange && (
                    <div className="ml-auto self-end">
                        <button
                            onClick={() => {
                                if (!canGenerateReport) return;
                                onGenerateReport?.();
                            }}
                            disabled={!canGenerateReport}
                            title={
                                !canGenerateReport
                                    ? 'Select at least one product before generating this report'
                                    : undefined
                            }
                            className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                        >
                            Generate Report
                        </button>
                    </div>
                )}
            </div>

            {isInvoicePerDatePerArea && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-medium text-gray-700">Products</div>
                        {selectedProducts.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedProducts([])}
                                className="text-sm text-blue-600 hover:underline"
                                title="Clear all"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowProductModal(true)}
                        className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                    >
                        <span className={selectedProducts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                            {selectedProducts.length === 0
                                ? 'Select Products'
                                : selectedProducts.length === 1
                                ? selectedProducts[0].productName || selectedProducts[0].productId
                                : `${selectedProducts.length} Products selected`}
                        </span>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {selectedProducts.length > 0 && (
                        <>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProducts.map((p) => {
                                    const label =
                                        p.productName && p.productName !== p.productId ? p.productName : p.productId;
                                    return (
                                        <span
                                            key={p.productId}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={label}
                                        >
                                            <span className="max-w-[220px] truncate">{label}</span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedProducts((prev) =>
                                                        prev.filter((x) => x.productId !== p.productId)
                                                    )
                                                }
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove product"
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>

                            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <div className="text-sm font-medium text-gray-900 mb-0.5">Lot Numbers (optional)</div>
                                <div className="text-xs text-gray-600 mb-2">
                                    You can enter multiple lot numbers separated by commas.
                                </div>
                                <div className="space-y-3">
                                    {selectedProducts.map((p) => (
                                        <div
                                            key={p.productId}
                                            className="grid grid-cols-[1fr_340px] gap-6 items-center"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {p.productName && p.productName !== p.productId
                                                        ? p.productName
                                                        : p.productId}
                                                </div>
                                                {p.productName && p.productName !== p.productId && (
                                                    <div className="text-xs text-gray-500 truncate">{p.productId}</div>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={p.lotNo}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSelectedProducts((prev) =>
                                                        prev.map((x) =>
                                                            x.productId === p.productId ? { ...x, lotNo: value } : x
                                                        )
                                                    );
                                                }}
                                                placeholder="e.g. 12345, 67890"
                                                className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white w-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <ProductMultiSearchableSelectionModal
                        show={showProductModal}
                        title="Select Products"
                        selectedValues={selectedProducts.map((p) => p.productId)}
                        onSelectMultiple={(products) => {
                            setSelectedProducts((prev) => {
                                const existingLotById = new Map(prev.map((p) => [p.productId, p.lotNo] as const));
                                return products
                                    .filter((p) => !!p.productId)
                                    .map((p) => ({
                                        productId: p.productId,
                                        productName: p.productName || p.productId,
                                        lotNo: existingLotById.get(p.productId) || '',
                                    }));
                            });
                            setShowProductModal(false);
                        }}
                        onClose={() => setShowProductModal(false)}
                    />
                </div>
            )}

            {filterType === 'date-range-invoice' && (
                <div className="mt-4">
                    <InvoiceAreaSelection
                        supportsMultiArea={supportsMultiArea}
                        selectedInvoiceAreaId={selectedInvoiceAreaId}
                        setSelectedInvoiceAreaId={setSelectedInvoiceAreaId}
                        selectedInvoiceAreaName={selectedInvoiceAreaName}
                        setSelectedInvoiceAreaName={setSelectedInvoiceAreaName}
                        selectedInvoiceAreaIds={selectedInvoiceAreaIds}
                        setSelectedInvoiceAreaIds={setSelectedInvoiceAreaIds}
                        selectedInvoiceAreaNames={selectedInvoiceAreaNames}
                        setSelectedInvoiceAreaNames={setSelectedInvoiceAreaNames}
                        supportsSeparateByArea={supportsSeparateByArea}
                        separateByArea={separateByArea}
                        setSeparateByArea={setSeparateByArea}
                    />
                </div>
            )}
        </div>
    );
};

export default ReportFilters;
