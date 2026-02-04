'use client';

import { StatusBadge } from '@components-web';
import { ProductApi, ProductDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductHeader, ProductTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function ProductsMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<any>();
    const [prevCursor, setPrevCursor] = useState<any>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const fetchProducts = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const currentPageSize = customPageSize ?? pageSize;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && serializedCursor ? direction : undefined;
            const paginationCursor = direction && serializedCursor ? serializedCursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // Always use getProductsByStatus for filtering, optionally with name search
            if (statusFilter !== 'ALL') {
                response = await ProductApi.getProductsByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined // Include name if searching
                );
            } else if (trimmedQuery.length > 0) {
                // Search by name only (no status filter)
                response = await ProductApi.getProductsByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else {
                // No filter, no search - get all
                response = await ProductApi.getProducts(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setProducts(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setProducts([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load products. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchProducts();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchProducts();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchProducts(undefined, undefined); // Reset direction and cursor for new search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProducts(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'productName', label: 'PRODUCT NAME' },
            { key: 'productCategoryName', label: 'CATEGORY' },
            { key: 'productClassName', label: 'CLASS' },
            { key: 'criticalLevel', label: 'CRITICAL LEVEL' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            products.map((product) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (product.activityLogs && product.activityLogs.length > 0) {
                    const lastLog = product.activityLogs[product.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...product,
                    status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }),
        [products]
    );

    const handleCreateClick = () => {
        router.push('/products/product/create');
    };

    const handleRowClick = (product: ProductDto) => {
        router.push(`/products/product/${product.productId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProducts(undefined, undefined, size);
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
                    <span className="text-gray-800 font-medium">Products</span>
                </nav>
            </div>

            <ProductHeader
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
                    fetchProducts();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

            <ProductTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProducts('prev', prevCursor)}
                onNext={() => fetchProducts('next', nextCursor)}
            />
        </div>
    );
}
