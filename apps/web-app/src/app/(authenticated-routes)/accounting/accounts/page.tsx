'use client';

import { StatusBadge } from '@components-web';
import { AccountApi, AccountsDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccountHeader, AccountTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function AccountsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [accounts, setAccounts] = useState<AccountsDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const hasFetchedRef = useRef(false);

    const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
    const canCreateAccount = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const fetchAccounts = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await AccountApi.getAccountsByStatus(
                    statusFilter,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    trimmedQuery,
                    userRole
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 2: Search only (no status filter)
                response = await AccountApi.getAccountsByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 3: Filter by status only
                response = await AccountApi.getAccountsByStatus(
                    statusFilter,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    undefined, // name parameter
                    userRole
                );
            } else {
                // Branch 4: No filter, no search - get all
                response = await AccountApi.getAccounts(
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setAccounts(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setAccounts([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            const errorMessage = extractErrorMessage(err, 'Failed to load accounts. Please try again.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchAccounts();
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
            fetchAccounts(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchAccounts(undefined, undefined);
    }, [statusFilter]);

    const headers = [
        { key: 'accountName', label: 'ACCOUNT NAME' },
        { key: 'accountType', label: 'ACCOUNT TYPE' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const handleRowClick = (account: AccountsDto) => {
        if (account?.accountingId) {
            router.push(`/accounting/accounts/${account.accountingId}/edit`);
        }
    };

    const handleCreateClick = () => {
        router.push('/accounting/accounts/create');
    };

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchAccounts();
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchAccounts(undefined, undefined, newPageSize);
    };

    const tableData = useMemo(
        () =>
            accounts?.map((account) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (account.activityLogs && account.activityLogs.length > 0) {
                    const lastLog = account.activityLogs[account.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...account,
                    status: <StatusBadge status={account.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) ?? [],
        [accounts]
    );

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {error && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-lg font-bold leading-none text-red-600 transition-colors duration-200 hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            <AccountHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onRefresh={handleRefresh}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreateAccount}
                isAdminUser={isAdminUser}
            />

            <AccountTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                hasPrevious={!!prevCursor}
                hasNext={!!nextCursor}
                onPrevious={() => fetchAccounts('prev', prevCursor)}
                onNext={() => fetchAccounts('next', nextCursor)}
            />
        </div>
    );
}
