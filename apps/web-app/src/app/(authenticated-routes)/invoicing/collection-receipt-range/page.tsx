'use client';

import {
    CollectionReceiptRangeApi,
    CollectionReceiptRangeDto,
    extractErrorMessage,
    RangeStatusEnum,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CollectionReceiptRangeHeader, CollectionReceiptRangeTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function CollectionReceiptRangePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [ranges, setRanges] = useState<CollectionReceiptRangeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const router = useRouter();
    const hasFetchedRef = useRef(false);
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch ranges from API
    const fetchRanges = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const currentPageSize = customPageSize ?? pageSize;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && serializedCursor ? direction : undefined;
            const paginationCursor = direction && serializedCursor ? serializedCursor : undefined;

            const response = await CollectionReceiptRangeApi.getCollectionReceiptRanges(
                currentPageSize,
                paginationDirection,
                paginationCursor
            );

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                // Filter by search query if provided (client-side filtering)
                let filteredData = response.data;
                const trimmedQuery = searchQuery.trim().toLowerCase();
                if (trimmedQuery.length > 0) {
                    filteredData = response.data.filter(
                        (range) =>
                            range.areaName?.toLowerCase().includes(trimmedQuery) ||
                            range.areaId?.toLowerCase().includes(trimmedQuery) ||
                            range.startNumber?.toString().includes(trimmedQuery) ||
                            range.endNumber?.toString().includes(trimmedQuery)
                    );
                }

                setRanges(filteredData);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setRanges([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            const errorMessage = extractErrorMessage(
                err,
                'Failed to load collection receipt ranges. Please try again.'
            );
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchRanges();
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
            fetchRanges(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const headers = [
        { key: 'areaName', label: 'AREA NAME' },
        { key: 'range', label: 'RANGE' },
        { key: 'lastUsed', label: 'LAST USED' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    // Helper function to render range status badge
    const getRangeStatusBadge = (status?: RangeStatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        const statusConfig: Record<RangeStatusEnum, { bg: string; text: string; label: string }> = {
            [RangeStatusEnum.AVAILABLE]: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
            [RangeStatusEnum.ALL_USED_UP]: { bg: 'bg-red-100', text: 'text-red-800', label: 'All Used Up' },
            [RangeStatusEnum.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
        };

        const config = status ? statusConfig[status] : { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown' };

        return <span className={`${baseClasses} ${config.bg} ${config.text}`}>{config.label}</span>;
    };

    // Handle row click - navigate to edit page
    const handleRowClick = (range: CollectionReceiptRangeDto) => {
        router.push(`/invoicing/collection-receipt-range/${range.collectionReceiptRangeId}/edit`);
    };

    // Handle create new range - navigate to create page
    const handleCreateClick = () => {
        router.push('/invoicing/collection-receipt-range/create');
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchRanges(undefined, undefined, newPageSize);
    };

    // Transform data for table display using useMemo
    const tableData = useMemo(() => {
        return (
            ranges?.map((range) => {
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
                    status: getRangeStatusBadge(range.rangeStatus),
                    latestActivity,
                };
            }) || []
        );
    }, [ranges]);

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
                    onSearchChange={setSearchQuery}
                    onRefresh={() => {
                        setSearchQuery('');
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                        fetchRanges();
                    }}
                    onCreateClick={handleCreateClick}
                    isLoading={isLoading}
                    canCreate={isAdminUser}
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
