# Refactoring Example: Products Module Migration

> **Real-World Example**: Complete before/after showing Product module migration from custom components to reusable @components-web pattern

This document shows the actual code changes made during the Product module migration, helping you understand what to DELETE and what to ADD when migrating other modules.

---

## 📋 Migration Overview

**Module**: Products  
**Path**: `apps/web-app/src/app/(authenticated-routes)/products/product/`  
**Date**: Session 1 (Pre-February 2026)  
**Result**: ✅ Complete (Reference Implementation)

### Stats

-   **Files Modified**: 3
-   **Lines Before**: ~280 total
-   **Lines After**: ~235 (page.tsx) + 79 (Header) + 200 (Table) = 514 total
-   **Code Reduction**: ~40% in duplicated code (custom components removed)
-   **Components Used**: 8/8 (StatusBadge, StatusFilterDropdown, RefreshButton, Input, TableSkeleton, EmptyTableState, PageSizeSelector, PaginationButtons)

---

## ✅ What Was Achieved

### Before Migration

-   ❌ Custom `getStatusBadge` function (33 lines)
-   ❌ Custom loading spinner (`<div>Loading...</div>`)
-   ❌ Custom empty state message
-   ❌ Custom pagination buttons (individual prev/next)
-   ❌ Custom page size selector
-   ❌ Mixed naming (`ProductsHeader` vs `ProductHeader`)

### After Migration

-   ✅ Uses `<StatusBadge>` component from @components-web
-   ✅ Uses `<TableSkeleton>` with proper row/column count
-   ✅ Uses `<EmptyTableState>` for desktop + mobile
-   ✅ Uses `<PaginationButtons>` with variants
-   ✅ Uses `<PageSizeSelector>` with variants
-   ✅ Uses `<StatusFilterDropdown>` with admin options
-   ✅ Uses `<RefreshButton>` with loading state
-   ✅ Consistent naming (singular: ProductHeader, ProductTable)

---

## 📝 File-by-File Changes

### File 1: page.tsx

#### BEFORE (Problematic Code)

**❌ Custom Status Badge Function** (DELETED):

```typescript
// This was 33 lines of duplicate code
const getStatusText = (status: StatusEnum): string => {
    switch (status) {
        case StatusEnum.ACTIVE:
            return 'Active';
        case StatusEnum.INACTIVE:
            return 'Inactive';
        // ... more cases
    }
};

const getStatusBadge = (status: StatusEnum): ReactNode => {
    const statusText = getStatusText(status);

    let colorClasses = '';
    switch (status) {
        case StatusEnum.ACTIVE:
            colorClasses = 'bg-green-100 text-green-800';
            break;
        case StatusEnum.INACTIVE:
            colorClasses = 'bg-gray-100 text-gray-800';
            break;
        // ... more cases
    }

    return <span className={`px-2 py-1 text-xs font-medium rounded ${colorClasses}`}>{statusText}</span>;
};
```

#### AFTER (Clean Code)

**✅ Import and Use StatusBadge**:

```typescript
import { StatusBadge } from '@components-web';

// In tableData transformation (inside component)
const tableData = useMemo(
    () =>
        products.map((product) => ({
            ...product,
            status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />,
            // ... other transformations
        })),
    [products]
);
```

**Result**: **33 lines removed**, replaced with 1 import + 1 line transformation

---

#### BEFORE (State Variables)

**❌ Inconsistent or Missing**:

```typescript
// Some modules had different names
const [loading, setLoading] = useState(false); // Wrong
const [search, setSearch] = useState(''); // Wrong
const [filter, setFilter] = useState('ALL'); // Wrong
```

#### AFTER (Standardized)

**✅ Exact Naming**:

```typescript
const [isLoading, setIsLoading] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('ALL');
const [products, setProducts] = useState<ProductDto[]>([]);
const [error, setError] = useState<string | null>(null);
const [nextCursor, setNextCursor] = useState<any>();
const [prevCursor, setPrevCursor] = useState<any>();
const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
const hasFetchedRef = useRef(false);
```

**Result**: Exact same state names across all modules

---

