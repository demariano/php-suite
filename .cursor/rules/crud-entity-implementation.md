# CRUD Entity Implementation Guide

## Overview

This document captures the complete implementation patterns from the customer module to guide implementation of similar CRUD operations for other entities. The patterns cover backend database services, API handlers, DTOs, frontend API calls, and UI/UX components.

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
  - `convertToDto(record): Promise<EntityDto>` - Must map `changeReason` from database record: `changeReason: record.changeReason ? record.changeReason : undefined`
  - `convertToDtoList(records): Promise<EntityDto[]>`
  - `convertToDataType(dto): Promise<EntityDataType>` - Must include `changeReason` in the data type: `changeReason: dto.changeReason`

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

When updating, ensure all indexes are updated in `convertToDataType`:

- Recalculate all GSI values based on current field values
- Maintain consistency with create method pattern

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
- Main container: `<div className="p-6 space-y-6">` (NOT full-width gradient background)
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
- Structure:
  - Container: `<div className="flex items-center justify-between">`
  - Search section: `<div className="flex items-center gap-3 flex-1 max-w-md">`
  - Input: Use `<Input>` component with `leftIcon={Search}` and `placeholder="Filter {entities}"`
  - Refresh button: `<button className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200 border border-gray-300 bg-white">` with refresh SVG icon
  - Create button: `<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">` with `<Add size={18} />` icon

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
  - Table container: `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">`
  - Table header: `<thead className="bg-blue-600 border-b border-blue-700">`
  - Header cells: `<th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">`
  - Table rows: `<tr className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50">`
  - Table cells: `<td className="px-6 py-5 text-sm font-medium text-gray-900">` or `text-gray-600` for secondary data
  - Pagination container: `<div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm mt-6">`
  - Pagination buttons: Use disabled states with gray styling (`border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50` when disabled)

### 5.2 Detail/Edit Page

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/[id]/edit/page.tsx`
- Main container: `<div className="p-6 space-y-6">`
- Form wrapper: `<div className="flex justify-center">`
- Card container: `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">`
- Tabs:
  - Details tab: Main form (named after entity with status, e.g., "Customer Information - Active", "Area Information - For Approval")
  - Approval tab: Only shown when status is not ACTIVE (shows pending changes)
  - Activity Logs tab: Shows activity logs array
- Tab Navigation:
  - Container: `<div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2">`
  - Buttons container: `<div className="flex gap-2">`
  - **Main Details Tab**:
    - Tab name format: `"{Entity} Information - {Status}"` (e.g., "Customer Information - Active")
    - Status shown as plain text in tab name (no badge)
    - Tab color changes based on status when active:
      - ACTIVE: `bg-green-600 text-white shadow-sm`
      - FOR_APPROVAL: `bg-yellow-500 text-white shadow-sm`
      - FOR_DELETION: `bg-red-600 text-white shadow-sm`
      - NEW_RECORD: `bg-blue-600 text-white shadow-sm`
    - Inactive state: `bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900`
    - Helper functions required:
      - `getStatusText(status: StatusEnum): string` - Converts status enum to readable text
      - `getTabColorClasses(status: StatusEnum, isActive: boolean): string` - Returns appropriate color classes based on status and active state
  - **Other Tabs** (Approval, Activity Logs):
    - Active tab button: `className="px-5 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors duration-200"`
    - Inactive tab button: `className="px-5 py-3 rounded-lg font-semibold text-sm bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200"`
  - Tab button content: `<span className="flex items-center gap-2">` with SVG icon and text
  - Tab icons: Document icon for details, checkmark icon for approval, list icon for logs
- Tab content wrapper: `<div className="p-6 bg-white">`
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
- Button Logic:
  - Save: Only enabled when status is ACTIVE (for non-admin) or always (for admin)
  - Delete: Always available (triggers delete confirmation modal)
  - Approve/Deny: Only shown for admin users when status requires approval
  - Cancel: Navigate back to list

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
  - Container: `<div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-6 bg-white shadow-sm">`
  - Section header: `<div className="border-2 border-gray-200 rounded-xl p-4">` with icon box and solid color title
  - Field grid: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`
- Read-only field styling:
  - Changed field: `border-blue-500 bg-blue-50 text-gray-700`
  - Unchanged field: `border-gray-200 bg-gray-50 text-gray-500`
- Action buttons:
  - Container: `<div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">`
  - Deny button: `className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"`
  - Approve button: `className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-sm hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"`
  - Cancel button: `className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"`

