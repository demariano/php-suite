'use client';

import { StatusBadge } from '@components-web';
import { ProductClassApi, ProductClassDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductClassHeader, ProductClassTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function ProductClassesMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [productClasses, setProductClasses] = useState<ProductClassDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [prevCursor, setPrevCursor] = useState<string | undefined>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const fetchProductClasses = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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

            // Always use getProductClassesByStatus for filtering, optionally with name search
            if (statusFilter !== 'ALL') {
                response = await ProductClassApi.getProductClassesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined // Include name if searching
                );
            } else if (trimmedQuery.length > 0) {
                // Search by name only (no status filter)
                response = await ProductClassApi.getProductClassesByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else {
                // No filter, no search - get all
                response = await ProductClassApi.getProductClasses(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setProductClasses(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setProductClasses([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load product classes. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchProductClasses();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchProductClasses();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchProductClasses(undefined, undefined); // Reset direction and cursor for new search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductClasses(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'className', label: 'CLASS NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            productClasses.map((productClass) => {
                const latestActivity =
                    productClass.activityLogs && productClass.activityLogs.length > 0
                        ? productClass.activityLogs[productClass.activityLogs.length - 1]
                        : '-';

                return {
                    ...productClass,
                    className: productClass.productClassName || '-',
                    latestActivity: latestActivity,
                    status: <StatusBadge status={productClass.status ?? StatusEnum.ACTIVE} />,
                };
            }),
        [productClasses]
    );

    const handleCreateClick = () => {
        router.push('/products/product-class/create');
    };

    const handleRowClick = (productClass: ProductClassDto) => {
        router.push(`/products/product-class/${productClass.productClassId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductClasses(undefined, undefined, size);
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
                    <a href="/products" className="text-blue-600 hover:text-blue-700">
                        Products
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Product Classes</span>
                </nav>
            </div>

            <ProductClassHeader
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
                    fetchProductClasses();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

            <ProductClassTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductClasses('prev', prevCursor)}
                onNext={() => fetchProductClasses('next', nextCursor)}
            />
        </div>
    );
}
