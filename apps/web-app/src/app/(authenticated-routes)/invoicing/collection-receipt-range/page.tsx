'use client';

import {
    CollectionReceiptRangeApi,
    CollectionReceiptRangeDto,
    RangeStatusEnum,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { CollectionReceiptRangeHeader, CollectionReceiptRangeTable } from './components';

export default function CollectionReceiptRangePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [ranges, setRanges] = useState<CollectionReceiptRangeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch ranges from API
    const fetchRanges = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Serialize cursor object to JSON string if it's an object
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // Use custom page size if provided, otherwise use state page size
            const currentPageSize = customPageSize ?? pageSize;

            const response = await CollectionReceiptRangeApi.getCollectionReceiptRanges(
                currentPageSize,
                direction,
                serializedCursor,
                userRole
            );

            if (response && response.statusCode === 200 && response.data) {
                // Filter by search query if provided
                let filteredData = response.data;
                if (searchQuery && searchQuery.trim() !== '') {
                    const query = searchQuery.toLowerCase();
                    filteredData = response.data.filter(
                        (range) =>
                            range.areaName?.toLowerCase().includes(query) ||
                            range.areaId?.toLowerCase().includes(query) ||
                            range.startNumber?.toString().includes(query) ||
                            range.endNumber?.toString().includes(query)
                    );
                }

                setRanges(filteredData);

                // Set pagination cursors from response
                setNextCursor(response.nextCursorPointer || undefined);
                setPrevCursor(response.prevCursorPointer || undefined);
            } else {
                setRanges([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load collection receipt ranges. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchRanges();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search query changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search query
        if (searchQuery === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchRanges();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const headers = [
        { key: 'areaName', label: 'AREA NAME' },
        { key: 'range', label: 'RANGE' },
        { key: 'lastUsed', label: 'LAST USED' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    // Helper function to get status text
    const getStatusText = (status?: RangeStatusEnum): string => {
        switch (status) {
            case RangeStatusEnum.AVAILABLE:
                return 'Available';
            case RangeStatusEnum.ALL_USED_UP:
                return 'All Used Up';
            case RangeStatusEnum.CANCELLED:
                return 'Cancelled';
            default:
                return 'Unknown';
        }
    };

    const getStatusBadge = (status?: RangeStatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === RangeStatusEnum.AVAILABLE) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else if (status === RangeStatusEnum.ALL_USED_UP) {
            colorClasses = '!bg-red-100 !text-red-800';
        } else if (status === RangeStatusEnum.CANCELLED) {
            colorClasses = '!bg-gray-100 !text-gray-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === RangeStatusEnum.AVAILABLE
                            ? '#dcfce7'
                            : status === RangeStatusEnum.ALL_USED_UP
                              ? '#fee2e2'
                              : status === RangeStatusEnum.CANCELLED
                                ? '#f3f4f6'
                                : '#f3f4f6',
                    color:
                        status === RangeStatusEnum.AVAILABLE
                            ? '#166534'
                            : status === RangeStatusEnum.ALL_USED_UP
                              ? '#dc2626'
                              : status === RangeStatusEnum.CANCELLED
                                ? '#374151'
                                : '#6b7280',
                }}
            >
                {getStatusText(status)}
            </span>
        );
    };

    // Handle row click - navigate to edit page
    const handleRowClick = (range: CollectionReceiptRangeDto) => {
        window.location.href = `/invoicing/collection-receipt-range/${range.collectionReceiptRangeId}/edit`;
    };

    // Handle create new range - navigate to create page
    const handleCreateClick = () => {
        window.location.href = '/invoicing/collection-receipt-range/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchRanges(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData = ranges?.map((range) => {
        // Get the latest activity log entry
        let latestActivity = null;
        if (range.activityLogs && range.activityLogs.length > 0) {
            const lastLog = range.activityLogs[range.activityLogs.length - 1];
            const parsed = parseActivityLog(lastLog);
            const activityStyle = getActivityStyle(parsed.activity);
            latestActivity = {
                text: parsed.activity,
                style: activityStyle,
            };
        }

        return {
            ...range,
            status: getStatusBadge(range.rangeStatus),
            latestActivity,
        };
    }) || [];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="mb-6">
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Invoicing
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Collection Receipt Range</span>
                </nav>
            </div>

            {/* Header */}
            <div>
                <CollectionReceiptRangeHeader
                    searchQuery={searchQuery}
                    onSearchChange={(value: string) => {
                        setSearchQuery(value);
                        // Reset pagination when search query changes
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                    }}
                    onRefresh={() => {
                        setSearchQuery('');
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                        fetchRanges();
                    }}
                    onCreateClick={handleCreateClick}
                />
            </div>

            {/* Table */}
            <div>
                <CollectionReceiptRangeTable
                    isLoading={isLoading}
                    tableData={tableData}
                    headers={headers}
                    searchQuery={searchQuery}
                    onRowClick={handleRowClick}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    prevCursor={prevCursor}
                    nextCursor={nextCursor}
                    onPrevious={() => fetchRanges('prev', prevCursor)}
                    onNext={() => fetchRanges('next', nextCursor)}
                />
            </div>
        </div>
    );
}

