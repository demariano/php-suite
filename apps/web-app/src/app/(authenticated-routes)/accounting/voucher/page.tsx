'use client';

import { StatusBadge } from '@components-web';
import { extractErrorMessage, StatusEnum, useEnv, useLocalStore, VoucherApi, VoucherDto } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { VoucherHeader, VoucherTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function VoucherPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [vouchers, setVouchers] = useState<VoucherDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch vouchers from API
    const fetchVouchers = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // Serialize cursor object to JSON string if it's an object
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            let response;

            // Use custom page size if provided, otherwise use state page size
            const currentPageSize = customPageSize ?? pageSize;
            const trimmedQuery = searchQuery.trim();

            // 4-branch API logic: search+status → search only → status only → show all
            if (trimmedQuery !== '' && statusFilter !== 'ALL') {
                // Branch 1: Search with status filter (use status API with voucherNo param)
                response = await VoucherApi.getVouchersPaginationByStatus(
                    statusFilter,
                    currentPageSize,
                    direction,
                    serializedCursor,
                    trimmedQuery
                );
            } else if (trimmedQuery !== '') {
                // Branch 2: Search only (no status filter)
                response = await VoucherApi.getVouchersContainingVoucherNo(
                    currentPageSize,
                    trimmedQuery,
                    direction,
                    serializedCursor
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 3: Filter by status only
                response = await VoucherApi.getVouchersPaginationByStatus(
                    statusFilter,
                    currentPageSize,
                    direction,
                    serializedCursor
                );
            } else {
                // Branch 4: Show all
                response = await VoucherApi.getVouchersPagination(currentPageSize, direction, serializedCursor);
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setVouchers(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setVouchers([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setVouchers([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            setError(extractErrorMessage(err, 'Failed to load vouchers. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchVouchers();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search term changes
    useEffect(() => {
        if (searchQuery === '') {
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchVouchers();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Handle status filter changes
    useEffect(() => {
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchVouchers();
    }, [statusFilter]);

    const headers = [
        { key: 'voucherNo', label: 'VOUCHER NO' },
        { key: 'voucherDate', label: 'VOUCHER DATE' },
        { key: 'accountName', label: 'ACCOUNT NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'totalAmount', label: 'TOTAL AMOUNT' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = (voucher: VoucherDto) => {
        router.push(`/accounting/voucher/${voucher.voucherId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/accounting/voucher/create');
    };

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchVouchers();
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchVouchers(undefined, undefined, newPageSize);
    };

    // Transform data for table display with useMemo
    const tableData = useMemo(
        () =>
            vouchers?.map((voucher) => {
                let latestActivity = null;
                if (voucher.activityLogs && voucher.activityLogs.length > 0) {
                    const lastLog = voucher.activityLogs[voucher.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...voucher,
                    status: <StatusBadge status={voucher.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [vouchers]
    );

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Error Message */}
            {error && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
                    <span className="text-sm font-medium">{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-lg font-bold leading-none text-red-600 transition-colors duration-200 hover:text-red-800"
                        aria-label="Close error message"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header */}
            <VoucherHeader
                searchQuery={searchQuery}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onRefresh={handleRefresh}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                isAdminUser={isAdminUser}
            />

            {/* Table */}
            <VoucherTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                hasPrevious={!!prevCursor}
                hasNext={!!nextCursor}
                onPrevious={() => fetchVouchers('prev', prevCursor)}
                onNext={() => fetchVouchers('next', nextCursor)}
            />
        </div>
    );
}