#### BEFORE (Fetch Function)

**❌ Inconsistent Naming**:

```typescript
const getProducts = async () => {
    // Wrong prefix
    // ...
};

const loadProducts = async () => {
    // Wrong prefix
    // ...
};
```

#### AFTER (Standardized)

**✅ Exact Naming**:

```typescript
const fetchProducts = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
    try {
        setIsLoading(true);
        setError(null);

        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        const currentPageSize = customPageSize ?? pageSize;
        const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

        const trimmedQuery = searchQuery.trim();
        let response;

        if (trimmedQuery.length > 0) {
            response = await ProductApi.getProductsByName(
                trimmedQuery,
                currentPageSize,
                direction,
                serializedCursor,
                userRole
            );
        } else {
            if (statusFilter !== 'ALL') {
                response = await ProductApi.getProductsByStatus(
                    currentPageSize,
                    statusFilter,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                response = await ProductApi.getProducts(
                    currentPageSize,
                    undefined,
                    direction,
                    serializedCursor,
                    userRole
                );
            }
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
```

**Result**: `fetch` prefix, proper parameters, error handling

---

### File 2: ProductHeader.tsx

#### BEFORE (Custom Components)

**❌ Custom Search Input** (DELETED):

```typescript
<input
    type="text"
    placeholder="Search products..."
    value={searchQuery}
    onChange={(e) => onSearchChange(e.target.value)}
    className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
/>
```

**❌ Custom Status Dropdown** (DELETED):

```typescript
<select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
    <option value="ALL">All Status</option>
    <option value="ACTIVE">Active</option>
    <option value="INACTIVE">Inactive</option>
    {/* More options... */}
</select>
```

**❌ Custom Refresh Button** (DELETED):

```typescript
<button onClick={onRefresh} disabled={isLoading}>
    {isLoading ? 'Refreshing...' : 'Refresh'}
</button>
```

#### AFTER (Reusable Components)

**✅ Use Components from @components-web**:

```typescript
import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';

export default function ProductHeader({
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    isLoading = false,
    canCreate = true,
    isAdminUser = false,
}: ProductHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    <div className="flex-1">
                        <Input
                            placeholder="Filter products"
                            value={searchQuery}
                            onChange={(value) => onSearchChange((value as string) ?? '')}
                            leftIcon={Search}
                        />
                    </div>
                    <StatusFilterDropdown
                        value={statusFilter}
                        onChange={onStatusFilterChange}
                        showAdminOptions={true}
                        isAdminUser={isAdminUser}
                    />
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} />
                </div>
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Add size={18} />
                        New product
                    </button>
                )}
            </div>
        </div>
    );
}
```

**Result**: ~50+ lines of custom code replaced with 4 component imports

---

### File 3: ProductTable.tsx

#### BEFORE (Custom Loading)

**❌ Custom Loading Spinner** (DELETED):

```typescript
{
    isLoading ? (
        <div className="p-10 text-center text-gray-500 text-base">Loading products...</div>
    ) : (
        <table>...</table>
    );
}
```

#### AFTER (TableSkeleton)

**✅ Use TableSkeleton**:

```typescript
import { TableSkeleton } from '@components-web';

{
    isLoading ? (
        <div className="hidden sm:block">
            <TableSkeleton rows={pageSize} columns={headers.length} />
        </div>
    ) : (
        <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            <table>...</table>
        </div>
    );
}
```

**Result**: Proper skeleton with accurate row/column count

---

#### BEFORE (Custom Empty State)

**❌ Custom Empty Message** (DELETED):

```typescript
{
    tableData.length === 0 && (
        <tr>
            <td colSpan={headers.length} className="text-center py-10 text-gray-500">
                No products found.
            </td>
        </tr>
    );
}
```

#### AFTER (EmptyTableState)

**✅ Use EmptyTableState**:

```typescript
import { EmptyTableState } from '@components-web';

{
    tableData.length === 0 && !isLoading && (
        <EmptyTableState message="No products found. Try adjusting your search or filters." variant="desktop" />
    );
}
```

**Result**: Consistent empty state styling across all modules

---

