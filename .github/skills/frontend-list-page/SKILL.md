---
name: 'frontend-list-page'
description: 'USE FOR: Creating Next.js App Router list pages for entity CRUD. Covers state management (isLoading, searchQuery, statusFilter, items, cursors, pageSize), 4-branch fetch logic (status+search / search-only / status-only / all), debounced search (500ms), cursor-based pagination, useRef hasFetched guard, StatusBadge rendering, breadcrumbs, ProductCategoryHeader and ProductCategoryTable component composition.'
---

# Frontend List Page Pattern

## Complete List Page Template

```tsx
'use client';

import { StatusBadge } from '@components-web';
import { {Entity}Api, {Entity}Dto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { {Entity}Header, {Entity}Table } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function {Entity}ListPage() {
    // ──── State ────
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [{entityCamel}s, set{Entity}s] = useState<{Entity}Dto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [prevCursor, setPrevCursor] = useState<string | undefined>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    // ──── Fetch Function (4-branch logic) ────
    const fetch{Entity}s = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const currentPageSize = customPageSize ?? pageSize;

            // Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && cursor ? direction : undefined;
            const paginationCursor = direction && cursor ? cursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // Branch 1: Status filter + optional name search
            if (statusFilter !== 'ALL') {
                response = await {Entity}Api.get{Entity}sByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    userRole,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined
                );
            }
            // Branch 2: Name search only (no status)
            else if (trimmedQuery.length > 0) {
                response = await {Entity}Api.get{Entity}sByName(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }
            // Branch 3: No filter, no search — get all
            else {
                response = await {Entity}Api.get{Entity}s(
                    currentPageSize,
                    undefined,
                    paginationDirection,
                    paginationCursor,
                    userRole
                );
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                set{Entity}s(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                set{Entity}s([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load {entityLabel}s. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ──── Initial Fetch (once) ────
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetch{Entity}s();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // ──── Debounced Search (500ms) ────
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery.length === 0) {
            fetch{Entity}s();
            return;
        }
        setNextCursor(undefined);
        setPrevCursor(undefined);
        const timer = setTimeout(() => {
            fetch{Entity}s(undefined, undefined);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ──── Status Filter Change ────
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery('');
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetch{Entity}s(undefined, undefined);
    }, [statusFilter]);

    // ──── Table Headers ────
    const headers = useMemo(
        () => [
            { key: '{entityCamel}Name', label: '{ENTITY} NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    // ──── Table Data Mapping ────
    const tableData = useMemo(
        () =>
            {entityCamel}s.map((item) => {
                const latestActivity =
                    item.activityLogs && item.activityLogs.length > 0
                        ? item.activityLogs[item.activityLogs.length - 1]
                        : '-';
                return {
                    ...item,
                    {entityCamel}Name: item.{entityCamel}Name || '-',
                    latestActivity,
                    status: <StatusBadge status={item.status ?? StatusEnum.ACTIVE} />,
                };
            }),
        [{entityCamel}s]
    );

    // ──── Navigation Handlers ────
    const handleCreateClick = () => router.push('/{module}/{entity-plural}/create');
    const handleRowClick = (item: {Entity}Dto) => router.push(`/{module}/{entity-plural}/${item.{entityCamel}Id}/edit`);
    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetch{Entity}s(undefined, undefined, size);
    };

    // ──── Render ────
    return (
        <div className="p-4 sm:p-6 space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">×</button>
                </div>
            )}

            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">Home</a>
                    <span>/</span>
                    <a href="/{module}" className="text-blue-600 hover:text-blue-700">{Module}</a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">{Entity Label}s</span>
                </nav>
            </div>

            <{Entity}Header
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => { setSearchQuery(value); setNextCursor(undefined); setPrevCursor(undefined); }}
                onStatusFilterChange={setStatusFilter}
                onRefresh={() => { setSearchQuery(''); setStatusFilter('ALL'); setNextCursor(undefined); setPrevCursor(undefined); fetch{Entity}s(); }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

            <{Entity}Table
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetch{Entity}s('prev', prevCursor)}
                onNext={() => fetch{Entity}s('next', nextCursor)}
            />
        </div>
    );
}
```

