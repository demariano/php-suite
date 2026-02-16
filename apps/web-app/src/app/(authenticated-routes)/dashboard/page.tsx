'use client';

import { Customers, File, StatCard } from '@components-web';
import {
    ContractExpirationItem,
    CustomerApi,
    DashboardApi,
    DashboardSummaryResponse,
    InvoicePaymentStatusResponse,
    InvoicesCreatedResponse,
    PaymentsCreatedResponse,
    ReturnGoodsSoldResponse,
} from '@data-access/index';
import { format, startOfYear } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DateRange } from 'react-day-picker';
import ContractExpirationCard from './components/ContractExpirationCard';
import DashboardHeader from './components/DashboardHeader';
import InvoicePaymentStatusChart from './components/InvoicePaymentStatusChart';
import InvoicesCreatedChart from './components/InvoicesCreatedChart';
import PaymentsCreatedChart from './components/PaymentsCreatedChart';
import QuickActionsCard from './components/QuickActionsCard';
import ReturnGoodsSoldChart from './components/ReturnGoodsSoldChart';

// Trend icon component for stat cards
function TrendIcon({ size = 22 }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C3AED"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

// Clock/alert icon for pending payments stat card
function PendingIcon({ size = 22 }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EE2C59"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

const DashboardPage = () => {
    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfYear(new Date()),
        to: new Date(),
    });

    // Summary / stat data
    const [activeCustomers, setActiveCustomers] = useState(0);
    const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [customerCountLoading, setCustomerCountLoading] = useState(true);

    // Chart data
    const [invoicesCreated, setInvoicesCreated] = useState<InvoicesCreatedResponse | null>(null);
    const [invoicesCreatedLoading, setInvoicesCreatedLoading] = useState(true);
    const [invoicesCreatedError, setInvoicesCreatedError] = useState<string | null>(null);

    const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatusResponse | null>(null);
    const [paymentStatusLoading, setPaymentStatusLoading] = useState(true);
    const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);

    const [paymentsCreated, setPaymentsCreated] = useState<PaymentsCreatedResponse | null>(null);
    const [paymentsCreatedLoading, setPaymentsCreatedLoading] = useState(true);
    const [paymentsCreatedError, setPaymentsCreatedError] = useState<string | null>(null);

    const [returnGoodsSold, setReturnGoodsSold] = useState<ReturnGoodsSoldResponse | null>(null);
    const [returnGoodsSoldLoading, setReturnGoodsSoldLoading] = useState(true);
    const [returnGoodsSoldError, setReturnGoodsSoldError] = useState<string | null>(null);

    const [contracts, setContracts] = useState<ContractExpirationItem[]>([]);
    const [contractsLoading, setContractsLoading] = useState(true);
    const [contractsError, setContractsError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);

    const fetchDashboardData = useCallback(
        async (overrideStart?: string, overrideEnd?: string) => {
            const startDate = overrideStart ?? (dateRange.from ? formatDate(dateRange.from) : '');
            const endDate = overrideEnd ?? (dateRange.to ? formatDate(dateRange.to) : '');
            if (!startDate || !endDate) return;

            // Reset loading
            setSummaryLoading(true);
            setCustomerCountLoading(true);
            setInvoicesCreatedLoading(true);
            setPaymentStatusLoading(true);
            setPaymentsCreatedLoading(true);
            setReturnGoodsSoldLoading(true);
            setContractsLoading(true);

            // Reset errors
            setInvoicesCreatedError(null);
            setPaymentStatusError(null);
            setPaymentsCreatedError(null);
            setReturnGoodsSoldError(null);
            setContractsError(null);

            // Fire all API calls independently — each widget updates as soon as its own data arrives
            CustomerApi.getActiveCustomerCount()
                .then((data) => setActiveCustomers(data.count ?? 0))
                .catch(() => setActiveCustomers(0))
                .finally(() => setCustomerCountLoading(false));

            DashboardApi.getSummary(startDate, endDate)
                .then((data) => setSummary(data))
                .catch(() => setSummary(null))
                .finally(() => setSummaryLoading(false));

            DashboardApi.getInvoicesCreated(startDate, endDate)
                .then((data) => setInvoicesCreated(data))
                .catch(() => setInvoicesCreatedError('Failed to load invoices data'))
                .finally(() => setInvoicesCreatedLoading(false));

            DashboardApi.getInvoicePaymentStatus(startDate, endDate)
                .then((data) => setPaymentStatus(data))
                .catch(() => setPaymentStatusError('Failed to load payment status data'))
                .finally(() => setPaymentStatusLoading(false));

            DashboardApi.getPaymentsCreated(startDate, endDate)
                .then((data) => setPaymentsCreated(data))
                .catch(() => setPaymentsCreatedError('Failed to load payments data'))
                .finally(() => setPaymentsCreatedLoading(false));

            DashboardApi.getReturnGoodsSold(startDate, endDate)
                .then((data) => setReturnGoodsSold(data))
                .catch(() => setReturnGoodsSoldError('Failed to load return goods data'))
                .finally(() => setReturnGoodsSoldLoading(false));

            DashboardApi.getContractExpiration(startDate, endDate)
                .then((data) => setContracts(data.contracts ?? []))
                .catch(() => setContractsError('Failed to load contracts data'))
                .finally(() => setContractsLoading(false));
        },
        [dateRange]
    );

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleDateRangeChange = (range: DateRange) => {
        setDateRange(range);
        if (range.from && range.to) {
            fetchDashboardData(formatDate(range.from), formatDate(range.to));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with date range picker */}
            <DashboardHeader dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />

            {/* Quick Actions */}
            <QuickActionsCard />

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Active Customers"
                    value={activeCustomers}
                    icon={Customers}
                    iconBgColor="#EDE9FE"
                    isLoading={customerCountLoading}
                />
                <StatCard
                    label="Active Contracts"
                    value={summary?.activeContracts ?? 0}
                    icon={File}
                    iconBgColor="#D1FAE5"
                    isLoading={summaryLoading}
                />
                <StatCard
                    label="Total Invoices (MTD)"
                    value={summary?.totalInvoicesMTD ?? 0}
                    icon={TrendIcon}
                    iconBgColor="#F3E8FF"
                    isLoading={summaryLoading}
                />
                <StatCard
                    label="Pending Payments"
                    value={summary?.pendingPayments ?? 0}
                    icon={PendingIcon}
                    iconBgColor="#FEE2E2"
                    isLoading={summaryLoading}
                />
            </div>

            {/* Charts Row 1: Invoices Created + Payment Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InvoicesCreatedChart
                    data={invoicesCreated?.weeklyData ?? []}
                    totalInvoices={invoicesCreated?.totalInvoices ?? 0}
                    isLoading={invoicesCreatedLoading}
                    error={invoicesCreatedError}
                />
                <InvoicePaymentStatusChart
                    data={paymentStatus?.weeklyData ?? []}
                    isLoading={paymentStatusLoading}
                    error={paymentStatusError}
                />
            </div>

            {/* Charts Row 2: Payments Created + Return Goods Sold */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PaymentsCreatedChart
                    data={paymentsCreated?.weeklyData ?? []}
                    isLoading={paymentsCreatedLoading}
                    error={paymentsCreatedError}
                />
                <ReturnGoodsSoldChart
                    data={returnGoodsSold?.weeklyData ?? []}
                    totalReturns={returnGoodsSold?.totalReturns ?? 0}
                    isLoading={returnGoodsSoldLoading}
                    error={returnGoodsSoldError}
                />
            </div>

            {/* Contract Expiration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ContractExpirationCard contracts={contracts} isLoading={contractsLoading} error={contractsError} />
            </div>
        </div>
    );
};

export default DashboardPage;
