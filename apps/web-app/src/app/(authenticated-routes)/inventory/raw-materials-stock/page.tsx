'use client';

import { RawMaterialsStockApi, RawMaterialsStockDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { RawMaterialsStockHeader, RawMaterialsStockTable } from './components';

export default function RawMaterialsStockMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stocks, setStocks] = useState<RawMaterialsStockDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const [nextCursor, setNextCursor] = useState<any>(undefined);
    const [prevCursor, setPrevCursor] = useState<any>(undefined);
    const [currentCursor, setCurrentCursor] = useState<any>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch stocks from API
    const fetchStocks = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
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

            // If search term exists, use search API, otherwise use regular pagination API
            if (searchTerm && searchTerm.trim() !== '') {
                response = await RawMaterialsStockApi.getRawMaterialsStocksByName(
                    searchTerm.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                response = await RawMaterialsStockApi.getRawMaterialsStocks(
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setStocks(response.data);

                    // Set pagination cursors from response
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setStocks([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setStocks([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch (err) {
            setError('Failed to load raw materials stock. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchStocks();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search term changes
    useEffect(() => {
        if (searchTerm === '') {
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchStocks();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const headers = [
        { key: 'rawMaterialName', label: 'MATERIAL NAME' },
        { key: 'lotNo', label: 'LOT NO' },
        { key: 'qty', label: 'QTY' },
        { key: 'rawMaterialUnitName', label: 'UNIT' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    // Helper function to get status text
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
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === StatusEnum.ACTIVE) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else if (status === StatusEnum.FOR_APPROVAL) {
            colorClasses = '!bg-yellow-100 !text-yellow-800';
        } else if (status === StatusEnum.FOR_DELETION) {
            colorClasses = '!bg-red-100 !text-red-800';
        } else if (status === StatusEnum.FOR_DEACTIVATION) {
            colorClasses = '!bg-orange-100 !text-orange-800';
        } else if (status === StatusEnum.INACTIVE) {
            colorClasses = '!bg-gray-200 !text-gray-500';
        } else if (status === StatusEnum.NEW_RECORD) {
            colorClasses = '!bg-blue-100 !text-blue-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === StatusEnum.ACTIVE
                            ? '#dcfce7'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#fef3c7'
                            : status === StatusEnum.FOR_DELETION
                            ? '#fef2f2'
                            : status === StatusEnum.NEW_RECORD
                            ? '#dbeafe'
                            : '#f3f4f6',
                    color:
                        status === StatusEnum.ACTIVE
                            ? '#166534'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#92400e'
                            : status === StatusEnum.FOR_DELETION
                            ? '#dc2626'
                            : status === StatusEnum.NEW_RECORD
                            ? '#1e40af'
                            : '#6b7280',
                }}
            >
                {getStatusText(status)}
            </span>
        );
    };

    const handleRowClick = async (stock: RawMaterialsStockDto) => {
        // Navigate to edit stock page
        window.location.href = `/inventory/raw-materials-stock/${stock.rawMaterialsStockId}/edit`;
    };

    const handleCreateClick = () => {
        // Navigate to create stock page
        window.location.href = '/inventory/raw-materials-stock/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchStocks(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        stocks?.map((stock) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (stock.activityLogs && stock.activityLogs.length > 0) {
                const lastLog = stock.activityLogs[stock.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...stock,
                status: getStatusBadge(stock.status || StatusEnum.ACTIVE),
                latestActivity,
            };
        }) || [];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
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
            <div>
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
                    <span className="text-gray-800 text-sm font-medium">Raw Materials Stock</span>
                </nav>
            </div>

            {/* Header Bar */}
            <RawMaterialsStockHeader
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                    setSearchTerm(value);
                    // Reset pagination when search term changes
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onRefresh={() => {
                    setSearchTerm('');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchStocks();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={isAdminUser}
            />

            {/* Table */}
            <RawMaterialsStockTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchTerm={searchTerm}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchStocks('prev', prevCursor)}
                onNext={() => fetchStocks('next', nextCursor)}
            />
        </div>
    );
}
