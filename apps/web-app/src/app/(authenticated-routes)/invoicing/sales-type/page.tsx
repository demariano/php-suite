'use client';

import { StatusBadge } from '@components-web';
import { extractErrorMessage, SalesTypeApi, SalesTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SalesTypeHeader, SalesTypeTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function SalesTypePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [salesTypes, setSalesTypes] = useState<SalesTypeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const router = useRouter();
    const hasFetchedRef = useRef(false);
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch sales types from API
    const fetchSalesTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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

            // 4-branch API logic: search+status → search only → status only → show all
            if (trimmedQuery.length > 0 && statusFilter !== 'ALL') {
                // Branch 1: Search with status filter (use status API with name param)
                response = await SalesTypeApi.getSalesTypesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    undefined, // userRole
                    trimmedQuery
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 2: Search only (no status filter)
                response = await SalesTypeApi.getSalesTypesByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 3: Filter by status only
                response = await SalesTypeApi.getSalesTypesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor
                );
            } else {
                // Branch 4: No filter, no search - get all
                response = await SalesTypeApi.getSalesTypes(
                    currentPageSize,
                    undefined, // status
                    paginationDirection,
                    paginationCursor
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setSalesTypes(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setSalesTypes([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            const errorMessage = extractErrorMessage(err, 'Failed to load sales types. Please try again.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchSalesTypes();
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
            fetchSalesTypes(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchSalesTypes(undefined, undefined);
    }, [statusFilter]);

    const headers = [
        { key: 'salesTypeName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    // Handle row click - navigate to edit page
    const handleRowClick = (salesType: SalesTypeDto) => {
        router.push(`/invoicing/sales-type/${salesType.salesTypeId}/edit`);
    };

    // Handle create new sales type - navigate to create page
    const handleCreateClick = () => {
        router.push('/invoicing/sales-type/create');
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchSalesTypes(undefined, undefined, newPageSize);
    };

    // Transform data for table display using useMemo
    const tableData = useMemo(() => {
        return (
            salesTypes?.map((salesType) => {
                let latestActivity = null;
                if (salesType.activityLogs && salesType.activityLogs.length > 0) {
                    const lastLog = salesType.activityLogs[salesType.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...salesType,
                    status: <StatusBadge status={salesType.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || []
        );
    }, [salesTypes]);

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
                    <span className="text-gray-800 text-sm font-medium">Sales Type</span>
                </nav>
            </div>

            {/* Header */}
            <div>
                <SalesTypeHeader
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    onSearchChange={setSearchQuery}
                    onStatusFilterChange={setStatusFilter}
                    onRefresh={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                        fetchSalesTypes();
                    }}
                    onCreateClick={handleCreateClick}
                    isLoading={isLoading}
                    isAdminUser={isAdminUser}
                />
            </div>

            {/* Table */}
            <div>
                <SalesTypeTable
                    isLoading={isLoading}
                    tableData={tableData}
                    headers={headers}
                    searchQuery={searchQuery}
                    onRowClick={handleRowClick}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    prevCursor={prevCursor}
                    nextCursor={nextCursor}
                    onPrevious={() => fetchSalesTypes('prev', prevCursor)}
                    onNext={() => fetchSalesTypes('next', nextCursor)}
                />
            </div>
        </div>
    );
}
