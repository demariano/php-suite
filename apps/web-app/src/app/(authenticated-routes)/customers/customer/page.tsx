'use client';

import { StatusBadge } from '@components-web';
import { CustomerApi, CustomerDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { CustomerHeader, CustomerTable } from './components';

export default function CustomersMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [customers, setCustomers] = useState<CustomerDto[]>([]);
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

    // Fetch customers from API
    const fetchCustomers = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
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
                response = await CustomerApi.getCustomersByName(
                    searchTerm.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Use backend status filtering via GSI2 for efficiency
                if (statusFilter !== 'ALL') {
                    response = await CustomerApi.getCustomersByStatus(
                        statusFilter,
                        currentPageSize,
                        direction,
                        serializedCursor,
                        userRole
                    );
                } else {
                    response = await CustomerApi.getCustomers(currentPageSize, direction, serializedCursor, userRole);
                }
            }

            if (response && response.statusCode === 200 && response.data) {
                // The response.data contains the array of customers
                if (Array.isArray(response.data)) {
                    // No client-side filtering needed - backend already filtered by status
                    setCustomers(response.data);

                    // Set pagination cursors from response
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setCustomers([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setCustomers([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch (err) {
            setError('Failed to load customers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load and when these dependencies change
    useEffect(() => {
        // Prevent duplicate calls in React Strict Mode
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        fetchCustomers();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    // Debounce search term changes (but not on initial mount with empty search)
    useEffect(() => {
        // Only debounce if there's actually a search term
        if (searchTerm === '') {
            return; // Skip - initial load is handled by the other useEffect
        }

        const delayDebounceFn = setTimeout(() => {
            // Reset pagination when search changes
            setNextCursor(undefined);
            setPrevCursor(undefined);
            setCurrentCursor(undefined);
            fetchCustomers();
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Refetch when status filter changes
    useEffect(() => {
        setCurrentCursor(undefined);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchCustomers();
    }, [statusFilter]);

    const headers = [
        { key: 'customerName', label: 'CUSTOMER NAME' },
        { key: 'email', label: 'EMAIL' },
        { key: 'contactNo', label: 'CONTACT NO' },
        { key: 'customerTypeName', label: 'CUSTOMER TYPE' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = async (customer: CustomerDto) => {
        // Navigate to edit customer page
        window.location.href = `/customers/customer/${customer.customerId}/edit`;
    };

    const handleCreateClick = () => {
        // Navigate to create customer page
        window.location.href = '/customers/customer/create';
    };

    // Handle page size change - reset pagination and fetch fresh data
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        // Fetch with new page size and no cursor (like initial load)
        fetchCustomers(undefined, undefined, newPageSize);
    };

    // Transform data for table display
    const tableData =
        customers?.map((customer) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (customer.activityLogs && customer.activityLogs.length > 0) {
                const lastLog = customer.activityLogs[customer.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...customer,
                status: <StatusBadge status={customer.status || StatusEnum.ACTIVE} />,
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
                    <span className="text-gray-800 text-sm font-medium">Customers</span>
                </nav>
            </div>

            {/* Header Bar */}
            <CustomerHeader
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchTerm(value);
                    // Reset pagination when search term changes
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
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchCustomers();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={isAdminUser}
                isAdminUser={isAdminUser}
            />

            {/* Table */}
            <CustomerTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchTerm={searchTerm}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchCustomers('prev', prevCursor)}
                onNext={() => fetchCustomers('next', nextCursor)}
            />
        </div>
    );
}
