'use client';

import { StatusBadge } from '@components-web';
import { AreaApi, AreaDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { AreaHeader, AreaTable } from './components';

export default function CustomerAreasPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [customerAreas, setCustomerAreas] = useState<AreaDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch customer areas from API
    const fetchCustomerAreas = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await AreaApi.getAreasByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                response = await AreaApi.getAreas(
                    currentPageSize,
                    statusFilter !== 'ALL' ? (statusFilter as StatusEnum) : undefined,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of areas
                if (Array.isArray(response.data)) {
                    setCustomerAreas(response.data);

                    // Set pagination cursors from response
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setCustomerAreas([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setCustomerAreas([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load customer areas. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchCustomerAreas();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search query changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search query
        if (searchQuery === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchCustomerAreas();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return; // Skip on initial mount

        fetchCustomerAreas();
    }, [statusFilter]);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreateArea = isAdminUser;

    const headers = [
        { key: 'areaName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = async (area: AreaDto) => {
        // Navigate to edit area page
        window.location.href = `/customers/areas/${area.areaId}/edit`;
    };

    const handleCreateClick = () => {
        // Navigate to create area page
        window.location.href = '/customers/areas/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchCustomerAreas(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        customerAreas?.map((area) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (area.activityLogs && area.activityLogs.length > 0) {
                const lastLog = area.activityLogs[area.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...area,
                status: <StatusBadge status={area.status || StatusEnum.ACTIVE} />,
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
                        href="/customers"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Customers
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Areas</span>
                </nav>
            </div>

            {/* Header Bar */}
            <AreaHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    // Reset pagination when search query changes
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value) => {
                    setStatusFilter(value);
                    // Reset pagination when status filter changes
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchCustomerAreas();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreateArea}
                isAdminUser={isAdminUser}
            />

            {/* Table */}
            <AreaTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchCustomerAreas('prev', prevCursor)}
                onNext={() => fetchCustomerAreas('next', nextCursor)}
            />
        </div>
    );
}
