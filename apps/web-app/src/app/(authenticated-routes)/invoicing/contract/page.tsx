'use client';

import { StatusBadge } from '@components-web';
import { ContractApi, ContractDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContractHeader, ContractTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function ContractsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [contracts, setContracts] = useState<ContractDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const fetchContracts = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
                // Branch 1: Search with status filter (use status API with contractNo param)
                response = await ContractApi.getContractsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    undefined, // customerId
                    trimmedQuery
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 2: Search only (no status filter)
                response = await ContractApi.getContractsContainingContractNo(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 3: Filter by status only
                response = await ContractApi.getContractsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor
                );
            } else {
                // Branch 4: No filter, no search - get all
                response = await ContractApi.getContracts(currentPageSize, paginationDirection, paginationCursor);
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setContracts(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setContracts([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch (err) {
            const errorMessage = extractErrorMessage(err, 'Failed to load contracts. Please try again.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchContracts();
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
            fetchContracts(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchContracts(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'contractNo', label: 'CONTRACT NO' },
            { key: 'contractName', label: 'CONTRACT NAME' },
            { key: 'customerName', label: 'CUSTOMER' },
            { key: 'startDate', label: 'START DATE' },
            { key: 'endDate', label: 'END DATE' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    // Transform data for table display using StatusBadge
    const tableData = useMemo(
        () =>
            contracts.map((contract) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (contract.activityLogs && contract.activityLogs.length > 0) {
                    const lastLog = contract.activityLogs[contract.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...contract,
                    status: <StatusBadge status={contract.status ?? StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }),
        [contracts]
    );

    const handleCreateClick = () => {
        router.push('/invoicing/contract/create');
    };

    const handleRowClick = (contract: ContractDto) => {
        router.push(`/invoicing/contract/${contract.contractId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchContracts(undefined, undefined, size);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Home
                    </a>
                    <span>/</span>
                    <a href="/invoicing" className="text-blue-600 hover:text-blue-700">
                        Invoicing
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Contracts</span>
                </nav>
            </div>

            <ContractHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value) => {
                    setStatusFilter(value);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchContracts();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={isAdminUser}
                isAdminUser={isAdminUser}
            />

            <ContractTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchContracts('prev', prevCursor)}
                onNext={() => fetchContracts('next', nextCursor)}
            />
        </div>
    );
}
