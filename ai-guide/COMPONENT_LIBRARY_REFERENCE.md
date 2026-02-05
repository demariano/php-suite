# Reusable Component Library Reference

> **Import Location**: All components are exported from `@components-web`  
> **Physical Location**: `libs/frontend/components-web/src/`  
> **Last Updated**: February 2025

This document provides complete API documentation for all reusable components used in table list, form, and approval workflow implementations.

---

## 📦 Component Index

### Table List Components

1. [StatusBadge](#statusbadge) - Status pill with color coding
2. [StatusFilterDropdown](#statusfilterdropdown) - Status filter with admin options
3. [RefreshButton](#refreshbutton) - Refresh button with loading animation
4. [PageSizeSelector](#pagesizeselector) - Rows per page selector
5. [TableSkeleton](#tableskeleton) - Loading skeleton for tables
6. [EmptyTableState](#emptytablestate) - Empty state component
7. [PaginationButtons](#paginationbuttons) - Previous/Next navigation
8. [Input](#input) - Search input (already exists)
9. [Add Icon](#add-icon) - Create button icon (lucide-react)

### Form Components

10. [FormActionButtons](#formactionbuttons) - Save/Cancel/Delete/Reactivate buttons
11. [FormSectionCard](#formsectioncard) - Blue-themed section container with icon
12. [ValidationErrors](#validationerrors) - Error display banner
13. [EditFormTabs](#editformtabs) - Tab navigation for edit forms
14. [InnerRecordTable](#innerrecordtable) - Table for sub-records (deals, prices, etc.)

### Approval Components

15. [ApprovalActionButtons](#approvalactionbuttons) - Approve/Deny/Cancel buttons
16. [DeletionApprovalCard](#deletionapprovalcard) - Card for FOR_DELETION status
17. [DeactivationApprovalCard](#deactivationapprovalcard) - Card for FOR_DEACTIVATION status
18. [ChangeSummaryCard](#changesummarycard) - Summary banner showing change overview
19. [FieldDiffRow](#fielddiffrow) - Side-by-side field comparison
20. [ArrayDiffTable](#arraydifftable) - Table showing added/modified/removed items
21. [ChangeReasonReadOnly](#changereasonreadonly) - Read-only change reason display
22. [computeArrayDiff](#computearraydiff) - Utility for computing array differences

---

## Status Workflow Overview

Records can have the following statuses:

| Status             | Theme  | Description                                            |
| ------------------ | ------ | ------------------------------------------------------ |
| `ACTIVE`           | Green  | Normal active record                                   |
| `INACTIVE`         | Gray   | Deactivated record (soft delete)                       |
| `FOR_APPROVAL`     | Yellow | Record has pending field changes awaiting admin review |
| `FOR_DELETION`     | Red    | Record is marked for permanent deletion                |
| `FOR_DEACTIVATION` | Orange | Record is marked to be deactivated (soft delete)       |
| `NEW_RECORD`       | Blue   | Newly created record pending approval                  |
| `DRAFT`            | Purple | Draft record not yet submitted                         |

### Approval Decision Flow

```
User makes changes → Status = FOR_APPROVAL
                   → forApprovalVersion = { ...pending changes }

Admin reviews:
  → Approve: Apply forApprovalVersion, clear it, status = ACTIVE
  → Deny: Clear forApprovalVersion, status = ACTIVE (revert to original)
```

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

# Form Components

These components are used in create/edit forms for standardized form layouts, action buttons, and sub-record tables.

---

## FormActionButtons

**Purpose**: Standardized Save/Cancel/Delete/Reactivate buttons with status-aware visibility.

### Import

```typescript
import { FormActionButtons } from '@components-web';
```

### Props

```typescript
interface FormActionButtonsProps {
    /** Mode: create or edit */
    mode: 'create' | 'edit';
    /** Current record status */
    status: StatusEnum;
    /** Whether current user is admin */
    isAdminUser: boolean;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Whether user can edit this record */
    canEdit?: boolean;
    /** Save handler */
    onSave: () => void;
    /** Cancel handler */
    onCancel: () => void;
    /** Delete handler (optional) */
    onDelete?: () => void;
    /** Reactivate handler (optional, admin only for INACTIVE) */
    onReactivate?: () => void;
    /** Custom save button text */
    saveText?: string;
    /** Custom cancel button text */
    cancelText?: string;
}
```

### Usage

```tsx
// Create mode
<FormActionButtons
    mode="create"
    status={StatusEnum.DRAFT}
    isAdminUser={false}
    isLoading={isSubmitting}
    onSave={handleSubmit}
    onCancel={handleCancel}
/>

// Edit mode with delete/reactivate
<FormActionButtons
    mode="edit"
    status={record.status}
    isAdminUser={isAdminUser}
    isLoading={isSubmitting}
    canEdit={canEdit}
    onSave={handleSubmit}
    onCancel={handleCancel}
    onDelete={handleDelete}
    onReactivate={handleReactivate}
/>
```

### Button Visibility Rules

| Button     | Condition                                            |
| ---------- | ---------------------------------------------------- |
| Save       | Always visible when `canEdit=true`                   |
| Cancel     | Always visible                                       |
| Delete     | Edit mode + ACTIVE status + `onDelete` provided      |
| Reactivate | Edit mode + INACTIVE status + admin + `onReactivate` |

### Notes

-   Uses consistent blue color scheme for primary actions
-   Delete button is red with confirmation styling
-   Reactivate shown only for INACTIVE records by admin users

---

## FormSectionCard

**Purpose**: Blue-themed section container with icon for grouping form fields.

### Import

```typescript
import { FormSectionCard } from '@components-web';
```

### Props

```typescript
type IconType =
    | 'document'
    | 'card'
    | 'currency'
    | 'user'
    | 'tag'
    | 'box'
    | 'calendar'
    | 'location'
    | 'phone'
    | 'email'
    | 'settings'
    | 'list'
    | 'chart'
    | 'custom';

interface FormSectionCardProps {
    /** Section title */
    title: string;
    /** Icon type or custom icon */
    icon?: IconType | React.ReactNode;
    /** Optional description */
    description?: string;
    /** Form fields content */
    children: React.ReactNode;
    /** Whether section is highlighted (for important sections) */
    highlighted?: boolean;
    /** Optional className for customization */
    className?: string;
}
```

### Usage

```tsx
// Basic section
<FormSectionCard title="Product Information" icon="document">
    <div className="grid grid-cols-2 gap-4">
        <Input label="Name" {...register('name')} />
        <Input label="Code" {...register('code')} />
    </div>
</FormSectionCard>

// Section with description
<FormSectionCard
    title="Pricing Details"
    icon="currency"
    description="Configure base pricing and unit costs"
>
    {/* form fields */}
</FormSectionCard>

// Custom icon
<FormSectionCard title="Custom Section" icon={<MyCustomIcon />}>
    {/* form fields */}
</FormSectionCard>
```

### Available Icons

| Icon       | Use Case                        |
| ---------- | ------------------------------- |
| `document` | General information, details    |
| `card`     | Identity, IDs, cards            |
| `currency` | Pricing, costs, money           |
| `user`     | Contact, person info            |
| `tag`      | Categories, tags, labels        |
| `box`      | Inventory, packages, products   |
| `calendar` | Dates, scheduling               |
| `location` | Addresses, geography            |
| `phone`    | Phone numbers, communication    |
| `email`    | Email addresses                 |
| `settings` | Configuration, options          |
| `list`     | Lists, items, collections       |
| `chart`    | Analytics, reporting            |
| `custom`   | Pass your own icon as ReactNode |

### Notes

-   Blue gradient header with rounded corners
-   Content area has white background with padding
-   Use consistent icon choices across similar sections

---

## ValidationErrors

**Purpose**: Red-themed error banner displaying validation errors.

### Import

```typescript
import { ValidationErrors } from '@components-web';
```

### Props

```typescript
interface ValidationErrorsProps {
    /** Array of error messages */
    errors: string[];
    /** Dismiss handler (optional) */
    onDismiss?: () => void;
    /** Custom title (default: "Please fix the following errors:") */
    title?: string;
}
```

### Usage

```tsx
// Basic usage
{
    errors.length > 0 && <ValidationErrors errors={errors} />;
}

// With dismiss
{
    errors.length > 0 && <ValidationErrors errors={errors} onDismiss={() => setErrors([])} title="Validation Failed" />;
}
```

### Notes

-   Shows at top of form, before form content
-   Red background with error icon
-   Bulleted list of errors
-   Optional X button to dismiss

---

## EditFormTabs

**Purpose**: Tab navigation for edit forms with Details/Approval/Logs tabs.

### Import

```typescript
import { EditFormTabs } from '@components-web';
```

### Props

```typescript
type TabType = 'details' | 'approval' | 'logs';

interface EditFormTabsProps {
    /** Currently active tab */
    activeTab: TabType;
    /** Tab change handler */
    onTabChange: (tab: TabType) => void;
    /** Current record status */
    status: StatusEnum;
    /** Whether in create mode (hides tabs) */
    isCreateMode?: boolean;
    /** Whether to show approval tab */
    showApprovalTab?: boolean;
    /** Whether to show logs tab */
    showLogsTab?: boolean;
}
```

### Usage

```tsx
const [activeTab, setActiveTab] = useState<TabType>('details');
const showApprovalTab =
    isAdminUser &&
    [StatusEnum.FOR_APPROVAL, StatusEnum.FOR_DELETION, StatusEnum.FOR_DEACTIVATION].includes(record.status);

<EditFormTabs
    activeTab={activeTab}
    onTabChange={setActiveTab}
    status={record.status}
    isCreateMode={mode === 'create'}
    showApprovalTab={showApprovalTab}
    showLogsTab={true}
/>;

{
    /* Tab content */
}
{
    activeTab === 'details' && <DetailsContent />;
}
{
    activeTab === 'approval' && <ApprovalContent />;
}
{
    activeTab === 'logs' && <LogsContent />;
}
```

### Tab Visibility

| Tab      | When Visible                                                       |
| -------- | ------------------------------------------------------------------ |
| Details  | Always                                                             |
| Approval | `showApprovalTab=true` AND status is FOR_APPROVAL/DELETION/DEACTIV |
| Logs     | `showLogsTab=true` (edit mode only)                                |

### Notes

-   Tabs hidden in create mode
-   Approval tab shows badge when pending changes exist
-   Uses consistent blue underline for active tab

---

## InnerRecordTable

**Purpose**: Table for managing sub-records within a form (deals, unit prices, etc.).

### Import

```typescript
import { InnerRecordTable } from '@components-web';
```

### Props

```typescript
interface ColumnDef<T> {
    /** Column header */
    header: string;
    /** Accessor key or render function */
    accessor: keyof T | ((item: T) => React.ReactNode);
    /** Column width class */
    width?: string;
}

interface InnerRecordTableProps<T> {
    /** Table title */
    title: string;
    /** Icon type */
    icon?: IconType;
    /** Array of items */
    items: T[];
    /** Column definitions */
    columns: ColumnDef<T>[];
    /** Key extractor function */
    getKey: (item: T, index: number) => string | number;
    /** Add item handler */
    onAdd?: () => void;
    /** Remove item handler */
    onRemove?: (item: T, index: number) => void;
    /** Edit item handler */
    onEdit?: (item: T, index: number) => void;
    /** Whether editing is disabled */
    disabled?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Add button text */
    addButtonText?: string;
}
```

### Usage

```tsx
// Product Deals table
<InnerRecordTable
    title="Product Deals"
    icon="tag"
    items={productDeals}
    columns={[
        { header: 'Code', accessor: 'dealCode', width: 'w-32' },
        { header: 'Deal Price', accessor: (d) => formatCurrency(d.dealPrice) },
        { header: 'Start Date', accessor: (d) => formatDate(d.startDate), width: 'w-36' },
        { header: 'End Date', accessor: (d) => formatDate(d.endDate), width: 'w-36' },
    ]}
    getKey={(deal, i) => deal.id || i}
    onAdd={() => setShowDealModal(true)}
    onRemove={(deal, i) => handleRemoveDeal(i)}
    disabled={!canEdit}
    emptyMessage="No deals configured"
    addButtonText="Add Deal"
/>

// Unit Prices table
<InnerRecordTable
    title="Unit Prices"
    icon="currency"
    items={unitPrices}
    columns={[
        { header: 'Unit', accessor: 'unitId' },
        { header: 'Price', accessor: (p) => formatCurrency(p.price) },
        { header: 'Cost', accessor: (p) => formatCurrency(p.cost) },
    ]}
    getKey={(price, i) => price.unitId || i}
    onAdd={handleAddUnitPrice}
    onRemove={handleRemoveUnitPrice}
    onEdit={handleEditUnitPrice}
    disabled={!canEdit}
/>
```

### Features

-   Blue header with icon and title
-   Add button in header (when onAdd provided)
-   Remove button per row (when onRemove provided)
-   Edit button per row (when onEdit provided)
-   Empty state when no items
-   Responsive scrolling for many columns

### Notes

-   Use with modal dialogs for add/edit operations
-   `getKey` required for React key prop
-   Actions disabled when `disabled=true`

---

# Approval Components

These components are used in edit forms when Admin/Super Admin users review pending changes. They provide standardized UI for approval workflows including field comparisons, array diffs, and action buttons.

---

## ApprovalActionButtons

**Purpose**: Standardized Approve/Deny/Cancel buttons with variant-specific styling.

### Import

```typescript
import { ApprovalActionButtons } from '@components-web';
```

### Props

```typescript
interface ApprovalActionButtonsProps {
    /** Type of approval: changes, deletion, or deactivation */
    variant: 'changes' | 'deletion' | 'deactivation';
    /** Handler for approve action */
    onApprove: () => void;
    /** Handler for deny action */
    onDeny: () => void;
    /** Handler for cancel action (optional) */
    onCancel?: () => void;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
}
```

### Usage

```tsx
// For field changes (FOR_APPROVAL)
<ApprovalActionButtons
    variant="changes"
    isAdminUser={isAdminUser}
    isLoading={isLoading}
    onApprove={handleApprove}
    onDeny={handleDeny}
    onCancel={handleCancel}
/>

// For deletion (FOR_DELETION)
<ApprovalActionButtons
    variant="deletion"
    isAdminUser={isAdminUser}
    isLoading={isLoading}
    onApprove={handleApprove}
    onDeny={handleDeny}
/>
```

### Variant Behavior

| Variant        | Approve Text           | Approve Color | Deny Text           |
| -------------- | ---------------------- | ------------- | ------------------- |
| `changes`      | "Approve Changes"      | Green         | "Deny Changes"      |
| `deletion`     | "Approve Deletion"     | Red           | "Deny Deletion"     |
| `deactivation` | "Approve Deactivation" | Orange        | "Deny Deactivation" |

### Notes

-   Only renders action buttons for Admin users
-   Non-admin users see "Awaiting admin approval" message
-   Cancel button only appears when `onCancel` is provided

---

## DeletionApprovalCard

**Purpose**: Display a prominent red-themed card when a record is marked for deletion.

### Import

```typescript
import { DeletionApprovalCard } from '@components-web';
```

### Props

```typescript
interface DeletionApprovalCardProps {
    /** The reason provided for deletion */
    reason?: string | null;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Handler for approve action */
    onApprove: () => void;
    /** Handler for deny action */
    onDeny: () => void;
    /** Handler for cancel action (optional) */
    onCancel?: () => void;
    /** Optional title override */
    title?: string;
    /** Optional description override */
    description?: string;
}
```

### Usage

```tsx
// In edit form when status is FOR_DELETION
if (record.status === StatusEnum.FOR_DELETION) {
    return (
        <DeletionApprovalCard
            reason={record.deletionReason}
            isAdminUser={isAdminUser}
            isLoading={isLoading}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onCancel={handleCancel}
        />
    );
}
```

### Visual Design

-   Red border and background (`border-red-300 bg-red-50`)
-   Trash icon in red circle
-   Deletion reason displayed in white box with border
-   Uses `ApprovalActionButtons` internally with `variant="deletion"`

---

## DeactivationApprovalCard

**Purpose**: Display a prominent orange-themed card when a record is marked for deactivation.

### Import

```typescript
import { DeactivationApprovalCard } from '@components-web';
```

### Props

```typescript
interface DeactivationApprovalCardProps {
    /** The reason provided for deactivation */
    reason?: string | null;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Loading state for buttons */
    isLoading?: boolean;
    /** Handler for approve action */
    onApprove: () => void;
    /** Handler for deny action */
    onDeny: () => void;
    /** Handler for cancel action (optional) */
    onCancel?: () => void;
    /** Optional title override */
    title?: string;
    /** Optional description override */
    description?: string;
}
```

### Usage

```tsx
// In edit form when status is FOR_DEACTIVATION
if (record.status === StatusEnum.FOR_DEACTIVATION) {
    return (
        <DeactivationApprovalCard
            reason={record.deletionReason}
            isAdminUser={isAdminUser}
            isLoading={isLoading}
            onApprove={handleApprove}
            onDeny={handleDeny}
        />
    );
}
```

### Visual Design

-   Orange border and background (`border-orange-300 bg-orange-50`)
-   Ban/circle-slash icon in orange circle
-   Uses `ApprovalActionButtons` internally with `variant="deactivation"`

---

## ChangeSummaryCard

**Purpose**: Summary banner at the top showing status, change counts, and reason.

### Import

```typescript
import { ChangeSummaryCard } from '@components-web';
```

### Props

```typescript
interface ArrayChangeSummary {
    name: string; // e.g., "Product Deals"
    added: number;
    modified: number;
    removed: number;
}

interface ChangeSummaryCardProps {
    /** Current status of the record */
    status: 'FOR_APPROVAL' | 'FOR_DELETION' | 'FOR_DEACTIVATION';
    /** Number of simple fields that changed */
    fieldChanges: number;
    /** Summary of array/sub-record changes */
    arrayChanges?: ArrayChangeSummary[];
    /** The reason provided for the change */
    changeReason?: string | null;
    /** Whether the current user is an admin */
    isAdminUser: boolean;
    /** Name of the record being reviewed */
    recordName?: string;
}
```

### Usage

```tsx
<ChangeSummaryCard
    status="FOR_APPROVAL"
    fieldChanges={5}
    arrayChanges={[
        { name: 'Product Deals', added: 1, modified: 2, removed: 0 },
        { name: 'Unit Prices', added: 0, modified: 1, removed: 1 },
    ]}
    changeReason={record.forApprovalVersion?.changeReason}
    isAdminUser={isAdminUser}
    recordName="Product"
/>
```

### Visual Elements

1. **Status Icon** - Color-coded (yellow/red/orange) with appropriate icon
2. **Title & Description** - Changes based on status and user role
3. **Quick Stats Badges** - Shows "5 fields modified", "+2 items added", etc.
4. **Change Reason** - Displayed in white card if provided
5. **Section Breakdown** - For multiple arrays, shows per-section counts

---

## FieldDiffRow

**Purpose**: Display side-by-side comparison of current vs proposed field value.

### Import

```typescript
import { FieldDiffRow, FieldDiffHeader, FieldDiffContainer } from '@components-web';
```

### Props

```typescript
interface FieldDiffRowProps {
    /** Label for the field */
    label: string;
    /** Current/original value */
    currentValue: string | number | boolean | null | undefined;
    /** Proposed new value */
    proposedValue: string | number | boolean | null | undefined;
    /** Whether the field has changed */
    isChanged: boolean;
    /** Optional formatter for display values */
    formatter?: (value: unknown) => string;
    /** Hide unchanged fields */
    hideUnchanged?: boolean;
    /** Optional icon to display before label */
    icon?: React.ReactNode;
}
```

### Usage

```tsx
import { FieldDiffContainer, FieldDiffRow } from '@components-web';

<FieldDiffContainer title="Basic Information">
    <FieldDiffRow
        label="Product Name"
        currentValue={record.name}
        proposedValue={record.forApprovalVersion?.name}
        isChanged={isFieldChanged('name')}
    />
    <FieldDiffRow
        label="Price"
        currentValue={record.price}
        proposedValue={record.forApprovalVersion?.price}
        isChanged={isFieldChanged('price')}
        formatter={(v) => `$${Number(v).toFixed(2)}`}
    />
    <FieldDiffRow
        label="Active"
        currentValue={record.isActive}
        proposedValue={record.forApprovalVersion?.isActive}
        isChanged={isFieldChanged('isActive')}
        // Boolean automatically formatted as "Yes" / "No"
    />
</FieldDiffContainer>;
```

### Visual Design

-   **Changed fields**: Yellow background, "Modified" badge, strikethrough on current value
-   **Unchanged fields**: White background, no badge
-   **Grid layout**: Field | Current Value | Proposed Value
-   **Responsive**: Stacks on mobile with labels

---

## ArrayDiffTable

**Purpose**: Display a table showing differences in sub-records (arrays).

### Import

```typescript
import { ArrayDiffTable, computeArrayDiff } from '@components-web';
```

### Props

```typescript
interface ArrayDiffColumn<T> {
    key: keyof T;
    label: string;
    formatter?: (value: unknown) => string;
    render?: (item: T, diffItem: ArrayDiffItem<T>) => React.ReactNode;
    widthClass?: string;
}

interface ArrayDiffTableProps<T> {
    /** Title for the table section */
    title?: string;
    /** Description text below title */
    description?: string;
    /** The computed diff result from computeArrayDiff */
    diffResult: ArrayDiffResult<T>;
    /** Column definitions */
    columns: ArrayDiffColumn<T>[];
    /** Function to get unique key from item */
    getKey: (item: T) => string | number;
    /** Optional icon for the section */
    icon?: React.ReactNode;
    /** Show only changed items (hide unchanged) */
    showChangesOnly?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Whether to show the summary badges */
    showSummary?: boolean;
}
```

### Usage

```tsx
import { ArrayDiffTable, computeArrayDiff } from '@components-web';

// First, compute the diff
const dealsDiff = useMemo(
    () => computeArrayDiff(record.deals, record.forApprovalVersion?.deals, { getKey: (deal) => deal.id }),
    [record]
);

// Then render the table
<ArrayDiffTable
    title="Product Deals"
    diffResult={dealsDiff}
    columns={[
        { key: 'dealName', label: 'Deal Name' },
        { key: 'discount', label: 'Discount', formatter: (v) => `${v}%` },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
    ]}
    getKey={(deal) => deal.id}
    showChangesOnly={false}
/>;
```

### Row Status Visual Design

| Status    | Background  | Text Style                 | Badge             |
| --------- | ----------- | -------------------------- | ----------------- |
| Added     | Green tint  | Normal                     | Green "+Added"    |
| Modified  | Yellow tint | Changed fields highlighted | Yellow "Modified" |
| Removed   | Red tint    | Strikethrough              | Red "-Removed"    |
| Unchanged | White       | Normal                     | Gray "Unchanged"  |

### Summary Badges

When `showSummary={true}`, displays badges like:

-   `+2 Added` (green)
-   `3 Modified` (yellow)
-   `-1 Removed` (red)

---

## ChangeReasonReadOnly

**Purpose**: Read-only display for change/deletion/deactivation reasons.

### Import

```typescript
import { ChangeReasonReadOnly } from '@components-web';
```

### Props

```typescript
interface ChangeReasonReadOnlyProps {
    /** The reason text to display */
    reason?: string | null;
    /** Label for the field */
    label?: string;
    /** Optional icon */
    icon?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}
```

### Usage

```tsx
<ChangeReasonReadOnly reason={record.forApprovalVersion?.changeReason} label="Change Reason" />
```

### Notes

-   Returns `null` if reason is empty/null
-   Gray-themed to match read-only form fields
-   Preserves whitespace in reason text

---

## computeArrayDiff

**Purpose**: Utility function to compute differences between original and proposed arrays.

### Import

```typescript
import { computeArrayDiff, ArrayDiffResult, ArrayDiffItem } from '@components-web';
```

### Function Signature

```typescript
function computeArrayDiff<T extends Record<string, unknown>>(
    originalArray: T[] | null | undefined,
    proposedArray: T[] | null | undefined,
    options: ComputeArrayDiffOptions<T>
): ArrayDiffResult<T>;

interface ComputeArrayDiffOptions<T> {
    /** Function to get unique identifier from item */
    getKey: (item: T) => string | number;
    /** Fields to exclude from comparison */
    excludeFields?: string[];
    /** Custom comparison function for specific fields */
    fieldComparators?: Record<string, (a: unknown, b: unknown) => boolean>;
}

interface ArrayDiffResult<T> {
    items: ArrayDiffItem<T>[];
    summary: {
        added: number;
        modified: number;
        removed: number;
        unchanged: number;
        total: number;
    };
    hasChanges: boolean;
}

interface ArrayDiffItem<T> {
    item: T;
    originalItem?: T; // Only for modified items
    status: 'added' | 'modified' | 'removed' | 'unchanged';
    changedFields?: string[]; // Only for modified items
}
```

### Usage

```typescript
import { computeArrayDiff } from '@components-web';

const diffResult = computeArrayDiff(
    originalDeals, // Original array
    proposedDeals, // Proposed array from forApprovalVersion
    {
        getKey: (deal) => deal.id,
        excludeFields: ['createdAt', 'updatedAt'], // Optional
    }
);

// Access results
console.log(diffResult.hasChanges); // true/false
console.log(diffResult.summary.added); // 2
console.log(diffResult.summary.modified); // 1
console.log(diffResult.summary.removed); // 0

// Iterate items
diffResult.items.forEach(({ item, status, changedFields }) => {
    if (status === 'modified') {
        console.log(`${item.name} changed fields:`, changedFields);
    }
});
```

### Default Excluded Fields

```typescript
const DEFAULT_ARRAY_DIFF_EXCLUDE_FIELDS = [
    'id',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'version',
    'forApprovalVersion',
    'status',
    'pk',
    'sk',
    'gsi1pk',
    'gsi1sk',
    'gsi2pk',
    'gsi2sk',
];
```

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

### Pattern 5: Edit Form Layout

```typescript
// Standard edit form structure
import { FormActionButtons, FormSectionCard, ValidationErrors, EditFormTabs, InnerRecordTable } from '@components-web';

function ModuleForm({ mode, record }) {
    const [activeTab, setActiveTab] = useState('details');
    const [errors, setErrors] = useState([]);

    const showApprovalTab =
        isAdminUser &&
        [StatusEnum.FOR_APPROVAL, StatusEnum.FOR_DELETION, StatusEnum.FOR_DEACTIVATION].includes(record?.status);

    return (
        <div className="space-y-6">
            {/* Action buttons at top */}
            <FormActionButtons
                mode={mode}
                status={record?.status}
                isAdminUser={isAdminUser}
                onSave={handleSubmit}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onReactivate={handleReactivate}
            />

            {/* Validation errors */}
            {errors.length > 0 && <ValidationErrors errors={errors} onDismiss={() => setErrors([])} />}

            {/* Tab navigation (edit mode only) */}
            <EditFormTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                status={record?.status}
                isCreateMode={mode === 'create'}
                showApprovalTab={showApprovalTab}
                showLogsTab={true}
            />

            {/* Tab content */}
            {activeTab === 'details' && (
                <>
                    <FormSectionCard title="Basic Information" icon="document">
                        {/* form fields */}
                    </FormSectionCard>

                    <FormSectionCard title="Pricing" icon="currency">
                        {/* pricing fields */}
                    </FormSectionCard>

                    <InnerRecordTable
                        title="Sub Items"
                        items={subItems}
                        columns={columns}
                        getKey={(item, i) => item.id || i}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                    />
                </>
            )}

            {activeTab === 'approval' && <ApprovalContent />}
            {activeTab === 'logs' && <LogsContent />}
        </div>
    );
}
```

### Pattern 6: Form Sections with Icons

```typescript
// Consistent icon usage across form sections
<FormSectionCard title="Product Information" icon="document">
    {/* Basic info fields */}
</FormSectionCard>

<FormSectionCard title="Pricing Details" icon="currency">
    {/* Price, cost fields */}
</FormSectionCard>

<FormSectionCard title="Contact Information" icon="user">
    {/* Contact name, phone, email */}
</FormSectionCard>

<FormSectionCard title="Address" icon="location">
    {/* Address fields */}
</FormSectionCard>

<FormSectionCard title="Inventory Settings" icon="box">
    {/* Stock, warehouse fields */}
</FormSectionCard>
```

### Pattern 7: Complete Approval Tab Implementation

```tsx
// Full approval workflow with form + approval components together
import {
    // Form Components
    FormActionButtons,
    FormSectionCard,
    ValidationErrors,
    EditFormTabs,
    InnerRecordTable,
    // Approval Components
    ChangeSummaryCard,
    DeletionApprovalCard,
    DeactivationApprovalCard,
    FieldDiffContainer,
    FieldDiffRow,
    ArrayDiffTable,
    ApprovalActionButtons,
    computeArrayDiff,
} from '@components-web';

function ModuleForm({ mode, record, isAdminUser, onApprove, onDeny }) {
    const [activeTab, setActiveTab] = useState('details');

    // Determine approval visibility
    const isForApproval = record.status === StatusEnum.FOR_APPROVAL;
    const isForDeletion = record.status === StatusEnum.FOR_DELETION;
    const isForDeactivation = record.status === StatusEnum.FOR_DEACTIVATION;
    const showApprovalTab = isAdminUser && (isForApproval || isForDeletion || isForDeactivation);

    // Compute array diffs for approval review
    const dealsDiff = useMemo(
        () =>
            isForApproval
                ? computeArrayDiff(record.deals, record.forApprovalVersion?.deals, {
                      getKey: (d) => d.id,
                  })
                : { items: [], summary: { added: 0, modified: 0, removed: 0, unchanged: 0, total: 0 }, hasChanges: false },
        [record, isForApproval]
    );

    // Count field changes
    const fieldChanges = useMemo(() => {
        if (!isForApproval) return 0;
        const fields = ['name', 'price', 'category', 'description'];
        return fields.filter((f) =>
            record[f] !== record.forApprovalVersion?.[f]
        ).length;
    }, [record, isForApproval]);

    return (
        <div className="space-y-6">
            {/* Standard form action buttons */}
            <FormActionButtons
                mode={mode}
                status={record.status}
                isAdminUser={isAdminUser}
                onSave={handleSubmit}
                onCancel={handleCancel}
            />

            {/* Tab navigation */}
            <EditFormTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                status={record.status}
                isCreateMode={mode === 'create'}
                showApprovalTab={showApprovalTab}
                showLogsTab={true}
            />

            {/* Details Tab - Normal form fields */}
            {activeTab === 'details' && (
                <>
                    <FormSectionCard title="Basic Information" icon="document">
                        {/* form fields */}
                    </FormSectionCard>
                    <InnerRecordTable title="Deals" items={record.deals} ... />
                </>
            )}

            {/* Approval Tab - Approval workflow components */}
            {activeTab === 'approval' && (
                <>
                    {/* FOR_DELETION: Show deletion card */}
                    {isForDeletion && (
                        <DeletionApprovalCard
                            reason={record.deletionReason}
                            isAdminUser={isAdminUser}
                            onApprove={onApprove}
                            onDeny={onDeny}
                        />
                    )}

                    {/* FOR_DEACTIVATION: Show deactivation card */}
                    {isForDeactivation && (
                        <DeactivationApprovalCard
                            reason={record.deletionReason}
                            isAdminUser={isAdminUser}
                            onApprove={onApprove}
                            onDeny={onDeny}
                        />
                    )}

                    {/* FOR_APPROVAL: Show field/array diffs */}
                    {isForApproval && (
                        <>
                            {/* Summary Card */}
                            <ChangeSummaryCard
                                status="FOR_APPROVAL"
                                fieldChanges={fieldChanges}
                                arrayChanges={[{ name: 'Deals', ...dealsDiff.summary }]}
                                changeReason={record.forApprovalVersion?.changeReason}
                                isAdminUser={isAdminUser}
                                recordName="Product"
                            />

                            {/* Field-by-field comparison */}
                            <FieldDiffContainer title="Basic Information">
                                <FieldDiffRow
                                    label="Name"
                                    currentValue={record.name}
                                    proposedValue={record.forApprovalVersion?.name}
                                    isChanged={record.name !== record.forApprovalVersion?.name}
                                />
                                <FieldDiffRow
                                    label="Price"
                                    currentValue={record.price}
                                    proposedValue={record.forApprovalVersion?.price}
                                    isChanged={record.price !== record.forApprovalVersion?.price}
                                    formatter={(v) => `$${Number(v).toFixed(2)}`}
                                />
                            </FieldDiffContainer>

                            {/* Array diff table */}
                            <ArrayDiffTable
                                title="Product Deals"
                                diffResult={dealsDiff}
                                columns={[
                                    { key: 'dealName', label: 'Deal Name' },
                                    { key: 'discount', label: 'Discount', formatter: (v) => `${v}%` },
                                ]}
                                getKey={(d) => d.id}
                            />

                            {/* Approval action buttons */}
                            <ApprovalActionButtons
                                variant="changes"
                                isAdminUser={isAdminUser}
                                onApprove={onApprove}
                                onDeny={onDeny}
                            />
                        </>
                    )}
                </>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && <ActivityLogs recordId={record.id} />}
        </div>
    );
}
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

**page.tsx (Table List)**:

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

**[Module]Form.tsx (Create/Edit)**:

```typescript
✅ import {
    FormActionButtons,
    FormSectionCard,
    ValidationErrors,
    EditFormTabs,
    InnerRecordTable,
} from '@components-web';
✅ import { StatusEnum } from '@data-access/index';
```

**[Module]Form.tsx (Approval Tab - Admin)**:

```typescript
✅ import {
    ApprovalActionButtons,
    ChangeSummaryCard,
    FieldDiffRow,
    ArrayDiffTable,
    DeletionApprovalCard,
    DeactivationApprovalCard,
    ChangeReasonReadOnly,
    computeArrayDiff,
} from '@components-web';
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
// Table List Components
export { default as StatusBadge } from './StatusBadge';
export { default as StatusFilterDropdown } from './StatusFilterDropdown';
export { default as RefreshButton } from './RefreshButton';
export { default as PageSizeSelector } from './PageSizeSelector';
export { default as TableSkeleton } from './TableSkeleton';
export { default as EmptyTableState } from './EmptyTableState';
export { default as PaginationButtons } from './PaginationButtons';

// Form Components
export * from './form-components';

// Approval Components
export * from './approval';
```

---

## 📚 Related Documentation

-   [FEATURE_TABLE_LIST.md](./features/FEATURE_TABLE_LIST.md) - Complete table list implementation guide
