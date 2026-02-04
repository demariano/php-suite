# Reusable Component Library Reference

> **Import Location**: All components are exported from `@components-web`  
> **Physical Location**: `libs/frontend/components-web/src/`

This document provides complete API documentation for all reusable components used in table list implementations.

---

## 📦 Component Index

1. [StatusBadge](#statusbadge) - Status pill with color coding
2. [StatusFilterDropdown](#statusfilterdropdown) - Status filter with admin options
3. [RefreshButton](#refreshbutton) - Refresh button with loading animation
4. [PageSizeSelector](#pagesizeselector) - Rows per page selector
5. [TableSkeleton](#tableskeleton) - Loading skeleton for tables
6. [EmptyTableState](#emptytablestate) - Empty state component
7. [PaginationButtons](#paginationbuttons) - Previous/Next navigation
8. [Input](#input) - Search input (already exists)
9. [Add Icon](#add-icon) - Create button icon (lucide-react)

---

## StatusBadge

**Purpose**: Display status with consistent color-coded badges across the application.

### Import

```typescript
import { StatusBadge } from '@components-web';
```

### Props

```typescript
interface StatusBadgeProps {
    status: StatusEnum;
}

enum StatusEnum {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    FOR_APPROVAL = 'FOR_APPROVAL',
    FOR_DELETION = 'FOR_DELETION',
    FOR_DEACTIVATION = 'FOR_DEACTIVATION',
    NEW_RECORD = 'NEW_RECORD',
    DRAFT = 'DRAFT',
}
```

### Usage

```typescript
// In tableData transformation
const tableData = useMemo(() => {
    return products.map((product) => ({
        ...product,
        status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />,
    }));
}, [products]);
```

### Color Mapping

-   `ACTIVE` → Green (bg-green-100, text-green-800)
-   `INACTIVE` → Gray (bg-gray-100, text-gray-800)
-   `FOR_APPROVAL` → Yellow (bg-yellow-100, text-yellow-800)
-   `FOR_DELETION` → Red (bg-red-100, text-red-800)
-   `FOR_DEACTIVATION` → Orange (bg-orange-100, text-orange-800)
-   `NEW_RECORD` → Blue (bg-blue-100, text-blue-800)
-   `DRAFT` → Purple (bg-purple-100, text-purple-800)

### Notes

-   Returns ReactNode, not string
-   Must transform in useMemo before passing to table
-   Handles null/undefined with fallback to ACTIVE

---

## StatusFilterDropdown

**Purpose**: Filter data by status with admin-only options.

### Import

```typescript
import { StatusFilterDropdown } from '@components-web';
```

### Props

```typescript
interface StatusFilterDropdownProps {
    value: string;
    onChange: (value: string) => void;
    isAdminUser?: boolean;
}
```

### Usage

```typescript
// In [Module]Header component
<StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} isAdminUser={isAdminUser} />
```

### Filter Options

**Regular Users** (isAdminUser=false):

-   ALL
-   ACTIVE
-   INACTIVE
-   FOR_APPROVAL
-   NEW_RECORD
-   DRAFT

**Admin Users** (isAdminUser=true):

-   All regular options PLUS:
-   FOR_DELETION
-   FOR_DEACTIVATION

### Notes

-   Defaults to 'ALL' if no value
-   Admin check: `authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'`
-   Uses select element with consistent styling

---

## RefreshButton

**Purpose**: Manual refresh with loading animation.

### Import

```typescript
import { RefreshButton } from '@components-web';
```

### Props

```typescript
interface RefreshButtonProps {
    onClick: () => void;
    isLoading: boolean;
}
```

### Usage

```typescript
// In [Module]Header component
<RefreshButton onClick={handleRefresh} isLoading={isLoading} />
```

### Behavior

-   Shows spinning animation when `isLoading=true`
-   Disabled state when loading
-   Rotates icon with animation
-   Blue color scheme matching design system

### Notes

-   Uses lucide-react RefreshCw icon
-   Auto-disables during loading
-   No text label (icon only)

---

## PageSizeSelector

**Purpose**: Allow users to change rows per page.

### Import

```typescript
import { PageSizeSelector } from '@components-web';
```

### Props

```typescript
interface PageSizeSelectorProps {
    pageSize: number;
    onChange: (size: number) => void;
    variant?: 'desktop' | 'mobile';
}
```

### Usage

```typescript
// Desktop version
<PageSizeSelector
    pageSize={pageSize}
    onChange={handlePageSizeChange}
    variant="desktop"
/>

// Mobile version
<PageSizeSelector
    pageSize={pageSize}
    onChange={handlePageSizeChange}
    variant="mobile"
/>
```

### Available Sizes

-   5 rows
-   10 rows (DEFAULT_PAGE_SIZE)
-   20 rows
-   50 rows

### Variants

-   `desktop`: Full styling with border, padding
-   `mobile`: Compact styling for mobile cards

### Notes

-   Defaults to 'desktop' variant if not specified
-   Triggers immediate fetch with new page size
-   Resets pagination cursors on change

---

## TableSkeleton

**Purpose**: Loading skeleton while data is being fetched.

### Import

```typescript
import { TableSkeleton } from '@components-web';
```

### Props

```typescript
interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}
```

### Usage

```typescript
// In [Module]Table component
{
    isLoading ? <TableSkeleton rows={pageSize} columns={headers.length} /> : <table>...</table>;
}
```

### Defaults

-   rows: 5
-   columns: 4

### Behavior

-   Renders placeholder rows matching table structure
-   Animates with pulse effect
-   Gray gradient background
-   Matches table header/cell sizing

### Notes

-   Use header count for accurate column count
-   Use pageSize for accurate row count
-   Prevents layout shift during loading

---

## EmptyTableState

**Purpose**: Friendly message when no data is found.

### Import

```typescript
import { EmptyTableState } from '@components-web';
```

### Props

```typescript
interface EmptyTableStateProps {
    message?: string;
    variant?: 'desktop' | 'mobile';
}
```

### Usage

```typescript
// Desktop version
{
    tableData.length === 0 && !isLoading && (
        <EmptyTableState message="No products found. Try adjusting your search or filters." variant="desktop" />
    );
}

// Mobile version
{
    tableData.length === 0 && !isLoading && (
        <EmptyTableState message="No products found. Try adjusting your search or filters." variant="mobile" />
    );
}
```

### Default Messages

-   Desktop: "No data available"
-   Mobile: "No items found"

### Variants

-   `desktop`: Full table row with centered message
-   `mobile`: Card-style message for mobile view

### Notes

-   Only show when NOT loading
-   Customize message based on search/filter context
-   Different styling for desktop vs mobile

---

## PaginationButtons

**Purpose**: Previous/Next navigation buttons.

### Import

```typescript
import { PaginationButtons } from '@components-web';
```

### Props

```typescript
interface PaginationButtonsProps {
    onPrevious: () => void;
    onNext: () => void;
    hasPrevious: boolean;
    hasNext: boolean;
    variant?: 'desktop' | 'mobile';
}
```

### Usage

```typescript
// Desktop version
<PaginationButtons
    onPrevious={() => fetchProducts('prev', prevCursor)}
    onNext={() => fetchProducts('next', nextCursor)}
    hasPrevious={!!prevCursor}
    hasNext={!!nextCursor}
    variant="desktop"
/>

// Mobile version
<PaginationButtons
    onPrevious={() => fetchProducts('prev', prevCursor)}
    onNext={() => fetchProducts('next', nextCursor)}
    hasPrevious={!!prevCursor}
    hasNext={!!nextCursor}
    variant="mobile"
/>
```

### Variants

-   `desktop`: Horizontal layout with gap
-   `mobile`: Full-width stacked layout

### Behavior

-   Previous button disabled when `hasPrevious=false`
-   Next button disabled when `hasNext=false`
-   Blue color scheme when enabled
-   Gray when disabled

### Notes

-   Always check cursor existence: `!!prevCursor` / `!!nextCursor`
-   Pass cursor to fetch function
-   Direction parameter: 'prev' or 'next'

---

## Input (Search)

**Purpose**: Text input for search functionality.

### Import

```typescript
import { Input } from '@components-web';
```

### Props

```typescript
interface InputProps {
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}
```

### Usage

```typescript
// In [Module]Header component
<Input
    type="text"
    placeholder="Search products..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="flex-1"
/>
```

### Notes

-   Pre-existing component in @components-web
-   Use with Search icon from lucide-react
-   Debounce search (500ms) in useEffect
-   Trim whitespace before API call

---

## Add Icon

**Purpose**: Icon for Create button.

### Import

```typescript
import { Add } from 'lucide-react';
```

### Usage

```typescript
// In [Module]Header component
<button onClick={handleCreateClick}>
    <Add className="h-4 w-4" />
    Create Product
</button>
```

### Notes

-   Not from @components-web, from lucide-react
-   Use h-4 w-4 for consistent sizing
-   Always pair with text label

---

## 🔄 Component Combination Patterns

### Pattern 1: Header Components

```typescript
// Always used together in [Module]Header.tsx
import { Input, StatusFilterDropdown, RefreshButton } from '@components-web';
import { Search, Add } from 'lucide-react';

// Usage order (left to right):
1. Search icon + Input
2. StatusFilterDropdown
3. RefreshButton
4. Create button (with Add icon)
```

### Pattern 2: Table Loading States

```typescript
// In [Module]Table.tsx
import { TableSkeleton, EmptyTableState } from '@components-web';

{
    isLoading ? (
        <TableSkeleton rows={pageSize} columns={headers.length} />
    ) : tableData.length === 0 ? (
        <EmptyTableState message="..." variant="desktop" />
    ) : (
        <table>...</table>
    );
}
```

### Pattern 3: Table Footer

```typescript
// Always used together at bottom of table
import { PageSizeSelector, PaginationButtons } from '@components-web';

<div className="footer">
    <PageSizeSelector pageSize={pageSize} onChange={handlePageSizeChange} variant="desktop" />
    <PaginationButtons onPrevious={...} onNext={...} hasPrevious={...} hasNext={...} variant="desktop" />
</div>
```

### Pattern 4: Mobile Cards

```typescript
// Mobile version requires same components with 'mobile' variant
<div className="sm:hidden">
    {isLoading ? (
        <TableSkeleton rows={pageSize} columns={1} />
    ) : tableData.length === 0 ? (
        <EmptyTableState message="..." variant="mobile" />
    ) : (
        cards.map(...)
    )}
    <PageSizeSelector variant="mobile" ... />
    <PaginationButtons variant="mobile" ... />
</div>
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Create Custom Components

```typescript
// WRONG
const StatusBadge = ({ status }) => {
    return <span className={getColor(status)}>{status}</span>;
};

// CORRECT
import { StatusBadge } from '@components-web';
```

### ❌ Don't Forget Variants

```typescript
// WRONG - No variant specified for mobile
<PageSizeSelector pageSize={pageSize} onChange={onChange} />

// CORRECT
<PageSizeSelector pageSize={pageSize} onChange={onChange} variant="mobile" />
```

### ❌ Don't Use String Status

```typescript
// WRONG - StatusBadge returns ReactNode
const tableData = products.map((p) => ({ ...p, status: p.status }));

// CORRECT - Transform in useMemo
const tableData = useMemo(() => {
    return products.map((p) => ({
        ...p,
        status: <StatusBadge status={p.status ?? StatusEnum.ACTIVE} />,
    }));
}, [products]);
```

### ❌ Don't Forget Admin Check

```typescript
// WRONG - No admin differentiation
<StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />

// CORRECT
<StatusFilterDropdown
    value={statusFilter}
    onChange={setStatusFilter}
    isAdminUser={authedUser?.userRole === 'ADMIN'}
/>
```

---

## 📋 Component Import Checklist

Before implementing a module, verify these imports:

**page.tsx**:

```typescript
✅ import { StatusBadge } from '@components-web';
✅ import { [MODULE]Api, [MODULE]Dto, StatusEnum } from '@data-access/index';
```

**[Module]Header.tsx**:

```typescript
✅ import { Input, StatusFilterDropdown, RefreshButton } from '@components-web';
✅ import { Search, Add } from 'lucide-react';
```

**[Module]Table.tsx**:

```typescript
✅ import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
✅ import { [MODULE]Dto } from '@data-access/index';
```

---

## 🔍 Component Verification

To verify a component exists and is properly exported:

```bash
# Check component file exists
ls libs/frontend/components-web/src/StatusBadge.tsx

# Check component is exported
grep "StatusBadge" libs/frontend/components-web/src/index.ts
```

Expected export in `index.ts`:

```typescript
export { default as StatusBadge } from './StatusBadge';
export { default as StatusFilterDropdown } from './StatusFilterDropdown';
export { default as RefreshButton } from './RefreshButton';
export { default as PageSizeSelector } from './PageSizeSelector';
export { default as TableSkeleton } from './TableSkeleton';
export { default as EmptyTableState } from './EmptyTableState';
export { default as PaginationButtons } from './PaginationButtons';
// ... other components
```

---

## 📚 Related Documentation

-   [FEATURE_TABLE_LIST.md](./features/FEATURE_TABLE_LIST.md) - Complete implementation guide
-   [MODULE_IMPLEMENTATION_GUIDE.md](./MODULE_IMPLEMENTATION_GUIDE.md) - Module architecture overview
-   [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) - Track which modules are migrated
-   [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common errors and solutions