#### 5.2.2 Activity Logs Tab

- Container: Scrollable container with border separators
- Format: Simple list display
- Each log entry: Display as-is from activityLogs array

### 5.3 Create Page

- Location: `apps/web-app/src/app/(authenticated-routes)/{entities}/{entity}/create/page.tsx`
- Same structure as edit page:
  - Main container: `<div className="p-6 space-y-6">`
  - Form wrapper: `<div className="flex justify-center">`
  - Card container: `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">`
  - Tab navigation container: `<div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2">`
  - Only one tab (Details/Information tab)
  - Tab button is always active (no onClick handler needed, same styling as active tab)
  - Tab content wrapper: `<div className="p-6 bg-white">`
  - `isCreateMode={true}`
  - Navigate to list after successful create

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

#### 5.4.1 Status Badge Display

- **IMPORTANT**: Status badges should NOT be displayed in the form component when the status is shown in the main tab name (see Section 5.2 for tab status display pattern).
- The status is already visible in the tab name (e.g., "Customer Information - Active") and the tab color changes based on status, so a separate status badge in the form is redundant.
- If status display is needed elsewhere (not in edit pages with tabs), use color-coded badges with solid colors (e.g., `bg-green-600 text-white shadow-sm`).

#### 5.4.2 Section Structure

- Main container: `<div className="space-y-6">`
- Each section: `<div className="space-y-4">`
- Section container: `<div className="border-2 border-gray-200 rounded-xl p-4">`
- Section header:
  - Container: `<div className="flex items-center gap-3 mb-4">`
  - Icon box: `<div className="p-2 bg-{color}-600 rounded-lg shadow-sm">` with white SVG icon
  - Title: `<h3 className="text-base font-bold text-{color}-600">`
- Field grid: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`
- Field group: `<div className="group">`
- Label: `<label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">` with colored dot `<span className="w-1.5 h-1.5 bg-{color}-500 rounded-full"></span>`
- Input: `<input className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" />`
- Disabled input: `className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"`
- Textarea: Same classes as input
- Change reason field: Only show for `!isCreateMode && !isAdminUser`
- Change reason textarea: Same styling as regular textarea
- Change reason helper text: `<div className="text-xs text-gray-500 mt-2">This field is required when making changes to the {entity} record.</div>`

#### 5.4.3 Related Entities Integration

- **CRITICAL**: Related entities (e.g., Towns for Area) should be integrated into the main form as a section, NOT as a separate tab
- Section should appear within the form, after main entity fields
- Only show in edit mode when `{entity}Id` exists
- Use same section styling pattern as other sections
- Display related entities in a table or list within the section

#### 5.4.4 Action Buttons

