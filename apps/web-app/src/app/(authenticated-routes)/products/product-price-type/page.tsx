'use client';

import { StatusBadge } from '@components-web';
import { ProductPriceTypeApi, ProductPriceTypeDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductPriceTypeHeader, ProductPriceTypeTable } from './components';

export default function ProductPriceTypesMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [productPriceTypes, setProductPriceTypes] = useState<ProductPriceTypeDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);
    const hasFetchedRef = useRef(false);

    const fetchProductPriceTypes = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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

            // Always use getProductPriceTypesByStatus for filtering, optionally with name search
            if (statusFilter !== 'ALL') {
                response = await ProductPriceTypeApi.getProductPriceTypesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined
                );
            } else if (trimmedQuery.length > 0) {
                // Search by name only (no status filter)
                response = await ProductPriceTypeApi.getProductPriceTypesByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            } else {
                // No filter, no search - get all
                response = await ProductPriceTypeApi.getProductPriceTypes(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setProductPriceTypes(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setProductPriceTypes([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load product price types. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchProductPriceTypes();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchProductPriceTypes();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchProductPriceTypes(undefined, undefined);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductPriceTypes(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'priceTypeName', label: 'PRICE TYPE NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const handleRowClick = async (productPriceType: ProductPriceTypeDto) => {
        router.push(`/products/product-price-type/${productPriceType.productPriceTypeId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/products/product-price-type/create');
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductPriceTypes(undefined, undefined, newPageSize);
    };

    const tableData = useMemo(
        () =>
            productPriceTypes?.map((productPriceType) => {
                const latestActivity =
                    productPriceType.activityLogs && productPriceType.activityLogs.length > 0
                        ? productPriceType.activityLogs[productPriceType.activityLogs.length - 1]
                        : 'No activity';

                return {
                    ...productPriceType,
                    priceTypeName: productPriceType.productPriceTypeName,
                    status: <StatusBadge status={productPriceType.status || StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }) || [],
        [productPriceTypes]
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
                    <span className="text-gray-800 text-sm font-medium">Product Price Types</span>
                </nav>
            </div>

            <ProductPriceTypeHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value: string) => {
                    setStatusFilter(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductPriceTypes();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
            />

            <ProductPriceTypeTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductPriceTypes('prev', prevCursor)}
                onNext={() => fetchProductPriceTypes('next', nextCursor)}
            />
        </div>
    );
}
