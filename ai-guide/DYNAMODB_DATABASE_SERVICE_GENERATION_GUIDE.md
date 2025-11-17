# AI Guide: Generating DynamoDB Database Services from OneTable Schemas

## Table of Contents
1. [Overview](#overview)
2. [Schema Analysis](#schema-analysis)
3. [TypeScript Type Generation](#typescript-type-generation)
4. [Abstract Class Generation](#abstract-class-generation)
5. [Database Service Implementation](#database-service-implementation)
6. [GSI Strategy & Query Methods](#gsi-strategy--query-methods)
7. [Pagination Implementation](#pagination-implementation)
8. [DTO Conversion Patterns](#dto-conversion-patterns)
9. [Validation & Error Handling](#validation--error-handling)
10. [NestJS-Specific Patterns](#nestjs-specific-patterns)
11. [Complete Examples](#complete-examples)

---

## Overview

This guide provides step-by-step instructions for AI models to generate complete database service implementations from DynamoDB OneTable schemas. The generated code follows enterprise patterns with:
- NestJS dependency injection
- Type-safe operations
- Comprehensive error handling
- Efficient GSI utilization
- Cursor-based pagination
- Audit logging

---

## Schema Analysis

### Step 1: Parse Schema Structure

Given a schema file (e.g., `CustomerSchema.ts` or `InvoicingSchema.ts`), extract:

#### A. Schema Metadata
```typescript
export const [Entity]Schema = {
    version: '0.0.1',
    indexes: { /* ... */ },
    models: { /* ... */ },
    params: { isoDates: true, timestamps: true },
};
```

#### B. Index Configuration
```typescript
indexes: {
    primary: { hash: 'PK', sort: 'SK' },
    GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
    GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' },
    // ... up to GSI13 for complex schemas
}
```

#### C. Model Definition
For each model in `models`:
- **Primary Keys:** Extract PK and SK value patterns
- **Auto-generated fields:** Identify fields with `generate: 'ulid'`
- **Required fields:** Check `required: true/false`
- **Enum fields:** Extract enum values (especially `status`)
- **Relationship fields:** Identify denormalized pairs (e.g., `customerId` + `customerName`)
- **Array fields:** Fields with `type: Array`
- **Object fields:** Fields with `type: Object`
- **GSI Keys:** Extract all GSI PK/SK value patterns

**Example Extraction:**
```typescript
// From CustomerSchema
Model: Customer
Primary: PK = 'CUSTOMER', SK = '${customerId}'
ID Field: customerId (generate: 'ulid')
Status Enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD', 'DRAFT']
GSI1: PK = 'CUSTOMER', SK = '${customerName}' (All customers by name)
GSI2: PK = 'CUSTOMER#${status}', SK = '${customerName}' (By status)
GSI3: PK = 'CUSTOMER#${customerClassificationId}', SK = '${customerName}' (By classification)
// ... etc
```

### Step 2: Analyze GSI Access Patterns

For each GSI, determine its purpose:

| GSI Pattern | Purpose | Query Type |
|------------|---------|------------|
| `ENTITY` / `${name}` | Browse all by name | List all, search by name |
| `ENTITY#${status}` / `${name}` | Filter by status | Status-filtered pagination |
| `ENTITY#${relatedId}` / `${name}` | One-to-many relationship | Find all by related entity |
| `ENTITY#${field}` / `${date}` | Time-series by category | Date-based queries |
| `ENTITY` / `${date}` | All records by date | Chronological listing |
| `ENTITY` / `${docno}` | Unique identifier lookup | Document number search |
| `ENTITY#${f1}#${f2}#${f3}` / `${sk}` | Compound filter | Multi-field queries |

**Example - Invoice Schema GSI Analysis:**
```typescript
GSI1:  PK='INVOICE', SK='${invoiceId}' → All invoices by ID (alternate lookup)
GSI2:  PK='INVOICE#${status}', SK='${docno}' → Filter by status, sort by docno
GSI3:  PK='INVOICE#${customerId}', SK='${invoiceDate}' → Customer's invoices by date
GSI11: PK='INVOICE', SK='${invoiceDate}' → All invoices chronologically
GSI12: PK='INVOICE', SK='${docno}' → Search/lookup by document number
GSI13: PK='INVOICE#${customerId}#${paymentStatus}#${status}', SK='${docno}' → Complex filter
```

---

## TypeScript Type Generation

### Step 3: Generate DataType Export

At the end of the schema file, create type exports:

```typescript
import { Entity } from 'dynamodb-onetable';

// For each model in the schema
export type [ModelName]DataType = Entity<typeof [Entity]Schema.models.[ModelName]>;

// Example:
export type CustomerDataType = Entity<typeof CustomerSchema.models.Customer>;
export type CustomerClassificationDataType = Entity<typeof CustomerSchema.models.CustomerClassification>;
export type InvoiceDataType = Entity<typeof InvoicingSchema.models.Invoice>;
```

**Rule:** Export one type per model defined in the schema.

---

## Abstract Class Generation

### Step 4: Create Abstract Service Class

**File naming:** `[entity]-database-service-abstract-class.ts`

**Template:**
```typescript
import { Create[Entity]Dto, [Entity]Dto, [Entity]FilterDto, PageDto } from '@dto';

export abstract class [Entity]DatabaseServiceAbstract {
    // CRUD Operations
    abstract createRecord(dto: Create[Entity]Dto): Promise<[Entity]Dto>;
    abstract updateRecord(dto: [Entity]Dto): Promise<[Entity]Dto>;
    abstract findRecordById(id: string): Promise<[Entity]Dto | null>;
    abstract deleteRecord(dto: [Entity]Dto): Promise<[Entity]Dto>;
    
    // Unique Field Lookup (if entity has unique name/identifier)
    abstract findRecordBy[UniqueField](field: string): Promise<[Entity]Dto | null>;
    
    // Search Operations (contains)
    abstract findRecordContaining[Field](field: string): Promise<[Entity]Dto[] | null>;
    
    // Pagination - Base
    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<[Entity]Dto>>;
    
    // Pagination - By Status (if status field exists)
    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        searchField: string
    ): Promise<PageDto<[Entity]Dto>>;
    
    // Pagination - By Unique Field (name, docno, etc.)
    abstract findRecordsBy[Field]Pagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        searchValue: string
    ): Promise<PageDto<[Entity]Dto>>;
    
    // Pagination - Complex Filter
    abstract find[Entity]RecordsByFilterPagination(
        filter: [Entity]FilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<[Entity]Dto>>;
    
    // Relationship Queries (for each GSI with pattern ENTITY#${relatedId})
    abstract findAll[Entity]sBy[RelatedEntity]Id(relatedId: string): Promise<[Entity]Dto[]>;
    
    // Utility/Testing
    abstract deleteAllRecords(): Promise<void>;
    
    // Conversion Methods
    abstract convertToDto(record: [Entity]DataType): Promise<[Entity]Dto>;
    abstract convertToDtoList(records: [Entity]DataType[]): Promise<[Entity]Dto[]>;
    abstract convertToDataType(dto: [Entity]Dto): Promise<[Entity]DataType>;
}
```

**Method Generation Rules:**

1. **For each GSI with pattern `ENTITY#${relatedId}`:**
   ```typescript
   abstract findAll[Entity]sBy[RelatedField]Id(id: string): Promise<[Entity]Dto[]>;
   ```

2. **For unique fields (name, docno):**
   ```typescript
   abstract findRecordBy[UniqueField](value: string): Promise<[Entity]Dto | null>;
   abstract findRecordContaining[UniqueField](value: string): Promise<[Entity]Dto[] | null>;
   abstract findRecordsBy[UniqueField]Pagination(...): Promise<PageDto<[Entity]Dto>>;
   ```

3. **For compound GSI patterns (GSI13 in Invoice):**
   ```typescript
   abstract find[SpecificUseCase]([...params]): Promise<[Entity]Dto[] | null>;
   // Example: findPendingPaymentInvoices(customerId: string, status: string)
   ```

---

## Database Service Implementation

### Step 5: Generate Service Class

**File naming:** `[entity]-database-service.ts`

#### A. Imports & Decorator
```typescript
import { 
    Create[Entity]Dto, 
    [Entity]Dto, 
    [Entity]FilterDto, 
    PageDto, 
    StatusEnum 
} from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    [Entity]DataType,
    [Entity]Schema,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { [Entity]DatabaseServiceAbstract } from './[entity]-database-service-abstract-class';

@Injectable()
export class [Entity]DatabaseService implements [Entity]DatabaseServiceAbstract {
    protected readonly logger = new Logger([Entity]DatabaseService.name);
    
    private readonly [entity]Table: Model<[Entity]DataType>;
    
    // Constructor follows...
}
```

#### B. Constructor Pattern
```typescript
constructor(private readonly configService: ConfigService) {
    // 1. Get table name from environment
    const DYNAMO_DB_[ENTITY]_TABLE = configService.get<string>('DYNAMO_DB_[ENTITY]_TABLE');
    
    // 2. Validate table name exists
    if (!DYNAMO_DB_[ENTITY]_TABLE) {
        throw new Error('DYNAMO_DB_[ENTITY]_TABLE is not defined in the configuration');
    }
    
    // 3. Initialize DynamoDB service
    const dynamoDbService = new DynamoDbLibService(configService);
    
    // 4. Get model from schema
    this.[entity]Table = dynamoDbService
        .dynamoDbMainTable(DYNAMO_DB_[ENTITY]_TABLE, [Entity]Schema)
        .getModel('[ModelName]');
}
```

**Key Points:**
- Environment variable naming: `DYNAMO_DB_[ENTITY]_TABLE`
- Model name matches schema model key exactly
- Throw descriptive error if table name missing

---

## CRUD Operations

### Step 6: Implement Create Operation

```typescript
async createRecord([entity]Dto: Create[Entity]Dto): Promise<[Entity]Dto> {
    // 1. Map DTO to DataType
    const [entity]Data: [Entity]DataType = {
        // Map all business fields from DTO
        status: [entity]Dto.status,
        [field1]: [entity]Dto.[field1],
        [field2]: [entity]Dto.[field2],
        // ... all other fields
        
        // 2. Populate ALL GSI keys based on schema patterns
        GSI1PK: `ENTITY`,
        GSI1SK: [entity]Dto.[sortField],
        GSI2PK: `ENTITY#${[entity]Dto.status}`,
        GSI2SK: [entity]Dto.[sortField],
        GSI3PK: `ENTITY#${[entity]Dto.[relatedField1Id]}`,
        GSI3SK: [entity]Dto.[sortField],
        // ... all GSI keys from schema
    };
    
    // 3. Create record (ID auto-generated by schema)
    const [entity]Record: [Entity]DataType = await this.[entity]Table.create([entity]Data);
    
    // 4. Convert and return DTO
    return await this.convertToDto([entity]Record);
}
```

**Critical Rules:**
- **Always populate ALL GSI keys** defined in schema
- Use exact patterns from schema (e.g., `CUSTOMER#${status}`)
- DynamoDB OneTable auto-generates ID fields marked with `generate: 'ulid'`
- Don't set PK/SK manually - they're auto-set by OneTable based on schema

### Step 7: Implement Update Operation

```typescript
async updateRecord(record: [Entity]Dto): Promise<[Entity]Dto> {
    // 1. Convert DTO to DataType
    const [entity]Record: [Entity]DataType = await this.convertToDataType(record);
    
    // 2. CRITICAL: Explicitly set changeReason before update
    // This ensures the field persists even if convertToDataType is called separately
    [entity]Record.changeReason = record.changeReason;
    
    // 3. Update record
    const updated[Entity]Record: [Entity]DataType = await this.[entity]Table.update([entity]Record);
    
    // 4. Convert and return
    return await this.convertToDto(updated[Entity]Record);
}
```

**Why explicit changeReason assignment?**
The `changeReason` field is often optional and may not be included in the type definition. Explicitly setting it ensures audit trail persistence.

### Step 8: Implement Find By ID

```typescript
async findRecordById(id: string): Promise<[Entity]Dto | null> {
    // 1. Query using primary key
    const record = await this.[entity]Table.get({
        PK: `ENTITY`,
        SK: `${id}`,
    });
    
    // 2. Return null if not found
    if (!record) {
        return null;
    }
    
    // 3. Convert and return
    return await this.convertToDto(record);
}
```

**Pattern:** Use primary key (PK/SK) for single-item lookups by ID.

### Step 9: Implement Delete Operation

```typescript
async deleteRecord(dto: [Entity]Dto): Promise<[Entity]Dto> {
    // 1. Convert to DataType
    const [entity]Record: [Entity]DataType = await this.convertToDataType(dto);
    
    // 2. Remove from table
    await this.[entity]Table.remove([entity]Record);
    
    // 3. Log deletion for audit
    this.logger.log(`[Entity] Record hard deleted: ${JSON.stringify([entity]Record)}`);
    
    // 4. Return deleted record
    return await this.convertToDto([entity]Record);
}
```

### Step 10: Implement Bulk Delete (Testing Only)

```typescript
async deleteAllRecords(): Promise<void> {
    // 1. Get all records using GSI
    const records = await this.[entity]Table.find(
        {
            GSI1PK: `ENTITY`,
        },
        {
            index: 'GSI1',
        }
    );
    
    // 2. Delete each record
    for (const record of records) {
        await this.[entity]Table.remove(record);
    }
}
```

**Warning:** This is for testing/cleanup only. Use GSI1 (all entities) for bulk operations.

---

## GSI Strategy & Query Methods

### Step 11: Generate Query Methods Based on GSI Patterns

#### Pattern 1: Find by Unique Field (GSI with ENTITY / ${uniqueField})

**Use Case:** Exact match lookup by name, docno, etc.

```typescript
async findRecordBy[UniqueField]([field]: string): Promise<[Entity]Dto | null> {
    const record = await this.[entity]Table.get(
        {
            GSI[N]PK: `ENTITY`,
            GSI[N]SK: `${[field]}`,
        },
        {
            index: 'GSI[N]',
        }
    );
    
    if (!record) {
        return null;
    }
    
    return await this.convertToDto(record);
}
```

**Example (Customer by name using GSI1):**
```typescript
async findRecordByName(name: string): Promise<CustomerDto | null> {
    const record = await this.customerTable.get(
        {
            GSI1PK: `CUSTOMER`,
            GSI1SK: `${name}`,
        },
        {
            index: 'GSI1',
        }
    );
    
    if (!record) return null;
    return await this.convertToDto(record);
}
```

#### Pattern 2: Contains Search

**Use Case:** Partial match search

```typescript
async findRecordContaining[Field]([field]: string): Promise<[Entity]Dto[] | null> {
    const [entity]Records = await this.[entity]Table.find(
        {
            GSI[N]PK: 'ENTITY',
        },
        {
            where: 'contains(${[fieldName]}, @{[fieldName]})',
            substitutions: {
                [fieldName]: [field],
            },
            index: 'GSI[N]',
        }
    );
    
    return await this.convertToDtoList([entity]Records);
}
```

**Example (Customer name contains):**
```typescript
async findRecordContainingName(name: string): Promise<CustomerDto[] | null> {
    const customerRecords = await this.customerTable.find(
        {
            GSI1PK: 'CUSTOMER',
        },
        {
            where: 'contains(${customerName}, @{customerName})',
            substitutions: {
                customerName: name,
            },
            index: 'GSI1',
        }
    );
    
    return await this.convertToDtoList(customerRecords);
}
```

#### Pattern 3: Find All by Related Entity (One-to-Many)

**Use Case:** Get all customers in an area, all invoices for a customer, etc.

```typescript
async findAll[Entity]sBy[RelatedEntity]Id([relatedId]: string): Promise<[Entity]Dto[]> {
    const [entity]Records = await this.[entity]Table.find(
        {
            GSI[N]PK: `ENTITY#${[relatedId]}`,
        },
        {
            index: 'GSI[N]',
        }
    );
    
    return await this.convertToDtoList([entity]Records);
}
```

**Examples:**
```typescript
// Customer - GSI3 (by classification)
async findAllCustomersByClassificationId(customerClassificationId: string): Promise<CustomerDto[]> {
    const customerRecords = await this.customerTable.find(
        { GSI3PK: `CUSTOMER#${customerClassificationId}` },
        { index: 'GSI3' }
    );
    return await this.convertToDtoList(customerRecords);
}

// Customer - GSI5 (by area)
async findAllCustomersByAreaId(areaId: string): Promise<CustomerDto[]> {
    const customerRecords = await this.customerTable.find(
        { GSI5PK: `CUSTOMER#${areaId}` },
        { index: 'GSI5' }
    );
    return await this.convertToDtoList(customerRecords);
}
```

#### Pattern 4: Compound Query (Multi-field Filter)

**Use Case:** Complex filters like "invoices for customer X with payment status Y and status Z"

```typescript
async find[SpecificUseCase]([param1]: string, [param2]: string): Promise<[Entity]Dto[] | null> {
    // Query first condition
    const records1 = await this.[entity]Table.find(
        {
            GSI[N]PK: `ENTITY#${[param1]}#${[value1]}#${[param2]}`,
        },
        { index: 'GSI[N]' }
    );
    
    // Query second condition (if needed)
    const records2 = await this.[entity]Table.find(
        {
            GSI[N]PK: `ENTITY#${[param1]}#${[value2]}#${[param2]}`,
        },
        { index: 'GSI[N]' }
    );
    
    // Merge results
    const dto1 = await this.convertToDtoList(records1);
    const dto2 = await this.convertToDtoList(records2);
    
    return dto1.concat(dto2);
}
```

**Example (Invoice - GSI13):**
```typescript
// Find invoices for customer that are pending or partially paid
async findPendingPaymentInvoices(customerId: string, status: string): Promise<InvoiceDto[] | null> {
    const pendingPaymentInvoices = await this.invoiceTable.find(
        {
            GSI13PK: `INVOICE#${customerId}#${PaymentStatusEnum.PENDING}#${status}`,
        },
        { index: 'GSI13' }
    );
    
    const partialPaymentInvoices = await this.invoiceTable.find(
        {
            GSI13PK: `INVOICE#${customerId}#${PaymentStatusEnum.PARTIAL}#${status}`,
        },
        { index: 'GSI13' }
    );
    
    const pendingDto = await this.convertToDtoList(pendingPaymentInvoices);
    const partialDto = await this.convertToDtoList(partialPaymentInvoices);
    
    return pendingDto.concat(partialDto);
}
```

---

## Pagination Implementation

### Step 12: Understand Pagination Utilities

#### A. createDynamoDbOptionWithPKSKIndex

**Purpose:** Create query options for cursor-based pagination

**Signature:**
```typescript
function createDynamoDbOptionWithPKSKIndex(
    limit: number,
    indexName: string,
    direction: string,
    cursorPointer: string
): { [key: string]: any }
```

**Parameters:**
- `limit` - Number of items to fetch (function adds +1 internally)
- `indexName` - GSI name ('GSI1', 'GSI2', etc.)
- `direction` - 'next' or 'prev' for pagination direction
- `cursorPointer` - URL-encoded JSON cursor from previous query

**Returns:**
```typescript
{
    limit: number + 1,  // +1 to detect if more results exist
    follow: true,       // Follow pagination
    index: string,      // GSI name
    next?: object,      // Cursor for next direction
    prev?: object,      // Cursor for prev direction
}
```

**Key Logic:**
```typescript
// Always add 1 to limit
dbOptions['limit'] = limitNumber + 1;

// Follow pagination cursors
dbOptions['follow'] = true;

// Decode cursor if provided
if (cursorPointer != null) {
    const sanitizedCursorPointer = decodeURIComponent(cursorPointer);
    dbOptions[direction] = JSON.parse(sanitizedCursorPointer);
}

// Validate: if direction provided, cursor must exist
if (direction != null && cursorPointer == null) {
    throw new BadRequestException('Cursor Pointer Can\'t be null if direction is not null');
}

// Set index
if (indexName != null) {
    dbOptions['index'] = indexName;
}
```

#### B. pageRecordHandler

**Purpose:** Process query results and generate next/prev cursor pointers

**Signature:**
```typescript
function pageRecordHandler(
    records: any[],
    limit: number,
    direction: string,
    indexKey: string,      // GSI partition key (e.g., 'GSI1PK')
    sortKey: string,       // GSI sort key (e.g., 'GSI1SK')
    primaryKey: string,    // Primary partition key ('PK')
    primarySortKey: string,// Primary sort key ('SK')
    nextCursorPointer: string,
    prevCursorPointer: string
): { nextCursorPointer: any, prevCursorPointer: any }
```

**Logic Flow:**
```typescript
// 1. If no records, return null cursors
if (records.length == 0) {
    return { nextCursorPointer: null, prevCursorPointer: null };
}

// 2. If records < limit, we're on last page (no next)
if (records.length < limit) {
    return { nextCursorPointer: null, prevCursorPointer: original };
}

// 3. Remove extra record based on direction
if (nextCursorPointer != null && direction != 'prev') {
    records.pop();  // Remove last item
}

if (prevCursorPointer != null && direction != 'next') {
    records.shift();  // Remove first item
}

// 4. Generate cursor from last/first record
// Next cursor: last record's keys
// Prev cursor: first record's keys
```

**Cursor Structure:**
```typescript
{
    [indexKey]: record[indexKey],           // GSI partition key value
    [sortKey]: record[sortKey],             // GSI sort key value
    [primaryKey]: record[primaryKey],       // Primary partition key value
    [primarySortKey]: record[primarySortKey] // Primary sort key value
}
```

**Why include both GSI and primary keys?**
DynamoDB requires both to uniquely identify position in pagination, especially when GSI values are not unique.

### Step 13: Implement Pagination Methods

#### Pattern A: Basic Pagination (All Records)

```typescript
async findRecordsByPagination(
    limit: number,
    direction: string,
    cursorPointer: string
): Promise<PageDto<[Entity]Dto>> {
    // 1. Convert limit to number
    limit = Number(limit);
    
    // 2. Create DynamoDB options
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI1',  // Use GSI that lists all entities
        direction, 
        cursorPointer
    );
    
    // 3. Query records
    const records = await this.[entity]Table.find(
        {
            GSI1PK: `ENTITY`,
        },
        dynamoDbOption
    );
    
    // 4. Process pagination
    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI1PK',
        'GSI1SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );
    
    // 5. Return PageDto
    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

#### Pattern B: Pagination with Status Filter

```typescript
async findRecordsByStatusPagination(
    limit: number,
    status: string,
    direction: string,
    cursorPointer: string,
    searchField: string
): Promise<PageDto<[Entity]Dto>> {
    limit = Number(limit);
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI2',  // Status GSI
        direction, 
        cursorPointer
    );
    
    const records = await this.[entity]Table.find(
        {
            GSI2PK: `ENTITY#${status}`,
            // Optional: add begins-with filter on sort key
            ...(searchField != null ? { GSI2SK: { begins: searchField } } : {}),
        },
        dynamoDbOption
    );
    
    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI2PK',
        'GSI2SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );
    
    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

**Key Pattern - Conditional Sort Key Filter:**
```typescript
...(searchField != null ? { GSI2SK: { begins: searchField } } : {})
```
Uses spread operator to conditionally add `begins-with` filter.

#### Pattern C: Pagination with Name Search

```typescript
async findRecordsByNamePagination(
    limit: number,
    direction: string,
    cursorPointer: string,
    name: string
): Promise<PageDto<[Entity]Dto>> {
    limit = Number(limit);
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI1', 
        direction, 
        cursorPointer
    );
    
    const records = await this.[entity]Table.find(
        {
            GSI1PK: `ENTITY`,
            // Add name filter with trimming and null check
            ...(name != null && name.trim() !== '' ? { GSI1SK: { begins: name.trim() } } : {}),
        },
        dynamoDbOption
    );
    
    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI1PK',
        'GSI1SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );
    
    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

#### Pattern D: Complex Filter Pagination

```typescript
async find[Entity]RecordsByFilterPagination(
    filter: [Entity]FilterDto,
    limit: number,
    direction: string,
    cursorPointer: string
): Promise<PageDto<[Entity]Dto>> {
    limit = Number(limit);
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI1', 
        direction, 
        cursorPointer
    );
    
    // Build dynamic WHERE clause
    const whereClause = [
        filter.status ? 'contains(${status}, @{status})' : null,
        filter.categoryIds && filter.categoryIds.length > 0
            ? '(${categoryId} IN (@{...categoryIds}))'
            : null,
        filter.typeIds && filter.typeIds.length > 0
            ? '(${typeId} IN (@{...typeIds}))'
            : null,
        // Add more conditions as needed
    ]
        .filter(Boolean)  // Remove null entries
        .join(' and ');   // Join with AND
    
    // Build substitutions
    const substitutions = {
        ...(filter.status && { status: filter.status.toLowerCase() }),
        ...(filter.categoryIds && filter.categoryIds.length > 0 && { 
            categoryIds: filter.categoryIds 
        }),
        ...(filter.typeIds && filter.typeIds.length > 0 && { 
            typeIds: filter.typeIds 
        }),
    };
    
    // Normalize field projection
    if (filter.fields && !Array.isArray(filter.fields)) {
        filter.fields = [filter.fields];
    }
    
    // Ensure ID field is always included
    if (!filter.fields?.includes('[entity]Id')) {
        filter.fields?.push('[entity]Id');
    }
    
    const records = await this.[entity]Table.find(
        {
            GSI1PK: 'ENTITY',
        },
        {
            fields: filter.fields ? filter.fields : undefined,
            where: whereClause || undefined,
            substitutions: Object.keys(substitutions).length > 0 ? substitutions : undefined,
            reverse: filter.reverse,
            ...dynamoDbOption,
        }
    );
    
    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI1PK',
        'GSI1SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );
    
    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

**DynamoDB OneTable WHERE Clause Syntax:**
- **Contains:** `contains(${fieldName}, @{substitutionKey})`
- **IN operator:** `(${fieldName} IN (@{...arraySubstitutionKey}))`
- **Comparison:** `${fieldName} >= @{value}`
- **Combine:** Use `' and '` or `' or '`

---

## DTO Conversion Patterns

### Step 14: Implement Conversion Methods

#### A. convertToDto (DataType → DTO)

```typescript
async convertToDto(record: [Entity]DataType): Promise<[Entity]Dto> {
    const dto = new [Entity]Dto();
    
    // Map each field with default values
    dto.[entityId] = record.[entityId] ? record.[entityId] : '';
    dto.[field1] = record.[field1] ? record.[field1] : '';
    dto.[numericField] = record.[numericField] ? record.[numericField] : 0;
    dto.[booleanField] = record.[booleanField] ? record.[booleanField] : false;
    dto.[arrayField] = record.[arrayField] ? record.[arrayField] : [];
    dto.[objectField] = record.[objectField] ? record.[objectField] : {};
    
    // Handle enums with casting and defaults
    dto.status = record.status 
        ? (record.status as StatusEnum) 
        : StatusEnum.ACTIVE;
    
    // Handle optional fields that may not be in type
    dto.changeReason = (record as [Entity]DataType & { changeReason?: string }).changeReason || undefined;
    
    // Audit fields
    dto.activityLogs = record.activityLogs ? record.activityLogs : [];
    dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
    
    return dto;
}
```

**Conversion Rules:**
| Field Type | Default Value |
|-----------|---------------|
| String | `''` (empty string) |
| Number | `0` |
| Boolean | `false` |
| Array | `[]` |
| Object | `{}` |
| Enum | First/default enum value |
| Optional | `undefined` |

**Enum Handling:**
```typescript
dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
```

**Optional Field Pattern (for fields not in strict type):**
```typescript
dto.changeReason = (record as [Entity]DataType & { changeReason?: string }).changeReason || undefined;
```

#### B. convertToDtoList (Array Conversion)

```typescript
async convertToDtoList(records: [Entity]DataType[]): Promise<[Entity]Dto[]> {
    const dtoList: [Entity]Dto[] = [];
    
    for (const record of records) {
        const dto: [Entity]Dto = await this.convertToDto(record);
        dtoList.push(dto);
    }
    
    return dtoList;
}
```

#### C. convertToDataType (DTO → DataType)

```typescript
async convertToDataType(dto: [Entity]Dto): Promise<[Entity]DataType> {
    const [entity]Data: [Entity]DataType = {
        // Map ID
        [entityId]: dto.[entityId],
        
        // Map all business fields
        status: dto.status,
        [field1]: dto.[field1],
        [field2]: dto.[field2],
        // ... all other fields
        
        // Populate ALL GSI keys (same as createRecord)
        GSI1PK: `ENTITY`,
        GSI1SK: dto.[sortField],
        GSI2PK: `ENTITY#${dto.status}`,
        GSI2SK: dto.[sortField],
        GSI3PK: `ENTITY#${dto.[relatedField1Id]}`,
        GSI3SK: dto.[sortField],
        // ... all GSI keys
        
        // Audit fields
        activityLogs: dto.activityLogs,
        forApprovalVersion: dto.forApprovalVersion,
        changeReason: dto.changeReason,
    };
    
    return [entity]Data;
}
```

**CRITICAL:** Always populate ALL GSI keys in `convertToDataType`. This is used by `updateRecord`, and GSI keys must be present for updates to work correctly.

---

## Validation & Error Handling

### Step 15: Implement Validation Patterns

#### A. Constructor Validation

```typescript
constructor(private readonly configService: ConfigService) {
    const DYNAMO_DB_[ENTITY]_TABLE = configService.get<string>('DYNAMO_DB_[ENTITY]_TABLE');
    
    if (!DYNAMO_DB_[ENTITY]_TABLE) {
        throw new Error('DYNAMO_DB_[ENTITY]_TABLE is not defined in the configuration');
    }
    
    // Continue with initialization...
}
```

#### B. Input Validation (Pagination)

```typescript
async findRecordsByPagination(
    limit: number,
    direction: string,
    cursorPointer: string
): Promise<PageDto<[Entity]Dto>> {
    // Validate and normalize limit
    limit = Number(limit);
    
    // Validate cursor if direction provided
    // (handled by createDynamoDbOptionWithPKSKIndex)
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI1', 
        direction, 
        cursorPointer
    );
    
    // createDynamoDbOptionWithPKSKIndex throws:
    // BadRequestException('Cursor Pointer Can\'t be null if direction is not null')
    
    // Continue...
}
```

#### C. Null Checks in Queries

```typescript
// Check before using optional parameters
if (!record) {
    return null;
}

// Validate and sanitize search input
...(name != null && name.trim() !== '' ? { GSI1SK: { begins: name.trim() } } : {})
```

#### D. Field Validation (Filter DTOs)

```typescript
// Normalize fields to array
if (filter.fields && !Array.isArray(filter.fields)) {
    filter.fields = [filter.fields];
}

// Ensure required field is included
if (!filter.fields?.includes('[entity]Id')) {
    filter.fields?.push('[entity]Id');
}

// Validate array filters
filter.categoryIds && filter.categoryIds.length > 0
    ? '(${categoryId} IN (@{...categoryIds}))'
    : null
```

#### E. Error Logging

```typescript
async deleteRecord(dto: [Entity]Dto): Promise<[Entity]Dto> {
    const [entity]Record: [Entity]DataType = await this.convertToDataType(dto);
    
    await this.[entity]Table.remove([entity]Record);
    
    // Log deletion for audit trail
    this.logger.log(`[Entity] Record hard deleted: ${JSON.stringify([entity]Record)}`);
    
    return await this.convertToDto([entity]Record);
}
```

#### F. Try-Catch for External Operations (Optional)

```typescript
async createRecord(dto: Create[Entity]Dto): Promise<[Entity]Dto> {
    try {
        const [entity]Data: [Entity]DataType = { /* ... */ };
        const [entity]Record = await this.[entity]Table.create([entity]Data);
        return await this.convertToDto([entity]Record);
    } catch (error) {
        this.logger.error(`Failed to create [entity]: ${error.message}`, error.stack);
        throw error;  // Re-throw to let NestJS handle
    }
}
```

**Note:** In NestJS, unhandled exceptions are caught by exception filters. Explicit try-catch is optional unless you need custom error handling.

---

## NestJS-Specific Patterns

### Step 16: Apply NestJS Conventions

#### A. Decorators

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class [Entity]DatabaseService implements [Entity]DatabaseServiceAbstract {
    protected readonly logger = new Logger([Entity]DatabaseService.name);
    // ...
}
```

**Required:**
- `@Injectable()` - Marks class for dependency injection
- `Logger` - NestJS logger instance with class name

#### B. Dependency Injection

```typescript
constructor(private readonly configService: ConfigService) {
    // ConfigService injected automatically by NestJS
}
```

**Pattern:** Use `private readonly` for injected dependencies.

#### C. ConfigService Usage

```typescript
const TABLE_NAME = configService.get<string>('DYNAMO_DB_[ENTITY]_TABLE');
```

**Environment Variable Naming:**
- Pattern: `DYNAMO_DB_[ENTITY]_TABLE`
- Examples: 
  - `DYNAMO_DB_CUSTOMER_TABLE`
  - `DYNAMO_DB_INVOICING_TABLE`
  - `DYNAMO_DB_PRODUCT_TABLE`

#### D. Logging

```typescript
// Info logging
this.logger.log(`[Entity] Record created: ${JSON.stringify(record)}`);

// Error logging
this.logger.error(`Failed to create [entity]: ${error.message}`, error.stack);

// Debug logging (if needed)
this.logger.debug(`Query options: ${JSON.stringify(dynamoDbOption)}`);
```

**Best Practice:** Log all mutations (create, update, delete) for audit trail.

#### E. Exception Handling

NestJS provides built-in exceptions:

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Validation errors
if (!cursorPointer && direction) {
    throw new BadRequestException('Cursor required when direction is specified');
}

// Not found
const record = await this.[entity]Table.get({ PK, SK });
if (!record) {
    throw new NotFoundException(`[Entity] with ID ${id} not found`);
}
```

**Common Exceptions:**
- `BadRequestException` - Invalid input (400)
- `NotFoundException` - Resource not found (404)
- `InternalServerErrorException` - Server errors (500)

#### F. Module Structure

Create a module file: `[entity]-database-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { [Entity]DatabaseService } from './[entity]-database-service';
import { [Entity]DatabaseServiceAbstract } from './[entity]-database-service-abstract-class';

@Module({
    providers: [
        {
            provide: [Entity]DatabaseServiceAbstract,
            useClass: [Entity]DatabaseService,
        },
    ],
    exports: [[Entity]DatabaseServiceAbstract],
})
export class [Entity]DatabaseServiceModule {}
```

**Pattern:** 
- Provide abstract class as token
- Use concrete class as implementation
- Export abstract class for type safety

#### G. Index Exports

Create `index.ts`:

```typescript
export * from './lib/[entity]-database-service';
export * from './lib/[entity]-database-service-abstract-class';
export * from './lib/[entity]-database-service.module';
```

---

## Complete Examples

### Example 1: Simple Schema - Customer

**Schema Analysis:**
- 6 GSIs
- Simple relationships (classification, type, area, town)
- Status enum
- Name-based sorting

**Generated Methods:**

1. **CRUD:** create, update, findById, delete
2. **Unique Lookup:** findByName
3. **Search:** findContainingName
4. **Pagination:**
   - findRecordsByPagination (all)
   - findRecordsByStatusPagination (by status)
   - findRecordsByNamePagination (name search)
   - findRecordsByFilterPagination (complex filter)
5. **Relationships:**
   - findAllCustomersByClassificationId (GSI3)
   - findAllCustomersByTypeId (GSI4)
   - findAllCustomersByAreaId (GSI5)
   - findAllCustomersByTownId (GSI6)

**Abstract Class:**

```typescript
export abstract class CustomerDatabaseServiceAbstract {
    abstract createRecord(dto: CreateCustomerDto): Promise<CustomerDto>;
    abstract updateRecord(dto: CustomerDto): Promise<CustomerDto>;
    abstract findRecordById(id: string): Promise<CustomerDto | null>;
    abstract findRecordByName(name: string): Promise<CustomerDto | null>;
    abstract findRecordContainingName(name: string): Promise<CustomerDto[] | null>;
    
    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerDto>>;
    
    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<CustomerDto>>;
    
    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<CustomerDto>>;
    
    abstract findCustomerRecordsByFilterPagination(
        filter: CustomerFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerDto>>;
    
    abstract findAllCustomersByClassificationId(customerClassificationId: string): Promise<CustomerDto[]>;
    abstract findAllCustomersByTypeId(customerTypeId: string): Promise<CustomerDto[]>;
    abstract findAllCustomersByAreaId(areaId: string): Promise<CustomerDto[]>;
    abstract findAllCustomersByTownId(townId: string): Promise<CustomerDto[]>;
    
    abstract deleteRecord(dto: CustomerDto): Promise<CustomerDto>;
    abstract deleteAllRecords(): Promise<void>;
    
    abstract convertToDto(record: CustomerDataType): Promise<CustomerDto>;
    abstract convertToDtoList(records: CustomerDataType[]): Promise<CustomerDto[]>;
}
```

### Example 2: Complex Schema - Invoice

**Schema Analysis:**
- 13 GSIs
- Date-based sorting (invoiceDate)
- Document number (docno)
- Multiple relationships (customer, area, territoryManager, salesType, contract, terms, priceType)
- Payment status tracking
- Compound query (GSI13)

**Generated Methods:**

1. **CRUD:** create, update, findById, delete
2. **Unique Lookup:** findByDocno
3. **Search:** findContainingDocno (paginated)
4. **Pagination:**
   - findRecordsByPagination (all, by date - GSI11)
   - findRecordsByStatusPagination (by status - GSI2)
5. **Special Queries:**
   - findPendingPaymentInvoices (GSI13 - compound)
6. **Relationships:** (Not shown but would use GSI3-9 for queries by customer, salesType, contract, etc.)

**Key GSI Usage:**

```typescript
// GSI2: Status + docno
GSI2PK: `INVOICE#${status}`
GSI2SK: docno

// GSI3: Customer + date (time-series)
GSI3PK: `INVOICE#${customerId}`
GSI3SK: invoiceDate

// GSI11: All invoices by date
GSI11PK: `INVOICE`
GSI11SK: invoiceDate

// GSI12: Docno lookup
GSI12PK: `INVOICE`
GSI12SK: docno

// GSI13: Compound filter
GSI13PK: `INVOICE#${customerId}#${paymentStatus}#${status}`
GSI13SK: docno
```

**Pagination Example (by date):**

```typescript
async findRecordsByPagination(
    limit: number,
    direction: string,
    cursorPointer: string
): Promise<PageDto<InvoiceDto>> {
    limit = Number(limit);
    const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
        limit, 
        'GSI11',  // Sort by date
        direction, 
        cursorPointer
    );
    
    const records = await this.invoiceTable.find(
        { GSI11PK: `INVOICE` },
        dynamoDbOption
    );
    
    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI11PK',
        'GSI11SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );
    
    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

---

## Generation Checklist

When generating database services, ensure:

### Schema Analysis
- [ ] Identify all models in schema
- [ ] Extract primary key patterns (PK, SK)
- [ ] Map all GSI configurations (1-13)
- [ ] Identify auto-generated fields (ID)
- [ ] List all enum fields
- [ ] Find denormalized relationships (ID + Name pairs)
- [ ] Note array and object fields

### Type Generation
- [ ] Export DataType for each model
- [ ] Use `Entity<typeof Schema.models.ModelName>` pattern

### Abstract Class
- [ ] Create abstract class file
- [ ] Add CRUD methods
- [ ] Add unique field lookups (name, docno, etc.)
- [ ] Add search methods (contains)
- [ ] Add pagination methods (all, status, name, filter)
- [ ] Add relationship queries (one per GSI with pattern ENTITY#${relatedId})
- [ ] Add special compound queries
- [ ] Add conversion methods
- [ ] Add deleteAllRecords (testing)

### Service Implementation
- [ ] Add @Injectable decorator
- [ ] Create Logger instance
- [ ] Implement constructor with ConfigService
- [ ] Validate table name from environment
- [ ] Initialize DynamoDbLibService
- [ ] Get model from schema
- [ ] Implement createRecord with ALL GSI keys
- [ ] Implement updateRecord with explicit changeReason
- [ ] Implement findRecordById
- [ ] Implement unique field lookups
- [ ] Implement search methods
- [ ] Implement all pagination methods
- [ ] Implement relationship queries
- [ ] Implement deleteRecord with logging
- [ ] Implement deleteAllRecords
- [ ] Implement convertToDto with defaults
- [ ] Implement convertToDtoList
- [ ] Implement convertToDataType with ALL GSI keys

### Pagination
- [ ] Use createDynamoDbOptionWithPKSKIndex correctly
- [ ] Convert limit to number
- [ ] Pass correct GSI index name
- [ ] Use pageRecordHandler with correct key names
- [ ] Return PageDto with next/prev cursors

### Validation
- [ ] Validate constructor inputs
- [ ] Check null records (return null)
- [ ] Normalize filter fields to arrays
- [ ] Ensure ID field in field projections
- [ ] Validate cursor with direction
- [ ] Trim and check string inputs

### NestJS Patterns
- [ ] Use @Injectable decorator
- [ ] Use Logger with class name
- [ ] Inject ConfigService
- [ ] Use private readonly for dependencies
- [ ] Log mutations for audit
- [ ] Create module file
- [ ] Create index.ts exports

### Error Handling
- [ ] Throw error if table name missing
- [ ] Return null if record not found
- [ ] Use BadRequestException for invalid input
- [ ] Log errors with stack traces
- [ ] Re-throw errors for NestJS filters

---

## Advanced Patterns

### Pattern: Time-Series Queries

For entities with date fields (invoices, payments):

```typescript
// GSI with date as sort key
GSI[N]PK: `ENTITY#${category}`
GSI[N]SK: dateField

// Query by date range
async findRecordsByDateRange(
    category: string,
    startDate: string,
    endDate: string
): Promise<[Entity]Dto[]> {
    const records = await this.[entity]Table.find(
        {
            GSI[N]PK: `ENTITY#${category}`,
            GSI[N]SK: {
                between: [startDate, endDate]
            }
        },
        { index: 'GSI[N]' }
    );
    
    return await this.convertToDtoList(records);
}
```

### Pattern: Reverse Sorting

```typescript
// Add reverse option in filter
const records = await this.[entity]Table.find(
    { GSI1PK: 'ENTITY' },
    {
        reverse: true,  // Sort descending
        ...dynamoDbOption,
    }
);
```

### Pattern: Field Projection

```typescript
// Return only specific fields
const records = await this.[entity]Table.find(
    { GSI1PK: 'ENTITY' },
    {
        fields: ['entityId', 'name', 'status'],  // Only these fields
        ...dynamoDbOption,
    }
);
```

### Pattern: Batch Operations

```typescript
async batchGet(ids: string[]): Promise<[Entity]Dto[]> {
    const batchResults = await this.[entity]Table.batch(
        ids.map(id => ({ PK: 'ENTITY', SK: id }))
    );
    
    return await this.convertToDtoList(batchResults);
}
```

---

## Summary

This guide provides a complete blueprint for AI models to generate database services from DynamoDB OneTable schemas. Key principles:

1. **Schema-Driven:** All methods derive from schema structure
2. **GSI Optimization:** Each GSI enables specific query patterns
3. **Type Safety:** Strong TypeScript typing throughout
4. **Pagination:** Cursor-based for efficient large datasets
5. **Audit Trail:** Logging for all mutations
6. **Error Handling:** Comprehensive validation and error messages
7. **NestJS Integration:** Full framework compatibility
8. **Denormalization:** Store related entity names for join-free queries

Follow this guide systematically for consistent, production-ready database services.
