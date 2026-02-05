'use client';

import { StatusBadge } from '@components-web';
import { StatusEnum, TermsApi, TermsDto, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TermsHeader, TermsTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function TermsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusEnum | 'ALL'>('ALL');
    const [terms, setTerms] = useState<TermsDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const hasFetchedRef = useRef(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch terms from API - 4-branch API logic
    const fetchTerms = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                response = await TermsApi.getTerms(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole,
                    searchQuery.trim()
                );
            } else if (hasSearch) {
                // Branch 2: Search only
                response = await TermsApi.getTermsByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else if (hasStatus) {
                // Branch 3: Status only
                response = await TermsApi.getTerms(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Branch 4: Show all
                response = await TermsApi.getTerms(currentPageSize, undefined, direction, serializedCursor, userRole);
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setTerms(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setTerms([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setTerms([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load terms. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial load
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchTerms();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounce search query changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        if (searchQuery === '') return;

        const delayDebounceFn = setTimeout(() => {
            setNextCursor(undefined);
            setPrevCursor(undefined);
            setCurrentCursor(undefined);
            fetchTerms();
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
        fetchTerms();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'termsName', label: 'NAME' },
            { key: 'days', label: 'DAYS' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            terms?.map((term) => {
                let latestActivity = null;
                if (term.activityLogs && term.activityLogs.length > 0) {
                    const lastLog = term.activityLogs[term.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...term,
                    status: <StatusBadge status={term.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [terms]
    );

    const handleRowClick = async (term: TermsDto) => {
        window.location.href = `/customers/terms/${term.termsId}/edit`;
    };

    const handleCreateClick = () => {
        window.location.href = '/customers/terms/create';
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchTerms(undefined, undefined, newPageSize);
    };

    const canCreateTerms = isAdminUser;

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
                    <span className="text-gray-800 text-sm font-medium">Terms</span>
                </nav>
            </div>

            <TermsHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={(value: StatusEnum | 'ALL') => {
                    setStatusFilter(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
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
                    fetchTerms();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreateTerms}
                isAdminUser={isAdminUser}
            />

            <TermsTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchTerms('prev', prevCursor)}
                onNext={() => fetchTerms('next', nextCursor)}
            />
        </div>
    );
}
