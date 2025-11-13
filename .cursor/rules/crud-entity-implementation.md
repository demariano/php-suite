# CRUD Entity Implementation Guide

## Overview

This document captures the complete implementation patterns from the customer module to guide implementation of similar CRUD operations for other entities. The patterns cover backend database services, API handlers, DTOs, frontend API calls, and UI/UX components.

**IMPORTANT: Mobile-First Approach**: All UI components MUST be mobile responsive following the patterns established in the Customer module. Every section in this document includes mobile responsiveness requirements. When implementing a new entity, use the Customer module (`apps/web-app/src/app/(authenticated-routes)/customers/customer/`) as the reference implementation for mobile patterns.

### How to Use This Guide

1. **Start with the workflow map (Table&nbsp;1)** to understand the order of execution from schema design to UI polish.  
2. **Complete each layer sequentially** (Sections 1 → 4 → 5), using the naming/table references to derive file paths and symbol names deterministically.  
3. **Consult Business Logic tables (Section 6)** whenever a rule depends on role, status, or approval state.  
4. **Run through the Implementation Checklist (Section 7)** and confirm every item by cross-checking the referenced section anchors.  
5. **Use Important Notes (Section 8)** as runtime assertions—if any note cannot be satisfied, pause and correct the earlier steps.

### Table 1. End-to-End Workflow Snapshot

| Stage | Section Reference | Primary Output | Required File/Folder Pattern |
| --- | --- | --- | --- |
| Schema & DB contract | §1.1–§1.4 | `{Entity}Schema`, DTO conversions | `libs/backend/dynamo-db-lib/src/lib/schema/{Entity}Schema.ts` |
| Database service API | §1.2–§1.8 | `{entity}-database-service.ts` with pagination/filter methods | `libs/backend/database-services/{entity}-database-service/` |
| CQRS command/query surface | §2.2–§2.3 | `create/update/delete/approve/deny` handlers + queries | `apps/{entity}/{entity}-api-service/src/app/{entity}/**/*` |
| Transport & DTOs | §3 | Shared DTOs + frontend types | `libs/dto/src/lib/{entity}/**/*`, `libs/frontend/data-access/src/types/{entity}.types.ts` |
| Frontend data access | §4 | `{Entity}MainApi` class | `libs/frontend/data-access/src/api/{entity}-main.api.ts` |
| UI composition | §5 | Page, form, modal, tab components | `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/**/*` |
| Business rules | §6 | Status + permission enforcement | Referenced inside handlers/forms |
| Final validation | §7 | Completed checklist | N/A (apply to repo state) |

### Naming & Placeholder Conventions

| Placeholder | Expected Transform | Example Input → Output |
| --- | --- | --- |
| `{Entity}` | PascalCase singular | `customer` → `Customer` |
| `{entity}` | camelCase singular | `customer` → `customer` |
| `{Entities}` | PascalCase plural | `customer` → `Customers` |
| `{entities}` | kebab-case plural folder segment | `customer` → `customers` |
| `{entityId}` | camelCase identifier | `customer` → `customerId` |
| `{Entity}Schema.ts` | PascalCase file | `customer` → `CustomerSchema.ts` |
| `{entity}-api-service` | kebab-case app name | `area` → `area-api-service` |
| Status enum values | Upper snake case with display text via `getStatusText()` | `FOR_APPROVAL` → `"For Approval"` |

Always derive new symbols using the transforms above; never invent additional casing rules. When generating files, ensure directory names match the plural kebab-case form (`{entities}`) and filenames consistently reuse the PascalCase or kebab-case variant listed here.

## 1. Database Services Layer

### 1.1 Schema Definition

- Location: `libs/backend/dynamo-db-lib/src/lib/schema/{Entity}Schema.ts`
- Pattern: Define schema with indexes (primary, GSI1-GSI6 as needed)
- Key fields:
  - PK: `{ENTITY_NAME}` (e.g., `CUSTOMER`)
  - SK: `${entityId}` (e.g., `${customerId}`)
  - status: enum with values `['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD', 'DRAFT']`
  - forApprovalVersion: Object type
  - changeReason: `{ type: String, required: false }` - Used for tracking reasons behind modifications for approval workflow
  - activityLogs: Array
  - GSI indexes for querying patterns

### 1.2 Database Service Implementation

- Location: `libs/backend/database-services/{entity}-database-service/src/lib/{entity}-database-service.ts`
- Abstract class pattern: Create abstract class defining all methods
- Key methods:
  - `createRecord(dto: CreateEntityDto): Promise<EntityDto>`
  - `updateRecord(dto: EntityDto): Promise<EntityDto>`
  - `findRecordById(id: string): Promise<EntityDto | null>`
  - `findRecordByName(name: string): Promise<EntityDto | null>` (for duplicate checking)
  - `findRecordContainingName(name: string): Promise<EntityDto[] | null>` (for non-paginated search - deprecated, use findRecordsByNamePagination instead)
  - `findRecordsByNamePagination(limit, direction, cursorPointer, name): Promise<PageDto<EntityDto>>` (for paginated search)
  - `findRecordsByPagination(limit, direction, cursorPointer): Promise<PageDto<EntityDto>>`
  - `findRecordsByStatusPagination(limit, status, direction, cursorPointer, name): Promise<PageDto<EntityDto>>`
  - `findEntityRecordsByFilterPagination(filter, limit, direction, cursorPointer): Promise<PageDto<EntityDto>>` (OPTIONAL - only for complex entities)
  - `findAllEntitiesBy{RelatedEntity}Id(id: string): Promise<EntityDto[]>` (for relationships, non-paginated)
  - `deleteRecord(dto: EntityDto): Promise<EntityDto>`
  - `deleteAllRecords(): Promise<void>`
  - `convertToDto(record): Promise<EntityDto>` - **CRITICAL**: Must map `changeReason` from database record. If TypeScript doesn't recognize `changeReason` on the record type, use type assertion: `changeReason: (record as EntityDataType & { changeReason?: string }).changeReason || undefined`
  - `convertToDtoList(records): Promise<EntityDto[]>`
  - `convertToDataType(dto): Promise<EntityDataType>` - **CRITICAL**: Must include `changeReason` in the data type: `changeReason: dto.changeReason`. This ensures the field is persisted to the database.

### 1.3 Create Method - Index Setup

When creating a record, set all GSI indexes:

```typescript
GSI1PK: `{ENTITY_NAME}`,
GSI1SK: dto.nameField, // Usually the name field for general queries
GSI2PK: `{ENTITY_NAME}#${dto.status}`, // For status-based queries
GSI2SK: dto.nameField,
// Additional GSIs for relationships (GSI3-GSI6) as needed
GSI3PK: `{ENTITY_NAME}#${dto.relatedEntityId}`,
GSI3SK: dto.nameField,
```

### 1.4 Update Method - Index Setup

When updating, ensure all indexes are updated in `updateRecord` method:

- Recalculate all GSI values based on current field values
- Maintain consistency with create method pattern
- **CRITICAL**: Explicitly set `changeReason` on the record before calling `update()`: `record.changeReason = dto.changeReason`. This ensures the field is persisted even if `convertToDataType` is called separately.

### 1.5 Delete Methods

- `deleteRecord`: Hard delete using `table.remove()`
- `deleteAllRecords`: Find all records via GSI1, then remove each

### 1.6 Find Methods - Pagination Support

- Use `createDynamoDbOptionWithPKSKIndex()` helper
- Use `pageRecordHandler()` for cursor management
- Return `PageDto<EntityDto>` with nextCursorPointer and prevCursorPointer

### 1.7 Find Methods - Duplicate Checking

- `findRecordByName`: Exact match using GSI1
- `findRecordContainingName`: Partial match using `contains()` where clause

### 1.8 Filter Functionality (OPTIONAL)

**IMPORTANT**: Not all entities require filter functionality. Only implement `findEntityRecordsByFilterPagination` and `{Entity}FilterDto` for:

- Complex entities with multiple filterable fields
- Entities that need advanced search capabilities

**DO NOT** implement filters for simple entities that only have:

- id field
- name field
- Basic status field

Examples of entities that DO need filters: Customer (has classification, type, area, town filters)

Examples that DON'T need filters: CustomerType, CustomerClassification (simple id/name entities)

## 2. Backend API Layer

### 2.1 Module Structure

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/{entity}.module.ts`
- Imports: CqrsModule, DynamoDbLibModule, ConfigurationLibModule, AuthGuardLibModule, MessageQueueLibModule, {Entity}DatabaseServiceModule
- Providers: All handlers (commands and queries), database service injection

### 2.2 Commands (CQRS Pattern)

#### 2.2.1 Create Command Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/command/create/`
- Files: `create.command.ts`, `create.handler.ts`
- Imports: `import { reduceArrayContents } from '@dynamo-db-lib'`
- Constant: `const ACTIVITY_LOGS_LIMIT = 10;`
- Logic:
  - Validate uniqueness (call `findRecordByName` for name-based duplicate check)
  - Check user permissions (`hasApprovalPermission`)
  - Set status based on permissions:
    - Admin/SuperAdmin: `ACTIVE` status, add activity log
    - Regular user: `NEW_RECORD` status, populate `forApprovalVersion` with all fields
  - **CRITICAL**: After adding activity log entries, limit to 10 entries using `reduceArrayContents(activityLogs, ACTIVITY_LOGS_LIMIT)`
  - Create record via database service

