'use client';

import { StatusBadge } from '@components-web';
import { ProductCategoryApi, ProductCategoryDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductCategoryHeader, ProductCategoryTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function ProductCategoriesMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [productCategories, setProductCategories] = useState<ProductCategoryDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [prevCursor, setPrevCursor] = useState<string | undefined>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const fetchProductCategories = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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

            // Always use getProductCategoriesByStatus for filtering, optionally with name search
            if (statusFilter !== 'ALL') {
                response = await ProductCategoryApi.getProductCategoriesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined // Include name if searching
                );
            } else if (trimmedQuery.length > 0) {
                // Search by name only (no status filter)
                response = await ProductCategoryApi.getProductCategoriesByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else {
                // No filter, no search - get all
                response = await ProductCategoryApi.getProductCategories(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setProductCategories(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setProductCategories([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load product categories. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchProductCategories();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchProductCategories();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchProductCategories(undefined, undefined); // Reset direction and cursor for new search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductCategories(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'categoryName', label: 'CATEGORY NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            productCategories.map((category) => {
                const latestActivity =
                    category.activityLogs && category.activityLogs.length > 0
                        ? category.activityLogs[category.activityLogs.length - 1]
                        : '-';

                return {
                    ...category,
                    categoryName: category.productCategoryName || '-',
                    latestActivity: latestActivity,
                    status: <StatusBadge status={category.status ?? StatusEnum.ACTIVE} />,
                };
            }),
        [productCategories]
    );

    const handleCreateClick = () => {
        router.push('/products/categories/create');
    };

    const handleRowClick = (category: ProductCategoryDto) => {
        router.push(`/products/categories/${category.productCategoryId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductCategories(undefined, undefined, size);
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
                    <span className="text-gray-800 font-medium">Product Categories</span>
                </nav>
            </div>

            <ProductCategoryHeader
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
                    fetchProductCategories();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

            <ProductCategoryTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductCategories('prev', prevCursor)}
                onNext={() => fetchProductCategories('next', nextCursor)}
            />
        </div>
    );
}
