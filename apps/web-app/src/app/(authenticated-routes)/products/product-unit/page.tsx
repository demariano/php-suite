'use client';

import { StatusBadge } from '@components-web';
import { ProductUnitApi, ProductUnitDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductUnitHeader, ProductUnitTable } from './components';

export default function ProductUnitsMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [productUnits, setProductUnits] = useState<ProductUnitDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);
    const hasFetchedRef = useRef(false);

    const fetchProductUnits = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const currentPageSize = customPageSize ?? pageSize;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && cursor ? direction : undefined;
            const paginationCursor = direction && cursor ? cursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // Always use getProductUnitsByStatus for filtering, optionally with name search
            if (statusFilter !== 'ALL') {
                response = await ProductUnitApi.getProductUnitsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined
                );
            } else if (trimmedQuery.length > 0) {
                // Search by name only (no status filter)
                response = await ProductUnitApi.getProductUnitsByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else {
                // No filter, no search - get all
                response = await ProductUnitApi.getProductUnits(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setProductUnits(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setProductUnits([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load product units. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchProductUnits();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchProductUnits();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchProductUnits(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductUnits(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'unitName', label: 'UNIT NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const handleRowClick = async (productUnit: ProductUnitDto) => {
        router.push(`/products/product-unit/${productUnit.productUnitId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/products/product-unit/create');
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchProductUnits(undefined, undefined, newPageSize);
    };

    const tableData = useMemo(
        () =>
            productUnits?.map((productUnit) => {
                const latestActivity =
                    productUnit.activityLogs && productUnit.activityLogs.length > 0
                        ? productUnit.activityLogs[productUnit.activityLogs.length - 1]
                        : 'No activity';

                return {
                    ...productUnit,
                    unitName: productUnit.productUnitName,
                    status: <StatusBadge status={productUnit.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [productUnits]
    );

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = true;

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
                        href="/products"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Products
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Product Units</span>
                </nav>
            </div>

            <ProductUnitHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value: string) => {
                    setStatusFilter(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductUnits();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
            />

            <ProductUnitTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductUnits('prev', prevCursor)}
                onNext={() => fetchProductUnits('next', nextCursor)}
            />
        </div>
    );
}