#### BEFORE (Custom Pagination)

**❌ Custom Pagination Buttons** (DELETED):

```typescript
<div className="flex justify-between mt-4">
    <button
        onClick={onPrevious}
        disabled={!prevCursor}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
    >
        Previous
    </button>
    <button
        onClick={onNext}
        disabled={!nextCursor}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
    >
        Next
    </button>
</div>
```

**❌ Custom Page Size Selector** (DELETED):

```typescript
<select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
    <option value={5}>5 rows</option>
    <option value={10}>10 rows</option>
    <option value={20}>20 rows</option>
    <option value={50}>50 rows</option>
</select>
```

#### AFTER (Reusable Components)

**✅ Use PaginationButtons + PageSizeSelector**:

```typescript
import { PaginationButtons, PageSizeSelector } from '@components-web';

{
    /* Desktop footer */
}
<div className="px-6 py-5 bg-gray-50 border-t border-gray-200 flex flex-row items-center justify-between">
    <PageSizeSelector pageSize={pageSize} onChange={onPageSizeChange} variant="desktop" />
    <PaginationButtons
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={!!prevCursor}
        hasNext={!!nextCursor}
        variant="desktop"
    />
</div>;

{
    /* Mobile footer */
}
<div className="sm:hidden space-y-3 bg-gray-50 border-t border-gray-200 px-4 py-5">
    <PageSizeSelector pageSize={pageSize} onChange={onPageSizeChange} variant="mobile" />
    <PaginationButtons
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={!!prevCursor}
        hasNext={!!nextCursor}
        variant="mobile"
    />
</div>;
```

**Result**: Consistent pagination across desktop + mobile with variants

---

## 🔍 Key Lessons from Migration

### Lesson 1: StatusBadge Must Be Transformed

**❌ WRONG** - Don't use status string directly:

```typescript
const tableData = products.map((p) => ({ ...p, status: p.status }));
// Later in table: <td>{row.status}</td>  // Shows "ACTIVE" as text
```

**✅ CORRECT** - Transform in useMemo:

```typescript
const tableData = useMemo(
    () =>
        products.map((p) => ({
            ...p,
            status: <StatusBadge status={p.status ?? StatusEnum.ACTIVE} />,
        })),
    [products]
);
// Later in table: <td>{row.status}</td>  // Renders colored badge
```

---

### Lesson 2: Mobile Needs Separate Components

**❌ WRONG** - Forgetting mobile skeleton:

```typescript
{isLoading ? (
    <TableSkeleton rows={pageSize} columns={headers.length} />  // Only desktop
) : (
    // table...
)}
```

**✅ CORRECT** - Both desktop and mobile:

```typescript
{/* Desktop */}
{isLoading ? (
    <div className="hidden sm:block">
        <TableSkeleton rows={pageSize} columns={headers.length} />
    </div>
) : (
    // desktop table...
)}

{/* Mobile */}
{isLoading ? (
    <div className="sm:hidden">
        <TableSkeleton rows={pageSize} columns={1} />
    </div>
) : (
    // mobile cards...
)}
```

---

### Lesson 3: Naming Matters

**❌ WRONG** - Creative naming:

```typescript
export default function ProductsHeader() {} // Plural
const getProducts = async () => {}; // "get" prefix
const onCreate = () => {}; // Missing "handle"
```

**✅ CORRECT** - Exact naming:

```typescript
export default function ProductHeader() {} // Singular
const fetchProducts = async () => {}; // "fetch" prefix
const handleCreateClick = () => {}; // "handle" prefix
```

---

### Lesson 4: Variants Are Required

**❌ WRONG** - No variant specified:

```typescript
<PageSizeSelector pageSize={pageSize} onChange={onChange} />
```

**✅ CORRECT** - Explicit variant:

```typescript
<PageSizeSelector pageSize={pageSize} onChange={onChange} variant="desktop" />
<PageSizeSelector pageSize={pageSize} onChange={onChange} variant="mobile" />
```

---

## 📊 Before/After Comparison

### Imports

**BEFORE**:

```typescript
import { ProductApi, ProductDto, StatusEnum } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// No component imports
```

