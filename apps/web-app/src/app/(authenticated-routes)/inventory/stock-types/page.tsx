'use client';

import { StatusEnum, StockTypeApi, StockTypeDto, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { StockTypeHeader, StockTypeTable } from './components';

export default function StockTypePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockTypes, setStockTypes] = useState<StockTypeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch stock types from API
    const fetchStockTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Serialize cursor object to JSON string if it's an object
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            let response;

            // Use custom page size if provided, otherwise use state page size
            const currentPageSize = customPageSize ?? pageSize;

            // If search query exists, use search API, otherwise use regular pagination API
            if (searchQuery && searchQuery.trim() !== '') {
                response = await StockTypeApi.getStockTypesByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                response = await StockTypeApi.getStockTypes(
                    currentPageSize,
                    undefined, // No status filter - show all records
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of stock types
                if (Array.isArray(response.data)) {
                    setStockTypes(response.data);

                    // Set pagination cursors from response
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setStockTypes([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setStockTypes([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load stock types. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchStockTypes();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search query changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search query
        if (searchQuery === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchStockTypes();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const headers = [
        { key: 'stockTypeName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.FOR_DEACTIVATION:
                return 'For Deactivation';
            case StatusEnum.INACTIVE:
                return 'Inactive';
            case StatusEnum.NEW_RECORD:
                return 'New Record';
            default:
                return status;
        }
    };

    const getStatusBadge = (status: StatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm';

        let colorClasses = '';
        if (status === StatusEnum.ACTIVE) {
            colorClasses = 'bg-green-600 text-white';
        } else if (status === StatusEnum.FOR_APPROVAL) {
            colorClasses = 'bg-yellow-500 text-white';
        } else if (status === StatusEnum.FOR_DELETION) {
            colorClasses = 'bg-red-600 text-white';
        } else if (status === StatusEnum.FOR_DEACTIVATION) {
            colorClasses = 'bg-orange-500 text-white';
        } else if (status === StatusEnum.INACTIVE) {
            colorClasses = 'bg-gray-400 text-white';
        } else if (status === StatusEnum.NEW_RECORD) {
            colorClasses = 'bg-blue-600 text-white';
        } else {
            colorClasses = 'bg-gray-600 text-white';
        }

        return <span className={`${baseClasses} ${colorClasses}`}>{getStatusText(status)}</span>;
    };

    // Handle row click - navigate to edit page
    const handleRowClick = (stockType: StockTypeDto) => {
        window.location.href = `/inventory/stock-types/${stockType.stockTypeId}/edit`;
    };

    // Handle create new stock type - navigate to create page
    const handleCreateClick = () => {
        window.location.href = '/inventory/stock-types/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchStockTypes(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        stockTypes?.map((stockType) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (stockType.activityLogs && stockType.activityLogs.length > 0) {
                const lastLog = stockType.activityLogs[stockType.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...stockType,
                status: getStatusBadge(stockType.status || StatusEnum.ACTIVE),
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
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Stock Types</span>
                </nav>
            </div>

            {/* Header */}
            <div>
                <StockTypeHeader
                    searchQuery={searchQuery}
                    onSearchChange={(value: string) => {
                        setSearchQuery(value);
                        // Reset pagination when search query changes
                        setCurrentCursor(undefined);
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                    }}
                    onRefresh={() => {
                        setSearchQuery('');
                        setCurrentCursor(undefined);
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                        fetchStockTypes();
                    }}
                    onCreateClick={handleCreateClick}
                />
            </div>

            {/* Table */}
            <div>
                <StockTypeTable
                    isLoading={isLoading}
                    tableData={tableData}
                    headers={headers}
                    searchQuery={searchQuery}
                    onRowClick={handleRowClick}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    prevCursor={prevCursor}
                    nextCursor={nextCursor}
                    onPrevious={() => fetchStockTypes('prev', prevCursor)}
                    onNext={() => fetchStockTypes('next', nextCursor)}
                />
            </div>
        </div>
    );
}
