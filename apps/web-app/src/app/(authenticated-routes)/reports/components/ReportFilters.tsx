'use client';

import { DateRangeSelector } from '@components-web';
import { AccountApi, AreaApi } from '@data-access/index';
import { ReportFilterParams } from '@data-access/types/report.types';
import { format, startOfYear } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { DateRange } from 'react-day-picker';
import AreaSearchableSelectionModal from '../../search-modals/AreaSearchableSelectionModal';
import ContractMultiSearchableSelectionModal from '../../search-modals/ContractMultiSearchableSelectionModal';
import CustomerClassificationMultiSearchableSelectionModal from '../../search-modals/CustomerClassificationMultiSearchableSelectionModal';
import CustomerMultiSearchableSelectionModal from '../../search-modals/CustomerMultiSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../search-modals/CustomerSearchableSelectionModal';
import CustomerTypeMultiSearchableSelectionModal from '../../search-modals/CustomerTypeMultiSearchableSelectionModal';
import ProductCategoryMultiSearchableSelectionModal from '../../search-modals/ProductCategoryMultiSearchableSelectionModal';
import ProductClassMultiSearchableSelectionModal from '../../search-modals/ProductClassMultiSearchableSelectionModal';
import ProductDealMultiSearchableSelectionModal from '../../search-modals/ProductDealMultiSearchableSelectionModal';
import ProductMultiSearchableSelectionModal from '../../search-modals/ProductMultiSearchableSelectionModal';
import ProductUnitMultiSearchableSelectionModal from '../../search-modals/ProductUnitMultiSearchableSelectionModal';
import SalesTypeMultiSearchableSelectionModal from '../../search-modals/SalesTypeMultiSearchableSelectionModal';
import SalesTypeSearchableSelectionModal from '../../search-modals/SalesTypeSearchableSelectionModal';
import StockTypeMultiSearchableSelectionModal from '../../search-modals/StockTypeMultiSearchableSelectionModal';
import TownMultiSelectionModal from '../../search-modals/TownMultiSelectionModal';
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

    // Payment report filters (date-range-payment)
    const [receiptNosInput, setReceiptNosInput] = useState('');
    const [invoiceDocNosInput, setInvoiceDocNosInput] = useState('');

    // RGS report filters (date-range-rgs)
    const [rgsDocNosInput, setRgsDocNosInput] = useState('');
    const [invoiceDocNosRgsInput, setInvoiceDocNosRgsInput] = useState('');
    const isRgsReport = filterType === 'date-range-rgs';

    const [contractPaymentFilter, setContractPaymentFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [customerCreditFilter, setCustomerCreditFilter] = useState<'all' | 'yes' | 'no'>('all');
    const ALL_PAYMENT_RECORD_STATUSES = [
        'ACTIVE',
        'INACTIVE',
        'FOR_APPROVAL',
        'FOR_DELETION',
        'FOR_DEACTIVATION',
        'NEW_RECORD',
        'DRAFT',
    ] as const;
    const [selectedPaymentRecordStatuses, setSelectedPaymentRecordStatuses] = useState<string[]>([]);
    const [showPaymentRecordStatusDropdown, setShowPaymentRecordStatusDropdown] = useState(false);
    const paymentRecordStatusDropdownRef = useRef<HTMLDivElement | null>(null);

    // Customer list report filters (list-customer)
    const [selectedCustomerClassificationIds, setSelectedCustomerClassificationIds] = useState<string[]>([]);
    const [selectedCustomerClassificationNames, setSelectedCustomerClassificationNames] = useState<string[]>([]);
    const [showCustomerClassificationMultiModal, setShowCustomerClassificationMultiModal] = useState(false);
    const [selectedCustomerTypeIds, setSelectedCustomerTypeIds] = useState<string[]>([]);
    const [selectedCustomerTypeNames, setSelectedCustomerTypeNames] = useState<string[]>([]);
    const [showCustomerTypeMultiModal, setShowCustomerTypeMultiModal] = useState(false);
    const [selectedProductDealIds, setSelectedProductDealIds] = useState<string[]>([]);
    const [selectedProductDealNames, setSelectedProductDealNames] = useState<string[]>([]);
    const [showProductDealMultiModal, setShowProductDealMultiModal] = useState(false);
    const [includeProductDealDetails, setIncludeProductDealDetails] = useState(false);
    const [includeInvoiceDetails, setIncludeInvoiceDetails] = useState(false);
    const [includePaymentDetails, setIncludePaymentDetails] = useState(false);
    const [includePaymentInvoiceDetails, setIncludePaymentInvoiceDetails] = useState(false);
    const [includeProductUnitDetails, setIncludeProductUnitDetails] = useState(false);
    const [selectedTownNames, setSelectedTownNames] = useState<string[]>([]);
    const [showTownMultiModal, setShowTownMultiModal] = useState(false);
    const [availableTowns, setAvailableTowns] = useState<string[]>([]);
    const ALL_CUSTOMER_STATUSES = [
        'ACTIVE',
        'INACTIVE',
        'FOR_APPROVAL',
        'FOR_DELETION',
        'FOR_DEACTIVATION',
        'NEW_RECORD',
    ] as const;
    const [selectedCustomerStatuses, setSelectedCustomerStatuses] = useState<string[]>([]);
    const [showCustomerStatusDropdown, setShowCustomerStatusDropdown] = useState(false);
    const customerStatusDropdownRef = useRef<HTMLDivElement | null>(null);

    // Stock list report filters (list-stock)
    const ALL_STOCK_STATUSES = [
        'ACTIVE',
        'INACTIVE',
        'FOR_APPROVAL',
        'FOR_DELETION',
        'FOR_DEACTIVATION',
        'NEW_RECORD',
        'DRAFT',
    ] as const;
    const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([]);
    const [showStockStatusDropdown, setShowStockStatusDropdown] = useState(false);
    const stockStatusDropdownRef = useRef<HTMLDivElement | null>(null);
    const [selectedStockTypeIds, setSelectedStockTypeIds] = useState<string[]>([]);
    const [selectedStockTypeNames, setSelectedStockTypeNames] = useState<string[]>([]);
    const [showStockTypeMultiModal, setShowStockTypeMultiModal] = useState(false);
    const [selectedProductUnitIds, setSelectedProductUnitIds] = useState<string[]>([]);
    const [selectedProductUnitNames, setSelectedProductUnitNames] = useState<string[]>([]);
    const [showProductUnitMultiModal, setShowProductUnitMultiModal] = useState(false);
    const [lotNosInput, setLotNosInput] = useState('');
    const [showStockProductModal, setShowStockProductModal] = useState(false);
    const [selectedStockProducts, setSelectedStockProducts] = useState<
        Array<{ productId: string; productName: string }>
    >([]);
    const [expirationDateRange, setExpirationDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);

    // Product list report filters (list-product)
    const ALL_PRODUCT_STATUSES = [
        'ACTIVE',
        'INACTIVE',
        'FOR_APPROVAL',
        'FOR_DELETION',
        'FOR_DEACTIVATION',
        'NEW_RECORD',
        'DRAFT',
    ] as const;
    const [selectedProductStatuses, setSelectedProductStatuses] = useState<string[]>([]);
    const [showProductStatusDropdown, setShowProductStatusDropdown] = useState(false);
    const productStatusDropdownRef = useRef<HTMLDivElement | null>(null);
    const [selectedProductCategoryIds, setSelectedProductCategoryIds] = useState<string[]>([]);
    const [selectedProductCategoryNames, setSelectedProductCategoryNames] = useState<string[]>([]);
    const [showProductCategoryMultiModal, setShowProductCategoryMultiModal] = useState(false);
    const [selectedProductClassIds, setSelectedProductClassIds] = useState<string[]>([]);
    const [selectedProductClassNames, setSelectedProductClassNames] = useState<string[]>([]);
    const [showProductClassMultiModal, setShowProductClassMultiModal] = useState(false);

    // Voucher report filters (date-range-voucher)
    const ALL_ACCOUNT_TYPES = ['AREA', 'CUSTOMER', 'OTHERS'] as const;
    const [selectedAccountType, setSelectedAccountType] = useState<string>('');
    const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
    const accountTypeDropdownRef = useRef<HTMLDivElement | null>(null);
    const [availableSubAccounts, setAvailableSubAccounts] = useState<string[]>([]);
    const [selectedSubAccounts, setSelectedSubAccounts] = useState<string[]>([]);
    const [showSubAccountDropdown, setShowSubAccountDropdown] = useState(false);
    const subAccountDropdownRef = useRef<HTMLDivElement | null>(null);
    const [loadingSubAccounts, setLoadingSubAccounts] = useState(false);

    // Stock status dropdown outside-click handler
    useEffect(() => {
        if (!showStockStatusDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = stockStatusDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowStockStatusDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowStockStatusDropdown(false);
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
    }, [showStockStatusDropdown]);

    // Product status dropdown outside-click handler
    useEffect(() => {
        if (!showProductStatusDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = productStatusDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowProductStatusDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowProductStatusDropdown(false);
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
    }, [showProductStatusDropdown]);

    // Account type dropdown outside-click handler
    useEffect(() => {
        if (!showAccountTypeDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = accountTypeDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowAccountTypeDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowAccountTypeDropdown(false);
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
    }, [showAccountTypeDropdown]);

    // Sub-account dropdown outside-click handler
    useEffect(() => {
        if (!showSubAccountDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = subAccountDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowSubAccountDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSubAccountDropdown(false);
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
    }, [showSubAccountDropdown]);

    // Load sub-accounts when account type changes
    useEffect(() => {
        if (!selectedAccountType) {
            setAvailableSubAccounts([]);
            setSelectedSubAccounts([]);
            return;
        }

        let cancelled = false;
        setLoadingSubAccounts(true);
        setSelectedSubAccounts([]);

        const loadSubAccounts = async () => {
            try {
                const allSubAccounts = new Set<string>();
                let cursorPointer = '';
                let direction = '';
                let hasMore = true;

                while (hasMore) {
                    const page = await AccountApi.getAccountsByAccountType(
                        selectedAccountType,
                        100,
                        direction || undefined,
                        cursorPointer || undefined
                    );
                    if (page.data && page.data.length > 0) {
                        for (const account of page.data) {
                            if (account.subAccounts) {
                                for (const sub of account.subAccounts) {
                                    if (sub) allSubAccounts.add(sub);
                                }
                            }
                        }
                    }
                    cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : '';
                    direction = 'next';
                    hasMore = !!page.nextCursorPointer;
                }

                if (!cancelled) {
                    setAvailableSubAccounts([...allSubAccounts].sort());
                }
            } catch (error) {
                console.error('Failed to load sub-accounts:', error);
                if (!cancelled) {
                    setAvailableSubAccounts([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingSubAccounts(false);
                }
            }
        };

        loadSubAccounts();

        return () => {
            cancelled = true;
        };
    }, [selectedAccountType]);

    useEffect(() => {
        if (!showPaymentRecordStatusDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = paymentRecordStatusDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowPaymentRecordStatusDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPaymentRecordStatusDropdown(false);
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
    }, [showPaymentRecordStatusDropdown]);

    // Customer status dropdown outside-click handler (list-customer)
    useEffect(() => {
        if (!showCustomerStatusDropdown) return;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const container = customerStatusDropdownRef.current;
            const target = e.target as Node | null;
            if (!container || !target) return;
            if (container.contains(target)) return;
            setShowCustomerStatusDropdown(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowCustomerStatusDropdown(false);
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
    }, [showCustomerStatusDropdown]);

    // Load towns from selected areas (list-customer)
    useEffect(() => {
        if (filterType !== 'list-customer') return;
        if (selectedInvoiceAreaIds.length === 0) {
            setAvailableTowns([]);
            return;
        }

        let cancelled = false;
        const loadTowns = async () => {
            const results = await Promise.allSettled(selectedInvoiceAreaIds.map((id) => AreaApi.getAreaById(id)));
            if (cancelled) return;

            const allTowns: string[] = [];
            results.forEach((res) => {
                if (res.status !== 'fulfilled') return;
                const value = res.value as unknown;
                const maybeAxios = value as { data?: { towns?: string[] } };
                const area = maybeAxios?.data ?? (value as { towns?: string[] });
                if (Array.isArray(area?.towns)) {
                    allTowns.push(...area.towns.filter(Boolean));
                }
            });

            setAvailableTowns(Array.from(new Set(allTowns)));
        };

        loadTowns();
        return () => {
            cancelled = true;
        };
    }, [filterType, selectedInvoiceAreaIds]);

    // Prune selected towns when available towns change (e.g. area removed)
    useEffect(() => {
        if (filterType !== 'list-customer') return;
        if (availableTowns.length === 0) {
            setSelectedTownNames([]);
            return;
        }
        const townSet = new Set(availableTowns);
        setSelectedTownNames((prev) => {
            const filtered = prev.filter((t) => townSet.has(t));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [filterType, availableTowns]);

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

        setReceiptNosInput('');
        setInvoiceDocNosInput('');
        setRgsDocNosInput('');
        setInvoiceDocNosRgsInput('');
        setContractPaymentFilter('all');
        setCustomerCreditFilter('all');
        setSelectedPaymentRecordStatuses([]);
        setShowPaymentRecordStatusDropdown(false);

        // Customer list report
        setSelectedCustomerClassificationIds([]);
        setSelectedCustomerClassificationNames([]);
        setShowCustomerClassificationMultiModal(false);
        setSelectedCustomerTypeIds([]);
        setSelectedCustomerTypeNames([]);
        setShowCustomerTypeMultiModal(false);
        setSelectedProductDealIds([]);
        setSelectedProductDealNames([]);
        setShowProductDealMultiModal(false);
        setIncludeProductDealDetails(false);
        setIncludeInvoiceDetails(false);
        setIncludePaymentDetails(false);
        setIncludePaymentInvoiceDetails(false);
        setSelectedTownNames([]);
        setShowTownMultiModal(false);
        setAvailableTowns([]);
        setSelectedCustomerStatuses([]);
        setShowCustomerStatusDropdown(false);

        // Stock list report
        setSelectedStockTypeIds([]);
        setSelectedStockTypeNames([]);
        setShowStockTypeMultiModal(false);
        setSelectedProductUnitIds([]);
        setSelectedProductUnitNames([]);
        setShowProductUnitMultiModal(false);
        setLotNosInput('');
        setShowStockProductModal(false);
        setSelectedStockProducts([]);
        setSelectedStockStatuses([]);
        setShowStockStatusDropdown(false);
        setExpirationDateRange({ from: undefined, to: undefined });
        setShowExpirationDatePicker(false);

        // Product list report
        setSelectedProductStatuses([]);
        setShowProductStatusDropdown(false);
        setSelectedProductCategoryIds([]);
        setSelectedProductCategoryNames([]);
        setShowProductCategoryMultiModal(false);
        setSelectedProductClassIds([]);
        setSelectedProductClassNames([]);
        setShowProductClassMultiModal(false);
        setIncludeProductDealDetails(false);
        setIncludeProductUnitDetails(false);

        // Voucher report
        setSelectedAccountType('');
        setShowAccountTypeDropdown(false);
        setAvailableSubAccounts([]);
        setSelectedSubAccounts([]);
        setShowSubAccountDropdown(false);
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
        filterType === 'date-range-method' ||
        filterType === 'date-range-payment' ||
        filterType === 'date-range-rgs' ||
        filterType === 'date-range-voucher';

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
            if (includeInvoiceDetails) {
                filters.includeInvoiceDetails = true;
            }
        }
        if (filterType === 'date-range-method' && paymentMethod !== 'all') {
            filters.paymentMethod = paymentMethod;
        }

        if (filterType === 'date-range-payment') {
            if (selectedCustomerIds.length > 0) {
                filters.customerIds = selectedCustomerIds;
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
            }
            if (selectedPaymentRecordStatuses.length > 0) {
                filters.paymentRecordStatuses = selectedPaymentRecordStatuses;
            }

            const trimmedReceiptNos = receiptNosInput
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean);
            if (trimmedReceiptNos.length > 0) {
                filters.receiptNos = trimmedReceiptNos;
            }

            const trimmedInvoiceDocNos = invoiceDocNosInput
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean);
            if (trimmedInvoiceDocNos.length > 0) {
                filters.invoiceDocNos = trimmedInvoiceDocNos;
            }

            if (contractPaymentFilter !== 'all') {
                filters.contractPayment = contractPaymentFilter === 'yes';
            }
            if (customerCreditFilter !== 'all') {
                filters.customerCreditPayment = customerCreditFilter === 'yes';
            }
            if (includePaymentDetails) {
                filters.includePaymentDetails = true;
            }
            if (includePaymentInvoiceDetails) {
                filters.includePaymentInvoiceDetails = true;
            }
        }
        if (filterType === 'list-area-status') {
            if (selectedArea !== 'all') filters.areaId = selectedArea;
            filters.activeStatus = activeChecked;
            filters.inactiveStatus = inactiveChecked;
        }

        if (filterType === 'list-customer') {
            if (supportsMultiArea) {
                if (selectedInvoiceAreaIds.length > 0) filters.areaIds = selectedInvoiceAreaIds;
            }
            if (supportsSeparateByArea) {
                filters.separateByArea = separateByArea;
            }
            if (selectedTownNames.length > 0) {
                filters.townNames = selectedTownNames;
            }
            if (selectedCustomerClassificationIds.length > 0) {
                filters.customerClassificationIds = selectedCustomerClassificationIds;
            }
            if (selectedCustomerTypeIds.length > 0) {
                filters.customerTypeIds = selectedCustomerTypeIds;
            }
            if (selectedProductDealIds.length > 0) {
                filters.productDealIds = selectedProductDealIds;
            }
            if (includeProductDealDetails) {
                filters.includeProductDealDetails = true;
            }
            if (selectedCustomerStatuses.length > 0) {
                filters.customerStatuses = selectedCustomerStatuses;
            }
        }

        if (filterType === 'list-stock') {
            if (selectedStockStatuses.length > 0) {
                filters.stockStatuses = selectedStockStatuses;
            } else {
                filters.activeStatus = true;
                filters.inactiveStatus = false;
            }
            if (selectedStockTypeIds.length > 0) {
                filters.stockTypeIds = selectedStockTypeIds;
            }
            if (selectedProductUnitIds.length > 0) {
                filters.productUnitIds = selectedProductUnitIds;
            }
            if (selectedStockProducts.length > 0) {
                filters.productSelections = selectedStockProducts
                    .filter((p) => !!p.productId)
                    .map((p) => ({ productId: p.productId }));
            }
            const trimmedLotNos = lotNosInput
                .split(',')
                .map((l) => l.trim())
                .filter(Boolean);
            if (trimmedLotNos.length > 0) {
                filters.lotNos = trimmedLotNos;
            }
            if (expirationDateRange.from) {
                filters.startDate = format(expirationDateRange.from, 'yyyy-MM-dd');
            }
            if (expirationDateRange.to) {
                filters.endDate = format(expirationDateRange.to, 'yyyy-MM-dd');
            }
        }

        if (filterType === 'list-product') {
            if (selectedProductStatuses.length > 0) {
                filters.productStatuses = selectedProductStatuses;
            } else {
                filters.activeStatus = true;
                filters.inactiveStatus = false;
            }
            if (selectedProductCategoryIds.length > 0) {
                filters.productCategoryIds = selectedProductCategoryIds;
            }
            if (selectedProductClassIds.length > 0) {
                filters.productClassIds = selectedProductClassIds;
            }
            if (selectedProductDealIds.length > 0) {
                filters.productDealIds = selectedProductDealIds;
            }
            if (selectedProductUnitIds.length > 0) {
                filters.productUnitIds = selectedProductUnitIds;
            }
            if (includeProductDealDetails) {
                filters.includeProductDealDetails = true;
            }
            if (includeProductUnitDetails) {
                filters.includeProductUnitDetails = true;
            }
        }

        if (filterType === 'date-range-voucher') {
            if (selectedCustomerIds.length > 0) {
                filters.customerIds = selectedCustomerIds;
            }
            if (selectedInvoiceAreaIds.length > 0) {
                filters.areaIds = selectedInvoiceAreaIds;
            }
            if (selectedAccountType) {
                filters.accountType = selectedAccountType;
            }
            if (selectedSubAccounts.length > 0) {
                filters.subAccounts = selectedSubAccounts;
            }
        }

        if (filterType === 'date-range-rgs') {
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

            const trimmedInvoiceDocNos = invoiceDocNosRgsInput
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean);
            if (trimmedInvoiceDocNos.length > 0) {
                filters.invoiceDocNos = trimmedInvoiceDocNos;
            }

            const trimmedRgsDocNos = rgsDocNosInput
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean);
            if (trimmedRgsDocNos.length > 0) {
                filters.rgsDocNos = trimmedRgsDocNos;
            }

            if (selectedProducts.length > 0) {
                filters.productSelections = selectedProducts
                    .filter((p) => !!p.productId)
                    .map((p) => ({
                        productId: p.productId,
                        lotNo: p.lotNo?.trim() ? p.lotNo.trim() : undefined,
                    }));
            }
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
        receiptNosInput,
        invoiceDocNosInput,
        rgsDocNosInput,
        invoiceDocNosRgsInput,
        contractPaymentFilter,
        customerCreditFilter,
        selectedPaymentRecordStatuses,
        selectedCustomerClassificationIds,
        selectedCustomerTypeIds,
        selectedTownNames,
        selectedProductDealIds,
        includeProductDealDetails,
        includeInvoiceDetails,
        includePaymentDetails,
        includePaymentInvoiceDetails,
        includeProductUnitDetails,
        selectedCustomerStatuses,
        selectedStockStatuses,
        selectedStockTypeIds,
        selectedProductUnitIds,
        selectedStockProducts,
        lotNosInput,
        expirationDateRange,
        selectedProductStatuses,
        selectedProductCategoryIds,
        selectedProductClassIds,
        selectedAccountType,
        selectedSubAccounts,
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

                        {filterType === 'date-range-invoice' && (
                            <label className="self-end flex items-center gap-2 cursor-pointer select-none pb-2">
                                <input
                                    type="checkbox"
                                    checked={includeInvoiceDetails}
                                    onChange={(e) => setIncludeInvoiceDetails(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    Include Invoice Details
                                </span>
                            </label>
                        )}

                        {filterType === 'date-range-payment' && (
                            <>
                                <label className="self-end flex items-center gap-2 cursor-pointer select-none pb-2">
                                    <input
                                        type="checkbox"
                                        checked={includePaymentDetails}
                                        onChange={(e) => setIncludePaymentDetails(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        Include Payment Details
                                    </span>
                                </label>
                                <label className="self-end flex items-center gap-2 cursor-pointer select-none pb-2">
                                    <input
                                        type="checkbox"
                                        checked={includePaymentInvoiceDetails}
                                        onChange={(e) => setIncludePaymentInvoiceDetails(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        Include Payment Invoice Details
                                    </span>
                                </label>
                            </>
                        )}

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

                {/* Customer (multi-select, payment reports) */}
                {filterType === 'date-range-payment' && (
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

                {/* Contract (multi-select, payment reports) */}
                {filterType === 'date-range-payment' && (
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

                {/* Payment Record Status (multi-select dropdown, payment reports) */}
                {filterType === 'date-range-payment' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Payment Record Status</div>
                            {selectedPaymentRecordStatuses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPaymentRecordStatuses([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div ref={paymentRecordStatusDropdownRef} className="relative w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentRecordStatusDropdown((v) => !v)}
                                    className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                >
                                    <span
                                        className={
                                            selectedPaymentRecordStatuses.length === 0
                                                ? 'text-gray-400'
                                                : 'text-gray-900'
                                        }
                                    >
                                        {selectedPaymentRecordStatuses.length === 0
                                            ? 'All Statuses'
                                            : selectedPaymentRecordStatuses.length === 1
                                            ? selectedPaymentRecordStatuses[0]
                                            : `${selectedPaymentRecordStatuses.length} Statuses selected`}
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

                                {showPaymentRecordStatusDropdown && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                        {ALL_PAYMENT_RECORD_STATUSES.map((status) => {
                                            const checked = selectedPaymentRecordStatuses.includes(status);
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                    onClick={() => {
                                                        setSelectedPaymentRecordStatuses((prev) =>
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

                        {selectedPaymentRecordStatuses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedPaymentRecordStatuses.map((status) => (
                                    <span
                                        key={status}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        title={status}
                                    >
                                        <span className="max-w-[220px] truncate">{status}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedPaymentRecordStatuses((prev) =>
                                                    prev.filter((s) => s !== status)
                                                )
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

                {/* Receipt Nos (comma-separated, payment reports) */}
                {filterType === 'date-range-payment' && (
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Receipt Nos</label>
                        <input
                            type="text"
                            value={receiptNosInput}
                            onChange={(e) => setReceiptNosInput(e.target.value)}
                            placeholder="e.g. REC-001, REC-002"
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Separate multiple receipt numbers with commas</p>
                    </div>
                )}

                {/* Invoice Doc Nos (comma-separated, payment reports) */}
                {filterType === 'date-range-payment' && (
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Doc Nos</label>
                        <input
                            type="text"
                            value={invoiceDocNosInput}
                            onChange={(e) => setInvoiceDocNosInput(e.target.value)}
                            placeholder="e.g. INV-001, INV-002"
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Separate multiple invoice document numbers with commas
                        </p>
                    </div>
                )}

                {/* Contract Payment filter (payment reports) */}
                {filterType === 'date-range-payment' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract Payment</label>
                        <select
                            value={contractPaymentFilter}
                            onChange={(e) => setContractPaymentFilter(e.target.value as 'all' | 'yes' | 'no')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white min-w-[180px]"
                        >
                            <option value="all">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                )}

                {/* Customer Credit Payment filter (payment reports) */}
                {filterType === 'date-range-payment' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Credit</label>
                        <select
                            value={customerCreditFilter}
                            onChange={(e) => setCustomerCreditFilter(e.target.value as 'all' | 'yes' | 'no')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white min-w-[180px]"
                        >
                            <option value="all">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
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

                {/* === RGS Report Filters (date-range-rgs) === */}
                {filterType === 'date-range-rgs' && (
                    <>
                        {/* Customer (multi-select) */}
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

                        {/* Invoice Doc No (comma-separated text input) */}
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Doc No</label>
                            <input
                                type="text"
                                value={invoiceDocNosRgsInput}
                                onChange={(e) => setInvoiceDocNosRgsInput(e.target.value)}
                                placeholder="e.g. INV-001, INV-002"
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                            />
                            <p className="mt-1 text-xs text-gray-500">Separate multiple doc numbers with commas</p>
                        </div>

                        {/* RGS Doc No (comma-separated text input) */}
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">RGS Doc No</label>
                            <input
                                type="text"
                                value={rgsDocNosInput}
                                onChange={(e) => setRgsDocNosInput(e.target.value)}
                                placeholder="e.g. RGS-001, RGS-002"
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                            />
                            <p className="mt-1 text-xs text-gray-500">Separate multiple doc numbers with commas</p>
                        </div>
                    </>
                )}

                {/* === Customer List Report Filters (list-customer) === */}
                {filterType === 'list-customer' && (
                    <>
                        {/* Customer Classification (multi-select) */}
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="text-sm font-medium text-gray-700">Classification</div>
                                {selectedCustomerClassificationIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerClassificationIds([]);
                                            setSelectedCustomerClassificationNames([]);
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
                                onClick={() => setShowCustomerClassificationMultiModal(true)}
                                className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span
                                    className={
                                        selectedCustomerClassificationIds.length === 0
                                            ? 'text-gray-400'
                                            : 'text-gray-900'
                                    }
                                >
                                    {selectedCustomerClassificationIds.length === 0
                                        ? 'All Classifications'
                                        : selectedCustomerClassificationIds.length === 1
                                        ? selectedCustomerClassificationNames[0] || selectedCustomerClassificationIds[0]
                                        : `${selectedCustomerClassificationIds.length} Classifications selected`}
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

                            {selectedCustomerClassificationIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedCustomerClassificationIds.map((id, idx) => {
                                        const label = selectedCustomerClassificationNames[idx] || id;
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
                                                        setSelectedCustomerClassificationIds((prev) =>
                                                            prev.filter((x) => x !== id)
                                                        );
                                                        setSelectedCustomerClassificationNames((prev) =>
                                                            prev.filter((_, i) => i !== idx)
                                                        );
                                                    }}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                    title="Remove"
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

                            <CustomerClassificationMultiSearchableSelectionModal
                                show={showCustomerClassificationMultiModal}
                                title="Select Classifications"
                                selectedValues={selectedCustomerClassificationIds}
                                onSelectMultiple={(classifications) => {
                                    const ids = classifications
                                        .map((c) => c.customerClassificationId)
                                        .filter(Boolean) as string[];
                                    const names = classifications
                                        .map((c) => c.customerClassificationName || c.customerClassificationId)
                                        .filter(Boolean) as string[];
                                    setSelectedCustomerClassificationIds(ids);
                                    setSelectedCustomerClassificationNames(names);
                                    setShowCustomerClassificationMultiModal(false);
                                }}
                                onClose={() => setShowCustomerClassificationMultiModal(false)}
                            />
                        </div>

                        {/* Customer Type (multi-select) */}
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="text-sm font-medium text-gray-700">Type</div>
                                {selectedCustomerTypeIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerTypeIds([]);
                                            setSelectedCustomerTypeNames([]);
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
                                onClick={() => setShowCustomerTypeMultiModal(true)}
                                className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span
                                    className={selectedCustomerTypeIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}
                                >
                                    {selectedCustomerTypeIds.length === 0
                                        ? 'All Types'
                                        : selectedCustomerTypeIds.length === 1
                                        ? selectedCustomerTypeNames[0] || selectedCustomerTypeIds[0]
                                        : `${selectedCustomerTypeIds.length} Types selected`}
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

                            {selectedCustomerTypeIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedCustomerTypeIds.map((id, idx) => {
                                        const label = selectedCustomerTypeNames[idx] || id;
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
                                                        setSelectedCustomerTypeIds((prev) =>
                                                            prev.filter((x) => x !== id)
                                                        );
                                                        setSelectedCustomerTypeNames((prev) =>
                                                            prev.filter((_, i) => i !== idx)
                                                        );
                                                    }}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                    title="Remove"
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

                            <CustomerTypeMultiSearchableSelectionModal
                                show={showCustomerTypeMultiModal}
                                title="Select Types"
                                selectedValues={selectedCustomerTypeIds}
                                onSelectMultiple={(types) => {
                                    const ids = types.map((t) => t.customerTypeId).filter(Boolean) as string[];
                                    const names = types
                                        .map((t) => t.customerTypeName || t.customerTypeId)
                                        .filter(Boolean) as string[];
                                    setSelectedCustomerTypeIds(ids);
                                    setSelectedCustomerTypeNames(names);
                                    setShowCustomerTypeMultiModal(false);
                                }}
                                onClose={() => setShowCustomerTypeMultiModal(false)}
                            />
                        </div>

                        {/* Product Deal (multi-select) */}
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="text-sm font-medium text-gray-700">Product Deal</div>
                                {selectedProductDealIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProductDealIds([]);
                                            setSelectedProductDealNames([]);
                                        }}
                                        className="text-sm text-blue-600 hover:underline"
                                        title="Clear all"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowProductDealMultiModal(true)}
                                    className="flex-1 inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                >
                                    <span
                                        className={
                                            selectedProductDealIds.length === 0 ? 'text-gray-400' : 'text-gray-900'
                                        }
                                    >
                                        {selectedProductDealIds.length === 0
                                            ? 'All Product Deals'
                                            : selectedProductDealIds.length === 1
                                            ? selectedProductDealNames[0] || selectedProductDealIds[0]
                                            : `${selectedProductDealIds.length} Deals selected`}
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

                                <label
                                    className={
                                        `inline-flex items-center gap-2 px-4 h-10 rounded-lg border cursor-pointer select-none transition-colors text-sm whitespace-nowrap ` +
                                        (includeProductDealDetails
                                            ? 'border-gray-300 bg-gray-50 text-gray-900'
                                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                                    }
                                    title="Include product deal details as sub-rows in the report"
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeProductDealDetails}
                                        onChange={(e) => setIncludeProductDealDetails(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                    />
                                    Include Product Deal Details
                                </label>
                            </div>

                            {selectedProductDealIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedProductDealIds.map((id, idx) => {
                                        const label = selectedProductDealNames[idx] || id;
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
                                                        setSelectedProductDealIds((prev) =>
                                                            prev.filter((x) => x !== id)
                                                        );
                                                        setSelectedProductDealNames((prev) =>
                                                            prev.filter((_, i) => i !== idx)
                                                        );
                                                    }}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                    title="Remove"
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

                            <ProductDealMultiSearchableSelectionModal
                                show={showProductDealMultiModal}
                                title="Select Product Deals"
                                selectedValues={selectedProductDealIds}
                                onSelectMultiple={(deals) => {
                                    const ids = deals.map((d) => d.productDealId).filter(Boolean) as string[];
                                    const names = deals
                                        .map((d) => d.productDealName || d.productDealId)
                                        .filter(Boolean) as string[];
                                    setSelectedProductDealIds(ids);
                                    setSelectedProductDealNames(names);
                                    setShowProductDealMultiModal(false);
                                }}
                                onClose={() => setShowProductDealMultiModal(false)}
                            />
                        </div>

                        {/* Customer Status (multi-select dropdown) */}
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="text-sm font-medium text-gray-700">Customer Status</div>
                                {selectedCustomerStatuses.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCustomerStatuses([])}
                                        className="text-sm text-blue-600 hover:underline"
                                        title="Clear all"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <div ref={customerStatusDropdownRef} className="relative w-full">
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerStatusDropdown((v) => !v)}
                                        className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                    >
                                        <span
                                            className={
                                                selectedCustomerStatuses.length === 0
                                                    ? 'text-gray-400'
                                                    : 'text-gray-900'
                                            }
                                        >
                                            {selectedCustomerStatuses.length === 0
                                                ? 'All Statuses'
                                                : selectedCustomerStatuses.length === 1
                                                ? selectedCustomerStatuses[0]
                                                : `${selectedCustomerStatuses.length} Statuses selected`}
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

                                    {showCustomerStatusDropdown && (
                                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                            {ALL_CUSTOMER_STATUSES.map((status) => {
                                                const checked = selectedCustomerStatuses.includes(status);
                                                return (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                        onClick={() => {
                                                            setSelectedCustomerStatuses((prev) =>
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

                            {selectedCustomerStatuses.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedCustomerStatuses.map((status) => (
                                        <span
                                            key={status}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={status}
                                        >
                                            <span className="max-w-[220px] truncate">{status}</span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedCustomerStatuses((prev) =>
                                                        prev.filter((s) => s !== status)
                                                    )
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
                    </>
                )}

                {!hasDateRange &&
                    filterType !== 'list-customer' &&
                    filterType !== 'list-stock' &&
                    filterType !== 'list-product' &&
                    filterType !== 'date-range-voucher' && (
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

            {filterType === 'date-range-payment' && (
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

            {isRgsReport && (
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
                                ? 'Select Products (optional)'
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

            {isRgsReport && (
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

            {filterType === 'list-customer' && (
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

                    {/* Town (multi-select, only visible when areas selected) */}
                    {selectedInvoiceAreaIds.length > 0 && (
                        <div className="w-full mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="text-sm font-medium text-gray-700">Town</div>
                                {selectedTownNames.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTownNames([])}
                                        className="text-sm text-blue-600 hover:underline"
                                        title="Clear all"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowTownMultiModal(true)}
                                className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span className={selectedTownNames.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                    {selectedTownNames.length === 0
                                        ? 'All Towns'
                                        : selectedTownNames.length === 1
                                        ? selectedTownNames[0]
                                        : `${selectedTownNames.length} Towns selected`}
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

                            {selectedTownNames.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedTownNames.map((town) => (
                                        <span
                                            key={town}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            title={town}
                                        >
                                            <span className="max-w-[220px] truncate">{town}</span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedTownNames((prev) => prev.filter((t) => t !== town))
                                                }
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove town"
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

                            <TownMultiSelectionModal
                                show={showTownMultiModal}
                                title="Select Towns"
                                towns={availableTowns}
                                selectedTowns={selectedTownNames}
                                onSelect={(towns) => {
                                    setSelectedTownNames(towns);
                                    setShowTownMultiModal(false);
                                }}
                                onClose={() => setShowTownMultiModal(false)}
                            />
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => {
                                if (!canGenerateReport) return;
                                onGenerateReport?.();
                            }}
                            disabled={!canGenerateReport}
                            className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                        >
                            Generate Report
                        </button>
                    </div>
                </div>
            )}

            {/* === Stock List Report Filters (list-stock) === */}
            {filterType === 'list-stock' && (
                <div className="mt-4 space-y-4">
                    {/* Status (multi-select dropdown) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            {selectedStockStatuses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedStockStatuses([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div ref={stockStatusDropdownRef} className="relative w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowStockStatusDropdown((v) => !v)}
                                    className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                >
                                    <span
                                        className={
                                            selectedStockStatuses.length === 0 ? 'text-gray-400' : 'text-gray-900'
                                        }
                                    >
                                        {selectedStockStatuses.length === 0
                                            ? 'All Statuses (default: ACTIVE)'
                                            : selectedStockStatuses.length === 1
                                            ? selectedStockStatuses[0]
                                            : `${selectedStockStatuses.length} Statuses selected`}
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

                                {showStockStatusDropdown && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                        {ALL_STOCK_STATUSES.map((status) => {
                                            const checked = selectedStockStatuses.includes(status);
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                    onClick={() => {
                                                        setSelectedStockStatuses((prev) =>
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

                        {selectedStockStatuses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedStockStatuses.map((status) => (
                                    <span
                                        key={status}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        title={status}
                                    >
                                        <span className="max-w-[220px] truncate">{status}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedStockStatuses((prev) => prev.filter((s) => s !== status))
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

                    {/* Stock Type (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Stock Type</div>
                            {selectedStockTypeIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedStockTypeIds([]);
                                        setSelectedStockTypeNames([]);
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
                            onClick={() => setShowStockTypeMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedStockTypeIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedStockTypeIds.length === 0
                                    ? 'All Stock Types'
                                    : selectedStockTypeIds.length === 1
                                    ? selectedStockTypeNames[0] || selectedStockTypeIds[0]
                                    : `${selectedStockTypeIds.length} Stock Types selected`}
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

                        {selectedStockTypeIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedStockTypeIds.map((id, idx) => {
                                    const label = selectedStockTypeNames[idx] || id;
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
                                                    setSelectedStockTypeIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedStockTypeNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <StockTypeMultiSearchableSelectionModal
                            show={showStockTypeMultiModal}
                            title="Select Stock Types"
                            selectedValues={selectedStockTypeIds}
                            onSelectMultiple={(stockTypes) => {
                                const ids = stockTypes.map((s) => s.stockTypeId).filter(Boolean) as string[];
                                const names = stockTypes
                                    .map((s) => s.stockTypeName || s.stockTypeId)
                                    .filter(Boolean) as string[];
                                setSelectedStockTypeIds(ids);
                                setSelectedStockTypeNames(names);
                                setShowStockTypeMultiModal(false);
                            }}
                            onClose={() => setShowStockTypeMultiModal(false)}
                        />
                    </div>

                    {/* Product (multi-select modal — reusable) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product</div>
                            {selectedStockProducts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedStockProducts([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowStockProductModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedStockProducts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedStockProducts.length === 0
                                    ? 'All Products'
                                    : selectedStockProducts.length === 1
                                    ? selectedStockProducts[0].productName || selectedStockProducts[0].productId
                                    : `${selectedStockProducts.length} Products selected`}
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

                        {selectedStockProducts.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedStockProducts.map((p) => {
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
                                                    setSelectedStockProducts((prev) =>
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
                        )}

                        <ProductMultiSearchableSelectionModal
                            show={showStockProductModal}
                            title="Select Products"
                            selectedValues={selectedStockProducts.map((p) => p.productId)}
                            onSelectMultiple={(products) => {
                                setSelectedStockProducts(
                                    products
                                        .filter((p) => !!p.productId)
                                        .map((p) => ({
                                            productId: p.productId,
                                            productName: p.productName || p.productId,
                                        }))
                                );
                                setShowStockProductModal(false);
                            }}
                            onClose={() => setShowStockProductModal(false)}
                        />
                    </div>

                    {/* Product Unit (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product Unit</div>
                            {selectedProductUnitIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductUnitIds([]);
                                        setSelectedProductUnitNames([]);
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
                            onClick={() => setShowProductUnitMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedProductUnitIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedProductUnitIds.length === 0
                                    ? 'All Product Units'
                                    : selectedProductUnitIds.length === 1
                                    ? selectedProductUnitNames[0] || selectedProductUnitIds[0]
                                    : `${selectedProductUnitIds.length} Product Units selected`}
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

                        {selectedProductUnitIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductUnitIds.map((id, idx) => {
                                    const label = selectedProductUnitNames[idx] || id;
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
                                                    setSelectedProductUnitIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedProductUnitNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <ProductUnitMultiSearchableSelectionModal
                            show={showProductUnitMultiModal}
                            title="Select Product Units"
                            selectedValues={selectedProductUnitIds}
                            onSelectMultiple={(productUnits) => {
                                const ids = productUnits.map((pu) => pu.productUnitId).filter(Boolean) as string[];
                                const names = productUnits
                                    .map((pu) => pu.productUnitName || pu.productUnitId)
                                    .filter(Boolean) as string[];
                                setSelectedProductUnitIds(ids);
                                setSelectedProductUnitNames(names);
                                setShowProductUnitMultiModal(false);
                            }}
                            onClose={() => setShowProductUnitMultiModal(false)}
                        />
                    </div>

                    {/* Lot No (comma-separated text input) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lot No</label>
                        <input
                            type="text"
                            value={lotNosInput}
                            onChange={(e) => setLotNosInput(e.target.value)}
                            placeholder="e.g. LOT-001, LOT-002"
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Separate multiple lot numbers with commas</p>
                    </div>

                    {/* Expiration Date Range (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Expiration Date Range <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowExpirationDatePicker(!showExpirationDatePicker)}
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
                                    {expirationDateRange.from && expirationDateRange.to
                                        ? `${formatDateDisplay(expirationDateRange.from)} - ${formatDateDisplay(
                                              expirationDateRange.to
                                          )}`
                                        : 'Select Expiration Date Range'}
                                </button>

                                {showExpirationDatePicker && (
                                    <DateRangeSelector
                                        dateRange={expirationDateRange}
                                        onApply={(range) => {
                                            setExpirationDateRange(range);
                                            setShowExpirationDatePicker(false);
                                        }}
                                        onCancel={() => setShowExpirationDatePicker(false)}
                                        title="Select Expiration Date Range"
                                    />
                                )}
                            </div>
                            {(expirationDateRange.from || expirationDateRange.to) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpirationDateRange({ from: undefined, to: undefined });
                                        setShowExpirationDatePicker(false);
                                    }}
                                    className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Filter stock by expiration date. Leave blank to include all.
                        </p>
                    </div>

                    {/* Generate Report button */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                if (!canGenerateReport) return;
                                onGenerateReport?.();
                            }}
                            disabled={!canGenerateReport}
                            className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                        >
                            Generate Report
                        </button>
                    </div>
                </div>
            )}

            {/* === Product List Report Filters (list-product) === */}
            {filterType === 'list-product' && (
                <div className="mt-4 space-y-4">
                    {/* Status (multi-select dropdown) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            {selectedProductStatuses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedProductStatuses([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div ref={productStatusDropdownRef} className="relative w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowProductStatusDropdown((v) => !v)}
                                    className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                                >
                                    <span
                                        className={
                                            selectedProductStatuses.length === 0 ? 'text-gray-400' : 'text-gray-900'
                                        }
                                    >
                                        {selectedProductStatuses.length === 0
                                            ? 'All Statuses (default: ACTIVE)'
                                            : selectedProductStatuses.length === 1
                                            ? selectedProductStatuses[0]
                                            : `${selectedProductStatuses.length} Statuses selected`}
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

                                {showProductStatusDropdown && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                        {ALL_PRODUCT_STATUSES.map((status) => {
                                            const checked = selectedProductStatuses.includes(status);
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                    onClick={() => {
                                                        setSelectedProductStatuses((prev) =>
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

                        {selectedProductStatuses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductStatuses.map((status) => (
                                    <span
                                        key={status}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        title={status}
                                    >
                                        <span className="max-w-[220px] truncate">{status}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedProductStatuses((prev) => prev.filter((s) => s !== status))
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

                    {/* Product Category (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product Category</div>
                            {selectedProductCategoryIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductCategoryIds([]);
                                        setSelectedProductCategoryNames([]);
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
                            onClick={() => setShowProductCategoryMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span
                                className={selectedProductCategoryIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}
                            >
                                {selectedProductCategoryIds.length === 0
                                    ? 'All Categories'
                                    : selectedProductCategoryIds.length === 1
                                    ? selectedProductCategoryNames[0] || selectedProductCategoryIds[0]
                                    : `${selectedProductCategoryIds.length} Categories selected`}
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

                        {selectedProductCategoryIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductCategoryIds.map((id, idx) => {
                                    const label = selectedProductCategoryNames[idx] || id;
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
                                                    setSelectedProductCategoryIds((prev) =>
                                                        prev.filter((x) => x !== id)
                                                    );
                                                    setSelectedProductCategoryNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <ProductCategoryMultiSearchableSelectionModal
                            show={showProductCategoryMultiModal}
                            title="Select Product Categories"
                            selectedValues={selectedProductCategoryIds}
                            onSelectMultiple={(categories) => {
                                const ids = categories.map((c) => c.productCategoryId).filter(Boolean) as string[];
                                const names = categories
                                    .map((c) => c.productCategoryName || c.productCategoryId)
                                    .filter(Boolean) as string[];
                                setSelectedProductCategoryIds(ids);
                                setSelectedProductCategoryNames(names);
                                setShowProductCategoryMultiModal(false);
                            }}
                            onClose={() => setShowProductCategoryMultiModal(false)}
                        />
                    </div>

                    {/* Product Class (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product Class</div>
                            {selectedProductClassIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductClassIds([]);
                                        setSelectedProductClassNames([]);
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
                            onClick={() => setShowProductClassMultiModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedProductClassIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedProductClassIds.length === 0
                                    ? 'All Classes'
                                    : selectedProductClassIds.length === 1
                                    ? selectedProductClassNames[0] || selectedProductClassIds[0]
                                    : `${selectedProductClassIds.length} Classes selected`}
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

                        {selectedProductClassIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductClassIds.map((id, idx) => {
                                    const label = selectedProductClassNames[idx] || id;
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
                                                    setSelectedProductClassIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedProductClassNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <ProductClassMultiSearchableSelectionModal
                            show={showProductClassMultiModal}
                            title="Select Product Classes"
                            selectedValues={selectedProductClassIds}
                            onSelectMultiple={(classes) => {
                                const ids = classes.map((c) => c.productClassId).filter(Boolean) as string[];
                                const names = classes
                                    .map((c) => c.productClassName || c.productClassId)
                                    .filter(Boolean) as string[];
                                setSelectedProductClassIds(ids);
                                setSelectedProductClassNames(names);
                                setShowProductClassMultiModal(false);
                            }}
                            onClose={() => setShowProductClassMultiModal(false)}
                        />
                    </div>

                    {/* Product Deal (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product Deal</div>
                            {selectedProductDealIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductDealIds([]);
                                        setSelectedProductDealNames([]);
                                    }}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowProductDealMultiModal(true)}
                                className="flex-1 inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span
                                    className={selectedProductDealIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}
                                >
                                    {selectedProductDealIds.length === 0
                                        ? 'All Deals'
                                        : selectedProductDealIds.length === 1
                                        ? selectedProductDealNames[0] || selectedProductDealIds[0]
                                        : `${selectedProductDealIds.length} Deals selected`}
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

                            <label
                                className={
                                    `inline-flex items-center gap-2 px-4 h-10 rounded-lg border cursor-pointer select-none transition-colors text-sm whitespace-nowrap ` +
                                    (includeProductDealDetails
                                        ? 'border-gray-300 bg-gray-50 text-gray-900'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                                }
                                title="Include product deal details as sub-rows in the report"
                            >
                                <input
                                    type="checkbox"
                                    checked={includeProductDealDetails}
                                    onChange={(e) => setIncludeProductDealDetails(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                />
                                Include Product Deal Details
                            </label>
                        </div>

                        {selectedProductDealIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductDealIds.map((id, idx) => {
                                    const label = selectedProductDealNames[idx] || id;
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
                                                    setSelectedProductDealIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedProductDealNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <ProductDealMultiSearchableSelectionModal
                            show={showProductDealMultiModal}
                            title="Select Product Deals"
                            selectedValues={selectedProductDealIds}
                            onSelectMultiple={(deals) => {
                                const ids = deals.map((d) => d.productDealId).filter(Boolean) as string[];
                                const names = deals
                                    .map((d) => d.productDealName || d.productDealId)
                                    .filter(Boolean) as string[];
                                setSelectedProductDealIds(ids);
                                setSelectedProductDealNames(names);
                                setShowProductDealMultiModal(false);
                            }}
                            onClose={() => setShowProductDealMultiModal(false)}
                        />
                    </div>

                    {/* Product Unit (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Product Unit</div>
                            {selectedProductUnitIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductUnitIds([]);
                                        setSelectedProductUnitNames([]);
                                    }}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowProductUnitMultiModal(true)}
                                className="flex-1 inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span
                                    className={selectedProductUnitIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}
                                >
                                    {selectedProductUnitIds.length === 0
                                        ? 'All Units'
                                        : selectedProductUnitIds.length === 1
                                        ? selectedProductUnitNames[0] || selectedProductUnitIds[0]
                                        : `${selectedProductUnitIds.length} Units selected`}
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

                            <label
                                className={
                                    `inline-flex items-center gap-2 px-4 h-10 rounded-lg border cursor-pointer select-none transition-colors text-sm whitespace-nowrap ` +
                                    (includeProductUnitDetails
                                        ? 'border-gray-300 bg-gray-50 text-gray-900'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                                }
                                title="Include product unit details as sub-rows in the report"
                            >
                                <input
                                    type="checkbox"
                                    checked={includeProductUnitDetails}
                                    onChange={(e) => setIncludeProductUnitDetails(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                />
                                Include Product Unit Details
                            </label>
                        </div>

                        {selectedProductUnitIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProductUnitIds.map((id, idx) => {
                                    const label = selectedProductUnitNames[idx] || id;
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
                                                    setSelectedProductUnitIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedProductUnitNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <ProductUnitMultiSearchableSelectionModal
                            show={showProductUnitMultiModal}
                            title="Select Product Units"
                            selectedValues={selectedProductUnitIds}
                            onSelectMultiple={(units) => {
                                const ids = units.map((u) => u.productUnitId).filter(Boolean) as string[];
                                const names = units
                                    .map((u) => u.productUnitName || u.productUnitId)
                                    .filter(Boolean) as string[];
                                setSelectedProductUnitIds(ids);
                                setSelectedProductUnitNames(names);
                                setShowProductUnitMultiModal(false);
                            }}
                            onClose={() => setShowProductUnitMultiModal(false)}
                        />
                    </div>

                    {/* Generate Report button */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                if (!canGenerateReport) return;
                                onGenerateReport?.();
                            }}
                            disabled={!canGenerateReport}
                            className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                        >
                            Generate Report
                        </button>
                    </div>
                </div>
            )}

            {/* === Voucher Report Filters (date-range-voucher) === */}
            {filterType === 'date-range-voucher' && (
                <div className="mt-4 space-y-4">
                    {/* Customer (multi-select modal) */}
                    <div>
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
                                                title="Remove"
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

                    {/* Area (multi-select modal) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Area</div>
                            {selectedInvoiceAreaIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedInvoiceAreaIds([]);
                                        setSelectedInvoiceAreaNames([]);
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
                            onClick={() => setShowAreaModal(true)}
                            className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                        >
                            <span className={selectedInvoiceAreaIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                {selectedInvoiceAreaIds.length === 0
                                    ? 'All Areas'
                                    : selectedInvoiceAreaIds.length === 1
                                    ? selectedInvoiceAreaNames[0] || selectedInvoiceAreaIds[0]
                                    : `${selectedInvoiceAreaIds.length} Areas selected`}
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

                        {selectedInvoiceAreaIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedInvoiceAreaIds.map((id, idx) => {
                                    const label = selectedInvoiceAreaNames[idx] || id;
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
                                                    setSelectedInvoiceAreaIds((prev) => prev.filter((x) => x !== id));
                                                    setSelectedInvoiceAreaNames((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                                title="Remove"
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

                        <AreaSearchableSelectionModal
                            show={showAreaModal}
                            title="Select Areas"
                            selectedValue={null}
                            multiSelect={true}
                            selectedValues={selectedInvoiceAreaIds}
                            onSelect={(area) => {
                                if (!area) return;
                                const areaId = (area as { areaId?: string }).areaId;
                                const areaName = (area as { areaName?: string }).areaName;
                                if (!areaId) return;
                                if (selectedInvoiceAreaIds.includes(areaId)) {
                                    setSelectedInvoiceAreaIds((prev) => prev.filter((id) => id !== areaId));
                                    setSelectedInvoiceAreaNames((prev) =>
                                        prev.filter((_, i) => selectedInvoiceAreaIds[i] !== areaId)
                                    );
                                } else {
                                    setSelectedInvoiceAreaIds((prev) => [...prev, areaId]);
                                    setSelectedInvoiceAreaNames((prev) => [...prev, areaName || areaId]);
                                }
                            }}
                            onSelectMultiple={(areas) => {
                                const ids = areas.map((a: { areaId?: string }) => a.areaId).filter(Boolean) as string[];
                                const names = areas
                                    .map((a: { areaName?: string; areaId?: string }) => a.areaName || a.areaId)
                                    .filter(Boolean) as string[];
                                setSelectedInvoiceAreaIds(ids);
                                setSelectedInvoiceAreaNames(names);
                                setShowAreaModal(false);
                            }}
                            onClose={() => setShowAreaModal(false)}
                        />
                    </div>

                    {/* Account Type (dropdown) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Account Type</div>
                            {selectedAccountType && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedAccountType('')}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div ref={accountTypeDropdownRef} className="relative w-full">
                            <button
                                type="button"
                                onClick={() => setShowAccountTypeDropdown((v) => !v)}
                                className="w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors justify-between"
                            >
                                <span className={!selectedAccountType ? 'text-gray-400' : 'text-gray-900'}>
                                    {selectedAccountType || 'All Account Types'}
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

                            {showAccountTypeDropdown && (
                                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
                                    {ALL_ACCOUNT_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                                selectedAccountType === type
                                                    ? 'text-blue-600 font-medium bg-blue-50'
                                                    : 'text-gray-700'
                                            }`}
                                            onClick={() => {
                                                setSelectedAccountType(selectedAccountType === type ? '' : type);
                                                setShowAccountTypeDropdown(false);
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sub Account (dynamic multi-select dropdown, depends on Account Type) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium text-gray-700">Sub Account</div>
                            {selectedSubAccounts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubAccounts([])}
                                    className="text-sm text-blue-600 hover:underline"
                                    title="Clear all"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div ref={subAccountDropdownRef} className="relative w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedAccountType) {
                                        setShowSubAccountDropdown((v) => !v);
                                    }
                                }}
                                disabled={!selectedAccountType}
                                className={`w-full inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-lg text-sm bg-white transition-colors justify-between ${
                                    !selectedAccountType
                                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className={selectedSubAccounts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                    {!selectedAccountType
                                        ? 'Select an Account Type first'
                                        : loadingSubAccounts
                                        ? 'Loading sub-accounts...'
                                        : selectedSubAccounts.length === 0
                                        ? 'All Sub Accounts'
                                        : selectedSubAccounts.length === 1
                                        ? selectedSubAccounts[0]
                                        : `${selectedSubAccounts.length} Sub Accounts selected`}
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

                            {showSubAccountDropdown && availableSubAccounts.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden max-h-60 overflow-y-auto">
                                    {availableSubAccounts.map((sub) => {
                                        const checked = selectedSubAccounts.includes(sub);
                                        return (
                                            <button
                                                key={sub}
                                                type="button"
                                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                onClick={() => {
                                                    setSelectedSubAccounts((prev) =>
                                                        prev.includes(sub)
                                                            ? prev.filter((s) => s !== sub)
                                                            : [...prev, sub]
                                                    );
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    readOnly
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                                                />
                                                {sub}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedSubAccounts.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedSubAccounts.map((sub) => (
                                    <span
                                        key={sub}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        title={sub}
                                    >
                                        <span className="max-w-[220px] truncate">{sub}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedSubAccounts((prev) => prev.filter((s) => s !== sub))
                                            }
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                            title="Remove"
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

                    {/* Generate Report button */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                if (!canGenerateReport) return;
                                onGenerateReport?.();
                            }}
                            disabled={!canGenerateReport}
                            className="px-8 py-2.5 bg-secondaryNeutral-900 text-white text-sm font-medium rounded-full hover:bg-secondaryNeutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondaryNeutral-900"
                        >
                            Generate Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFilters;