#### 2.2.2 Update Command Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/command/update/`
- Files: `update.command.ts`, `update.handler.ts`
- Imports:
  - `import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib'`
  - `import { reduceArrayContents } from '@dynamo-db-lib'`
- Constant: `const ACTIVITY_LOGS_LIMIT = 10;`
- Logic:
  - Find existing record
  - Check user permissions
  - If admin:
    - Apply changes directly, set to `ACTIVE`
    - Clear `changeReason` to `undefined` after applying changes
    - Add activity log entry
    - Limit activity logs to 10 entries using `reduceArrayContents(activityLogs, ACTIVITY_LOGS_LIMIT)`
  - If regular user:
    - Store changes in `forApprovalVersion`, keep original in main fields, set status to `FOR_APPROVAL`
    - Use `detectFieldChanges(existingRecord, command.dto)` to detect changes
    - Use `formatFieldChanges(changes)` to format changes
    - Combine user's `changeReason` with formatted changes:
      - If user provided `changeReason`: `${command.dto.changeReason}\n\n${formattedChanges}`
      - If no user reason: just `formattedChanges`
    - Store combined reason in `existingRecord.changeReason`
    - Build activity log message: `Date: {timestamp}, {Entity} updated by {username} for approval`
    - **CRITICAL**: Append formatted changes to activity log message: `activityLogMessage += \` - ${formattedChanges}\`` (only if formattedChanges exists)
    - Add activity log entry
    - Limit activity logs to 10 entries using `reduceArrayContents(activityLogs, ACTIVITY_LOGS_LIMIT)`
- **IMPORTANT**: Activity logs for non-admin updates MUST include field change details in the message

#### 2.2.3 Delete Command Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/command/delete/`
- Files: `delete.command.ts`, `delete.handler.ts`
- Logic:
  - Find existing record
  - Check user permissions
  - If admin: Set status to `FOR_DELETION`, call `deleteRecord()` immediately
  - If regular user: Set status to `FOR_DELETION`, add activity log, update record (not delete)
  - Activity log entry for deletion request

#### 2.2.4 Approve Command Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/command/approve-record/`
- Files: `approve.command.ts`, `approve.handler.ts`
- Logic:
  - Validate user has ADMIN or SUPER_ADMIN role
  - Check record exists
  - Handle different statuses:
    - `NEW_RECORD`: 
      1. Apply `forApprovalVersion` to main fields
      2. Set status to `ACTIVE`
      3. Clear `forApprovalVersion` (set to `{}`)
      4. **Reset `changeReason` to `null`** (NOT `undefined`) - MUST be after applying changes
      5. Add approval activity log
      6. Limit activity logs to 10 entries
      7. Update record in database
    - `FOR_APPROVAL`:
      1. Apply `forApprovalVersion` to main fields
      2. Set status to `ACTIVE`
      3. Clear `forApprovalVersion` (set to `{}`)
      4. **Reset `changeReason` to `null`** (NOT `undefined`) - MUST be after applying changes
      5. Add approval activity log
      6. Limit activity logs to 10 entries
      7. Update record in database
    - `FOR_DELETION`:
      1. **Reset `changeReason` to `null`** before deleting
      2. Call `deleteRecord()` to hard delete
- **IMPORTANT**: Always use `null` (not `undefined`) for `changeReason` reset to match Customer pattern

#### 2.2.5 Deny Command Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/command/deny-record/`
- Files: `deny.command.ts`, `deny.handler.ts`
- Logic:
  - Validate user has ADMIN or SUPER_ADMIN role
  - Check record exists
  - Handle different statuses:
    - `NEW_RECORD`: 
      1. **Reset `changeReason` to `null`** in `deleteRecord()` method before deleting
      2. Delete record (hard delete)
    - `FOR_APPROVAL`:
      1. Clear `forApprovalVersion` (set to `{}`)
      2. **Reset `changeReason` to `null`** (NOT `undefined`) - MUST be after clearing forApprovalVersion
      3. Revert status to `ACTIVE`
      4. Add denial activity log
      5. Limit activity logs to 10 entries
      6. Update record in database
    - `FOR_DELETION`:
      1. **Reset `changeReason` to `null`** before reverting status
      2. Revert status to `ACTIVE`
      3. Add denial activity log
      4. Limit activity logs to 10 entries
      5. Update record in database
- **IMPORTANT**: Always use `null` (not `undefined`) for `changeReason` reset to match Customer pattern

### 2.3 Queries (CQRS Pattern)

#### 2.3.1 Get By ID Query Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/queries/get.by.id/`
- Files: `get.{entity}.by.id.query.ts`, `get.{entity}.by.id.handler.ts`
- Simple query: Call `findRecordById()`

#### 2.3.2 Get By Name Query Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/queries/get.by.name/`
- Files: `get.{entity}.by.name.query.ts`, `get.{entity}.by.name.handler.ts`
- **IMPORTANT**: Must return `PageDto<EntityDto>` with pagination support (not a plain array)
- Query class: Accept pagination parameters (`limit`, `direction`, `cursorPointer`) in addition to name
- Handler: Call `findRecordsByNamePagination()` (not `findRecordContainingName()`) to get paginated results
- Return type: `ResponseDto<PageDto<EntityDto>>` - this ensures frontend receives `{ data, statusCode, nextCursorPointer, prevCursorPointer }` structure
- **Note**: All search modals and table pages expect paginated responses, so search endpoints must return `PageDto` to work correctly

#### 2.3.3 Get Records Pagination Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/queries/get.records.pagination/`
- Files: `get.records.pagination.query.ts`, `get.records.pagination.handler.ts`
- Call `findRecordsByPagination()`

#### 2.3.4 Get Records By Status Pagination Handler

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/queries/get.records.by.status.pagination/`
- Files: `get.records.by.status.pagination.query.ts`, `get.records.by.status.pagination.handler.ts`
- Call `findRecordsByStatusPagination()` with status and optional name filter

### 2.4 Controller

- Location: `apps/{entity}/{entity}-api-service/src/app/{entity}/{entity}.controller.ts`
- Decorators: `@Controller('{entities}')`, `@ApiTags('{entities}')`, `@ApiBearerAuth('JWT-auth')`, `@UseGuards(CognitoAuthGuard)`
- Endpoints:
  - `POST /` - Create (with `@Query('userRole')` for BYPASS_AUTH)
  - `PUT /:id` - Update (with `@Query('userRole')`)
  - `DELETE /:id` - Delete (with `@Query('userRole')`)
  - `POST /:id/approve` - Approve (with `@Query('userRole')`)
  - `POST /:id/deny` - Deny (with `@Query('userRole')`)
  - `GET /:id` - Get by ID
  - `GET /name/:name` - Get by name (search with pagination - accepts `limit`, `direction`, `cursorPointer` query parameters)
  - `GET /` - Get paginated list
  - `GET /status` - Get paginated list by status (with optional name filter)
- All endpoints use CommandBus/QueryBus pattern
- Handle `userRole` query parameter for BYPASS_AUTH testing

## 3. DTOs

### 3.1 Entity DTO

- Location: `libs/dto/src/lib/{entity}/{entity}/{entity}.dto.ts`
- Fields: All entity fields with `@ApiProperty()` decorators
- Include: `status`, `forApprovalVersion`, `changeReason`, `activityLogs`
- `changeReason` field:
  - Type: `changeReason?: string`
  - Decorator: `@ApiProperty()` with optional configuration
  - Purpose: Track reasons behind modifications for approval workflow
- Include nested DTOs for related entities (arrays)

### 3.2 Create Entity DTO

- Location: `libs/dto/src/lib/{entity}/{entity}/create.{entity}.dto.ts`
- Pattern: `export class Create{Entity}Dto extends OmitType({Entity}Dto, ['{entity}Id'] as const) {}`

### 3.3 Filter DTO (OPTIONAL - Only for Complex Entities)

- Location: `libs/dto/src/lib/{entity}/{entity}/{entity}.filter.dto.ts`
- **IMPORTANT**: Only create for entities that need advanced filtering
- **DO NOT** create for simple entities with just id/name fields
- Fields: status, related entity IDs (arrays), fields (for projection), reverse

### 3.4 Frontend Types

- Location: `libs/frontend/data-access/src/types/{entity}.types.ts`
- Mirror backend DTOs but as TypeScript interfaces (no decorators)
- Include `Create{Entity}Dto` interface
- Include `PaginatedResponse<T>` type
- **IMPORTANT**: Frontend `EntityDto` interface must include `changeReason?: string` to match backend DTO structure

## 4. Frontend API Layer

### 4.1 API Service Class

- Location: `libs/frontend/data-access/src/api/{entity}-main.api.ts`
- Extends `AxiosConfig`
- Constructor: `super('API_{ENTITY}_URL', true, false)`
- Methods:
  - `get{Entities}(limit, direction, cursorPointer, userRole): Promise<{Entities}Response>`
  - `get{Entities}ByStatus(limit, status, direction, cursorPointer, name, userRole): Promise<{Entities}Response>`
  - `get{Entity}ById(id, userRole): Promise<{Entity}Dto>`
  - `get{Entities}ByName(name, limit, direction, cursorPointer, userRole): Promise<{Entities}Response>` - **Returns paginated response** with `{ data, statusCode, nextCursorPointer, prevCursorPointer }` structure
  - `create{Entity}(entity, userRole): Promise<{Entity}Dto>`
  - `update{Entity}(id, entity, userRole): Promise<{Entity}Dto>`
  - `delete{Entity}(entity, userRole): Promise<void>`
  - `approve{Entity}(id, userRole): Promise<{Entity}Dto>`
  - `deny{Entity}(id, userRole): Promise<{Entity}Dto>`
- Security: Only add `userRole` query parameter if provided (for BYPASS_AUTH)
- Export default instance: `export default new {Entity}MainApi()`

## 5. Frontend UI/UX

**IMPORTANT STYLING GUIDELINES:**
- **NO GRADIENTS**: All components must use solid colors only. Do NOT use `bg-gradient-to-r`, `bg-gradient-to-br`, or any gradient classes.
- **Solid Colors Only**: Use solid color classes like `bg-blue-600`, `bg-red-600`, `bg-gray-50`, etc.
- **Simple Shadows**: Use `shadow-sm` for subtle shadows, avoid complex shadow effects.
- **Simple Hover Effects**: Use `hover:bg-{color}-700` for color transitions, avoid transform scale effects.
- **Status Badges**: Display status badges without icon boxes. Use solid color badges (e.g., `bg-green-600 text-white shadow-sm`).

### 5.1 Table Page

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/page.tsx`
- Main container: `<div className="p-4 sm:p-6 space-y-6">` (NOT full-width gradient background)
- **IMPORTANT**: Page should NOT use full-width background gradients or any gradient styling. Use solid colors only.
- State management:
  - `isLoading`, `error`, `entities` array
  - `nextCursor`, `prevCursor`, `currentCursor` for pagination
  - `pageSize` for page size control
  - `searchQuery` (generic name, not `searchTerm`) for search functionality
