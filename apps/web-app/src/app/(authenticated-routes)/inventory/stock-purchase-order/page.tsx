'use client';

import { StockPurchaseOrderApi } from '@data-access/api/stock-purchase-order.api';
import {
    StatusEnum,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
    useEnv,
    useLocalStore,
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StockPurchaseOrderHeader, StockPurchaseOrderTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function StockPurchaseOrderPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [purchaseOrders, setPurchaseOrders] = useState<StockPurchaseOrderDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const router = useRouter();

    const hasFetchedRef = useRef(false);
    const userRole = authedUser?.userRole || 'USER';
    const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const fetchPurchaseOrders = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;
            const size = customPageSize ?? pageSize;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && serializedCursor ? direction : undefined;
            const paginationCursor = direction && serializedCursor ? serializedCursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // 4-branch API logic: all filtering done on backend
            if (statusFilter !== 'ALL' && trimmedQuery.length > 0) {
                // Branch 1: Filter by status with search (use approval status API with docNo param)
                response = await StockPurchaseOrderApi.getStockPurchaseOrdersByApprovalStatus(
                    size,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    trimmedQuery,
                    userRole
                );
            } else if (statusFilter !== 'ALL') {
                // Branch 2: Filter by status only
                response = await StockPurchaseOrderApi.getStockPurchaseOrdersByApprovalStatus(
                    size,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    undefined,
                    userRole
                );
            } else if (trimmedQuery.length > 0) {
                // Branch 3: Search by docNo only (no status filter) - now uses backend filtering
                response = await StockPurchaseOrderApi.getStockPurchaseOrders({
                    limit: size,
                    direction: paginationDirection,
                    cursorPointer: paginationCursor,
                    docNo: trimmedQuery,
                });
            } else {
                // Branch 4: No filters at all (default pagination)
                response = await StockPurchaseOrderApi.getStockPurchaseOrders({
                    limit: size,
                    direction: paginationDirection,
                    cursorPointer: paginationCursor,
                });
            }

            if (response && response.statusCode === 200 && response.data) {
                const rawData = (response.data as any).data || response.data;
                if (Array.isArray(rawData)) {
                    setPurchaseOrders(rawData);
                    const cursorData = response.data as any;
                    setNextCursor(cursorData.nextCursorPointer || response.nextCursorPointer || undefined);
                    setPrevCursor(cursorData.prevCursorPointer || response.prevCursorPointer || undefined);
                } else {
                    setPurchaseOrders([]);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }
            } else {
                setPurchaseOrders([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load stock purchase orders. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchPurchaseOrders();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Debounced search
    useEffect(() => {
        if (searchQuery === '') return;
        setNextCursor(undefined);
        setPrevCursor(undefined);
        const timeout = setTimeout(() => fetchPurchaseOrders(), 500);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // Status filter changes
    useEffect(() => {
        setSearchQuery('');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchPurchaseOrders();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'docNo', label: 'DOC NO' },
            { key: 'poDate', label: 'PO DATE' },
            { key: 'stockSupplierName', label: 'SUPPLIER' },
            { key: 'status', label: 'APPROVAL STATUS' },
            { key: 'poStatus', label: 'PO STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const getPoStatusText = (poStatus: StockPurchaseOrderStatusEnum): string => {
        switch (poStatus) {
            case StockPurchaseOrderStatusEnum.SYSTEM_GENERATED:
                return 'System Generated';
            case StockPurchaseOrderStatusEnum.PENDING:
                return 'Pending';
            case StockPurchaseOrderStatusEnum.PARTIAL:
                return 'Partial';
            case StockPurchaseOrderStatusEnum.COMPLETED:
                return 'Completed';
            default:
                return poStatus;
        }
    };

    const getPoStatusBadge = (poStatus: StockPurchaseOrderStatusEnum) => {
        const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase';

        let bgColor = '';
        let textColor = '';

        if (poStatus === StockPurchaseOrderStatusEnum.SYSTEM_GENERATED) {
            bgColor = '#f3e8ff';
            textColor = '#6b21a8';
        } else if (poStatus === StockPurchaseOrderStatusEnum.PENDING) {
            bgColor = '#f3f4f6';
            textColor = '#1f2937';
        } else if (poStatus === StockPurchaseOrderStatusEnum.PARTIAL) {
            bgColor = '#dbeafe';
            textColor = '#1e40af';
        } else if (poStatus === StockPurchaseOrderStatusEnum.COMPLETED) {
            bgColor = '#dcfce7';
            textColor = '#166534';
        } else {
            bgColor = '#f3f4f6';
            textColor = '#6b7280';
        }

        return (
            <span className={baseClasses} style={{ backgroundColor: bgColor, color: textColor }}>
                {getPoStatusText(poStatus)}
            </span>
        );
    };

    const handleRowClick = (purchaseOrder: StockPurchaseOrderDto) => {
        router.push(`/inventory/stock-purchase-order/${purchaseOrder.stockPurchaseOrderId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/inventory/stock-purchase-order/create');
    };

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchPurchaseOrders();
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchPurchaseOrders(undefined, undefined, newPageSize);
    };

    const tableData = useMemo(
        () =>
            purchaseOrders?.map((purchaseOrder) => {
                const latestLog = purchaseOrder.activityLogs?.[purchaseOrder.activityLogs.length - 1];
                const parsed = latestLog ? parseActivityLog(latestLog) : null;
                const activityStyle = parsed ? getActivityStyle(parsed.activity) : undefined;

                return {
                    stockPurchaseOrderId: purchaseOrder.stockPurchaseOrderId,
                    docNo: purchaseOrder.docNo,
                    poDate: purchaseOrder.poDate,
                    stockSupplierName: purchaseOrder.stockSupplierName,
                    status: purchaseOrder.status || StatusEnum.ACTIVE,
                    poStatus: purchaseOrder.poStatus || StockPurchaseOrderStatusEnum.PENDING,
                    latestActivity: parsed && activityStyle ? { text: parsed.activity, style: activityStyle } : null,
                };
            }) || [],
        [purchaseOrders]
    );

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
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

            <StockPurchaseOrderHeader
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

            <StockPurchaseOrderTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchPurchaseOrders('prev', prevCursor)}
                onNext={() => fetchPurchaseOrders('next', nextCursor)}
                getPoStatusBadge={getPoStatusBadge}
            />
        </div>
    );
}
