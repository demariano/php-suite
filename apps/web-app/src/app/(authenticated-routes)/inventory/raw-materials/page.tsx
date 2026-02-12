'use client';

import { StatusBadge } from '@components-web';
import { RawMaterialApi, RawMaterialDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import RawMaterialHeader from './components/RawMaterialHeader';
import RawMaterialTable from './components/RawMaterialTable';

const DEFAULT_PAGE_SIZE = 10;

export default function RawMaterialsMainPage() {
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();
    const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

    const [rawMaterials, setRawMaterials] = useState<RawMaterialDto[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);

    const fetchRawMaterials = async (direction?: 'next' | 'prev', cursor?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const validDirection = direction && cursor ? direction : undefined;
            const validCursor = direction && cursor ? cursor : undefined;

            let response;
            // Branch 1: Search query + Status filter (both active)
            if (searchQuery.trim() && statusFilter && statusFilter !== 'ALL') {
                response = await RawMaterialApi.getRawMaterialsByStatus(
                    pageSize,
                    statusFilter,
                    validDirection,
                    validCursor,
                    searchQuery.trim(),
                    userRole
                );
            }
            // Branch 2: Search query only (status filter is ALL)
            else if (searchQuery.trim()) {
                response = await RawMaterialApi.searchRawMaterialsByName(
                    searchQuery.trim(),
                    pageSize,
                    validDirection,
                    validCursor,
                    userRole
                );
            }
            // Branch 3: Status filter only (no search query)
            else if (statusFilter && statusFilter !== 'ALL') {
                response = await RawMaterialApi.getRawMaterialsByStatus(
                    pageSize,
                    statusFilter,
                    validDirection,
                    validCursor,
                    undefined,
                    userRole
                );
            }
            // Branch 4: Show all records (no filters)
            else {
                response = await (RawMaterialApi as any).getRawMaterials(pageSize, validDirection, validCursor, userRole);
            }

            if (response?.data) {
                setRawMaterials(Array.isArray(response.data) ? response.data : []);
                setNextCursor(response.nextCursorPointer);
                setPrevCursor(response.prevCursorPointer);
            }
        } catch (err: any) {
            console.error('Failed to load raw materials:', err);
            setError('Failed to load raw materials. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: err?.message || 'Failed to load raw materials.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRawMaterials();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) return;
        const timer = setTimeout(() => {
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchRawMaterials();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchRawMaterials();
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'rawMaterialName', label: 'NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(() => {
        return rawMaterials.map((material) => {
            const latestLog = material.activityLogs?.[material.activityLogs.length - 1];
            const parsed = latestLog ? parseActivityLog(latestLog) : null;
            const activityStyle = parsed ? getActivityStyle(parsed.activity) : undefined;

            return {
                rawMaterialId: material.rawMaterialId,
                rawMaterialName: material.rawMaterialName || '-',
                status: <StatusBadge status={material.status} />,
                latestActivity:
                    parsed && activityStyle ? (
                        <span
                            className={`px-2 py-1 rounded text-xs ${activityStyle.bgColor} ${activityStyle.textColor}`}
                        >
                            {parsed.activity}
                        </span>
                    ) : (
                        <span className="text-gray-400">-</span>
                    ),
            };
        });
    }, [rawMaterials]);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const canCreate = true;

    const handleRowClick = (material: RawMaterialDto) => {
        if (!material?.rawMaterialId) return;
        router.push(`/inventory/raw-materials/${material.rawMaterialId}/edit`);
    };

    const handleCreateClick = () => {
        router.push('/inventory/raw-materials/create');
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setNextCursor(undefined);
        setPrevCursor(undefined);
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
                    <span className="text-gray-800 font-medium">Raw Materials</span>
                </nav>
            </div>

            <RawMaterialHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    fetchRawMaterials();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={canCreate}
                isAdminUser={isAdminUser}
            />

            <RawMaterialTable
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetchRawMaterials('prev', prevCursor)}
                onNext={() => fetchRawMaterials('next', nextCursor)}
            />
        </div>
    );
}
