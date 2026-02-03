'use client';

import { StatusBadge } from '@components-web';
import { CustomerTypeApi, CustomerTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { CustomerTypeHeader, CustomerTypeTable } from './components';

export default function CustomerTypesPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusEnum | 'ALL'>('ALL');
    const [customerTypes, setCustomerTypes] = useState<CustomerTypeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch customer types from API
    const fetchCustomerTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await CustomerTypeApi.getCustomerTypesByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Determine status parameter based on filter
                const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;

                response = await CustomerTypeApi.getCustomerTypes(
                    currentPageSize,
                    statusParam,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of customer types
                if (Array.isArray(response.data)) {
                    setCustomerTypes(response.data);

                    // Set pagination cursors from response
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

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchCustomerTypes();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize, statusFilter]);

    // Debounce search query changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search query
        if (searchQuery === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            fetchCustomerTypes();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const headers = [
        { key: 'customerTypeName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = async (customerType: CustomerTypeDto) => {
        // Navigate to edit customer type page
        window.location.href = `/customers/types/${customerType.customerTypeId}/edit`;
    };

    const handleCreateClick = () => {
        // Navigate to create customer type page
        window.location.href = '/customers/types/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchCustomerTypes(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        customerTypes?.map((customerType) => {
            // Get the latest activity log entry
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
        }) || [];

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreateType = isAdminUser;

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
