# AI Guide: NestJS CQRS Module Implementation

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Business Rules & Workflows](#business-rules--workflows)
4. [Implementation Guides](#implementation-guides)
5. [Module Structure](#module-structure)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)

---

## Overview

This guide teaches AI models how to generate complete NestJS CQRS modules from database services, following enterprise patterns with approval workflows, role-based permissions, and comprehensive audit logging.

**What This Guide Covers:**
- Command and Query pattern implementation (CQRS)
- Role-based authorization (USER, ADMIN, SUPER_ADMIN)
- Approval workflow system (NEW_RECORD, FOR_APPROVAL, FOR_DELETION, ACTIVE)
- Activity logging and change tracking
- OpenAPI/Swagger documentation
- NestJS module configuration

**Generated Components:**
- Commands (Create, Update, Delete, Approve, Deny)
- Command Handlers (business logic, validation, authorization)
- Queries (GetById, GetByName, Pagination variants)
- Query Handlers (data retrieval patterns)
- Controllers (REST endpoints with Swagger)
- Modules (dependency injection configuration)

---

## Architecture & Design Principles

### CQRS Pattern

Commands and Queries are separated for clarity and scalability:

**Commands (Write Operations):**
- Modify state (create, update, delete)
- Require authorization and validation
- Return `ResponseDto<EntityDto>`
- Execute business logic
- Generate activity logs
- Trigger side effects

**Queries (Read Operations):**
- Read-only, no state changes
- No authorization checks in handlers (rely on data filters)
- Return `ResponseDto<EntityDto>` or `ResponseDto<PageDto<EntityDto>>`
- Simple data retrieval
- Pagination support

### Dependency Flow

```
Controller
    ↓
CommandBus / QueryBus
    ↓
Handler (Command/Query Handler)
    ↓
Database Service (Abstract)
    ↓
DynamoDB OneTable
```

### Key Libraries

| Library | Purpose | Key Exports |
|---------|---------|-------------|
| `@nestjs/cqrs` | CQRS infrastructure | CommandBus, QueryBus, @CommandHandler, @QueryHandler, ICommandHandler, IQueryHandler |
| `@auth-guard-lib` | Authentication & authorization | CognitoAuthGuard, @CurrentUser, UserCognito |
| `@dto` | Data transfer objects | All DTOs, ResponseDto, PageDto, StatusEnum, UserRole, ErrorResponseDto |
| `@dynamo-db-lib` | DynamoDB utilities | reduceArrayContents |
| `@field-change-utils-lib` | Change detection | detectFieldChanges, formatFieldChanges |
| `{entity}-database-service` | Database operations | {Entity}DatabaseServiceAbstract, {Entity}DatabaseService |

---

## Business Rules & Workflows

### Role-Based Permissions

**UserRole Enum:**
```typescript
export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN'
}
```

**Permission Matrix:**

| Operation | USER | ADMIN | SUPER_ADMIN |
|-----------|------|-------|-------------|
| **Create** | Status: NEW_RECORD<br/>Changes in forApprovalVersion<br/>Needs approval | Status: ACTIVE<br/>Applied directly<br/>No approval needed | Status: ACTIVE<br/>Applied directly<br/>No approval needed |
| **Update** | Status: FOR_APPROVAL<br/>Original data preserved<br/>Changes in forApprovalVersion | Status: ACTIVE<br/>Applied directly<br/>No approval needed | Status: ACTIVE<br/>Applied directly<br/>No approval needed |
| **Delete** | Status: FOR_DELETION<br/>Record marked, not deleted<br/>Needs approval | Hard delete<br/>Immediate removal | Hard delete<br/>Immediate removal |
| **Approve** | ❌ Forbidden | ✅ Allowed | ✅ Allowed |
| **Deny** | ❌ Forbidden | ✅ Allowed | ✅ Allowed |
| **View/Query** | ✅ All records | ✅ All records | ✅ All records |

### Status Workflow

**StatusEnum:**
```typescript
export enum StatusEnum {
    NEW_RECORD = 'NEW_RECORD',      // Created by USER, awaiting approval
    FOR_APPROVAL = 'FOR_APPROVAL',  // Modified by USER, awaiting approval
    FOR_DELETION = 'FOR_DELETION',  // Deletion requested, awaiting approval
    ACTIVE = 'ACTIVE',              // Approved/Active record
    DRAFT = 'DRAFT'                 // Optional: Work in progress (entity-specific)
}
```

**Status Transition Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CREATE OPERATION                         │
├─────────────────────────────────────────────────────────────────┤
│  USER creates    →  NEW_RECORD (pending approval)               │
│  ADMIN creates   →  ACTIVE (no approval needed)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UPDATE OPERATION                         │
├─────────────────────────────────────────────────────────────────┤
│  USER updates ACTIVE     →  FOR_APPROVAL (original preserved)   │
│  ADMIN updates ACTIVE    →  ACTIVE (changes applied)             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         DELETE OPERATION                         │
├─────────────────────────────────────────────────────────────────┤
│  USER deletes    →  FOR_DELETION (marked, not removed)          │
│  ADMIN deletes   →  Hard delete (immediate removal)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        APPROVE OPERATION                         │
├─────────────────────────────────────────────────────────────────┤
│  NEW_RECORD      →  ACTIVE (apply forApprovalVersion)           │
│  FOR_APPROVAL    →  ACTIVE (apply forApprovalVersion)           │
│  FOR_DELETION    →  Hard delete (remove record)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         DENY OPERATION                           │
├─────────────────────────────────────────────────────────────────┤
│  NEW_RECORD      →  Hard delete (reject creation)               │
│  FOR_APPROVAL    →  ACTIVE (revert, clear forApprovalVersion)   │
│  FOR_DELETION    →  ACTIVE (cancel deletion)                     │
└─────────────────────────────────────────────────────────────────┘
```

### forApprovalVersion Pattern

The `forApprovalVersion` field is a critical component of the approval workflow system.

**Purpose:**
- Stores pending changes that require approval
- Preserves original data during approval process
- Enables rollback on denial

**When USER Makes Changes:**

1. **Original data remains in main fields**
   ```typescript
   existingCustomer.customerName = "Acme Corp"  // Original value unchanged
   existingCustomer.email = "old@acme.com"       // Original value unchanged
   ```

2. **New values stored in forApprovalVersion**
   ```typescript
   existingCustomer.forApprovalVersion = {
       customerName: "Acme Corporation",  // Pending change
       email: "new@acme.com",             // Pending change
       creditLimit: 15000,                // Pending change
       // ... all modified fields
   }
   ```

3. **Status updated to indicate pending approval**
   ```typescript
   existingCustomer.status = StatusEnum.FOR_APPROVAL  // or NEW_RECORD
   ```

4. **changeReason populated**
   ```typescript
   existingCustomer.changeReason = "Updated company name and contact info\n\nModified Fields:\n• Customer Name: \"Acme Corp\" → \"Acme Corporation\"\n• Email: \"old@acme.com\" → \"new@acme.com\""
   ```

**On Approval:**
```typescript
// Apply all changes from forApprovalVersion to main record
Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);

// Clear approval-related fields
updatedCustomer.forApprovalVersion = undefined;
updatedCustomer.changeReason = null;
updatedCustomer.status = StatusEnum.ACTIVE;
```

**On Denial:**
```typescript
// Keep original values, discard forApprovalVersion
updatedCustomer.forApprovalVersion = undefined;
updatedCustomer.changeReason = null;
updatedCustomer.status = StatusEnum.ACTIVE;
// Original field values remain unchanged
```

**forApprovalVersion Structure:**
```typescript
// Example for Customer entity
forApprovalVersion?: {
    customerName?: string;
    email?: string;
    address1?: string;
    address2?: string;
    creditLimit?: number;
    customerCredit?: number;
    tinNumber?: string;
    contactNo?: string;
    contactPerson?: string;
    areaId?: string;
    areaName?: string;
    townId?: string;
    townName?: string;
    customerClassificationId?: string;
    customerClassificationName?: string;
    customerTypeId?: string;
    customerTypeName?: string;
    customerTerms?: Array<{ termsId: string; termsName: string }>;
    customerProductDeals?: Array<{ productDealId: string; /* ... */ }>;
}
```

### Activity Logging

All state-changing operations are logged for audit trail and compliance.

**Format:**
```typescript
`Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {action description}`
```

**Examples:**
```typescript
"Date: 11/17/2025, 2:30:45 PM, Customer created by john.doe, status set to ACTIVE"
"Date: 11/17/2025, 3:15:20 PM, Customer updated by jane.smith for approval"
"Date: 11/17/2025, 3:45:12 PM, Customer updated by admin.user, status set to ACTIVE"
"Date: 11/17/2025, 4:00:00 PM, Customer deletion requested by john.doe for approval"
"Date: 11/17/2025, 4:15:30 PM, Customer approved by manager.admin"
"Date: 11/17/2025, 4:20:00 PM, Customer denied by manager.admin"
```

**Implementation:**
```typescript
import { reduceArrayContents } from '@dynamo-db-lib';

const ACTIVITY_LOGS_LIMIT = 10;

// Initialize or get existing logs
command.customerDto.activityLogs = existingCustomer?.activityLogs || [];

// Add new log entry
command.customerDto.activityLogs.push(
    `Date: ${new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
    })}, Customer created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
);

// Limit to last 10 entries
command.customerDto.activityLogs = reduceArrayContents(
    command.customerDto.activityLogs,
    ACTIVITY_LOGS_LIMIT
);
```

**Storage:**
- Field: `activityLogs: string[]`
- Maximum entries: 10 (most recent)
- Timezone: Asia/Manila
- User attribution: `command.user.username`

### Change Tracking

Automatic detection and formatting of field changes for transparency.

**Auto-Detection Using Field Change Utils:**

```typescript
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';

// Detect changes between old and new objects
const fieldChanges = detectFieldChanges(existingCustomer, command.customerDto, {
    arrayIdFields: {
        customerTerms: 'termsId',
        customerProductDeals: 'productDealId',
    },
});

// Format changes as readable string
const formattedChanges = formatFieldChanges(fieldChanges);
```

**Output Format:**
```
Modified Fields:
• Customer Name: "Acme Corp" → "Acme Corporation"
• Credit Limit: "10000" → "15000"
• Email: "old@acme.com" → "new@acme.com"
• Customer Terms: Added 1 item, Modified 1 item
• Customer Product Deals: Removed 1 item
```

**Combining with User Input:**

```typescript
const userChangeReason = command.customerDto.changeReason?.trim();

if (userChangeReason && formattedChanges) {
    // User provided reason + auto-detected changes
    existingCustomer.changeReason = `${userChangeReason}${formattedChanges}`;
} else if (userChangeReason) {
    // Only user-provided reason
    existingCustomer.changeReason = userChangeReason;
} else if (formattedChanges) {
    // Only auto-detected changes
    existingCustomer.changeReason = formattedChanges;
} else {
    // No changes detected
    existingCustomer.changeReason = undefined;
}
```

**Activity Log Integration:**

```typescript
let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
})}, Customer updated by ${command.user.username} for approval`;

// Append changes to activity log if detected
if (formattedChanges) {
    activityLogMessage += ` - ${formattedChanges}`;
}

existingCustomer.activityLogs.push(activityLogMessage);
```

---

## Implementation Guides

Each component has a detailed implementation guide with fully populated examples:

1. **[Commands Guide](./NESTJS_CQRS_COMMANDS_GUIDE.md)**
   - Command class patterns (Create, Update, Delete, Approve, Deny)
   - Constructor patterns with user context
   - TypeScript interfaces

2. **[Command Handlers Guide](./NESTJS_CQRS_COMMAND_HANDLERS_GUIDE.md)**
   - Handler implementation with @CommandHandler decorator
   - Business logic patterns
   - Validation strategies
   - Authorization checks
   - Status transitions
   - forApprovalVersion management
   - Error handling

3. **[Queries Guide](./NESTJS_CQRS_QUERIES_GUIDE.md)**
   - Query class patterns (GetById, GetByName, Pagination)
   - Parameter handling
   - Pagination support

4. **[Query Handlers Guide](./NESTJS_CQRS_QUERY_HANDLERS_GUIDE.md)**
   - Handler implementation with @QueryHandler decorator
   - Database service integration
   - Pagination patterns
   - Error handling

5. **[Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md)**
   - REST API endpoint patterns
   - Complete OpenAPI/Swagger documentation
   - CognitoAuthGuard integration
   - CommandBus/QueryBus execution
   - Testing support (userRole override)

6. **[Modules Guide](./NESTJS_CQRS_MODULES_GUIDE.md)**
   - Module configuration
   - Dependency injection setup
   - Provider registration
   - Import/export patterns

---

## Module Structure

**Standard Folder Organization:**

```
apps/{domain}/{entity}-api-service/src/app/{entity}/
├── command/
│   ├── create/
│   │   ├── create.command.ts
│   │   └── create.handler.ts
│   ├── update/
│   │   ├── update.command.ts
│   │   └── update.handler.ts
│   ├── delete/
│   │   ├── delete.command.ts
│   │   └── delete.handler.ts
│   ├── approve-record/
│   │   ├── approve.command.ts
│   │   └── approve.handler.ts
│   └── deny-record/
│       ├── deny.command.ts
│       └── deny.handler.ts
├── queries/
│   ├── get.by.id/
│   │   ├── get.{entity}.by.id.query.ts
│   │   └── get.{entity}.by.id.handler.ts
│   ├── get.by.name/                    (or other unique field)
│   │   ├── get.{entity}.by.name.query.ts
│   │   └── get.{entity}.by.name.handler.ts
│   ├── get.records.pagination/
│   │   ├── get.records.pagination.query.ts
│   │   └── get.records.pagination.handler.ts
│   └── get.records.by.status.pagination/
│       ├── get.records.by.status.pagination.query.ts
│       └── get.records.by.status.pagination.handler.ts
├── {entity}.controller.ts
└── {entity}.module.ts
```

**Example (Customer):**
```
apps/customer/customer-api-service/src/app/customer/
├── command/
│   ├── create/
│   │   ├── create.command.ts
│   │   └── create.handler.ts
│   ├── update/
│   │   ├── update.command.ts
│   │   └── update.handler.ts
│   ├── delete/
│   │   ├── delete.command.ts
│   │   └── delete.handler.ts
│   ├── approve-record/
│   │   ├── approve.command.ts
│   │   └── approve.handler.ts
│   └── deny-record/
│       ├── deny.command.ts
│       └── deny.handler.ts
├── queries/
│   ├── get.by.id/
│   │   ├── get.customer.by.id.query.ts
│   │   └── get.customer.by.id.handler.ts
│   ├── get.by.name/
│   │   ├── get.customer.by.name.query.ts
│   │   └── get.customer.by.name.handler.ts
│   ├── get.records.pagination/
│   │   ├── get.records.pagination.query.ts
│   │   └── get.records.pagination.handler.ts
│   └── get.records.by.status.pagination/
│       ├── get.records.by.status.pagination.query.ts
│       └── get.records.by.status.pagination.handler.ts
├── customer.controller.ts
└── customer.module.ts
```

---

## Best Practices

### 1. Validation

**Always Validate:**
- ✅ Unique field constraints before creation
- ✅ Record existence before update/delete
- ✅ User permissions for approve/deny operations
- ✅ Required fields are present
- ✅ Field formats and types

**Example:**
```typescript
// Validate unique name
const existingRecord = await this.customerDatabaseService.findRecordByName(
    command.customerDto.customerName
);

if (existingRecord) {
    throw new BadRequestException('Customer name already exists');
}

// Validate record exists
const existingCustomer = await this.customerDatabaseService.findRecordById(
    command.customerId
);

if (!existingCustomer) {
    throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
}

// Validate permissions
if (!user.roles || user.roles.length === 0) {
    throw new ForbiddenException('Insufficient permissions to approve customer');
}
```

### 2. Error Handling

**Use NestJS Exceptions:**
```typescript
import {
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
} from '@nestjs/common';
```

**Centralize Error Handling:**
```typescript
private handleError(error: unknown, customerId: string): never {
    this.logger.error(`Error processing request for customer ${customerId}:`, error);

    // Re-throw known exceptions
    if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
    ) {
        throw error;
    }

    // Handle unknown errors
    const errorMessage = this.extractErrorMessage(error);
    throw new BadRequestException(errorMessage);
}

private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error as { response?: { body?: { errorMessage?: string } } };
        return responseError.response?.body?.errorMessage || 'Unknown error occurred';
    }

    return 'An unexpected error occurred';
}
```

### 3. Constants

**Define at File Top:**
```typescript
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;
```

### 4. Type Safety

**Always Use Explicit Types:**
```typescript
// ✅ Good
async execute(command: CreateCustomerCommand): Promise<ResponseDto<CustomerDto>> {
    // ...
}