- Fetch function:
  - Use `searchQuery` (not `searchTerm`) for variable names
  - If `searchQuery` exists, call `get{Entities}ByName()`
  - Otherwise, call `get{Entities}()`
  - Handle cursor serialization (JSON.stringify if object)
  - Debounce search (500ms delay)
- UI Components:
  - Breadcrumbs navigation
  - Header component with search input and create button
  - Table component with pagination controls
  - Status badges with color coding
- Status Display:
  - **IMPORTANT**: Status badges must display readable text, not raw enum values
  - Implement `getStatusText(status: StatusEnum): string` helper function to convert enum values:
    - `ACTIVE` → "Active"
    - `FOR_APPROVAL` → "For Approval"
    - `FOR_DELETION` → "For Deletion"
    - `NEW_RECORD` → "New Record"
  - Use `getStatusText()` in `getStatusBadge()` function to display converted text
  - Status badges should use color-coded styling (green for ACTIVE, yellow for FOR_APPROVAL, red for FOR_DELETION, blue for NEW_RECORD)

#### 5.1.1 Header Component

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/{Entity}Header.tsx`
- Imports: `import { Input } from '@components-web'` and `import { Add, Search } from '@components-web'`
- Props:
  - `searchQuery: string` (NOT `searchTerm`)
  - `onSearchChange: (value: string) => void`
  - `onRefresh: () => void`
  - `onCreateClick: () => void`
  - Optional `isLoading` + `canCreate` flags keep APIs aligned with Area patterns.
- Structure:
  - Wrapper: `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">`
  - Search cluster: `<div className="flex w-full items-center gap-3 sm:flex-1 sm:max-w-md">`
  - Input: Use `<Input>` component with `leftIcon={Search}` and `placeholder="Filter {entities}"`
  - Refresh button: `<button type="button" className="p-2 rounded-md border border-gray-300 bg-white transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">` with refresh SVG icon
  - Create button: `<button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">` with `<Add size={18} />` icon
- Button logic:
  - Render the refresh button flush right within the search cluster and keep it always visible; disable it (via `disabled`, `aria-disabled`) while `isLoading` to prevent double fetches.
  - Place the create button after the search cluster; show it only when the signed-in user has create permission (e.g., `permissions.canCreate{Entity}` or user role ADMIN/SUPER_ADMIN). Hide it entirely for read-only users instead of disabling.
  - When the header supports BYPASS_AUTH, pass `userRole` from the parent into both refresh and create handlers so button clicks always respect the selected role.

#### 5.1.2 Table Component

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/{Entity}Table.tsx`
- Props:
  - `isLoading: boolean`
  - `tableData: any[]`
  - `headers: { key: string; label: string }[]`
  - `searchQuery: string` (NOT `searchTerm`)
  - `onRowClick: (entity: EntityDto) => void`
  - `pageSize: number`
  - `onPageSizeChange: (size: number) => void`
  - `prevCursor: any`
  - `nextCursor: any`
  - `onPrevious: () => void`
  - `onNext: () => void`
- Styling:
  - Desktop table container: `<div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">`
  - Mobile list container: `<div className="sm:hidden space-y-4">` where each record renders as `<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">`
  - Table header: `<thead className="bg-blue-600 border-b border-blue-700">`
  - Header cells: `<th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">`
  - Table rows: `<tr className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50">`
  - Table cells: `<td className="px-6 py-5 text-sm font-medium text-gray-900">` or `text-gray-600` for secondary data
  - Pagination container: `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm mt-6">`
  - Pagination buttons: Use disabled states with gray styling (`border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50` when disabled) and stack inside `<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">`
- Button logic:
  - Keep the table body free of inline action buttons; rely on `onRowClick` to open the edit page so the entire row acts as the call-to-action.
  - In the pagination footer place the `Previous` button on the left and the `Next` button on the right; disable (`disabled` + subdued styling) when `prevCursor` or `nextCursor` is falsy respectively.
  - Surface a compact page-size selector (if enabled) between the pagination buttons; changes should immediately call `onPageSizeChange` and reset the cursor pointers.

### 5.2 Detail/Edit Page

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/[id]/edit/page.tsx`
- Main container: `<div className="p-4 sm:p-6 space-y-6">`
- Form wrapper: `<div className="flex justify-center">`
- Card container: `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">`
- Tabs:
  - Details tab: Main form (named after entity with status, e.g., "Customer Information - Active", "Area Information - For Approval")
  - Approval tab: Only shown when status is not ACTIVE (shows pending changes)
  - Activity Logs tab: Shows activity logs array
- Tab Navigation:
  - Container: `<div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">`
  - Buttons container: `<div className="flex gap-2 flex-nowrap">`
  - **Main Details Tab**:
    - Tab name format: `"{Entity} Information - {Status}"` (e.g., "Customer Information - Active")
    - Status shown as plain text in tab name (no badge)
    - Tab color changes based on status when active:
      - ACTIVE: `bg-green-600 text-white shadow-sm`
      - FOR_APPROVAL: `bg-yellow-500 text-white shadow-sm`
      - FOR_DELETION: `bg-red-600 text-white shadow-sm`
      - NEW_RECORD: `bg-blue-600 text-white shadow-sm`
    - Inactive state: `bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900`
    - Button class should include `flex-shrink-0` so tabs stay readable on narrow screens.
    - Helper functions required:
      - `getStatusText(status: StatusEnum): string` - Converts status enum to readable text
      - `getTabColorClasses(status: StatusEnum, isActive: boolean): string` - Returns appropriate color classes based on status and active state
  - **Other Tabs** (Approval, Activity Logs):
    - Active tab button: `className="px-5 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors duration-200"`
    - Inactive tab button: `className="px-5 py-3 rounded-lg font-semibold text-sm bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200"`
  - Tab button content: `<span className="flex items-center gap-2">` with SVG icon and text
  - Tab icons: Document icon for details, checkmark icon for approval, list icon for logs
- Tab content wrapper: `<div className="p-4 sm:p-6 bg-white">`
- Approval Tab Logic:
  - **FOR_DELETION Status**: When status is FOR_DELETION, `forApprovalVersion` will be empty. Instead of showing approval version fields, display a deletion message:
    - Show a red-themed warning box with deletion icon
    - Display message: "Record Marked for Deletion" with description
    - Show deletion reason (if `changeReason` exists) in a separate section
    - Display "Deny Deletion" and "Approve Deletion" buttons (for admin users)
  - **FOR_APPROVAL and NEW_RECORD Status**: Display `forApprovalVersion` fields as read-only
    - Highlight changed fields with blue border/background
    - Show change reason at top
    - Handle inner tables (arrays) with change detection
    - Show "All records removed" warning if arrays emptied
    - Approve/Deny buttons (only for admin users)
- Activity Logs Tab:
  - Display logs in scrollable container
  - Format: Simple list with border separators
- Action bar layout:
  - Render a footer action bar inside the tab content using `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t-2 border-gray-200">` so buttons stay anchored to the card bottom while stacking naturally on mobile.
  - Place destructive actions (Delete or Deny) on the first slot of the container and keep primary/secondary actions grouped together (Cancel → Save/Approve). Ensure each button uses `w-full sm:w-auto` so they stretch on phones.
- Button logic:
  - Save: Show on the right group for both admins and regular users; disable (`disabled` + `aria-disabled`) when the form is pristine or when a submit mutation is pending. For non-admins disable whenever `status !== StatusEnum.ACTIVE`.
  - Delete: Render on the left only when the record exists (`!isCreateMode`) and the current status is `ACTIVE`. Clicking must trigger the delete confirmation modal and never run delete immediately.
  - Approve/Deny: Only show for admin users when the current status is `NEW_RECORD`, `FOR_APPROVAL`, or `FOR_DELETION`. Use context-specific button labels (`Approve Changes`, `Approve Deletion`, etc.) and disable while mutation is in-flight.
  - Cancel: Always visible on the right group; cancel navigates back to the list and should close any pending modals before routing.

