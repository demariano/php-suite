'use client';

import { ProductUnitApi, ProductUnitDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { ProductUnitHeader, ProductUnitTable } from './components';

export default function ProductUnitPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [productUnits, setProductUnits] = useState<ProductUnitDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();

    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(10);

    // Track if initial fetch has been made to prevent duplicate calls
    const hasFetchedRef = useRef(false);

    // Fetch product units from API
    const fetchProductUnits = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            let response;

            const currentPageSize = customPageSize ?? pageSize;

            if (searchQuery && searchQuery.trim() !== '') {
                response = await ProductUnitApi.getProductUnitsByName(
                    searchQuery.trim(),
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                response = await ProductUnitApi.getProductUnits(
                    currentPageSize,
                    undefined,
                    direction,
                    serializedCursor,
                    userRole
                );
            }

            if (response && response.statusCode === 200 && response.data) {
                if (Array.isArray(response.data)) {
                    setProductUnits(response.data);
                    setNextCursor(response.nextCursorPointer || undefined);
                    setPrevCursor(response.prevCursorPointer || undefined);
                } else {
                    setProductUnits([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setProductUnits([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }

            if (direction && cursor) {
                setCurrentCursor(cursor);
            } else {
                setCurrentCursor(undefined);
            }
        } catch {
            setError('Failed to load product units. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchProductUnits();
    }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

    useEffect(() => {
        if (searchQuery === '') {
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            fetchProductUnits();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const headers = [
        { key: 'productUnitName', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ];

    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.INACTIVE:
                return 'Inactive';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.FOR_DEACTIVATION:
                return 'For Deactivation';
            case StatusEnum.NEW_RECORD:
                return 'New Record';
            default:
                return status;
        }
    };

    const getStatusBadge = (status: StatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let colorClasses = '';
        if (status === StatusEnum.ACTIVE) {
            colorClasses = '!bg-green-100 !text-green-800';
        } else if (status === StatusEnum.INACTIVE) {
            colorClasses = '!bg-gray-200 !text-gray-500';
        } else if (status === StatusEnum.FOR_APPROVAL) {
            colorClasses = '!bg-yellow-100 !text-yellow-800';
        } else if (status === StatusEnum.FOR_DELETION) {
            colorClasses = '!bg-red-100 !text-red-800';
        } else if (status === StatusEnum.FOR_DEACTIVATION) {
            colorClasses = '!bg-orange-100 !text-orange-800';
        } else if (status === StatusEnum.NEW_RECORD) {
            colorClasses = '!bg-blue-100 !text-blue-800';
        } else {
            colorClasses = '!bg-gray-100 !text-gray-600';
        }

        return (
            <span
                className={`${baseClasses} ${colorClasses}`}
                style={{
                    backgroundColor:
                        status === StatusEnum.ACTIVE
                            ? '#dcfce7'
                            : status === StatusEnum.INACTIVE
                            ? '#e5e7eb'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#fef3c7'
                            : status === StatusEnum.FOR_DELETION
                            ? '#fef2f2'
                            : status === StatusEnum.FOR_DEACTIVATION
                            ? '#ffedd5'
                            : status === StatusEnum.NEW_RECORD
                            ? '#dbeafe'
                            : '#f3f4f6',
                    color:
                        status === StatusEnum.ACTIVE
                            ? '#166534'
                            : status === StatusEnum.INACTIVE
                            ? '#6b7280'
                            : status === StatusEnum.FOR_APPROVAL
                            ? '#92400e'
                            : status === StatusEnum.FOR_DELETION
                            ? '#dc2626'
                            : status === StatusEnum.FOR_DEACTIVATION
                            ? '#9a3412'
                            : status === StatusEnum.NEW_RECORD
                            ? '#1e40af'
                            : '#6b7280',
                }}
            >
                {getStatusText(status)}
            </span>
        );
    };

    const handleRowClick = async (productUnit: ProductUnitDto) => {
        window.location.href = `/products/product-unit/${productUnit.productUnitId}/edit`;
    };

    const handleCreateClick = () => {
        window.location.href = '/products/product-unit/create';
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        setCurrentCursor(undefined);
        fetchProductUnits(undefined, undefined, newPageSize);
    };

    const tableData =
        productUnits?.map((productUnit) => {
            // Get the latest activity log entry
            let latestActivity = null;
            if (productUnit.activityLogs && productUnit.activityLogs.length > 0) {
                const lastLog = productUnit.activityLogs[productUnit.activityLogs.length - 1];
                const parsed = parseActivityLog(lastLog);
                const activityStyle = getActivityStyle(parsed.activity);
                latestActivity = {
                    text: parsed.activity,
                    style: activityStyle,
                };
            }

            return {
                ...productUnit,
                status: getStatusBadge(productUnit.status || StatusEnum.ACTIVE),
                latestActivity,
            };
        }) || [];

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = isAdminUser;

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
                    <span className="text-gray-800 text-sm font-medium">Product Unit</span>
                </nav>
            </div>

            <ProductUnitHeader
                searchQuery={searchQuery}
                onSearchChange={(value: string) => {
                    setSearchQuery(value);
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setCurrentCursor(undefined);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchProductUnits();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
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
