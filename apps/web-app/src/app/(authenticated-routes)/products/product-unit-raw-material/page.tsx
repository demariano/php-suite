'use client';

import ProductUnitRawMaterialApi from '@data-access/api/product-unit-raw-material.api';
import { ProductUnitRawMaterialDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductUnitRawMaterialHeader, ProductUnitRawMaterialTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

const getStatusText = (status: StatusEnum): string => {
    switch (status) {
        case StatusEnum.ACTIVE:
            return 'Active';
        case StatusEnum.FOR_APPROVAL:
            return 'For Approval';
        case StatusEnum.FOR_DELETION:
            return 'For Deletion';
        case StatusEnum.FOR_DEACTIVATION:
            return 'For Deactivation';
        case StatusEnum.INACTIVE:
            return 'Inactive';
        case StatusEnum.NEW_RECORD:
            return 'New Record';
        default:
            return status;
    }
};

const getStatusBadge = (status?: StatusEnum) => {
    const resolvedStatus = status ?? StatusEnum.ACTIVE;

    const badgeStyles: Record<StatusEnum, string> = {
        [StatusEnum.ACTIVE]: 'bg-green-100 text-green-800',
        [StatusEnum.FOR_APPROVAL]: 'bg-yellow-100 text-yellow-800',
        [StatusEnum.FOR_DELETION]: 'bg-red-100 text-red-800',
        [StatusEnum.FOR_DEACTIVATION]: 'bg-orange-100 text-orange-800',
        [StatusEnum.INACTIVE]: 'bg-gray-200 text-gray-500',
        [StatusEnum.NEW_RECORD]: 'bg-blue-100 text-blue-800',
        [StatusEnum.DRAFT]: 'bg-gray-100 text-gray-700',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                badgeStyles[resolvedStatus] ?? 'bg-gray-100 text-gray-700'
            }`}
        >
            {getStatusText(resolvedStatus)}
        </span>
    );
};

export default function ProductUnitRawMaterialsMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [productUnitRawMaterials, setProductUnitRawMaterials] = useState<ProductUnitRawMaterialDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<any>();
    const [prevCursor, setPrevCursor] = useState<any>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const fetchProductUnitRawMaterials = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
        console.log('fetchProductUnitRawMaterials called', { direction, cursor, customPageSize });
        setIsLoading(true);
        setError(null);

        try {
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const limit = customPageSize ?? pageSize;

            console.log('Calling API with params:', { limit, direction, cursor, userRole });

            const response = await ProductUnitRawMaterialApi.getAllProductUnitRawMaterials(
                limit,
                direction,
                cursor,
                userRole
            );

            console.log('API response:', response);

            setProductUnitRawMaterials(response.data || []);
            setNextCursor(response.nextCursorPointer);
            setPrevCursor(response.prevCursorPointer);
        } catch (err: any) {
            console.error('Error fetching product unit raw materials:', err);
            console.error('Error details:', {
                message: err?.message,
                response: err?.response,
                responseData: err?.response?.data,
            });
            setError(err?.response?.data?.message || 'Failed to fetch product unit raw materials');
            setProductUnitRawMaterials([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        console.log('Calling fetchProductUnitRawMaterials from useEffect', { env, authedUser });
        fetchProductUnitRawMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const headers = useMemo(
        () => [
            { key: 'productName', label: 'PRODUCT' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            productUnitRawMaterials.map((item) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (item.activityLogs && item.activityLogs.length > 0) {
                    const lastLog = item.activityLogs[item.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...item,
                    status: getStatusBadge(item.status),
                    latestActivity,
                };
            }),
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
        fetchProductUnitRawMaterials(undefined, undefined, size);
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
                onRefresh={() => {
                    setSearchQuery('');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductUnitRawMaterials();
                }}
                onCreateClick={handleCreateClick}
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