#### 5.2.1 Approval Tab Implementation

- **IMPORTANT**: Check status first before rendering approval tab content
- **FOR_DELETION Status Handling**:
  - When `status === StatusEnum.FOR_DELETION`, do NOT try to display `forApprovalVersion` (it will be empty)
  - Instead, render a deletion message:
    - Container: `<div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 shadow-sm">`
    - Icon: Red circular icon with trash/delete SVG icon (`w-12 h-12 bg-red-600 rounded-full`)
    - Title: "Record Marked for Deletion" (`text-lg font-bold text-red-800`)
    - Description: "This record has been marked for deletion and is awaiting approval." (`text-sm text-red-700`)
    - Deletion reason (if exists): Show `changeReason` in a white box with border (`bg-white border-2 border-red-200 rounded-lg p-4`)
    - Buttons: "Deny Deletion" (red) and "Approve Deletion" (green) for admin users
- **FOR_APPROVAL and NEW_RECORD Status Handling**:
  - Only proceed with approval version display if `forApprovalVersion` exists
  - Helper functions required:
    - `normalizeValue(val: unknown): string` - Normalize values for comparison (handle null, undefined, objects)
    - `isFieldChanged(fieldName: string): boolean` - Check if field changed by comparing current entity fields vs `forApprovalVersion`
    - `formatValue(value: unknown): string` - Format value for display (handle null, boolean, number, object, string)
    - `renderReadOnlyField(label: string, value: unknown, colorClass: string, fieldName?: string)` - Render read-only field with change highlighting
- Change reason display:
  - Container: `<div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm mb-6">`
  - Header: Icon + title with solid color styling
  - Content: `<div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 font-medium shadow-sm cursor-not-allowed whitespace-pre-wrap font-mono leading-relaxed">`
- Section structure:
  - Container: `<div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-4 sm:p-6 bg-white shadow-sm">`
  - Section header: `<div className="border-2 border-gray-200 rounded-xl p-4">` with icon box and solid color title
  - Field grid: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`
- Read-only field styling:
  - Changed field: `border-blue-500 bg-blue-50 text-gray-700`
  - Unchanged field: `border-gray-200 bg-gray-50 text-gray-500`
- Action buttons:
  - Container: `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t-2 border-gray-200">`
  - Deny button: `className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"`
  - Approve button: `className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"`
  - Cancel button: `className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2"`
  - Button logic:
    - For `FOR_DELETION`, relabel buttons to `Deny Deletion` / `Approve Deletion`, keep them visible only to admin users, and display the cancel button for all roles.
    - For `FOR_APPROVAL` and `NEW_RECORD`, keep the cancel button visible for all roles, render approve/deny buttons only when `isAdminUser` is true, and disable them when no pending changes remain.
    - Always wire action buttons to close the tab’s local modal state and re-fetch entity data after the command bus resolves.

#### 5.2.2 Activity Logs Tab

- Container: Scrollable container with border separators
- Format: Simple list display
- Each log entry: Display as-is from activityLogs array

### 5.3 Create Page

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/create/page.tsx`
- Same structure as edit page:
  - Main container: `<div className="p-4 sm:p-6 space-y-6">`
  - Form wrapper: `<div className="flex justify-center">`
  - Card container: `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">`
  - Tab navigation container: `<div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">`
  - Only one tab (Details/Information tab)
  - Tab button is always active (no onClick handler needed, same styling as active tab) and should include `flex-shrink-0` when rendered inside a flex row.
  - Tab content wrapper: `<div className="p-4 sm:p-6 bg-white">`
  - `isCreateMode={true}`
  - Navigate to list after successful create
- Button logic:
  - Use the same footer action bar pattern as the edit page but only render the right-side group with Cancel and Save buttons.
  - Cancel: Always visible; returns to the entity list without saving.
  - Save: Enabled once required fields pass validation; disable and show a loading indicator while the create mutation is in progress.

### 5.4 Form Component

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/{Entity}Form.tsx`
- Props:
  - `isCreateMode: boolean`
  - `selectedEntity: EntityDto | null`
  - `successMessage: string | null`
  - `onSave: (entity: EntityDto) => void`
  - `onDelete: () => void` - Should trigger delete confirmation modal (NOT directly delete)
  - `onCancel: () => void`
  - `isAdminUser: boolean`
  - `activeTab: 'details' | 'approval'`
  - `{entity}Id?: string` - For fetching related entities (e.g., `areaId` for fetching towns)
- Form state handling:
  - Maintain a `userHasMadeSelections` (or similarly named) flag that flips after the user edits any controlled field or selection. Guard the initial hydration `useEffect` with this flag so the form only seeds default values once and never overwrites user-entered data during prop changes or background refreshes.
  - Keep controlled `formData` state for text/number inputs and ensure any derived field (like computed payload arrays) also lives in component state so validation can run locally before submission.
  - Store selected related entities as `{ id, name }` objects; this keeps display labels and ids together for quick payload assembly.
- Submission status rules:
  - When creating records, follow the approval workflow: default `status` to `NEW_RECORD` for users without approval permission and to `ACTIVE` for admins/super-admins. Let the backend enforce the final state after permission checks instead of forcing every create payload to `ACTIVE`.
  - When updating records, preserve the incoming `status` unless the command handler explicitly transitions it (e.g., non-admin edits move to `FOR_APPROVAL`); avoid unconditionally resetting to `ACTIVE`.

#### 5.4.1 Status Badge Display

- **IMPORTANT**: Status badges should NOT be displayed in the form component when the status is shown in the main tab name (see Section 5.2 for tab status display pattern).
- The status is already visible in the tab name (e.g., "Customer Information - Active") and the tab color changes based on status, so a separate status badge in the form is redundant.
- If status display is needed elsewhere (not in edit pages with tabs), use color-coded badges with solid colors (e.g., `bg-green-600 text-white shadow-sm`).

#### 5.4.2 Section Structure

Use the canonical blueprint below verbatim for every form section. Adjust only the dynamic props (`icon`, `sectionTitle`, `label`, `disabled`).

```tsx
<div className="space-y-6">
  <section className="space-y-4">
    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
      <header className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">{icon}</div>
        <h3 className="text-base font-bold text-blue-600 m-0">{sectionTitle}</h3>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="group">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            {label}
          </label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  </section>
</div>
```

- Apply `border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed` when `disabled` is true.
- Mirror the same classes for `<textarea>` elements.
- Render the change reason block only when `!isCreateMode && !isAdminUser`, using the same container and appending helper text (`"This field is required when making changes to the {entity} record."`).
- Wrap any wide child content (inner tables, charts, key-value grids) with `<div className="overflow-x-auto">` so the layout stays usable on narrow screens.

#### 5.4.3 Related Entities Integration

- **CRITICAL**: Related entities (e.g., Towns for Area) should be integrated into the main form as a section, NOT as a separate tab
- Section should appear within the form, after main entity fields
- Only show in edit mode when `{entity}Id` exists
- Use same section styling pattern as other sections
- Display related entities in a table or list within the section
- Data loading pattern:
  - Load related collections through dedicated API helpers that can query across the relevant statuses in parallel (e.g., `Promise.all` for ACTIVE, FOR_APPROVAL, FOR_DELETION). Merge the results into a single array before rendering so grouping logic runs on a consistent shape.
  - Include `NEW_RECORD` in the status fetch set so pending creations appear alongside other states in review flows.
  - Surface loading spinners, error banners, and empty-state placeholders within the section so the user always understands the fetch status.
  - Group records by `StatusEnum` before rendering; display each group with a colored heading and reuse the status badge helper to keep styling consistent.
  - When no related records exist, render a muted informational card rather than an empty table to reinforce that the fetch succeeded.
- Status badge rendering:
  - Reuse the same `getStatusText()` helper from the list/table page before printing status labels inside related-entity tables. Do not render raw enum strings (e.g., `FOR_APPROVAL`) directly in the UI.
- Tabs & secondary panes:
  - Apply the shared blue accent to every tabbed section (approval details, activity logs, related collections) so the experience stays uniform. When rendering section headers or icon boxes inside these tabs, continue using `bg-blue-600` and `text-blue-600`.

#### 5.4.4 Action Buttons

- Container: `<div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">`
- Delete button (left side, only when status is ACTIVE): `className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"`
- Delete button onClick: Must call `onDelete()` handler (NOT directly delete), which should show the delete confirmation modal
- When Delete is hidden, use a spacer: `<div className="hidden sm:block" />` to maintain layout on desktop
- Right-side button group: `<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">`
- Save button (inside right group): `className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"`
- Cancel button (inside right group, next to Save): `className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"`
- Button icons: Use SVG icons for each button type
- Visibility rules:
  - In create mode render only Save and Cancel; hide the Delete button entirely (use spacer on desktop).
  - When `!isAdminUser` lock Save in disabled state unless `status === StatusEnum.ACTIVE` and the form has changes plus a filled `changeReason`.
  - Surface additional inline approve/deny buttons from the approval tab via props instead of duplicating them in the form body to avoid conflicting call-to-actions.

