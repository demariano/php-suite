# AI Guide: NestJS CQRS Queries Implementation

## Table of Contents
1. [Overview](#overview)
2. [Query Class Structure](#query-class-structure)
3. [GetById Query](#getbyid-query)
4. [GetByName Query](#getbyname-query)
5. [GetRecordsPagination Query](#getrecordspagination-query)
6. [GetRecordsByStatusPagination Query](#getrecordsbystatuspagination-query)
7. [Query Patterns](#query-patterns)
8. [Complete Examples](#complete-examples)

---

## Overview

Queries represent read operations in the CQRS pattern. They encapsulate the intent to retrieve data without modifying state.

**Key Characteristics:**
- Immutable data containers
- No user context required (read-only operations)
- Named with nouns or "Get" prefix
- No business logic (logic belongs in handlers)
- Simple constructors
- Support pagination parameters

**Standard Queries:**
1. **GetById** - Retrieve single entity by ID
2. **GetByName** - Retrieve entities by name (with pagination)
3. **GetRecordsPagination** - Retrieve all records (paginated)
4. **GetRecordsByStatusPagination** - Retrieve records filtered by status (paginated)

---

## Query Class Structure

### Basic Pattern

```typescript
export class GetEntityByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

**Components:**
- **Public readonly field** - For immutability
- **Simple constructor** - Just parameter assignment
- **No imports needed** - Queries are simple data containers (no DTOs or user context)

### File Naming Convention

```
queries/{operation}/
├── get.{entity}.by.{field}.query.ts     ← Query class
└── get.{entity}.by.{field}.handler.ts   ← Handler class

Examples:
- get.by.id/get.customer.by.id.query.ts
- get.by.name/get.customer.by.name.query.ts
- get.records.pagination/get.records.pagination.query.ts
- get.records.by.status.pagination/get.records.by.status.pagination.query.ts
```

---

## GetById Query

### Purpose
Retrieve a single entity by its unique identifier.

### Structure

```typescript
export class GetCustomerByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `recordId` | `string` | Unique identifier of the entity |

### Usage in Controller

```typescript
@Get(':id')
getById(@Param('id') id: string) {
    const query = new GetCustomerByIdQuery(id);
    return this.queryBus.execute(query);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/queries/get.by.id/get.customer.by.id.query.ts
export class GetCustomerByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

---

## GetByName Query

### Purpose
Retrieve entities by name with pagination support (for search/filter functionality).

### Structure

```typescript
export class GetCustomerByNameQuery {
    constructor(
        public readonly customerName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

### Parameters

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `customerName` | `string` | No | Name to search for (can be partial) |
| `limit` | `number` | Yes | Number of records to return (default: 10) |
| `direction` | `string` | Yes | Pagination direction: 'next' or 'prev' |
| `cursorPointer` | `string` | Yes | Cursor for pagination (null for first page) |

### Usage in Controller

```typescript
@Get('name/:name')
getByName(
    @Param('name') name: string,
    @Query('limit') limit?: number,
    @Query('direction') direction?: string,
    @Query('cursorPointer') cursorPointer?: string
) {
    const query = new GetCustomerByNameQuery(name, limit, direction, cursorPointer);
    return this.queryBus.execute(query);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/queries/get.by.name/get.customer.by.name.query.ts
export class GetCustomerByNameQuery {
    constructor(
        public readonly customerName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

---

## GetRecordsPagination Query

### Purpose
Retrieve all records with pagination support.

### Structure

```typescript
export class GetCustomerRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | `number` | Number of records to return per page |
| `direction` | `string` | Pagination direction: 'next' or 'prev' (or undefined for first page) |
| `cursorPointer` | `string` | Cursor for pagination (undefined/null for first page) |

### Usage in Controller

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

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/queries/get.records.pagination/get.records.pagination.query.ts
export class GetCustomerRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

---

## GetRecordsByStatusPagination Query

### Purpose
Retrieve records filtered by status with optional name search and pagination.

### Structure

```typescript
export class GetRecordsByStatusPaginationQuery {
    constructor(
        public readonly status: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly name: string
    ) {}
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `string` | Status filter (ACTIVE, FOR_APPROVAL, NEW_RECORD, FOR_DELETION) |
| `limit` | `number` | Number of records to return per page |
| `direction` | `string` | Pagination direction: 'next' or 'prev' |
| `cursorPointer` | `string` | Cursor for pagination |
| `name` | `string` | Optional name filter for search within status |

### Usage in Controller

```typescript
@Get('/status')
getRecordsPaginationByStatus(
    @Query('limit') limit: number,
    @Query('direction') direction: string,
    @Query('cursorPointer') cursorPointer: string,
    @Query('status') status: string,
    @Query('name') name: string
) {
    return this.queryBus.execute(
        new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
    );
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/queries/get.records.by.status.pagination/get.records.by.status.pagination.query.ts
export class GetRecordsByStatusPaginationQuery {
    constructor(
        public readonly status: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly name: string
    ) {}
}
```

---

## Query Patterns

### Pattern 1: Simple ID Lookup

**When to use:** Retrieving a single entity by unique identifier

```typescript
export class GetEntityByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

**Characteristics:**
- Single string parameter
- No pagination
- Returns single entity or null
- Most straightforward query pattern

### Pattern 2: Search with Pagination

**When to use:** Text search or filtering with pagination

```typescript
export class GetEntityByNameQuery {
    constructor(
        public readonly entityName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

**Characteristics:**
- Search term + pagination parameters
- Optional pagination (defaults in handler)
- Returns PageDto with cursor pointers
- Supports partial matches (contains)

### Pattern 3: Paginated List

**When to use:** Listing all records with pagination

```typescript
export class GetEntityRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

**Characteristics:**
- Only pagination parameters
- No filters
- Returns PageDto
- All parameters required (can be undefined/null)

### Pattern 4: Filtered Paginated List

**When to use:** Filtered list with multiple criteria and pagination

```typescript
export class GetRecordsByStatusPaginationQuery {
    constructor(
        public readonly status: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly searchTerm: string
    ) {}
}
```

**Characteristics:**
- Filter criteria + search + pagination
- Multiple parameters
- Returns PageDto
- Combines filtering and searching

### Comparison Table

| Query | Parameters | Pagination | Filter | Returns |
|-------|-----------|------------|--------|---------|
| **GetById** | ID only | ❌ No | ❌ No | Single entity |
| **GetByName** | Name + optional pagination | ✅ Yes | Name | PageDto |
| **GetRecordsPagination** | Pagination only | ✅ Yes | ❌ No | PageDto |
| **GetRecordsByStatusPagination** | Status + name + pagination | ✅ Yes | Status, Name | PageDto |

---

## Complete Examples

### Example 1: Customer Queries (Complete Set)

```typescript
// get.customer.by.id.query.ts
export class GetCustomerByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

```typescript
// get.customer.by.name.query.ts
export class GetCustomerByNameQuery {
    constructor(
        public readonly customerName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

```typescript
// get.records.pagination.query.ts
export class GetCustomerRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

```typescript
// get.records.by.status.pagination.query.ts
export class GetRecordsByStatusPaginationQuery {
    constructor(
        public readonly status: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly name: string
    ) {}
}
```

### Example 2: Product Queries

```typescript
// get.product.by.id.query.ts
export class GetProductByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

```typescript
// get.product.by.name.query.ts
export class GetProductByNameQuery {
    constructor(
        public readonly productName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

### Example 3: Invoice Queries

```typescript
// get.invoice.by.id.query.ts
export class GetInvoiceByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

```typescript
// get.invoice.by.docno.query.ts
export class GetInvoiceByDocnoQuery {
    constructor(
        public readonly docno: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

### Example 4: Entity with Multiple Unique Fields

```typescript
// get.user.by.id.query.ts
export class GetUserByIdQuery {
    constructor(public readonly recordId: string) {}
}
```

```typescript
// get.user.by.email.query.ts
export class GetUserByEmailQuery {
    constructor(public readonly email: string) {}
}
```

```typescript
// get.user.by.username.query.ts
export class GetUserByUsernameQuery {
    constructor(public readonly username: string) {}
}
```

---

## Advanced Patterns

### Custom Filter Query

For complex filtering needs:

```typescript
export class GetCustomersByFilterQuery {
    constructor(
        public readonly filter: CustomerFilterDto,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
```

### Multi-Field Search Query

For searching across multiple fields:

```typescript
export class SearchCustomersQuery {
    constructor(
        public readonly searchTerm: string,
        public readonly searchFields: string[],
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

### Date Range Query

For time-series data:

```typescript
export class GetInvoicesByDateRangeQuery {
    constructor(
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}
```

---

## Summary

**Query Implementation Checklist:**

- [ ] Create query file in `queries/{operation}/get.{entity}.by.{field}.query.ts`
- [ ] Define public readonly fields
- [ ] Create simple constructor with parameter assignment
- [ ] Follow naming convention: `Get{Entity}By{Field}Query` or `Get{Entity}RecordsPaginationQuery`
- [ ] Include appropriate parameters:
  - GetById: ID only
  - GetByName: Name + optional pagination
  - GetRecordsPagination: Pagination parameters
  - GetRecordsByStatusPagination: Status + name + pagination
- [ ] Use optional parameters (`?`) for pagination when appropriate
- [ ] No imports needed (queries are simple data containers)

**Key Points:**
- ✅ Queries are immutable data containers
- ✅ No business logic in queries
- ✅ No user context required (read-only)
- ✅ Simple constructors only
- ✅ Public readonly fields for immutability
- ✅ Support pagination for list operations
- ✅ Name queries clearly (Get prefix)

---

**Next Steps:**
- Review [Query Handlers Guide](./NESTJS_CQRS_QUERY_HANDLERS_GUIDE.md) for data retrieval implementation
- Study [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md) for query execution patterns
