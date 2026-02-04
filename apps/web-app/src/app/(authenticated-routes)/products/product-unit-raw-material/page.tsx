'use client';

import { StatusBadge } from '@components-web';
import ProductUnitRawMaterialApi from '@data-access/api/product-unit-raw-material.api';
import { ProductUnitRawMaterialDto, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductUnitRawMaterialHeader, ProductUnitRawMaterialTable } from './components';

export default function ProductUnitRawMaterialsMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [productUnitRawMaterials, setProductUnitRawMaterials] = useState<ProductUnitRawMaterialDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);
    const hasFetchedRef = useRef(false);

    const fetchProductUnitRawMaterials = async (direction?: 'next' | 'prev', cursor?: string) => {
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
                response = await ProductUnitRawMaterialApi.getProductUnitRawMaterialsByProductName(
                    searchQuery.trim(),
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 2: Show all records
            else {
                response = await ProductUnitRawMaterialApi.getAllProductUnitRawMaterials(
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }

            setProductUnitRawMaterials(response.data || []);
            setNextCursor(response.nextCursorPointer);
            setPrevCursor(response.prevCursorPointer);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to fetch product unit raw materials');
            setProductUnitRawMaterials([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchProductUnitRawMaterials();
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery === '') return;

        setNextCursor(undefined);
        setPrevCursor(undefined);

        const delayDebounceFn = setTimeout(() => {
            fetchProductUnitRawMaterials();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const headers = useMemo(
        () => [
            { key: 'productName', label: 'PRODUCT NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            productUnitRawMaterials.map((item) => ({
                ...item,
                status: <StatusBadge status={item.status} />,
                latestActivity:
                    item.activityLogs && item.activityLogs.length > 0
                        ? item.activityLogs[item.activityLogs.length - 1]
                        : '-',
            })),
        [productUnitRawMaterials]
    );

    const handleCreateClick = () => {
        router.push('/products/product-unit-raw-material/create');
    };

    const handleRowClick = (item: ProductUnitRawMaterialDto) => {
        router.push(`/products/product-unit-raw-material/${item.productUnitRawMaterialId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchProductUnitRawMaterials();
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
                    <a href="/products" className="text-blue-600 hover:text-blue-700">
                        Products
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Product Unit Raw Materials</span>
                </nav>
            </div>

            <ProductUnitRawMaterialHeader
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
                    fetchProductUnitRawMaterials();
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductUnitRawMaterials();
                }}
                onCreateClick={handleCreateClick}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
                isLoading={isLoading}
            />

            <ProductUnitRawMaterialTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchProductUnitRawMaterials('prev', prevCursor)}
                onNext={() => fetchProductUnitRawMaterials('next', nextCursor)}
            />
        </div>
    );
}
