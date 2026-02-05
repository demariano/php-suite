'use client';

import { StatusBadge } from '@components-web';
import {
    extractErrorMessage,
    StatusEnum,
    TerritoryManagerApi,
    TerritoryManagerDto,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TerritoryManagerHeader, TerritoryManagerTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

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
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const router = useRouter();
    const hasFetchedRef = useRef(false);
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch territory managers from API
    const fetchTerritoryManagers = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await TerritoryManagerApi.getTerritoryManagersByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    undefined, // userRole
                    trimmedQuery
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 2: Search only (no status filter)
                response = await TerritoryManagerApi.getTerritoryManagersByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 3: Filter by status only
                response = await TerritoryManagerApi.getTerritoryManagersByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor
                );
            } else {
                // Branch 4: No filter, no search - get all
                response = await TerritoryManagerApi.getTerritoryManagers(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setTerritoryManagers(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setTerritoryManagers([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            const errorMessage = extractErrorMessage(err, 'Failed to load territory managers. Please try again.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchTerritoryManagers();
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
            fetchTerritoryManagers(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchTerritoryManagers(undefined, undefined);
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
        router.push(`/invoicing/territory-manager/${territoryManager.territoryManagerId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/invoicing/territory-manager/create');
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchTerritoryManagers(undefined, undefined, newPageSize);
    };

    // Transform data for table display using useMemo
    const tableData = useMemo(() => {
        return (
            territoryManagers?.map((territoryManager) => {
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
            }) || []
        );
    }, [territoryManagers]);

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
            <div>
                <TerritoryManagerHeader
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    onSearchChange={setSearchQuery}
                    onStatusFilterChange={setStatusFilter}
                    onRefresh={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                        setNextCursor(undefined);
                        setPrevCursor(undefined);
                        fetchTerritoryManagers();
                    }}
                    onCreateClick={handleCreateClick}
                    isLoading={isLoading}
                    canCreate={isAdminUser}
                    isAdminUser={isAdminUser}
                />
            </div>

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
