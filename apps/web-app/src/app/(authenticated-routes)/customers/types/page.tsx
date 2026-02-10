'use client';

import { StatusBadge } from '@components-web';
import { CustomerTypeApi, CustomerTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomerTypeHeader, CustomerTypeTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function CustomerTypesPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusEnum | 'ALL'>('ALL');
    const [customerTypes, setCustomerTypes] = useState<CustomerTypeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch customer types from API - 4-branch API logic
    const fetchCustomerTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;
            const currentPageSize = customPageSize ?? pageSize;

            let response;
            const hasSearch = searchQuery && searchQuery.trim() !== '';
            const hasStatus = statusFilter !== 'ALL';

            // 4-branch API logic
            if (hasSearch && hasStatus) {
                // Branch 1: Both search and status - use status API with name param (backend filtering)
                response = await CustomerTypeApi.getCustomerTypes(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole,
                    searchQuery.trim()
                );
            } else if (hasSearch) {
                // Branch 2: Search only
                response = await CustomerTypeApi.getCustomerTypesByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else if (hasStatus) {
                // Branch 3: Status only
                response = await CustomerTypeApi.getCustomerTypes(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Branch 4: Show all
                response = await CustomerTypeApi.getCustomerTypes(
                    currentPageSize,
                    undefined,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setCustomerTypes(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setCustomerTypes([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setCustomerTypes([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load customer types. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchCustomerTypes();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounce search query changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        if (searchQuery === '') return;

        const delayDebounceFn = setTimeout(() => {
            setNextCursor(undefined);
            setPrevCursor(undefined);
            setCurrentCursor(undefined);
            fetchCustomerTypes();
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
        fetchCustomerTypes();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'customerTypeName', label: 'NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            customerTypes?.map((customerType) => {
                let latestActivity = null;
                if (customerType.activityLogs && customerType.activityLogs.length > 0) {
                    const lastLog = customerType.activityLogs[customerType.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...customerType,
                    status: <StatusBadge status={customerType.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [customerTypes]
    );

    const handleRowClick = async (customerType: CustomerTypeDto) => {
        router.push(`/customers/types/${customerType.customerTypeId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/customers/types/create');
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchCustomerTypes(undefined, undefined, newPageSize);
    };

    const canCreateType = true;

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
                    <span className="text-gray-800 text-sm font-medium">Types</span>
                </nav>
            </div>

            <CustomerTypeHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value: StatusEnum | 'ALL') => {
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
                    fetchCustomerTypes();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreateType}
                isAdminUser={isAdminUser}
            />

            <CustomerTypeTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchCustomerTypes('prev', prevCursor)}
                onNext={() => fetchCustomerTypes('next', nextCursor)}
            />
        </div>
    );
}