- Container: `<div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">`
- Delete button (left side, only when status is ACTIVE): `className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"`
- Delete button onClick: Must call `onDelete()` handler (NOT directly delete), which should show the delete confirmation modal
- Save button (right side): `className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"`
- Cancel button (right side, next to Save): `className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"`
- Button icons: Use SVG icons for each button type

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
  - Modal container: `<div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">` (add `mx-4` for Customer pattern)
  - Header section:
    - Container: `<div className="flex items-center gap-3 mb-4">`
    - Warning icon: `<div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-xl">⚠️</div>`
    - Title: `<h3 className="text-lg font-semibold text-gray-800 m-0">Delete {Entity}</h3>`
  - Message: `<p className="text-sm text-gray-600 mb-6 leading-relaxed">Are you sure you want to delete <strong>{entity?.nameField}</strong>? This action cannot be undone.</p>` (use entity's name field, e.g., `customerName`, `areaName`)
  - Buttons container: `<div className="flex gap-3 justify-end">`
  - Cancel button: `className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"`
  - Delete button: `className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"`

#### 5.4.6 Form Fields and Validation

- Form Fields:
  - Use controlled inputs with state
  - Disable fields when `!isCreateMode && status !== ACTIVE` (for non-admin)
  - Number formatting hooks for monetary fields
  - Searchable selection modals for related entities
- Validation:
  - Client-side validation before submit
  - Display validation errors
- Inner Tables (if applicable):
  - Manage arrays (e.g., customerTerms, customerProductDeals)
  - Add/remove functionality
  - Modal for adding items
  - Table display with edit/delete actions

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

## 6. Business Logic Patterns

### 6.1 Status Management

- `ACTIVE`: Record is live and can be edited (by admin) or updated for approval (by regular user)
- `NEW_RECORD`: Created by regular user, awaiting approval
- `FOR_APPROVAL`: Updated by regular user, awaiting approval
- `FOR_DELETION`: Marked for deletion, awaiting approval
- `DRAFT`: Optional draft state

### 6.2 Permission Logic

- Admin/SuperAdmin: Can approve, deny, create/update/delete directly (status becomes ACTIVE immediately)
- Regular User: Creates/updates go to NEW_RECORD or FOR_APPROVAL, requires admin approval

### 6.3 Field Change Tracking

- **IMPORTANT**: `detectFieldChanges()` and `formatFieldChanges()` MUST be imported from `@field-change-utils-lib`
- Use `detectFieldChanges()` utility for automatic change detection
- Configure `arrayIdFields` for array comparison (e.g., `{ customerTerms: 'termsId' }`)
- Combine user-provided `changeReason` with auto-generated changes:
  - Format: `${userChangeReason}\n\n${formattedChanges}` if user provided reason
  - Format: just `formattedChanges` if no user reason
- **CRITICAL**: Formatted changes MUST be appended to activity log messages for non-admin updates
- Store in `forApprovalVersion` when user lacks approval permission

### 6.4 Activity Logs

- Limit to last 10 entries using `reduceArrayContents(activityLogs, 10)`
- **IMPORTANT**: Limit is applied AFTER adding new log entries
- Format: `Date: {timestamp}, {action} by {username} {additional info}`
- Format for non-admin updates: `Date: {timestamp}, {Entity} updated by {username} for approval - {formattedChanges}`
- Timezone: Asia/Manila
- **CRITICAL**: Activity logs MUST include field change details when applicable (for non-admin updates)

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

## 7. Implementation Checklist

When implementing a new entity:

### Backend

- [ ] Create schema in `libs/backend/dynamo-db-lib/src/lib/schema/`
- [ ] Add `changeReason` field to schema definition (`{ type: String, required: false }`)
- [ ] Create database service abstract class
- [ ] Implement database service with all methods
- [ ] Update `convertToDto()` to map `changeReason` field
- [ ] Update `convertToDataType()` to include `changeReason` field
- [ ] Set up GSI indexes correctly in create/update
- [ ] Create DTOs (EntityDto, CreateEntityDto, FilterDto if needed)
- [ ] Add `changeReason?: string` to EntityDto with `@ApiProperty()` decorator
- [ ] Create command handlers (create, update, delete, approve, deny)
- [ ] Add activity log limiting in create handler using `reduceArrayContents()`
- [ ] Add field change detection and formatting in update handler
- [ ] Ensure activity logs include formatted changes for non-admin updates
- [ ] Reset `changeReason` to `null` in approve handler AFTER applying forApprovalVersion
- [ ] Reset `changeReason` to `null` in deny handler AFTER clearing forApprovalVersion
- [ ] Use `null` (not `undefined`) for changeReason reset
- [ ] Create query handlers (getById, getByName, getPagination, getByStatusPagination)
- [ ] Create controller with all endpoints
- [ ] Create module with all providers
- [ ] Test duplicate checking logic
- [ ] Test pagination (with and without cursors)
- [ ] Test approval/deny workflows

### Frontend

- [ ] Create types in `libs/frontend/data-access/src/types/`
- [ ] Add `changeReason?: string` to frontend EntityDto interface
- [ ] Create API service in `libs/frontend/data-access/src/api/`
- [ ] Create table page with search (use `searchQuery` not `searchTerm`)
- [ ] Use `p-6 space-y-6` for main container (NOT full-width gradient)
- [ ] Implement `getStatusText()` helper function to convert enum values to readable text
- [ ] Update `getStatusBadge()` function to use `getStatusText()` for status display
- [ ] Create Header component using Input component with Search icon
- [ ] Create Header component using Add icon for create button
- [ ] Create table component using blue header (`bg-blue-600`)
- [ ] Create table component using `rounded-xl` and `shadow-lg`
- [ ] Create detail/edit page with tabs
- [ ] Edit page uses centered container with `max-w-4xl`
- [ ] Tab navigation uses solid color background with icons
- [ ] Main Details tab includes status in tab name (e.g., "Customer Information - Active")
- [ ] Main Details tab color changes based on status when active (green/yellow/red/blue)
- [ ] Implement `getStatusText()` and `getTabColorClasses()` helper functions
- [ ] Create form component
- [ ] Form uses section-based layout with solid color icon boxes
- [ ] Status badge NOT displayed in form (status is shown in tab name instead)
- [ ] Related entities integrated into main form (not separate tab)
- [ ] Change reason field shown for non-admin users in edit mode
- [ ] Approval tab checks status first (FOR_DELETION shows deletion message, not approval version)
- [ ] Approval tab includes helper functions (normalizeValue, isFieldChanged, formatValue, renderReadOnlyField) for FOR_APPROVAL/NEW_RECORD
- [ ] Approval tab uses read-only fields with change highlighting for FOR_APPROVAL/NEW_RECORD
- [ ] Approval tab buttons use solid color styling
- [ ] Activity logs tab displays logs in scrollable container
- [ ] Create Delete Confirmation Modal component
- [ ] Delete button triggers confirmation modal (not direct delete)
- [ ] Modal width is 900px (if using modal component)
- [ ] All buttons use consistent solid color styling
- [ ] Implement inner tables if needed
- [ ] Test all CRUD operations
- [ ] Test approval/deny flows
- [ ] Test pagination
- [ ] Test search functionality

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

10. **changeReason Field**: Must be included in all entity DTOs, schemas, and database services. Reset to `null` (not `undefined`) in approve/deny handlers AFTER applying/clearing forApprovalVersion.

11. **Activity Log Formatting**: Activity logs for non-admin updates MUST include formatted field changes. Append ` - ${formattedChanges}` to the activity log message.

12. **Frontend Variable Naming**: Always use `searchQuery` (not `searchTerm`) for search state variables throughout frontend code.

13. **Form Layout**: Forms must use centered container with `max-w-4xl`, section-based layout with solid color icon boxes, and related entities integrated into main form sections (not separate tabs).

14. **Tab Navigation**: Tab navigation must use solid color backgrounds (`bg-gray-50`), icons in tab buttons, and proper active/inactive states with simple hover transitions.

15. **Main Tab Status Display**: The main Details/Information tab must include the record status in the tab name (e.g., "Customer Information - Active"). The tab background color must change based on status when active: green for ACTIVE, yellow for FOR_APPROVAL, red for FOR_DELETION, blue for NEW_RECORD. Status should be displayed as plain text in the tab name (no badge). Implement `getStatusText()` and `getTabColorClasses()` helper functions for this functionality.

16. **Button Styling**: All buttons must use solid color backgrounds (e.g., `bg-blue-600`, `bg-red-600`), simple shadows (`shadow-sm`), and hover color transitions. Do NOT use gradients or transform scale effects.

17. **Approval Tab Implementation**: Approval tab MUST check status first. For FOR_DELETION status, display a deletion message (not approval version fields). For FOR_APPROVAL and NEW_RECORD status, include helper functions for field change detection and highlighting. Changed fields must have blue border and background.

18. **Modal Width**: Modal components must use `900px` width (not 500px) to match Customer/Area patterns.

19. **Status Badge Display**: Status badges should NOT be displayed in form components when the status is shown in the main tab name (see note #15). The status is already visible in the tab name and tab color, making a separate badge redundant. If status display is needed elsewhere (not in edit pages with tabs), use solid color badges (e.g., `bg-green-600 text-white shadow-sm`).

20. **Delete Confirmation**: Delete operations must use a custom confirmation modal component. The delete button should trigger the modal, not directly delete the entity.

21. **Status Text Conversion**: Status badges in table pages must display readable text (e.g., "Active", "For Approval") instead of raw enum values (e.g., "ACTIVE", "FOR_APPROVAL"). Implement `getStatusText()` helper function in table page components to convert enum values, and use it in `getStatusBadge()` function. This ensures consistent, user-friendly status display across all table views.

22. **FOR_DELETION Status in Approval Tab**: When a record has FOR_DELETION status, the `forApprovalVersion` field will be empty. The approval tab MUST check the status first and display a deletion message instead of trying to render empty approval version fields. Show a red-themed warning box with deletion icon, message, deletion reason (if exists), and "Deny Deletion"/"Approve Deletion" buttons for admin users.

