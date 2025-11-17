# AI Guide: NestJS CQRS Query Handlers Implementation

## Table of Contents
1. [Overview](#overview)
2. [Handler Structure](#handler-structure)
3. [GetById Handler](#getbyid-handler)
4. [GetByName Handler](#getbyname-handler)
5. [GetRecordsPagination Handler](#getrecordspagination-handler)
6. [GetRecordsByStatusPagination Handler](#getrecordsbystatuspagination-handler)
7. [Common Patterns](#common-patterns)
8. [Error Handling](#error-handling)
9. [Complete Examples](#complete-examples)

---

## Overview

Query handlers contain the logic for retrieving data from the database. They are simpler than command handlers since they don't modify state or require authorization checks.

**Key Responsibilities:**
- Fetch data from database service
- Transform database results to DTOs
- Handle pagination
- Return standardized responses
- Handle not-found scenarios

**Pattern:**
```typescript
@QueryHandler(QueryClass)
export class Handler implements IQueryHandler<QueryClass> {
    private readonly logger = new Logger(Handler.name);
    
    constructor(
        @Inject('DatabaseService')
        private readonly databaseService: DatabaseServiceAbstract
    ) {}
    
    async execute(query: QueryClass): Promise<ResponseDto<EntityDto>> {
        // Data retrieval logic here
    }
}
```

---

## Handler Structure

### Basic Template

```typescript
import { DatabaseServiceAbstract } from '@entity-database-service';
import { EntityDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEntityByIdQuery } from './get.entity.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetEntityByIdQuery)
export class GetEntityByIdHandler implements IQueryHandler<GetEntityByIdQuery> {
    private readonly logger = new Logger(GetEntityByIdHandler.name);

    constructor(
        @Inject('EntityDatabaseService')
        private readonly entityDatabaseService: EntityDatabaseServiceAbstract
    ) {}

    async execute(query: GetEntityByIdQuery): Promise<ResponseDto<EntityDto>> {
        this.logger.log(`Processing get entity request for ID: ${query.recordId}`);

        try {
            // Fetch and validate entity record
            const entityRecord = await this.fetchEntityById(query.recordId);

            this.logger.log(`Entity retrieved successfully: ${query.recordId}`);
            return new ResponseDto<EntityDto>(entityRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    private async fetchEntityById(recordId: string): Promise<EntityDto> {
        const entityRecord = await this.entityDatabaseService.findRecordById(recordId);

        if (!entityRecord) {
            this.logger.warn(`Entity not found for ID: ${recordId}`);
            throw new NotFoundException(`Entity not found for ID: ${recordId}`);
        }

        return entityRecord;
    }

    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching entity by ID ${recordId}:`, error);

        if (error instanceof NotFoundException) {
            throw error;
        }

        throw new NotFoundException(`Entity not found for ID: ${recordId}`);
    }
}
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `@QueryHandler` | Registers handler with CQRS module |
| `IQueryHandler` | Interface for type safety |
| `Logger` | NestJS logger for debugging |
| `@Inject` | Dependency injection for database service |
| Constants | HTTP status codes |
| `execute()` | Main handler method |
| Private helper methods | Data fetching, error handling |

---

## GetById Handler

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerByIdQuery } from './get.customer.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerByIdQuery)
export class GetCustomerByIdHandler implements IQueryHandler<GetCustomerByIdQuery> {
    private readonly logger = new Logger(GetCustomerByIdHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerByIdQuery): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing get customer request for ID: ${query.recordId}`);

        try {
            // Fetch and validate customer record
            const customerRecord = await this.fetchCustomerById(query.recordId);

            this.logger.log(`Customer retrieved successfully: ${query.recordId}`);
            return new ResponseDto<CustomerDto>(customerRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a customer record by ID
     */
    private async fetchCustomerById(recordId: string): Promise<CustomerDto> {
        const customerRecord = await this.customerDatabaseService.findRecordById(recordId);

        if (!customerRecord) {
            this.logger.warn(`Customer not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer not found for ID: ${recordId}`);
        }

        return customerRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching customer by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Customer not found for ID: ${recordId}`);
    }
}
```

### Key Points

- Call `findRecordById()` from database service
- Throw `NotFoundException` if record doesn't exist
- Return single entity wrapped in `ResponseDto`
- Log request and successful retrieval

---

## GetByName Handler

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, PageDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerByNameQuery } from './get.customer.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerByNameQuery)
export class GetCustomerByNameHandler implements IQueryHandler<GetCustomerByNameQuery> {
    private readonly logger = new Logger(GetCustomerByNameHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerByNameQuery): Promise<ResponseDto<PageDto<CustomerDto>>> {
        this.logger.log(`Processing get customers by name request for: ${query.customerName}`);

        try {
            // Fetch customers by name with pagination
            const paginatedResult = await this.fetchCustomersByName(query);

            this.logger.log(`Customers retrieved successfully for name: ${query.customerName}`);
            return new ResponseDto<PageDto<CustomerDto>>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerName);
        }
    }

    /**
     * Fetches customers by name with pagination support
     */
    private async fetchCustomersByName(query: GetCustomerByNameQuery): Promise<PageDto<CustomerDto>> {
        const limit = query.limit || 10;
        const direction = query.direction || undefined;
        const cursorPointer = query.cursorPointer || undefined;
        const customerName = query.customerName || '';

        const paginatedResult = await this.customerDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            customerName
        );

        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerName: string): never {
        this.logger.error(`Error fetching customers by name ${customerName}:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers');
    }
}
```

### Key Points

- Provide defaults for optional parameters (limit: 10, direction: undefined)
- Call `findRecordsByNamePagination()` from database service
- Return `PageDto<EntityDto>` wrapped in `ResponseDto`
- Handle empty results gracefully (return empty array, not error)

---

## GetRecordsPagination Handler

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerRecordsPaginationQuery)
export class GetCustomerRecordsPaginationHandler implements IQueryHandler<GetCustomerRecordsPaginationQuery> {
    private readonly logger = new Logger(GetCustomerRecordsPaginationHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerRecordsPaginationQuery): Promise<ResponseDto<any>> {
        this.logger.log(`Processing get customers pagination request`);

        try {
            // Fetch customers with pagination
            const paginatedResult = await this.fetchCustomersWithPagination(query);

            this.logger.log(`Customers pagination retrieved successfully`);
            return new ResponseDto<any>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches customers with pagination
     */
    private async fetchCustomersWithPagination(query: GetCustomerRecordsPaginationQuery): Promise<any> {
        const paginatedResult = await this.customerDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching customers pagination:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers pagination');
    }
}
```

### Key Points

- Pass pagination parameters directly to database service
- Call `findRecordsByPagination()`
- Return `PageDto` with cursor pointers
- Log operation without sensitive data

---

## GetRecordsByStatusPagination Handler

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<any>> {
        this.logger.log(`Processing get customers by status pagination request`);

        try {
            // Fetch customers with status pagination
            const paginatedResult = await this.fetchCustomersByStatusPagination(query);

            this.logger.log(`Customers by status pagination retrieved successfully`);
            return new ResponseDto<any>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches customers with status pagination
     */
    private async fetchCustomersByStatusPagination(query: GetRecordsByStatusPaginationQuery): Promise<any> {
        const paginatedResult = await this.customerDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching customers by status pagination:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers by status pagination');
    }
}
```

### Key Points

- Pass all filter and pagination parameters to database service
- Call `findRecordsByStatusPagination()`
- Include status and optional name filter
- Return filtered and paginated results

---

## Common Patterns

### Database Service Method Mapping

| Query Handler | Database Service Method |
|---------------|------------------------|
| GetById | `findRecordById(id)` |
| GetByName | `findRecordsByNamePagination(limit, direction, cursor, name)` |
| GetRecordsPagination | `findRecordsByPagination(limit, direction, cursor)` |
| GetRecordsByStatusPagination | `findRecordsByStatusPagination(limit, status, direction, cursor, name)` |

### Default Parameter Pattern

```typescript
const limit = query.limit || 10;
const direction = query.direction || undefined;
const cursorPointer = query.cursorPointer || undefined;
const searchTerm = query.searchTerm || '';
```

### ResponseDto Wrapper

```typescript
// Single entity
return new ResponseDto<CustomerDto>(customerRecord, HTTP_STATUS_OK);

// Paginated results
return new ResponseDto<PageDto<CustomerDto>>(paginatedResult, HTTP_STATUS_OK);
```

### Logging Pattern

```typescript
this.logger.log(`Processing get customers request for ID: ${query.recordId}`);
// ... operation ...
this.logger.log(`Customers retrieved successfully: ${query.recordId}`);
```

---

## Error Handling

### Not Found Pattern

```typescript
private async fetchEntityById(recordId: string): Promise<EntityDto> {
    const record = await this.databaseService.findRecordById(recordId);

    if (!record) {
        this.logger.warn(`Entity not found for ID: ${recordId}`);
        throw new NotFoundException(`Entity not found for ID: ${recordId}`);
    }

    return record;
}
```

### Generic Error Handling

```typescript
private handleError(error: unknown, identifier?: string): never {
    this.logger.error(`Error fetching entity${identifier ? ` for ${identifier}` : ''}:`, error);

    // Re-throw known exceptions
    if (error instanceof NotFoundException) {
        throw error;
    }

    // Handle unknown errors
    throw new Error('An unexpected error occurred while fetching entity');
}
```

### Empty Results (Not an Error)

```typescript
// For list/search operations, empty results are valid
const paginatedResult = await this.databaseService.findRecordsByName(name);

// Returns PageDto with empty array if no results
// Do NOT throw NotFoundException for empty lists
return new ResponseDto<PageDto<EntityDto>>(paginatedResult, HTTP_STATUS_OK);
```

---

## Complete Examples

### Example 1: Product Query Handlers

```typescript
// get.product.by.id.handler.ts
@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
    private readonly logger = new Logger(GetProductByIdHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductByIdQuery): Promise<ResponseDto<ProductDto>> {
        this.logger.log(`Processing get product request for ID: ${query.recordId}`);

        try {
            const productRecord = await this.productDatabaseService.findRecordById(query.recordId);

            if (!productRecord) {
                throw new NotFoundException(`Product not found for ID: ${query.recordId}`);
            }

            this.logger.log(`Product retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductDto>(productRecord, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error fetching product by ID ${query.recordId}:`, error);
            
            if (error instanceof NotFoundException) {
                throw error;
            }
            
            throw new NotFoundException(`Product not found for ID: ${query.recordId}`);
        }
    }
}
```

### Example 2: Invoice Query Handlers

```typescript
// get.invoice.by.docno.handler.ts
@QueryHandler(GetInvoiceByDocnoQuery)
export class GetInvoiceByDocnoHandler implements IQueryHandler<GetInvoiceByDocnoQuery> {
    private readonly logger = new Logger(GetInvoiceByDocnoHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoiceByDocnoQuery): Promise<ResponseDto<PageDto<InvoiceDto>>> {
        this.logger.log(`Processing get invoice by docno request for: ${query.docno}`);

        try {
            const limit = query.limit || 10;
            const direction = query.direction || undefined;
            const cursorPointer = query.cursorPointer || undefined;

            const paginatedResult = await this.invoiceDatabaseService.findRecordsByDocnoPagination(
                limit,
                direction,
                cursorPointer,
                query.docno
            );

            this.logger.log(`Invoices retrieved successfully for docno: ${query.docno}`);
            return new ResponseDto<PageDto<InvoiceDto>>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error fetching invoices by docno ${query.docno}:`, error);
            throw new Error('An unexpected error occurred while fetching invoices');
        }
    }
}
```

---

## Summary

**Query Handler Checklist:**

- [ ] Add @QueryHandler decorator with query class
- [ ] Implement IQueryHandler interface
- [ ] Create logger instance
- [ ] Inject database service with @Inject
- [ ] Define HTTP_STATUS_OK constant
- [ ] Implement execute() method with try-catch
- [ ] Add logging at start and end
- [ ] Call appropriate database service method
- [ ] Handle not-found scenarios (GetById only)
- [ ] Provide defaults for optional parameters
- [ ] Return ResponseDto with proper type
- [ ] Implement error handling methods
- [ ] Add JSDoc comments for private methods

**Key Principles:**
- ✅ Query handlers are read-only (no state changes)
- ✅ No authorization checks (rely on data filters)
- ✅ Throw NotFoundException for GetById when record doesn't exist
- ✅ Return empty results for list operations (not errors)
- ✅ Provide sensible defaults for pagination parameters
- ✅ Log all operations for debugging
- ✅ Return standardized ResponseDto
- ✅ Keep handlers simple and focused

---

**Next Steps:**
- Review [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md) for query execution and Swagger documentation
- Study [Modules Guide](./NESTJS_CQRS_MODULES_GUIDE.md) for dependency injection configuration
