'use client';

import { StatusBadge } from '@components-web';
import {
    CustomerClassificationApi,
    CustomerClassificationDto,
    StatusEnum,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomerClassificationHeader, CustomerClassificationTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function CustomerClassificationsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusEnum | 'ALL'>('ALL');
    const [customerClassifications, setCustomerClassifications] = useState<CustomerClassificationDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const hasFetchedRef = useRef(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch customer classifications from API - 4-branch API logic
    const fetchCustomerClassifications = async (
        direction?: 'next' | 'prev',
        cursor?: string,
        customPageSize?: number
    ) => {
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
                response = await CustomerClassificationApi.getCustomerClassifications(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole,
                    searchQuery.trim()
                );
            } else if (hasSearch) {
                // Branch 2: Search only
                response = await CustomerClassificationApi.getCustomerClassificationsByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else if (hasStatus) {
                // Branch 3: Status only
                response = await CustomerClassificationApi.getCustomerClassifications(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Branch 4: Show all
                response = await CustomerClassificationApi.getCustomerClassifications(
                    currentPageSize,
                    undefined,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setCustomerClassifications(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setCustomerClassifications([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setCustomerClassifications([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load customer classifications. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchCustomerClassifications();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounce search query changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        if (searchQuery === '') return;

        const delayDebounceFn = setTimeout(() => {
            setNextCursor(undefined);
            setPrevCursor(undefined);
            setCurrentCursor(undefined);
            fetchCustomerClassifications();
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
        fetchCustomerClassifications();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'customerClassificationName', label: 'NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            customerClassifications?.map((customerClassification) => {
                let latestActivity = null;
                if (customerClassification.activityLogs && customerClassification.activityLogs.length > 0) {
                    const lastLog = customerClassification.activityLogs[customerClassification.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...customerClassification,
                    status: <StatusBadge status={customerClassification.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [customerClassifications]
    );

    const handleRowClick = async (customerClassification: CustomerClassificationDto) => {
        window.location.href = `/customers/classifications/${customerClassification.customerClassificationId}/edit`;
    };

    const handleCreateClick = () => {
        window.location.href = '/customers/classifications/create';
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchCustomerClassifications(undefined, undefined, newPageSize);
    };

    const canCreateClassification = isAdminUser;

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
                    <span className="text-gray-800 text-sm font-medium">Classifications</span>
                </nav>
            </div>

            {/* Header Bar */}
            <CustomerClassificationHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                isAdminUser={isAdminUser}
                onStatusFilterChange={(filter: StatusEnum | 'ALL') => {
                    setStatusFilter(filter);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
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
                    fetchCustomerClassifications();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreateClassification}
            />

            {/* Table */}
            <CustomerClassificationTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchCustomerClassifications('prev', prevCursor)}
                onNext={() => fetchCustomerClassifications('next', nextCursor)}
            />
        </div>
    );
}
