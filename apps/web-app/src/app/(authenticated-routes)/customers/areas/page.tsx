'use client';

import { StatusBadge } from '@components-web';
import { AreaApi, AreaDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AreaHeader, AreaTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function CustomerAreasPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusEnum | 'ALL'>('ALL');
    const [customerAreas, setCustomerAreas] = useState<AreaDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const hasFetchedRef = useRef(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch customer areas from API - 4-branch API logic
    const fetchCustomerAreas = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;
            const currentPageSize = customPageSize ?? pageSize;

            let response: any;
            const hasSearch = searchQuery && searchQuery.trim() !== '';
            const hasStatus = statusFilter !== 'ALL';

            // 4-branch API logic
            if (hasSearch && hasStatus) {
                // Branch 1: Both search and status - use status API with name param (backend filtering)
                response = await AreaApi.getAreas(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole,
                    searchQuery.trim()
                );
            } else if (hasSearch) {
                // Branch 2: Search only
                response = await AreaApi.getAreasByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else if (hasStatus) {
                // Branch 3: Status only
                response = await (AreaApi as any).getAreas(currentPageSize, statusFilter, direction, serializedCursor, userRole);
            } else {
                // Branch 4: Show all
                response = await (AreaApi as any).getAreas(currentPageSize, undefined, direction, serializedCursor, userRole);
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setCustomerAreas(response.data);
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

    // Fetch on initial load
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchCustomerAreas();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounce search query changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        if (searchQuery === '') return;

        const delayDebounceFn = setTimeout(() => {
            setNextCursor(undefined);
            setPrevCursor(undefined);
            setCurrentCursor(undefined);
            fetchCustomerAreas();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Handle status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery('');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchCustomerAreas();
    }, [statusFilter]);

    const canCreateArea = true;

    const headers = useMemo(
        () => [
            { key: 'areaName', label: 'NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            customerAreas?.map((area) => {
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
            }) || [],
        [customerAreas]
    );

    const handleRowClick = async (area: AreaDto) => {
        router.push(`/customers/areas/${area.areaId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/customers/areas/create');
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchCustomerAreas(undefined, undefined, newPageSize);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
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

            <AreaHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value) => {
                    setStatusFilter(value);
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
