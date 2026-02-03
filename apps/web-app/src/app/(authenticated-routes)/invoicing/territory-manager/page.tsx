'use client';

import { StatusBadge } from '@components-web';
import { StatusEnum, TerritoryManagerApi, TerritoryManagerDto, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { TerritoryManagerHeader, TerritoryManagerTable } from './components';

export default function TerritoryManagerPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [territoryManagers, setTerritoryManagers] = useState<TerritoryManagerDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch territory managers from API
    const fetchTerritoryManagers = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await TerritoryManagerApi.getTerritoryManagersByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Use backend status filtering via GSI2 for efficiency
                if (statusFilter !== 'ALL') {
                    response = await TerritoryManagerApi.getTerritoryManagersByStatus(
                        statusFilter,
                        currentPageSize,
                        direction,
                        serializedCursor,
                        userRole
                    );
                } else {
                    response = await TerritoryManagerApi.getTerritoryManagers(
                        currentPageSize,
                        undefined,
                        direction,
                        serializedCursor,
                        userRole
                    );
                }
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of territory managers
                if (Array.isArray(response.data)) {
                    setTerritoryManagers(response.data);

                    // Set pagination cursors from response
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setTerritoryManagers([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setTerritoryManagers([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load territory managers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchTerritoryManagers();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search query changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search query
        if (searchQuery === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchTerritoryManagers();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        setCurrentCursor(undefined);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchTerritoryManagers();
    }, [statusFilter]);

    const headers = [
        { key: 'territoryManagerName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = (territoryManager: TerritoryManagerDto) => {
        if (!territoryManager || !territoryManager.territoryManagerId) {
            return;
        }
        window.location.href = `/invoicing/territory-manager/${territoryManager.territoryManagerId}/edit`;
    };

    const handleCreateClick = () => {
        window.location.href = '/invoicing/territory-manager/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchTerritoryManagers(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        territoryManagers?.map((territoryManager) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (territoryManager.activityLogs && territoryManager.activityLogs.length > 0) {
                const lastLog = territoryManager.activityLogs[territoryManager.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...territoryManager,
                status: <StatusBadge status={territoryManager.status || StatusEnum.ACTIVE} />,
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
                    <span className="text-gray-800 text-sm font-medium">Territory Manager</span>
                </nav>
            </div>

            {/* Header */}
            <TerritoryManagerHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    // Reset pagination when search query changes
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value: string) => {
                    setStatusFilter(value);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchTerritoryManagers();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

            {/* Table */}
            <TerritoryManagerTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchTerritoryManagers('prev', prevCursor)}
                onNext={() => fetchTerritoryManagers('next', nextCursor)}
            />
        </div>
    );
}