// ❌ Avoid
async execute(command) {
    // ...
}
```

**Use Enums:**
```typescript
// ✅ Good
command.customerDto.status = StatusEnum.ACTIVE;

// ❌ Avoid
command.customerDto.status = 'ACTIVE';
```

### 5. Logging

**Log All Mutations:**
```typescript
this.logger.log(`Processing create request for customer: ${command.customerDto.customerName}`);
this.logger.log(`Customer created successfully: ${createdRecord.customerId}`);
this.logger.error(`Error processing create request:`, error);
```

### 6. Testing Support

**userRole Override Pattern:**
```typescript
// In controller
@Post()
createRecord(
    @Body() dto: CreateCustomerDto,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    const command = new CreateCustomerCommand(dto, user);
    return this.commandBus.execute(command);
}
```

---

## Common Patterns

### ResponseDto Wrapper

**All handlers return ResponseDto:**
```typescript
// Single entity
return new ResponseDto<CustomerDto>(customerData, HTTP_STATUS_OK);

// Paginated results
return new ResponseDto<PageDto<CustomerDto>>(paginatedData, HTTP_STATUS_OK);

// On creation
return new ResponseDto<CustomerDto>(createdRecord, HTTP_STATUS_CREATED);
```

### Database Service Injection

**Standard Pattern:**
```typescript
import { Inject } from '@nestjs/common';

