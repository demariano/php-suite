'use client';

import { StatusBadge } from '@components-web';
import { StatusEnum, SupplierApi, SupplierDto, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SupplierHeader, SupplierTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function SuppliersMainPage() {
    // State management
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    // Fetch suppliers from API
    const fetchSuppliers = async (direction?: 'next' | 'prev', cursor?: string) => {
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
                response = await SupplierApi.getSuppliersByName(
                    searchQuery.trim(),
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 2: Status filter is active
            else if (statusFilter && statusFilter !== 'ALL') {
                response = await SupplierApi.getSuppliersByStatus(
                    pageSize,
                    statusFilter,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: Show all records
            else {
                response = await SupplierApi.getSuppliers(pageSize, undefined, validDirection, validCursor, userRole);
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setSuppliers(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setSuppliers([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load suppliers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch (once)
    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;
        fetchSuppliers();
    }, []);

    // Search debounce (500ms)
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchSuppliers();
            return;
        }

        const timer = setTimeout(() => {
            fetchSuppliers();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery('');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchSuppliers(undefined, undefined);
    }, [statusFilter]);

    // Derived state - headers
    const headers = useMemo(
        () => [
            { key: 'supplierName', label: 'SUPPLIER NAME' },
            { key: 'email', label: 'EMAIL' },
            { key: 'phone', label: 'PHONE' },
            { key: 'contactPerson', label: 'CONTACT PERSON' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    // Derived state - table data
    const tableData = useMemo(
        () =>
            suppliers.map((supplier) => {
                // Get the latest activity log entry
                let latestActivity = null;
                if (supplier.activityLogs && supplier.activityLogs.length > 0) {
                    const lastLog = supplier.activityLogs[supplier.activityLogs.length - 1];
                    const parsed = parseActivityLog(lastLog);
                    const activityStyle = getActivityStyle(parsed.activity);
                    latestActivity = {
                        text: parsed.activity,
                        style: activityStyle,
                    };
                }

                return {
                    ...supplier,
                    email: supplier.supplierEmail,
                    phone: supplier.supplierPhone,
                    contactPerson: supplier.supplierContactPerson,
                    status: <StatusBadge status={supplier.status ?? StatusEnum.ACTIVE} />,
                    latestActivity,
                };
            }),
        [suppliers]
    );

    // Handlers
    const handleCreateClick = () => {
        router.push('/inventory/suppliers/create');
    };

    const handleRowClick = (supplier: SupplierDto) => {
        router.push(`/inventory/suppliers/${supplier.supplierId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchSuppliers(undefined, undefined);
    };

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = isAdminUser;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
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

            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Home
                    </a>
                    <span>/</span>
                    <a href="/inventory" className="text-blue-600 hover:text-blue-700">
                        Inventory
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Suppliers</span>
                </nav>
            </div>

            {/* Header Component */}
            <SupplierHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    fetchSuppliers();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
            />

            {/* Table Component */}
            <SupplierTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchSuppliers('prev', prevCursor)}
                onNext={() => fetchSuppliers('next', nextCursor)}
            />
        </div>
    );
}
