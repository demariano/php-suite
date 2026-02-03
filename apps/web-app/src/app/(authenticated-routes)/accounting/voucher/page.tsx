'use client';

import { StatusBadge } from '@components-web';
import { StatusEnum, VoucherApi, VoucherDto, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { VoucherHeader, VoucherTable } from './components';

export default function VoucherPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [vouchers, setVouchers] = useState<VoucherDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

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

            // If search term exists, use search API, otherwise use regular pagination API
            if (searchTerm && searchTerm.trim() !== '') {
                response = await VoucherApi.getVouchersContainingVoucherNo(
                    currentPageSize,
                    searchTerm.trim(),
                    direction,
                    serializedCursor
                );
            } else {
                // Use backend status filtering via GSI2 for efficiency
                if (statusFilter !== 'ALL') {
                    response = await VoucherApi.getVouchersPaginationByStatus(
                        currentPageSize,
                        statusFilter,
                        direction,
                        serializedCursor
                    );
                } else {
                    response = await VoucherApi.getVouchersPagination(currentPageSize, direction, serializedCursor);
                }
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of vouchers
                if (Array.isArray(response.data)) {
                    // No client-side filtering needed - backend already filtered by status
                    setVouchers(response.data);

                    // Set pagination cursors from response
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
        } catch {
            setError('Failed to load vouchers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchVouchers();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search term changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search term
        if (searchTerm === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchVouchers();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

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

    const handleRowClick = async (voucher: VoucherDto) => {
        // Navigate to edit voucher page
        window.location.href = `/accounting/voucher/${voucher.voucherId}/edit`;
    };

    const handleCreateClick = () => {
        // Navigate to create voucher page
        window.location.href = '/accounting/voucher/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchVouchers(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        vouchers?.map((voucher) => {
            // Get the latest activity log entry
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
        }) || [];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center shadow-sm">
                    <span className="text-sm font-medium">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900 text-xl font-bold transition-colors duration-200"
                        aria-label="Close error message"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm">
                <a
                    href="/dashboard"
                    className="text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium"
                >
                    Home
                </a>
                <span className="text-gray-400">/</span>
                <a
                    href="/accounting"
                    className="text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium"
                >
                    Accounting
                </a>
                <span className="text-gray-400">/</span>
                <span className="text-gray-800 font-semibold">Voucher</span>
            </nav>

            {/* Header */}
            <VoucherHeader
                searchTerm={searchTerm}
                onSearchChange={(value: string) => {
                    setSearchTerm(value);
                    // Reset pagination when search term changes
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onRefresh={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchVouchers();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                isAdminUser={isAdminUser}
            />

            {/* Table */}
            <VoucherTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchTerm={searchTerm}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchVouchers('prev', prevCursor)}
                onNext={() => fetchVouchers('next', nextCursor)}
            />
        </div>
    );
}