constructor(
    @Inject('CustomerDatabaseService')
    private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
) {}
```

### User Context Access

**In Controller:**
```typescript
import { CurrentUser, UserCognito } from '@auth-guard-lib';

@Post()
createRecord(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: UserCognito
) {
    const command = new CreateCustomerCommand(dto, user);
    return this.commandBus.execute(command);
}
```

**In Command:**
```typescript
import { UserCognito } from '@auth-guard-lib';

export class CreateCustomerCommand {
    constructor(
        public readonly customerDto: CreateCustomerDto,
        public readonly user: UserCognito
    ) {}
}
```

**In Handler:**
```typescript
// Access user information
const username = command.user.username;
const roles = command.user.roles;

// Check permissions
const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);
```

### Pagination Parameters

**Query Definition:**
```typescript
export class GetRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

**Handler Usage:**
```typescript
const paginatedResult = await this.customerDatabaseService.findRecordsByPagination(
    query.limit,
    query.direction,
    query.cursorPointer
);

return new ResponseDto<PageDto<CustomerDto>>(paginatedResult, HTTP_STATUS_OK);
```

**Controller Pattern:**
```typescript
@Get()
getRecordsPagination(
    @Query('limit') limit: number,
    @Query('direction') direction: string,
    @Query('cursorPointer') cursorPointer: string
) {
    const query = new GetCustomerRecordsPaginationQuery(limit, direction, cursorPointer);
    return this.queryBus.execute(query);
}
```

