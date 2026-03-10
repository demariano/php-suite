---
description: 'Use when creating or modifying Next.js pages, React components, API clients, Zustand stores, or frontend hooks in the web app. Covers CRUD page pattern, form conventions, state management, and UI component usage.'
applyTo: 'apps/web-app/**,libs/frontend/**'
---

# Frontend Conventions

## CRUD Page Pattern (every entity follows this)

### List Page (`page.tsx`)

Required state: `isLoading`, `searchQuery`, `statusFilter`, `items[]`, `nextCursor`, `prevCursor`, `pageSize`

4-branch fetch logic:

1. Status + search → `api.getByStatus(limit, status, dir, cursor, name)`
2. Search only → `api.getByName(name, limit, dir, cursor)`
3. Status only → `api.getByStatus(limit, status, dir, cursor)`
4. No filter → `api.getAll(limit, dir, cursor)`

-   Debounce search input with 500ms `setTimeout`
-   Reset cursors on any filter/search change
-   Compose: `<EntityHeader>` + `<EntityTable>` + `<PageSizeSelector>` + `<PaginationButtons>`

### Create Page (`create/page.tsx`)

-   Breadcrumbs + `<EntityForm isCreateMode={true} selectedEntity={null} />`
-   On save: `api.create(dto, userRole)` → flash notification → `router.push` to list

### Edit Page (`[id]/edit/page.tsx`)

-   Load entity by ID on mount: `api.getById(params.id)`
-   Two tabs: Information + Activity Logs (tab colors vary by status)
-   Actions by status:
    -   `ACTIVE`: Save + Delete + Cancel
    -   `INACTIVE`: Reactivate + Cancel
    -   `FOR_APPROVAL`/`NEW_RECORD`: Approve (admin) + Deny (admin) + Cancel
    -   `FOR_DELETION`/`FOR_DEACTIVATION`: Approve deletion (admin) + Deny (admin) + Cancel

## Entity Form Pattern (`EntityForm.tsx`)

-   Controlled state: `formData` object for text fields, `selected*` objects for relational entities
-   Array state for sub-tables (e.g., `invoiceDetails[]`, `customerTerms[]`)
-   Selection modals: `<SelectionField>` triggers `*SearchableSelectionModal` on click
-   Inline validation on submit (required fields, changeReason for non-admin)
-   Approval diff view (admin only): `renderFieldWithInlineDiff(label, field, current, pending)`
-   Sub-table diffs: rows marked as added (green), modified (blue), removed (red/strikethrough)

## Entity Table Pattern (`EntityTable.tsx`)

-   Desktop: `<table>` with blue header row
-   Mobile: responsive card layout
-   Use `<StatusBadge>`, `<TableSkeleton>`, `<EmptyTableState>` from `@components-web`
-   Row click: `router.push('/module/entity/${id}/edit')`

## Entity Header Pattern (`EntityHeader.tsx`)

-   Search `<Input>` + `<StatusFilterDropdown>` + `<RefreshButton>` + Create `<Button>` (role-gated)

## API Client Pattern

```typescript
class EntityApi extends AxiosConfig {
  constructor() {
    super('API_DOMAIN_URL', true, false);
    //     ^env var key    ^auth  ^no 401 redirect
  }
  getAll(limit, direction?, cursor?) { ... }
  getById(id) { ... }
  create(dto, userRole?) { ... }
  update(id, dto, userRole?) { ... }
  delete(id, userRole?) { ... }
  approve(id, userRole?) { ... }
  deny(id, approverMessage, userRole?) { ... }
}
export default new EntityApi();
```

Env vars (`API_*_URL`) resolved at runtime from `/api/env` → cached in sessionStorage.

## State Management

-   **`useLocalStore`** (localStorage): `authedUser` (userId, email, userRole), `websocketConnection`
-   **`useSessionStore`** (sessionStorage): `flashNotification` (title, message, alertType), `eventReference`, `tempLoginInfo`
-   Both use Zustand slices with `persist` + `devtools`

## Selection Modals

-   30 modals in `(authenticated-routes)/search-modals/`
-   All wrap `GenericSearchableSelectionModal<T>`: full-screen overlay → search → filtered table → row click returns selection
-   Use for all relational field pickers (customer, product, area, supplier, etc.)

## UI Components (from `@components-web`)

-   **Forms**: `Form` (react-hook-form + Yup), `Input`, `Button`, `Checkbox`, `DropdownMenu`, `Switch`, `DateRangePicker`
-   **Data display**: `Table`, `Pagination`, `Badge`, `StatusBadge`, `Toast`, `Tab`, `Accordion`, `Card`
-   **Navigation**: `Header`, `Sidebar`, `Breadcrumbs`
-   **Approval**: `ApprovalActionButtons`, `ChangeSummaryCard`, `FieldDiffRow`, `ArrayDiffTable`, `DeletionApprovalCard`
-   **Shared module**: `ConfirmationModal`, `DeleteConfirmationModal`, `DenyReasonDialog`, `ListHeader`, `StatusTabs`

## Styling

-   SCSS modules for `@components-web` design system controls
-   Tailwind utilities for page-level layout and spacing
-   Colors/fonts from `@ui-config`
