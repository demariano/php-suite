'use client';

import { StatusBadge } from '@components-web';
import { PaymentApi, PaymentDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PaymentHeader, PaymentTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function PaymentPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [payments, setPayments] = useState<PaymentDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const fetchPayments = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const currentPageSize = customPageSize ?? pageSize;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && serializedCursor ? direction : undefined;
            const paginationCursor = direction && serializedCursor ? serializedCursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // 4-branch API logic: search+status → status only → search only → show all
            if (statusFilter !== 'ALL' && trimmedQuery.length > 0) {
                // Branch 1: Filter by status with search (use status API with receiptNo param)
                response = await PaymentApi.getPaymentsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    trimmedQuery
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 2: Filter by status only
                response = await PaymentApi.getPaymentsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 3: Search by receipt number only (no status filter)
                response = await PaymentApi.getPaymentsContainingReceiptNo(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor
                );
            } else {
                // Branch 4: No filter, no search - get all
                response = await PaymentApi.getPayments(currentPageSize, paginationDirection, paginationCursor);
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setPayments(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setPayments([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load payments. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchPayments();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounce search query changes
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0 && !hasFetchedRef.current) {
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchPayments(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchPayments(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'receiptNo', label: 'RECEIPT NO' },
            { key: 'paymentDate', label: 'PAYMENT DATE' },
            { key: 'customerName', label: 'CUSTOMER NAME' },
            { key: 'paymentAmount', label: 'PAYMENT AMOUNT' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    // Transform data for table display using StatusBadge
    const tableData = useMemo(
        () =>
            payments.map((payment) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (payment.activityLogs && payment.activityLogs.length > 0) {
                    const lastLog = payment.activityLogs[payment.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...payment,
                    status: <StatusBadge status={payment.status ?? StatusEnum.ACTIVE} />,
                    paymentAmount: payment.paymentAmount ? `₱${payment.paymentAmount.toFixed(2)}` : '₱0.00',
                    latestActivity,
                };
            }),
        [payments]
    );

    const handleCreateClick = () => {
        router.push('/invoicing/payment/create');
    };

    const handleRowClick = (payment: PaymentDto) => {
        router.push(`/invoicing/payment/${payment.paymentId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchPayments(undefined, undefined, size);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Home
                    </a>
                    <span>/</span>
                    <a href="/invoicing" className="text-blue-600 hover:text-blue-700">
                        Invoicing
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Payment</span>
                </nav>
            </div>

            <PaymentHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value) => {
                    setStatusFilter(value);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchPayments();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={isAdminUser}
            />

            <PaymentTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchPayments('prev', prevCursor)}
                onNext={() => fetchPayments('next', nextCursor)}
            />
        </div>
    );
}