### Permission Checking

**Reusable Method:**
```typescript
private hasApprovalPermission(userRoles?: string[]): boolean {
    if (!userRoles || userRoles.length === 0) {
        return false;
    }

    return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
}
```

**Usage:**
```typescript
const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

if (hasApprovalPermission) {
    // Admin flow: apply changes directly
    command.customerDto.status = StatusEnum.ACTIVE;
} else {
    // User flow: require approval
    command.customerDto.status = StatusEnum.FOR_APPROVAL;
}
```

---

## Frontend Integration (Next.js Web App)

The Next.js app consumes these APIs through a shared data-access library. When updating modules/endpoints, keep these integration points aligned:

- **Runtime env loading:** Client fetches `/api/env` and caches values in sessionStorage; `getEnv()` returns cached values on subsequent calls ([libs/frontend/data-access/src/config/env.ts](libs/frontend/data-access/src/config/env.ts#L1-L120)). Add new env keys there to expose new API URLs.
- **Axios wrapper:** `AxiosConfig` sets `baseURL` from env, injects `Authorization` and `sessionId` headers, and reshapes Nest `ResponseDto` bodies into `{ data, statusCode, nextCursorPointer, prevCursorPointer }` ([libs/frontend/data-access/src/api/axiosConfig.ts](libs/frontend/data-access/src/api/axiosConfig.ts#L1-L94)). Keep API responses consistent with this shape.
- **Auth flows:** `AuthApi` hits `/login`, `/verify-mfa`, `/admin-create-user`, etc. without auth headers ([libs/frontend/data-access/src/api/auth.ts](libs/frontend/data-access/src/api/auth.ts#L1-L80)). Token-setting and redirects live in `useAuth` ([libs/frontend/data-access/src/hooks/useAuth.ts](libs/frontend/data-access/src/hooks/useAuth.ts#L1-L120)); adjust when auth endpoints or cookie names change.
- **Websocket selection:** `connectSocket` picks socket.io for localstack and native WebSocket for prod, appending the access token as a `token` query param ([libs/frontend/data-access/src/websocket/socket.ts](libs/frontend/data-access/src/websocket/socket.ts#L1-L120)). If websocket auth schema changes, update this builder alongside backend expectations.

---

## Summary

This modular guide system provides comprehensive patterns for implementing NestJS CQRS modules with:

✅ **Role-Based Authorization** - USER, ADMIN, SUPER_ADMIN permissions  
✅ **Approval Workflows** - NEW_RECORD, FOR_APPROVAL, FOR_DELETION status transitions  
✅ **Activity Logging** - Audit trail with Asia/Manila timezone  
✅ **Change Tracking** - Auto-detection with field-change-utils-lib  
✅ **OpenAPI Documentation** - Complete Swagger specs with examples  
✅ **Type Safety** - Full TypeScript support with strict types  
✅ **Error Handling** - Centralized exception management  
✅ **Testing Support** - userRole override for development  

---

## Next Steps

1. **Read [Commands Guide](./NESTJS_CQRS_COMMANDS_GUIDE.md)** to understand command patterns and structure
2. **Study [Command Handlers Guide](./NESTJS_CQRS_COMMAND_HANDLERS_GUIDE.md)** for business logic implementation
3. **Review [Queries Guide](./NESTJS_CQRS_QUERIES_GUIDE.md)** for query patterns
4. **Examine [Query Handlers Guide](./NESTJS_CQRS_QUERY_HANDLERS_GUIDE.md)** for data retrieval
5. **Learn [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md)** for REST API implementation
6. **Configure with [Modules Guide](./NESTJS_CQRS_MODULES_GUIDE.md)** for dependency injection

---

**Related Guides:**
- [DynamoDB Database Service Generation Guide](./DYNAMODB_DATABASE_SERVICE_GENERATION_GUIDE.md) - Database layer implementation
