'use client';

import {
    RawMaterialUnitApi,
    RawMaterialUnitDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { RawMaterialUnitHeader, RawMaterialUnitTable } from './components';

export default function RawMaterialUnitsMainPage() {
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const [rawMaterialUnits, setRawMaterialUnits] = useState<RawMaterialUnitDto[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<number>(10);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

    const hasFetchedRef = useRef(false);

    const fetchRawMaterialUnits = async (direction?: 'next' | 'prev', cursor?: string, customSize?: number) => {
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
                response = await RawMaterialUnitApi.getRawMaterialUnitsByStatus(
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
                response = await RawMaterialUnitApi.searchRawMaterialUnitsByName(
                    searchQuery.trim(),
                    size,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: Status filter only (no search query)
            else if (statusFilter !== 'ALL') {
                response = await RawMaterialUnitApi.getRawMaterialUnitsByStatus(
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
                response = await (RawMaterialUnitApi as any).getRawMaterialUnits(size, validDirection, validCursor, userRole);
            }

            if (response && response.data) {
                setRawMaterialUnits(Array.isArray(response.data) ? response.data : []);
                setNextCursor(response.nextCursorPointer || undefined);
                setPrevCursor(response.prevCursorPointer || undefined);
            } else {
                setRawMaterialUnits([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch (err: any) {
            console.error('Failed to load raw material units:', err);
            setError('Failed to load raw material units. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: err?.message || 'Failed to load raw material units.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchRawMaterialUnits();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    useEffect(() => {
        if (searchQuery === '') return;
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        const timeout = setTimeout(() => fetchRawMaterialUnits(), 500);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    useEffect(() => {
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchRawMaterialUnits();
    }, [statusFilter]);

    const handleCreateClick = () => {
        window.location.href = '/inventory/raw-material-units/create';
    };

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setCurrentCursor(undefined);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchRawMaterialUnits();
    };

    const handleRowClick = (rawMaterialUnitId: string) => {
        if (!rawMaterialUnitId) return;
        window.location.href = `/inventory/raw-material-units/${rawMaterialUnitId}/edit`;
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

            <RawMaterialUnitHeader
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

            <RawMaterialUnitTable
                rawMaterialUnits={rawMaterialUnits}
                searchQuery={searchQuery}
                isLoading={isLoading}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    setCurrentCursor(undefined);
                    fetchRawMaterialUnits(undefined, undefined, newSize);
                }}
                nextCursor={nextCursor}
                prevCursor={prevCursor}
                onNextPage={() => fetchRawMaterialUnits('next', nextCursor)}
                onPrevPage={() => fetchRawMaterialUnits('prev', prevCursor)}
            />
        </div>
    );
}