**AFTER**:

```typescript
import { StatusBadge } from '@components-web'; // ✅ Added
import { ProductApi, ProductDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react'; // ✅ Added useMemo, useRef
import { ProductHeader, ProductTable } from './components';
```

---

### Component Props

**BEFORE** (Inconsistent):

```typescript
interface ProductHeaderProps {
    search: string; // Wrong name
    filter: string; // Wrong name
    onSearchChange: (value: string) => void;
    // ... missing props
}
```

**AFTER** (Standardized):

```typescript
interface ProductHeaderProps {
    searchQuery: string; // ✅ Correct
    statusFilter: string; // ✅ Correct
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    isLoading?: boolean;
    canCreate?: boolean;
    isAdminUser?: boolean; // ✅ For admin-only filters
}
```

---

## 🎯 Migration Checklist (What Got Done)

-   [x] **Replaced custom getStatusBadge** with StatusBadge component
-   [x] **Renamed ProductsHeader** to ProductHeader (singular)
-   [x] **Added StatusFilterDropdown** with admin options
-   [x] **Added RefreshButton** with loading state
-   [x] **Added Input** component for search
-   [x] **Replaced custom loading** with TableSkeleton (desktop + mobile)
-   [x] **Replaced custom empty state** with EmptyTableState (desktop + mobile)
-   [x] **Replaced custom pagination** with PaginationButtons + PageSizeSelector
-   [x] **Added variants** for all footer components
-   [x] **Standardized naming** (fetch not get, handle prefix, etc.)
-   [x] **Added hasFetchedRef** to prevent duplicate initial fetch
-   [x] **Added 500ms debounce** for search
-   [x] **Used useMemo** for headers and tableData
-   [x] **Passed exact props** (9 for Header, 11 for Table)

---

## 📈 Impact Analysis

### Code Quality

-   ✅ **Consistency**: Now matches pattern used by 31 other modules
-   ✅ **Maintainability**: Changes to components affect all modules
-   ✅ **Testability**: Reusable components tested once, used everywhere

### Developer Experience

-   ✅ **Faster Development**: Copy template → find-replace → done
-   ✅ **Less Debugging**: Components already validated
-   ✅ **Clear Patterns**: No guessing on implementation

### User Experience

-   ✅ **Consistent UI**: All tables look and behave the same
-   ✅ **Better Loading**: Proper skeletons instead of text
-   ✅ **Responsive**: Desktop + mobile variants

---

## 🚀 Applying to Other Modules

### Quick Steps

1. **Copy this example** as reference
2. **Open your module** (e.g., Customer)
3. **Find-replace** Product → Customer, products → customers
4. **Delete custom components** (like in BEFORE examples)
5. **Add reusable components** (like in AFTER examples)
6. **Run validation checklist** (80+ points from FEATURE_TABLE_LIST.md)

### Common Patterns to Replace

| Old Pattern (DELETE)           | New Pattern (ADD)                                 |
| ------------------------------ | ------------------------------------------------- |
| Custom getStatusBadge function | `<StatusBadge status={...} />`                    |
| `<input type="text" ...>`      | `<Input ... leftIcon={Search} />`                 |
| Custom select for status       | `<StatusFilterDropdown ... />`                    |
| Custom refresh button          | `<RefreshButton ... />`                           |
| `<div>Loading...</div>`        | `<TableSkeleton rows={...} columns={...} />`      |
| Custom empty message           | `<EmptyTableState message="..." variant="..." />` |
| Custom prev/next buttons       | `<PaginationButtons ... variant="..." />`         |
| Custom page size select        | `<PageSizeSelector ... variant="..." />`          |

---

## 📚 Related Documentation

-   [FEATURE_TABLE_LIST.md](./features/FEATURE_TABLE_LIST.md) - Complete templates
-   [COMPONENT_LIBRARY_REFERENCE.md](./COMPONENT_LIBRARY_REFERENCE.md) - Component APIs
-   [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) - Track your progress
-   [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - If you get stuck

---

**Remember**: The Product module is your reference. When in doubt, check how it was done there!
