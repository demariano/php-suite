'use client';

import { StatusBadge } from '@components-web';
import { StockApi, StockDto, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StockHeader, StockTable } from './components';

export default function StocksMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [stocks, setStocks] = useState<StockDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);
    const hasFetchedRef = useRef(false);

    const fetchStocks = async (direction?: 'next' | 'prev', cursor?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            const validDirection = direction && serializedCursor ? direction : undefined;
            const validCursor = direction && serializedCursor ? serializedCursor : undefined;

            let response;

            // Branch 1: Search query is active (takes priority)
            if (searchQuery && searchQuery.trim() !== '') {
                response = await StockApi.getStocksByName(
                    searchQuery.trim(),
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 2: Status filter is active
            else if (statusFilter && statusFilter !== 'ALL') {
                response = await StockApi.getStocksByStatus(
                    pageSize,
                    statusFilter,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: Show all records
            else {
                response = await StockApi.getStocks(pageSize, validDirection, validCursor, userRole);
            }

            setStocks(response.data || []);
            setNextCursor(response.nextCursorPointer);
            setPrevCursor(response.prevCursorPointer);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to fetch stocks');
            setStocks([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchStocks();
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery === '') return;

        setNextCursor(undefined);
        setPrevCursor(undefined);

        const delayDebounceFn = setTimeout(() => {
            fetchStocks();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Status filter change
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery('');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchStocks();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'productName', label: 'PRODUCT NAME' },
            { key: 'lotNo', label: 'LOT NO' },
            { key: 'totalQuantity', label: 'TOTAL QTY' },
            { key: 'productUnitName', label: 'UNIT' },
            { key: 'stockTypeName', label: 'STOCK TYPE' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            stocks.map((item) => ({
                ...item,
                status: <StatusBadge status={item.status} />,
                latestActivity:
                    item.activityLogs && item.activityLogs.length > 0
                        ? item.activityLogs[item.activityLogs.length - 1]
                        : '-',
            })),
        [stocks]
    );

    const handleCreateClick = () => {
        router.push('/inventory/stock/create');
    };

    const handleRowClick = (item: StockDto) => {
        router.push(`/inventory/stock/${item.stockId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchStocks();
    };

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = isAdminUser;

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
                    <a href="/inventory" className="text-blue-600 hover:text-blue-700">
                        Inventory
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Stock</span>
                </nav>
            </div>

            <StockHeader
                searchQuery={searchQuery}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={(status) => {
                    setStatusFilter(status);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchStocks();
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchStocks();
                }}
                onCreateClick={handleCreateClick}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
                isLoading={isLoading}
            />

            <StockTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchStocks('prev', prevCursor)}
                onNext={() => fetchStocks('next', nextCursor)}
            />
        </div>
    );
}