## Header Component Template

```tsx
'use client';

import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';

interface {Entity}HeaderProps {
    searchQuery: string;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    isLoading?: boolean;
    canCreate?: boolean;
    isAdminUser?: boolean;
}

export default function {Entity}Header({
    searchQuery, statusFilter, onSearchChange, onStatusFilterChange,
    onRefresh, onCreateClick, isLoading = false, canCreate = true,
}: {Entity}HeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    <div className="flex-1">
                        <Input
                            placeholder="Filter {entity label}s"
                            value={searchQuery}
                            onChange={(value) => onSearchChange((value as string) ?? '')}
                            leftIcon={Search}
                        />
                    </div>
                    <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} />
                </div>
                {canCreate && (
                    <button type="button" onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Add size={18} />
                        New {entity label}
                    </button>
                )}
            </div>
        </div>
    );
}
```

## Table Component Template

```tsx
'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { {Entity}Dto } from '@data-access/index';
import { ReactNode } from 'react';

type {Entity}TableRow = Omit<{Entity}Dto, 'status'> & {
    status: ReactNode;
    {entityCamel}Name: string;
    latestActivity: string;
};

interface {Entity}TableProps {
    isLoading: boolean;
    tableData: {Entity}TableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (row: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function {Entity}Table({
    isLoading, tableData, headers, searchQuery, onRowClick,
    pageSize, onPageSizeChange, prevCursor, nextCursor, onPrevious, onNext,
}: {Entity}TableProps) {
    return (
        <>
            {/* Desktop Table */}
            {isLoading ? (
                <div className="hidden sm:block"><TableSkeleton rows={pageSize} columns={headers.length} /></div>
            ) : (
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    {tableData.length === 0 ? (
                        <EmptyTableState message="No {entity label}s found." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-blue-600 border-b border-blue-700">
                                    <tr>
                                        {headers.map((h) => (
                                            <th key={h.key} className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tableData.map((row) => (
                                        <tr key={row.{entityCamel}Id} onClick={() => onRowClick(row)} className="cursor-pointer hover:bg-gray-50">
                                            {headers.map((h) => (
                                                <td key={h.key} className="px-6 py-5 text-sm">{(row as any)[h.key]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Cards - same pattern with card layout per row */}

            {/* Pagination */}
            <div className="mt-6 hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons onPrevious={onPrevious} onNext={onNext} hasPrevious={!!prevCursor} hasNext={!!nextCursor} />
            </div>
        </>
    );
}
```

## Folder Structure

```
src/app/(authenticated-routes)/{module}/{entity-plural}/
├── page.tsx                    # List page (this template)
├── create/page.tsx             # Create page
├── [id]/edit/page.tsx          # Edit page
├── [id]/edit/components/       # Edit-specific components (full form)
│   └── {Entity}Form.tsx
└── components/
    ├── index.ts                # Barrel exports
    ├── {Entity}Header.tsx      # Search + filter + create button
    ├── {Entity}Table.tsx       # Table + pagination
    ├── {Entity}Form.tsx        # Create-mode form (simpler)
    └── DenyReasonDialog.tsx    # Optional deny dialog
```

## Key Patterns

| Pattern           | Details                                                               |
| ----------------- | --------------------------------------------------------------------- |
| Debounced search  | 500ms `setTimeout`, clear on empty                                    |
| 4-branch fetch    | status+name, name-only, status-only, all                              |
| hasFetchedRef     | `useRef(false)` to prevent double fetch in StrictMode                 |
| Cursor pagination | `nextCursorPointer` / `prevCursorPointer` from API                    |
| StatusBadge       | `<StatusBadge status={item.status} />` from `@components-web`         |
| BYPASS_AUTH       | Only pass `userRole` query param when `env.BYPASS_AUTH === 'ENABLED'` |
