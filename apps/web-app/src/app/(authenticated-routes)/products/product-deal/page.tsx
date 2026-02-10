'use client';

import { StatusBadge } from '@components-web';
import { ProductDealApi, ProductDealDto, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductDealHeader, ProductDealTable } from './components';

export default function ProductDealsMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [productDeals, setProductDeals] = useState<ProductDealDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    const hasFetchedRef = useRef(false);

    const fetchProductDeals = async (direction?: 'next' | 'prev', cursor?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // Validate pagination parameters: both direction and cursor must be defined together
            const validDirection = direction && serializedCursor ? direction : undefined;
            const validCursor = direction && serializedCursor ? serializedCursor : undefined;

            let response;

            // Branch 1: Search query is active (takes priority, can combine with status)
            if (searchQuery && searchQuery.trim() !== '') {
                response = await ProductDealApi.getProductDealsByName(
                    searchQuery.trim(),
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 2: Status filter is active (not 'ALL')
            else if (statusFilter && statusFilter !== 'ALL') {
                response = await ProductDealApi.getProductDeals(
                    pageSize,
                    statusFilter === '' ? undefined : statusFilter,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: No filters - show all
            else {
                response = await ProductDealApi.getProductDeals(
                    pageSize,
                    undefined,
                    validDirection,
                    validCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setProductDeals(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setProductDeals([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setProductDeals([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load product deals. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchProductDeals();
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery === '') return;

        setNextCursor(undefined);
        setPrevCursor(undefined);

        const delayDebounceFn = setTimeout(() => {
            fetchProductDeals();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Status filter change
    useEffect(() => {
        if (!hasFetchedRef.current) return;

        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductDeals();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'dealName', label: 'DEAL NAME' },
            { key: 'minQty', label: 'MIN QTY' },
            { key: 'additionalQty', label: 'ADDITIONAL QTY' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const handleRowClick = async (productDeal: ProductDealDto) => {
        router.push(`/products/product-deal/${productDeal.productDealId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/products/product-deal/create');
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductDeals();
    };

    const tableData = useMemo(
        () =>
            productDeals?.map((productDeal) => ({
                ...productDeal,
                dealName: productDeal.productDealName || '-',
                minQty: productDeal.minQty ?? '-',
                additionalQty: productDeal.additionalQty ?? '-',
                status: <StatusBadge status={productDeal.status} />,
                latestActivity:
                    productDeal.activityLogs && productDeal.activityLogs.length > 0
                        ? productDeal.activityLogs[productDeal.activityLogs.length - 1]
                        : '-',
            })) || [],
        [productDeals]
    );

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = true;

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {error && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="cursor-pointer border-none bg-transparent text-lg font-bold text-red-600 hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            <nav className="flex items-center gap-2">
                <a
                    href="/dashboard"
                    className="text-sm text-blue-500 no-underline transition-colors duration-200 hover:text-blue-600"
                >
                    Home
                </a>
                <span className="text-gray-400">/</span>
                <a
                    href="/products"
                    className="text-sm text-blue-500 no-underline transition-colors duration-200 hover:text-blue-600"
                >
                    Products
                </a>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-800">Product Deals</span>
            </nav>

            <ProductDealHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value: string) => setStatusFilter(value)}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductDeals();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
            />

            <ProductDealTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductDeals('prev', prevCursor)}
                onNext={() => fetchProductDeals('next', nextCursor)}
            />
        </div>
    );
}
