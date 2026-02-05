'use client';

import {
    RawMaterialsStockApi,
    RawMaterialsStockDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { RawMaterialsStockHeader, RawMaterialsStockTable } from './components';

export default function RawMaterialsStockMainPage() {
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const [rawMaterialsStocks, setRawMaterialsStocks] = useState<RawMaterialsStockDto[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<number>(10);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

    const hasFetchedRef = useRef(false);

    const fetchRawMaterialsStocks = async (direction?: 'next' | 'prev', cursor?: string, customSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const size = customSize ?? pageSize;
            const validDirection = direction && cursor ? direction : undefined;
            const validCursor =
                direction && cursor ? (typeof cursor === 'object' ? JSON.stringify(cursor) : cursor) : undefined;

            let response;

            // Branch 1: Search query + Status filter (both active)
            if (searchQuery.trim() && statusFilter !== 'ALL') {
                response = await RawMaterialsStockApi.getRawMaterialsStocksByStatus(
                    size,
                    statusFilter as StatusEnum,
                    validDirection,
                    validCursor,
                    searchQuery.trim(),
                    userRole
                );
            }
            // Branch 2: Search query only (status filter is ALL)
            else if (searchQuery.trim()) {
                response = await RawMaterialsStockApi.getRawMaterialsStocksByName(
                    searchQuery.trim(),
                    size,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: Status filter only (no search query)
            else if (statusFilter !== 'ALL') {
                response = await RawMaterialsStockApi.getRawMaterialsStocksByStatus(
                    size,
                    statusFilter as StatusEnum,
                    validDirection,
                    validCursor,
                    undefined,
                    userRole
                );
            }
            // Branch 4: Show all records (no filters)
            else {
                response = await RawMaterialsStockApi.getRawMaterialsStocks(
                    size,
                    validDirection,
                    validCursor,
                    userRole
                );
            }

            if (response && response.data) {
                setRawMaterialsStocks(Array.isArray(response.data) ? response.data : []);
                setNextCursor(response.nextCursorPointer || undefined);
                setPrevCursor(response.prevCursorPointer || undefined);
            } else {
                setRawMaterialsStocks([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch (err: any) {
            console.error('Failed to load raw materials stocks:', err);
            setError('Failed to load raw materials stocks. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: err?.message || 'Failed to load raw materials stocks.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchRawMaterialsStocks();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    useEffect(() => {
        if (searchQuery === '') return;
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        const timeout = setTimeout(() => fetchRawMaterialsStocks(), 500);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    useEffect(() => {
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchRawMaterialsStocks();
    }, [statusFilter]);

    const handleCreateClick = () => {
        window.location.href = '/inventory/raw-materials-stock/create';
    };

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setCurrentCursor(undefined);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchRawMaterialsStocks();
    };

    const handleRowClick = (rawMaterialsStockId: string) => {
        if (!rawMaterialsStockId) return;
        window.location.href = `/inventory/raw-materials-stock/${rawMaterialsStockId}/edit`;
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
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

            <RawMaterialsStockHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                onRefresh={handleRefresh}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={isAdminUser}
            />

            <RawMaterialsStockTable
                rawMaterialsStocks={rawMaterialsStocks}
                searchQuery={searchQuery}
                isLoading={isLoading}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    setCurrentCursor(undefined);
                    fetchRawMaterialsStocks(undefined, undefined, newSize);
                }}
                nextCursor={nextCursor}
                prevCursor={prevCursor}
                onNextPage={() => fetchRawMaterialsStocks('next', nextCursor)}
                onPrevPage={() => fetchRawMaterialsStocks('prev', prevCursor)}
            />
        </div>
    );
}