#### 5.4.5 Delete Confirmation Modal Component

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/DeleteConfirmationModal.tsx`
- Props:
  - `show: boolean` - Controls modal visibility
  - `{entity}: EntityDto | null` - The entity to be deleted (e.g., `customer`, `area`)
  - `onConfirm: () => void` - Handler for confirm delete action
  - `onCancel: () => void` - Handler for cancel action
- Features:
  - ESC key support to close modal (use `useEffect` to add/remove event listener)
  - Early return if `!show` or entity is null
- Structure:
  - Overlay: `<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">` (use `z-[1001]` for Area pattern, `z-[1000]` for Customer pattern)
  - Modal container: `<div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-lg">` (add `mx-4` for Customer pattern)
  - Header section:
    - Container: `<div className="flex items-center gap-3 mb-4">`
    - Warning icon: `<div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-xl">⚠️</div>`
    - Title: `<h3 className="text-lg font-semibold text-gray-800 m-0">Delete {Entity}</h3>`
  - Message: `<p className="text-sm text-gray-600 mb-6 leading-relaxed">Are you sure you want to delete <strong>{entity?.nameField}</strong>? This action cannot be undone.</p>` (use entity's name field, e.g., `customerName`, `areaName`)
  - Buttons container: `<div className="flex gap-3 justify-end">`
  - Cancel button: `className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"`
  - Delete button: `className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"`
- Button logic:
  - Keep the Cancel button first in the button group so it sits closest to the dialog edge; it should close the modal without side effects.
  - Disable the Delete button and show a spinner when the delete mutation is pending to prevent duplicate submissions.
  - Only render the modal when `show === true` and a valid entity object is supplied; this prevents accidental deletion prompts when the form is still loading.

#### 5.4.6 Form Fields and Validation

- Form Fields:
  - Use controlled inputs with state
  - Disable fields when `!isCreateMode && status !== ACTIVE` (for non-admin)
  - Number formatting hooks for monetary fields
  - Searchable selection modals for related entities
- Validation:
  - Client-side validation before submit
  - Display validation errors
  - Deduplicate nested arrays (terms, deals, etc.) by id before submitting; build composite keys (e.g., `productId|productDealId`) when uniqueness depends on multiple fields.
  - Show validation errors inside a persistent banner near the top of the form. List each issue so the user can resolve them sequentially before resubmitting.
- Inner Tables (if applicable):
  - Manage arrays (e.g., customerTerms, customerProductDeals)
  - Add/remove functionality
  - Modal for adding items
  - Table display with edit/delete actions

#### 5.4.7 Selection Modal Workflow

- Trigger selection modals from within the form using dedicated buttons or `SelectionField` components; opening the modal should set a `show{Entity}Modal` flag to `true`.
- When the user confirms a choice, emit the selected record, close the modal, and update the `{ id, name }` pair in form state. Clear any prior validation errors related to missing selections at the same time.
- Provide a clear mechanism to clear selections (`onClear`) so users can remove mistaken choices; when parent selections change (e.g., choosing a new Area), automatically reset dependent selections (e.g., Town) to avoid stale references.
- For list-based modals that allow adding multiple items (terms, deals), enforce uniqueness on insert and immediately surface an inline validation message if the user attempts to add a duplicate.

#### 5.4.8 Numeric Field Formatting

- Wrap monetary or numeric inputs with shared formatting hooks (such as `useNumberFormatting`) so values stay human-readable while still posting numeric payloads.
- The hook should expose `value`, `onChange`, `onBlur`, and `onFocus` handlers that convert between formatted strings and raw numbers; wire these handlers into the controlled input and keep the formatted value in component state.
- Re-run formatting logic in the form’s hydration effect so persisted decimal values render consistently when editing existing records.

### 5.5 Table Component

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/{Entity}Table.tsx`
- Props:
  - `isLoading`, `tableData`, `headers`, `searchQuery` (not `searchTerm`)
  - `onRowClick`, `pageSize`, `onPageSizeChange`
  - `prevCursor`, `nextCursor`, `onPrevious`, `onNext`
- Styling:
  - Header: `bg-blue-600` with white text
  - Rows: Hover effect with `hover:bg-gray-50`
  - Status badges: Color-coded with readable text (not raw enum values)
  - Pagination controls at bottom
- **Note**: Status badges in table data should already be converted to readable text by the `getStatusBadge()` function in the table page component, which uses `getStatusText()` helper

### 5.6 Modal Component (if used)

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/components/{Entity}Modal.tsx`
- Modal width: `900px` (NOT 500px)
- Tab label: Use entity name (e.g., "Customer Information", "Area Information") NOT "Details"
- Similar to edit page but in modal format
- Same tab structure and logic

### 5.7 UI/UX Patterns

- Color Scheme:
  - Active status: Green (`bg-green-100 text-green-800`)
  - For Approval: Yellow (`bg-yellow-100 text-yellow-800`)
  - For Deletion: Red (`bg-red-100 text-red-800`)
  - New Record: Blue (`bg-blue-100 text-blue-800`)
- Button Styles:
  - Primary: `bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors duration-200`
  - Danger: `bg-red-600 text-white shadow-sm hover:bg-red-700 transition-colors duration-200`
  - Secondary: `bg-white text-gray-700 border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200`
- Form Field Styles:
  - Label: `text-sm font-bold text-gray-700 mb-2` with colored dot indicator
  - Input: `border-2 rounded-xl text-sm font-medium shadow-sm`
  - Disabled: `border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed`
- Section Headers:
  - Icon + Title with solid color text
  - Border containers with padding
- Inner Tables:
  - Same styling as main table
  - Show in sections within form
  - Add/Edit/Delete actions per row

### 5.8 Mobile Responsiveness Guidelines

**MANDATORY**: All CRUD flows MUST be mobile responsive. These rules ensure usability on phones and small tablets. **Reference Implementation**: Use the Customer module (`apps/web-app/src/app/(authenticated-routes)/customers/customer/`) as the pattern for all mobile responsive implementations.

Adhere to these rules so CRUD flows remain usable on phones and small tablets:

- **Breakpoints**: Treat Tailwind's `sm:` breakpoint (640px) as the pivot. Default layouts should stack vertically, then fan out via `sm:`/`md:` classes on larger screens. **CRITICAL**: JavaScript media queries MUST use `640px` (not `1024px`) to match Tailwind's `sm:` breakpoint.
- **Spacing**: Use `p-4 sm:p-6` for cards/sections and keep `space-y-6` wrappers to preserve breathing room on small screens. Never use fixed `p-6` without responsive variants.
- **Headers**: Wrap header bars with `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Make CTA buttons `w-full sm:w-auto` and keep refresh buttons accessible with `disabled:cursor-not-allowed disabled:opacity-60`.
- **Buttons**: Group action bars with `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` so buttons stack on mobile and align horizontally on desktop. Individual buttons should use `w-full sm:w-auto`. Ensure touch targets (`py-3 px-4`) meet the 44px guideline.
- **Tables**: Pair a desktop table (`hidden sm:block overflow-x-auto`) with a mobile card list (`sm:hidden space-y-4`). Display label/value pairs inside each card so data remains readable without horizontal scrolling. **Both layouts are required** - do not implement only one.
- **Pagination**: Wrap pagination controls with `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Stack navigation buttons using `flex w-full flex-col gap-2 sm:w-auto sm:flex-row` inside the control group.
- **Tabs**: Place tab buttons inside an `overflow-x-auto` container with `flex-nowrap` and `flex-shrink-0` button classes to enable horizontal swiping on narrow screens. Tab content should use `p-4 sm:p-6` for responsive padding.
- **Modals**: Let dialogs expand edge-to-edge on phones via `w-full max-w-md sm:max-w-lg` and add `p-4` overlay padding so content never touches device edges.
- **Inner tables/lists**: Guard wide grids with `<div className="overflow-x-auto">` to enable horizontal scroll without padding hacks.
- **Typography**: Maintain readable body sizes (`text-sm` minimum), rely on `font-medium`/`font-semibold` for emphasis, and avoid shrinking text below 14px.
- **Z-index and Pointer Events**: Follow the exact z-index hierarchy (z-0, z-40, z-[60], z-[70], z-[80]) and pointer-events management patterns documented in section 5.9 to prevent interaction blocking issues.

### 5.9 Mobile Navigation Sidebar

The authenticated layout includes a collapsible sidebar navigation that must work correctly across all device orientations and screen sizes.

#### 5.9.1 Breakpoint Strategy

- **Critical**: JavaScript media queries MUST use `640px` to match Tailwind's `sm:` breakpoint exactly.
- **Mobile Mode** (`<640px`): Sidebar is hidden by default, requires burger menu toggle, burger icon visible.
- **Desktop Mode** (`>=640px`): Sidebar is always visible, burger icon hidden, no toggle required.
- **Implementation**: Use `window.matchMedia('(min-width: 640px)')` in JavaScript, and `sm:` classes in Tailwind.

#### 5.9.2 Z-Index Hierarchy

Establish a clear z-index layering to prevent interaction blocking. **CRITICAL**: These values must be followed exactly to prevent click-blocking issues.

- **Page Content**: `z-0` (lowest layer, default)
- **Sidebar Overlay** (backdrop): `z-40` - Below header and sidebar, only visible when sidebar is open
- **Sidebar Wrapper**: `z-[60]` - Highest layer when open, `pointer-events-none` when closed
- **Mobile Header** (burger menu): `z-[70]` - Always above overlay and sidebar when closed
- **Header Interactive Elements** (burger button, profile menu): `z-[80]` - Highest, always clickable

**Implementation Pattern** (Reference: Customer module):
```tsx
// Page content wrapper
<div className="relative z-0 h-screen w-full overflow-y-auto ...">

// Mobile header (fixed to viewport, always on top when scrolling)
<div className="fixed top-0 left-0 right-0 z-[70] bg-secondaryNeutral-50 shadow-md sm:hidden">
  <div className="flex items-center justify-between px-4 py-4">
    <button className="relative z-[80] ...">Burger Icon</button>
    <div className="relative z-[80]"><ProfileHeaderMenu /></div>
  </div>
</div>

// Content wrapper (with top padding to account for fixed header)
<div className="pt-20 sm:pt-8">
  {children}
</div>

// Sidebar overlay (only when sidebar is open on mobile)
<div className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden pointer-events-none opacity-0" />
// When open: pointer-events-auto opacity-100

// Sidebar wrapper (highest when mobile, normal on desktop)
<div className={classNames(
  'sm:z-auto',
  !isToggleDisabled ? 'fixed inset-y-0 left-0 z-[60]' : '',
  !isToggleDisabled && !isOpen ? 'pointer-events-none' : ''
)}>
  <aside className={classNames(
    '...',
    !isToggleDisabled && !isOpen ? 'pointer-events-none' : 'pointer-events-auto'
  )}>
    Sidebar Content
  </aside>
</div>
```

#### 5.9.3 Pointer Events Management

**CRITICAL**: Proper pointer-events management prevents all interaction blocking issues in portrait mode.

- **Overlay when closed**: `pointer-events-none opacity-0` - Does not block interactions
- **Overlay when open**: `pointer-events-auto opacity-100` - Blocks background clicks, closes sidebar
- **Sidebar wrapper when closed**: `pointer-events-none` - Prevents wrapper from blocking clicks even when translated off-screen
- **Sidebar content when closed**: `pointer-events-none` - Prevents sidebar content from blocking interactions
- **Sidebar content when open**: `pointer-events-auto` - Ensures buttons/links are clickable
- **Header buttons**: Always have `relative z-[80]` to ensure they're above all overlays and sidebar

#### 5.9.4 Fixed Header Behavior

**CRITICAL**: The mobile header MUST use `fixed` positioning (not `sticky`) because it's inside a scrollable container. `sticky` positions relative to the nearest scrolling ancestor, while `fixed` positions relative to the viewport.

- Mobile header uses `fixed top-0 left-0 right-0 z-[70]` to stay at the top of the viewport when scrolling (must be above sidebar `z-[60]`)
- Header must have solid background (`bg-secondaryNeutral-50`) to prevent content showing through
- Header shadow (`shadow-md`) provides visual separation from content
- Interactive elements (burger button, profile menu) need `relative z-[80]` to stay clickable above everything
- Content wrapper must have top padding (`pt-20` on mobile, `sm:pt-8` on desktop) to account for the fixed header height
- Header container should NOT have `overflow-hidden` or other properties that might interfere with fixed positioning

**Implementation Pattern**:
```tsx
// Mobile header (fixed to viewport top)
<div className="fixed top-0 left-0 right-0 z-[70] bg-secondaryNeutral-50 shadow-md sm:hidden">
  <div className="flex items-center justify-between px-4 py-4">
    <button className="relative z-[80] ...">Burger Icon</button>
    <div className="relative z-[80]"><ProfileHeaderMenu /></div>
  </div>
</div>

// Content wrapper (with top padding to account for fixed header)
<div className="pt-20 sm:pt-8">
  {children}
</div>
```

#### 5.9.5 Landscape Mode Handling

- **Portrait phones** (`<640px`): Burger icon visible, sidebar toggleable
- **Landscape phones/tablets** (`640px-1023px`): Sidebar always open (desktop behavior), burger hidden
- **Desktop** (`>=1024px`): Sidebar always open, burger hidden
- The `640px` breakpoint ensures consistent behavior: mobile toggle below, always-visible above

#### 5.9.6 Common Issues and Solutions

- **Burger icon not clickable**: Ensure header has `z-[70]` and button has `relative z-[80]`. Check that sidebar wrapper has `pointer-events-none` when closed.
- **Buttons/inputs not clickable**: 
  - Check sidebar wrapper has `pointer-events-none` when closed
  - Check sidebar content has `pointer-events-none` when closed
  - Verify overlay is `pointer-events-none` when sidebar is closed
  - Ensure no invisible elements are covering the content area
- **Header floats when scrolling**: Use `fixed top-0 left-0 right-0 z-[70]` (not `sticky`) with solid background (`bg-secondaryNeutral-50`) and shadow. The header must be `fixed` because it's inside a scrollable container. Add `pt-20` padding to content wrapper on mobile to account for header height.
- **Sidebar not visible in landscape**: Verify breakpoint is `640px` (not `1024px`) in JavaScript media query
- **Overlay blocks header**: Ensure overlay `z-40` is below header `z-[70]`
- **Content area blocked**: Ensure content wrapper has `z-0` and sidebar wrapper has `pointer-events-none` when closed

### 5.10 Mobile Responsiveness Implementation Checklist

**Reference Implementation**: Always use the Customer module (`apps/web-app/src/app/(authenticated-routes)/customers/customer/`) as the reference for mobile patterns.

Before marking any entity implementation as complete, verify all mobile responsiveness requirements:

#### 5.10.1 Page-Level Mobile Requirements

- [ ] **Main container**: Uses `p-4 sm:p-6` for responsive padding (not fixed `p-6`)
- [ ] **Card containers**: Use `w-full sm:max-w-4xl` for responsive width constraints
- [ ] **No fixed widths**: All containers use responsive classes, no `width: 500px` or similar
- [ ] **Content wrapper**: Has `z-0` to ensure proper stacking context

#### 5.10.2 Header Component Mobile Requirements

- [ ] **Wrapper**: Uses `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
- [ ] **Search input**: Full width on mobile (`w-full sm:flex-1 sm:max-w-md`)
- [ ] **Create button**: Full width on mobile (`w-full sm:w-auto`)
- [ ] **Refresh button**: Always accessible, disabled state uses `disabled:cursor-not-allowed disabled:opacity-60`
- [ ] **Button stacking**: Buttons stack vertically on mobile, horizontally on desktop

#### 5.10.3 Table Component Mobile Requirements

- [ ] **Desktop table**: Uses `hidden sm:block` to hide on mobile
- [ ] **Mobile cards**: Uses `sm:hidden space-y-4` to show only on mobile
- [ ] **Card layout**: Each mobile card displays label/value pairs in readable format
- [ ] **Pagination**: Uses `flex flex-col gap-3 sm:flex-row` for responsive stacking
- [ ] **Page size selector**: Full width on mobile (`w-full sm:w-auto`)
- [ ] **Navigation buttons**: Stack vertically on mobile (`flex-col sm:flex-row`)

#### 5.10.4 Form Component Mobile Requirements

- [ ] **Section containers**: Use `p-4 sm:p-6` for responsive padding
- [ ] **Field grids**: Use `grid grid-cols-1 md:grid-cols-2 gap-6` (single column on mobile)
- [ ] **Action buttons**: Container uses `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
- [ ] **Delete button**: Full width on mobile (`w-full sm:w-auto`)
- [ ] **Button group**: Right-side buttons use `flex w-full flex-col gap-2 sm:w-auto sm:flex-row`
- [ ] **Spacer div**: Uses `hidden sm:block` when delete button is hidden
- [ ] **Inner tables**: Wrapped in `<div className="overflow-x-auto">` for horizontal scroll on mobile

#### 5.10.5 Detail/Edit Page Mobile Requirements

- [ ] **Main container**: Uses `p-4 sm:p-6 space-y-6`
- [ ] **Card container**: Uses `w-full sm:max-w-4xl`
- [ ] **Tab navigation**: Container has `overflow-x-auto` for horizontal scrolling
- [ ] **Tab buttons**: Use `flex-shrink-0` to prevent squishing
- [ ] **Tab content**: Uses `p-4 sm:p-6 bg-white`
- [ ] **Approval tab buttons**: Use `w-full sm:w-auto` for responsive width
- [ ] **Activity logs**: Scrollable container with proper mobile padding

#### 5.10.6 Create Page Mobile Requirements

- [ ] **Main container**: Uses `p-4 sm:p-6 space-y-6`
- [ ] **Card container**: Uses `w-full sm:max-w-4xl`
- [ ] **Tab navigation**: Same responsive patterns as edit page
- [ ] **Tab content**: Uses `p-4 sm:p-6 bg-white`

#### 5.10.7 Navigation Sidebar Mobile Requirements

- [ ] **Breakpoint**: JavaScript uses `640px` (not `1024px`) to match Tailwind `sm:`
- [ ] **Z-index hierarchy**: 
  - Content: `z-0`
  - Overlay: `z-40`
  - Sidebar: `z-[60]`
  - Header: `z-[70]`
  - Header buttons: `z-[80]`
- [ ] **Pointer events**: Sidebar wrapper and content have `pointer-events-none` when closed
- [ ] **Fixed header**: Uses `fixed top-0 left-0 right-0 z-[70]` (not `sticky`) with solid background
- [ ] **Content padding**: Content wrapper has `pt-20 sm:pt-8` to account for fixed header height
- [ ] **Burger button**: Has `relative z-[80]` to stay clickable
- [ ] **Overlay**: Only visible when sidebar is open, `pointer-events-none` when closed

#### 5.10.8 Testing Checklist

Test all of the following in portrait mode (`<640px` width):

- [ ] Burger icon is clickable and opens sidebar
- [ ] Header stays at top when scrolling (sticky behavior)
- [ ] All buttons are clickable (create, save, cancel, delete, etc.)
- [ ] All text inputs are clickable and focusable
- [ ] Table displays as cards (not hidden table)
- [ ] Pagination buttons stack vertically
- [ ] Form sections stack properly
- [ ] Action buttons stack vertically
- [ ] Tabs scroll horizontally if needed
- [ ] No elements are blocked by overlays or sidebars

Test all of the following in landscape mode (`>=640px` width):

- [ ] Sidebar is visible (not hidden)
- [ ] Burger icon is hidden (not visible)
- [ ] Desktop table is visible (not mobile cards)
- [ ] All responsive patterns work correctly
- [ ] Navigation is accessible

#### 5.10.9 Common Mobile Issues to Avoid

- ❌ **Fixed padding**: Using `p-6` instead of `p-4 sm:p-6`
- ❌ **Fixed widths**: Using `w-96` or `max-w-md` without responsive variants
- ❌ **Missing mobile layouts**: Only implementing desktop table, no mobile cards
- ❌ **Button overflow**: Buttons not stacking on mobile, causing horizontal scroll
- ❌ **Z-index conflicts**: Elements blocking interactions due to incorrect z-index
- ❌ **Pointer events**: Sidebar or overlay blocking clicks when closed
- ❌ **Breakpoint mismatch**: JavaScript using `1024px` while Tailwind uses `sm:` (640px)
- ❌ **Missing overflow-x-auto**: Wide content causing horizontal scroll issues

## 6. Business Logic Patterns

### 6.1 Status Management Matrix

| Status | Assigned By | Trigger Condition | Required Follow-up | References |
| --- | --- | --- | --- | --- |
| `ACTIVE` | System/admin | Admin create/update, approval success | Clear `changeReason`, trim activity logs | §2.2.1, §2.2.2, §2.2.4 |
| `NEW_RECORD` | System | Non-admin create | Populate `forApprovalVersion` with full payload, await approval | §2.2.1 |
| `FOR_APPROVAL` | System | Non-admin update | Persist original fields, write diffs to `forApprovalVersion` | §2.2.2 |
| `FOR_DELETION` | System/admin | Delete requested | Log deletion reason, await approve/deny | §2.2.3 |
| `DRAFT` | Explicit feature toggle | Draft workflows only | Treat as non-approved; exclude from active lists | §6.1 |

### 6.2 Permission Logic Table

| Role | Create | Update | Approve/Deny | Delete | Status Outcome |
| --- | --- | --- | --- | --- | --- |
| `ADMIN` / `SUPER_ADMIN` | Direct persist | Direct persist | Allowed | Hard delete when approved | Remains `ACTIVE` unless set explicitly |
| Non-admin | Approval flow | Approval flow | Not allowed | Request only | Moves to `NEW_RECORD`, `FOR_APPROVAL`, `FOR_DELETION` |

### 6.3 Field Change Tracking Blueprint

```ts
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';

const changes = detectFieldChanges(existingRecord, command.dto, {
  arrayIdFields: { customerTerms: 'termsId', customerProductDeals: 'productDealId' },
});
const formattedChanges = formatFieldChanges(changes);
const combinedReason = command.dto.changeReason
  ? `${command.dto.changeReason}\n\n${formattedChanges}`
  : formattedChanges;
```

- Persist `combinedReason` to `changeReason`.
- Append `formattedChanges` to the non-admin activity log entry (`activityLogMessage += \` - ${formattedChanges}\``).
- Skip persistence when `changes` is empty to prevent noise.
- Store `forApprovalVersion` only when the user lacks approval permission.

### 6.4 Activity Log Rules

| Step | Action | Enforcement |
| --- | --- | --- |
| Add entry | Push new log entry with formatted text (`Date: …`) | Always use timezone `Asia/Manila` |
| Trim entries | Call `reduceArrayContents(activityLogs, 10)` | Invoke **after** pushing the new entry |
| Non-admin updates | Append formatted change summary | Mandatory (see §6.3) |

### 6.5 Inner Tables (Nested Arrays)

- If entity has inner tables (e.g., customerTerms, customerProductDeals):
  - Include in form with add/edit/delete functionality
  - Track changes in approval version
  - Show in approval tab with change highlighting
  - Handle "all removed" scenario with warning message

### 6.6 changeReason Field Management

- Purpose: Track reasons behind modifications for approval workflow
- Required for: Non-admin users when updating records
- Validation: Required field when making changes (for non-admin users)
- Storage: Stored in `changeReason` field of entity
- Combination: Combined with auto-detected field changes in update handler
- Reset: Must be reset to `null` (NOT `undefined`) in approve/deny handlers
- Reset timing: AFTER applying/clearing `forApprovalVersion`, not before
- Display: Shown in approval tab as read-only field with special styling

**Database Service Requirements** (CRITICAL - Common source of bugs):

1. **Schema Definition** (§1.1): Must include `changeReason: { type: String, required: false }` in the DynamoDB schema model definition. Without this, the field cannot be stored in the database.

2. **convertToDto Method** (§1.2): Must map `changeReason` from database record to DTO. If TypeScript doesn't recognize the property (common after schema updates), use type assertion: `changeReason: (record as EntityDataType & { changeReason?: string }).changeReason || undefined`

3. **convertToDataType Method** (§1.2): Must include `changeReason: dto.changeReason` when converting DTO to database format. This ensures the field is included in the database record.

4. **updateRecord Method** (§1.4): Must explicitly set `changeReason` on the record object before calling `update()`: `record.changeReason = dto.changeReason`. This is critical because even if `convertToDataType` includes it, the explicit assignment ensures it's not lost during the update operation.

**Verification Checklist**:
- [ ] Schema includes `changeReason` field definition
- [ ] `convertToDto` maps `changeReason` (with type assertion if needed)
- [ ] `convertToDataType` includes `changeReason` in returned object
- [ ] `updateRecord` explicitly sets `changeReason` before calling `update()`
- [ ] DTO includes `changeReason?: string` with `@ApiProperty()` decorator
- [ ] Frontend types include `changeReason?: string` in EntityDto interface

## 7. Implementation Checklist

When implementing a new entity:

### Backend

- [ ] Create schema in `libs/backend/dynamo-db-lib/src/lib/schema/` (see §1.1)
- [ ] Add `changeReason` field to schema definition (`{ type: String, required: false }`) (see §1.1)
- [ ] Create database service abstract class (see §1.2)
- [ ] Implement database service with all methods (see §1.2–§1.8)
- [ ] Update `convertToDto()` to map `changeReason` field with type assertion if TypeScript doesn't recognize it (see §1.2, §6.6)
- [ ] Update `convertToDataType()` to include `changeReason` field in returned object (see §1.2, §6.6)
- [ ] Update `updateRecord()` to explicitly set `changeReason` on record before calling `update()` (see §1.4, §6.6)
- [ ] Set up GSI indexes correctly in create/update (see §1.3–§1.4)
- [ ] Create DTOs (EntityDto, CreateEntityDto, FilterDto if needed) (see §3)
- [ ] Add `changeReason?: string` to EntityDto with `@ApiProperty()` decorator (see §3.1)
- [ ] Create command handlers (create, update, delete, approve, deny) (see §2.2)
- [ ] Add activity log limiting in create handler using `reduceArrayContents()` (see §2.2.1, §6.4)
- [ ] Add field change detection and formatting in update handler (see §2.2.2, §6.3)
- [ ] Ensure activity logs include formatted changes for non-admin updates (see §6.3–§6.4)
- [ ] Reset `changeReason` to `null` in approve handler AFTER applying forApprovalVersion (see §2.2.4)
- [ ] Reset `changeReason` to `null` in deny handler AFTER clearing forApprovalVersion (see §2.2.5)
- [ ] Use `null` (not `undefined`) for changeReason reset (see §2.2.4–§2.2.5)
- [ ] Create query handlers (getById, getByName, getPagination, getByStatusPagination) (see §2.3)
- [ ] Create controller with all endpoints (see §2.4)
- [ ] Create module with all providers (see §2.1)
- [ ] Test duplicate checking logic (see §1.7, §2.2.1)
- [ ] Test pagination (with and without cursors) (see §1.6, §2.3, §4.1)
- [ ] Test approval/deny workflows (see §2.2.4–§2.2.5, §6.1–§6.4)

### Frontend

- [ ] Create types in `libs/frontend/data-access/src/types/` (see §3.4)
- [ ] Add `changeReason?: string` to frontend EntityDto interface (see §3.4)
- [ ] Create API service in `libs/frontend/data-access/src/api/` (see §4.1)
- [ ] Create table page with search (use `searchQuery` not `searchTerm`) (see §5.1)
- [ ] Use `p-4 sm:p-6 space-y-6` for main container (NOT full-width gradient, MUST be mobile responsive) (see §5.1, §5.8)
- [ ] Implement `getStatusText()` helper function to convert enum values to readable text (see §5.1)
- [ ] Update `getStatusBadge()` function to use `getStatusText()` for status display (see §5.1)
- [ ] Create Header component using Input component with Search icon (see §5.1.1)
- [ ] Create Header component using Add icon for create button (see §5.1.1)
- [ ] Create table component using blue header (`bg-blue-600`) (see §5.1.2)
- [ ] Create table component using `rounded-xl` and `shadow-lg` (see §5.1.2)
- [ ] Create detail/edit page with tabs (see §5.2)
- [ ] Edit page uses centered container with `w-full sm:max-w-4xl` (see §5.2, §5.10.5)
- [ ] Tab navigation uses solid color background with icons (see §5.2)
- [ ] Main Details tab includes status in tab name (e.g., "Customer Information - Active") (see §5.2)
- [ ] Main Details tab color changes based on status when active (green/yellow/red/blue) (see §5.2)
- [ ] Implement `getStatusText()` and `getTabColorClasses()` helper functions (see §5.2)
- [ ] Create form component (see §5.4)
- [ ] Form uses section-based layout with solid color icon boxes (see §5.4.2)
- [ ] Status badge NOT displayed in form (status is shown in tab name instead) (see §5.4.1)
- [ ] Related entities integrated into main form (not separate tab) (see §5.4.3)
- [ ] Change reason field shown for non-admin users in edit mode (see §5.4.2, §5.4.3)
- [ ] Approval tab checks status first (FOR_DELETION shows deletion message, not approval version) (see §5.2.1)
- [ ] Approval tab includes helper functions (normalizeValue, isFieldChanged, formatValue, renderReadOnlyField) for FOR_APPROVAL/NEW_RECORD (see §5.2.1)
- [ ] Approval tab uses read-only fields with change highlighting for FOR_APPROVAL/NEW_RECORD (see §5.2.1)
- [ ] Approval tab buttons use solid color styling (see §5.2.1)
- [ ] Activity logs tab displays logs in scrollable container (see §5.2.2)
- [ ] Create Delete Confirmation Modal component (see §5.4.5)
- [ ] Delete button triggers confirmation modal (not direct delete) (see §5.4.5)
- [ ] Modal width is 900px (if using modal component) (see §5.6)
- [ ] All buttons use consistent solid color styling (see §5.7)
- [ ] Implement inner tables if needed (see §5.4.6, §6.5)
- [ ] Test all CRUD operations (see §5–§6)
- [ ] Test approval/deny flows (see §5.2, §6.1–§6.4)
- [ ] Test pagination (see §4.1, §5.1.2)
- [ ] Test search functionality (see §5.1.1)

### Mobile Responsiveness

**CRITICAL**: All UI components MUST be mobile responsive. Use the Customer module as the reference implementation.

- [ ] **Page-level**: Main containers use `p-4 sm:p-6` (not fixed `p-6`) (see §5.10.1)
- [ ] **Page-level**: Card containers use `w-full sm:max-w-4xl` (see §5.10.1)
- [ ] **Header**: Wrapper uses `flex flex-col gap-3 sm:flex-row` (see §5.10.2)
- [ ] **Header**: Create button uses `w-full sm:w-auto` (see §5.10.2)
- [ ] **Table**: Desktop table uses `hidden sm:block` (see §5.10.3)
- [ ] **Table**: Mobile cards use `sm:hidden space-y-4` (see §5.10.3)
- [ ] **Table**: Pagination uses `flex flex-col gap-3 sm:flex-row` (see §5.10.3)
- [ ] **Form**: Section containers use `p-4 sm:p-6` (see §5.10.4)
- [ ] **Form**: Action buttons container uses `flex flex-col gap-3 sm:flex-row` (see §5.10.4)
- [ ] **Form**: Delete button uses `w-full sm:w-auto` (see §5.10.4)
- [ ] **Form**: Button group uses `flex w-full flex-col gap-2 sm:w-auto sm:flex-row` (see §5.10.4)
- [ ] **Detail/Edit page**: Tab navigation has `overflow-x-auto` (see §5.10.5)
- [ ] **Detail/Edit page**: Tab buttons use `flex-shrink-0` (see §5.10.5)
- [ ] **Navigation sidebar**: JavaScript breakpoint uses `640px` (not `1024px`) (see §5.10.7)
- [ ] **Navigation sidebar**: Z-index hierarchy follows exact values (z-0, z-40, z-[60], z-[70], z-[80]) (see §5.10.7)
- [ ] **Navigation sidebar**: Pointer events properly managed (see §5.10.7)
- [ ] **Testing**: All portrait mode tests pass (see §5.10.8)
- [ ] **Testing**: All landscape mode tests pass (see §5.10.8)
- [ ] **Reference**: Customer module patterns followed exactly (see §5.10)

## 8. Important Notes

1. **Filter Functionality**: Only implement for complex entities. Simple entities (id + name only) do NOT need FilterDto or filter pagination methods.

2. **Search Variable Naming**: Use `searchQuery` (or similar generic name) instead of `searchTerm` in frontend code for better reusability.

3. **Search Endpoints Must Return Paginated Responses**: All `get{Entities}ByName` endpoints MUST return `PageDto<EntityDto>` wrapped in `ResponseDto`, not plain arrays. This is critical because:
   - The axios interceptor expects `{ data, statusCode, nextCursorPointer, prevCursorPointer }` structure
   - Frontend table pages and search modals expect paginated responses
   - Use `findRecordsByNamePagination()` in the database service, not `findRecordContainingName()`
   - The query class must accept pagination parameters (`limit`, `direction`, `cursorPointer`)

4. **Index Consistency**: Always update all GSI indexes in both create and update operations.

5. **Activity Logs Limit**: Always limit to 10 entries using `reduceArrayContents()`.

6. **Permission Checks**: Always validate user roles before allowing approve/deny operations.

7. **Status Transitions**: Follow the defined status workflow (NEW_RECORD → ACTIVE, FOR_APPROVAL → ACTIVE, FOR_DELETION → deleted).

8. **Field Change Tracking**: Use the utility functions for automatic change detection, but allow manual changeReason input.

9. **Inner Tables**: If entity has nested arrays, implement full CRUD for those arrays with proper change tracking.

10. **changeReason Field**: Must be included in all entity DTOs, schemas, and database services. **CRITICAL**: Ensure `changeReason` is:
    - Defined in DynamoDB schema (`{ type: String, required: false }`)
    - Mapped in `convertToDto()` (use type assertion if TypeScript doesn't recognize it)
    - Included in `convertToDataType()` return object
    - Explicitly set in `updateRecord()` before calling `update()`
    - Reset to `null` (not `undefined`) in approve/deny handlers AFTER applying/clearing forApprovalVersion
    - See §6.6 for complete verification checklist

11. **Activity Log Formatting**: Activity logs for non-admin updates MUST include formatted field changes. Append ` - ${formattedChanges}` to the activity log message.

12. **Frontend Variable Naming**: Always use `searchQuery` (not `searchTerm`) for search state variables throughout frontend code.

13. **Form Layout**: Forms must use centered container with `w-full sm:max-w-4xl` (mobile responsive), section-based layout with solid color icon boxes, and related entities integrated into main form sections (not separate tabs). All section containers must use `p-4 sm:p-6` for responsive padding.

14. **Tab Navigation**: Tab navigation must use solid color backgrounds (`bg-gray-50`), icons in tab buttons, and proper active/inactive states with simple hover transitions.

15. **Main Tab Status Display**: The main Details/Information tab must include the record status in the tab name (e.g., "Customer Information - Active"). The tab background color must change based on status when active: green for ACTIVE, yellow for FOR_APPROVAL, red for FOR_DELETION, blue for NEW_RECORD. Status should be displayed as plain text in the tab name (no badge). Implement `getStatusText()` and `getTabColorClasses()` helper functions for this functionality.

16. **Button Styling**: All buttons must use solid color backgrounds (e.g., `bg-blue-600`, `bg-red-600`), simple shadows (`shadow-sm`), and hover color transitions. Do NOT use gradients or transform scale effects.

17. **Approval Tab Implementation**: Approval tab MUST check status first. For FOR_DELETION status, display a deletion message (not approval version fields). For FOR_APPROVAL and NEW_RECORD status, include helper functions for field change detection and highlighting. Changed fields must have blue border and background.

18. **Modal Width**: Modal components must use `900px` width (not 500px) to match Customer/Area patterns.

19. **Status Badge Display**: Status badges should NOT be displayed in form components when the status is shown in the main tab name (see note #15). The status is already visible in the tab name and tab color, making a separate badge redundant. If status display is needed elsewhere (not in edit pages with tabs), use solid color badges (e.g., `bg-green-600 text-white shadow-sm`).

20. **Delete Confirmation**: Delete operations must use a custom confirmation modal component. The delete button should trigger the modal, not directly delete the entity.

21. **Status Text Conversion**: Status badges in table pages must display readable text (e.g., "Active", "For Approval") instead of raw enum values (e.g., "ACTIVE", "FOR_APPROVAL"). Implement `getStatusText()` helper function in table page components to convert enum values, and use it in `getStatusBadge()` function. This ensures consistent, user-friendly status display across all table views.

22. **FOR_DELETION Status in Approval Tab**: When a record has FOR_DELETION status, the `forApprovalVersion` field will be empty. The approval tab MUST check the status first and display a deletion message instead of trying to render empty approval version fields. Show a red-themed warning box with deletion icon, message, deletion reason (if exists), and "Deny Deletion"/"Approve Deletion" buttons for admin users.

23. **Mobile Responsiveness is Mandatory**: All UI components MUST be mobile responsive following the patterns established in the Customer module. Every page, component, and layout must work correctly in both portrait mode (`<640px`) and landscape mode (`>=640px`). Use the Customer module (`apps/web-app/src/app/(authenticated-routes)/customers/customer/`) as the reference implementation. See section 5.10 for the complete mobile responsiveness checklist and requirements.

