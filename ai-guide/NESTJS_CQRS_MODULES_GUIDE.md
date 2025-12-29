# AI Guide: NestJS CQRS Modules Implementation

## Table of Contents
1. [Overview](#overview)
2. [Module Structure](#module-structure)
3. [Dependencies](#dependencies)
4. [Providers Configuration](#providers-configuration)
5. [Complete Module Example](#complete-module-example)
6. [Database Service Integration](#database-service-integration)
7. [Testing Configuration](#testing-configuration)

---

## Overview

Modules organize related components (controllers, handlers, services) and manage dependency injection. They serve as the configuration layer for the CQRS implementation.

**Key Responsibilities:**
- Import required modules (CqrsModule, DatabaseServiceModule)
- Declare all command and query handlers as providers
- Register controllers
- Configure dependency injection
- Export services for use in other modules (if needed)

**Pattern:**
```typescript
@Module({
    imports: [CqrsModule, EntityDatabaseServiceModule],
    controllers: [EntityController],
    providers: [
        // Command Handlers
        CreateEntityHandler,
        UpdateEntityHandler,
        DeleteEntityHandler,
        ApproveEntityHandler,
        DenyEntityHandler,
        
        // Query Handlers
        GetEntityByIdHandler,
        GetEntityByNameHandler,
        GetEntityRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class EntityModule {}
```

---

## Module Structure

### Complete Template

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Database Service Module
import { CustomerDatabaseServiceModule } from '@customer-database-service';

// Controller
import { CustomerController } from './customer.controller';

// Command Handlers
import { CreateCustomerHandler } from './commands/create/create.handler';
import { UpdateCustomerHandler } from './commands/update/update.handler';
import { DeleteCustomerHandler } from './commands/delete/delete.handler';
import { ApproveCustomerHandler } from './commands/approve/approve.handler';
import { DenyCustomerHandler } from './commands/deny/deny.handler';

// Query Handlers
import { GetCustomerByIdHandler } from './queries/get.by.id/get.customer.by.id.handler';
import { GetCustomerByNameHandler } from './queries/get.by.name/get.customer.by.name.handler';
import { GetCustomerRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [CustomerController],
    providers: [
        // Command Handlers
        CreateCustomerHandler,
        UpdateCustomerHandler,
        DeleteCustomerHandler,
        ApproveCustomerHandler,
        DenyCustomerHandler,
        
        // Query Handlers
        GetCustomerByIdHandler,
        GetCustomerByNameHandler,
        GetCustomerRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class CustomerModule {}
```

### File Organization

```
apps/{domain}/{entity}-api-service/src/app/{entity}/
├── commands/
│   ├── create/
│   │   ├── create.command.ts
│   │   └── create.handler.ts          ← Import as provider
│   ├── update/
│   │   ├── update.command.ts
│   │   └── update.handler.ts          ← Import as provider
│   ├── delete/
│   │   ├── delete.command.ts
│   │   └── delete.handler.ts          ← Import as provider
│   ├── approve/
│   │   ├── approve.command.ts
│   │   └── approve.handler.ts         ← Import as provider
│   └── deny/
│       ├── deny.command.ts
│       └── deny.handler.ts            ← Import as provider
├── queries/
│   ├── get.by.id/
│   │   ├── get.{entity}.by.id.query.ts
│   │   └── get.{entity}.by.id.handler.ts       ← Import as provider
│   ├── get.by.name/
│   │   ├── get.{entity}.by.name.query.ts
│   │   └── get.{entity}.by.name.handler.ts     ← Import as provider
│   ├── get.records.pagination/
│   │   ├── get.records.pagination.query.ts
│   │   └── get.records.pagination.handler.ts   ← Import as provider
│   └── get.records.by.status.pagination/
│       ├── get.records.by.status.pagination.query.ts
│       └── get.records.by.status.pagination.handler.ts  ← Import as provider
├── {entity}.controller.ts             ← Register as controller
└── {entity}.module.ts                 ← Module configuration file
```

---

## Dependencies

### Required Imports

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EntityDatabaseServiceModule } from '@entity-database-service';
```

### Module Dependencies

| Import | Purpose |
|--------|---------|
| `CqrsModule` | Provides CommandBus and QueryBus |
| `EntityDatabaseServiceModule` | Provides database service for entity operations |

### CqrsModule

**From:** `@nestjs/cqrs`

**Provides:**
- `CommandBus` - Executes commands
- `QueryBus` - Executes queries
- Handler registration infrastructure

**Usage:**
```typescript
@Module({
    imports: [CqrsModule],
    // ...
})
```

### Database Service Module

**From:** Entity-specific library (e.g., `@customer-database-service`)

**Provides:**
- Abstract database service interface
- Concrete database service implementation
- DynamoDB OneTable integration

**Naming Convention:**
```typescript
// Customer
import { CustomerDatabaseServiceModule } from '@customer-database-service';

// Product
import { ProductDatabaseServiceModule } from '@product-database-service';

// Invoice
import { InvoiceDatabaseServiceModule } from '@invoice-database-service';
```

---

## Providers Configuration

### Provider Structure

```typescript
providers: [
    // Command Handlers (5 standard handlers)
    CreateEntityHandler,
    UpdateEntityHandler,
    DeleteEntityHandler,
    ApproveEntityHandler,
    DenyEntityHandler,
    
    // Query Handlers (4 standard handlers)
    GetEntityByIdHandler,
    GetEntityByNameHandler,
    GetEntityRecordsPaginationHandler,
    GetRecordsByStatusPaginationHandler,
]
```

### Command Handlers (Providers)

| Handler | File Location | Operation |
|---------|---------------|-----------|
| `CreateEntityHandler` | `commands/create/create.handler.ts` | Create new entity |
| `UpdateEntityHandler` | `commands/update/update.handler.ts` | Update existing entity |
| `DeleteEntityHandler` | `commands/delete/delete.handler.ts` | Delete entity |
| `ApproveEntityHandler` | `commands/approve/approve.handler.ts` | Approve pending entity |
| `DenyEntityHandler` | `commands/deny/deny.handler.ts` | Deny pending entity |

### Query Handlers (Providers)

| Handler | File Location | Operation |
|---------|---------------|-----------|
| `GetEntityByIdHandler` | `queries/get.by.id/get.entity.by.id.handler.ts` | Fetch by ID |
| `GetEntityByNameHandler` | `queries/get.by.name/get.entity.by.name.handler.ts` | Search by name |
| `GetEntityRecordsPaginationHandler` | `queries/get.records.pagination/get.records.pagination.handler.ts` | List all (paginated) |
| `GetRecordsByStatusPaginationHandler` | `queries/get.records.by.status.pagination/get.records.by.status.pagination.handler.ts` | Filter by status |

### Provider Registration Rules

**✅ DO:**
- Register all handlers as providers
- Use class names (not string tokens)
- Import handlers from their specific files
- Organize by type (commands, queries)

**❌ DON'T:**
- Register command/query classes as providers (only handlers)
- Use string-based injection tokens (use class references)
- Forget to add new handlers when creating new operations
- Mix handlers with services or other provider types

---

## Complete Module Example

### Customer Module (Full Implementation)

```typescript
// File: apps/customer/customer-api-service/src/app/customer/customer.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Database Service Module
import { CustomerDatabaseServiceModule } from '@customer-database-service';

// Controller
import { CustomerController } from './customer.controller';

// Command Handlers
import { CreateCustomerHandler } from './commands/create/create.handler';
import { UpdateCustomerHandler } from './commands/update/update.handler';
import { DeleteCustomerHandler } from './commands/delete/delete.handler';
import { ApproveCustomerHandler } from './commands/approve/approve.handler';
import { DenyCustomerHandler } from './commands/deny/deny.handler';

// Query Handlers
import { GetCustomerByIdHandler } from './queries/get.by.id/get.customer.by.id.handler';
import { GetCustomerByNameHandler } from './queries/get.by.name/get.customer.by.name.handler';
import { GetCustomerRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [CustomerController],
    providers: [
        // ============================================
        // COMMAND HANDLERS
        // ============================================
        CreateCustomerHandler,
        UpdateCustomerHandler,
        DeleteCustomerHandler,
        ApproveCustomerHandler,
        DenyCustomerHandler,
        
        // ============================================
        // QUERY HANDLERS
        // ============================================
        GetCustomerByIdHandler,
        GetCustomerByNameHandler,
        GetCustomerRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class CustomerModule {}
```

### Product Module Example

```typescript
// File: apps/product/product-api-service/src/app/product/product.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Database Service Module
import { ProductDatabaseServiceModule } from '@product-database-service';

// Controller
import { ProductController } from './product.controller';

// Command Handlers
import { CreateProductHandler } from './commands/create/create.handler';
import { UpdateProductHandler } from './commands/update/update.handler';
import { DeleteProductHandler } from './commands/delete/delete.handler';
import { ApproveProductHandler } from './commands/approve/approve.handler';
import { DenyProductHandler } from './commands/deny/deny.handler';

// Query Handlers
import { GetProductByIdHandler } from './queries/get.by.id/get.product.by.id.handler';
import { GetProductByNameHandler } from './queries/get.by.name/get.product.by.name.handler';
import { GetProductRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        ProductDatabaseServiceModule,
    ],
    controllers: [ProductController],
    providers: [
        // Command Handlers
        CreateProductHandler,
        UpdateProductHandler,
        DeleteProductHandler,
        ApproveProductHandler,
        DenyProductHandler,
        
        // Query Handlers
        GetProductByIdHandler,
        GetProductByNameHandler,
        GetProductRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class ProductModule {}
```

### Invoice Module Example

```typescript
// File: apps/invoicing/invoicing-api-service/src/app/invoice/invoice.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Database Service Module
import { InvoiceDatabaseServiceModule } from '@invoice-database-service';

// Controller
import { InvoiceController } from './invoice.controller';

// Command Handlers
import { CreateInvoiceHandler } from './commands/create/create.handler';
import { UpdateInvoiceHandler } from './commands/update/update.handler';
import { DeleteInvoiceHandler } from './commands/delete/delete.handler';
import { ApproveInvoiceHandler } from './commands/approve/approve.handler';
import { DenyInvoiceHandler } from './commands/deny/deny.handler';

// Query Handlers
import { GetInvoiceByIdHandler } from './queries/get.by.id/get.invoice.by.id.handler';
import { GetInvoiceByDocnoHandler } from './queries/get.by.docno/get.invoice.by.docno.handler';
import { GetInvoiceRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        InvoiceDatabaseServiceModule,
    ],
    controllers: [InvoiceController],
    providers: [
        // Command Handlers
        CreateInvoiceHandler,
        UpdateInvoiceHandler,
        DeleteInvoiceHandler,
        ApproveInvoiceHandler,
        DenyInvoiceHandler,
        
        // Query Handlers
        GetInvoiceByIdHandler,
        GetInvoiceByDocnoHandler,  // Entity-specific query
        GetInvoiceRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class InvoiceModule {}
```

---

## Database Service Integration

### Database Service Module Structure

Each entity has its own database service module:

```typescript
// libs/backend/{entity}-database-service/src/lib/{entity}-database-service.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { EntityDatabaseService } from './entity-database-service';
import { EntityDatabaseServiceAbstract } from './entity-database-service.abstract';

@Module({})
export class EntityDatabaseServiceModule {
    static forRoot(config?: any): DynamicModule {
        return {
            module: EntityDatabaseServiceModule,
            providers: [
                {
                    provide: 'EntityDatabaseService',
                    useClass: EntityDatabaseService,
                },
                {
                    provide: EntityDatabaseServiceAbstract,
                    useExisting: 'EntityDatabaseService',
                },
            ],
            exports: [
                'EntityDatabaseService',
                EntityDatabaseServiceAbstract,
            ],
        };
    }
}

    ### Concrete Provider Variant (as observed in Authentication)

    Some modules inject concrete services directly with string tokens instead of exporting abstract classes. This keeps wiring simple but bypasses the abstraction shown above. If you follow this variant (e.g., the authentication API service):

    - Provide the concrete class with a string token and omit the abstract-class re-export
    - Keep the provider list scoped to command handlers only (no QueryBus) when the feature is command-only
    - Be explicit about third-party libs (Cognito, SES, SQS) in `imports` so handlers can resolve dependencies
    - When adopting this shortcut, document the trade-off (tighter coupling, harder to swap implementations later)
```

### Injection in Handlers

Handlers receive the database service via dependency injection:

```typescript
constructor(
    @Inject('EntityDatabaseService')
    private readonly entityDatabaseService: EntityDatabaseServiceAbstract
) {}
```

### Database Service Methods

Standard methods provided by database service:

| Method | Purpose |
|--------|---------|
| `findRecordById(id)` | Get single record by ID |
| `findRecordsByNamePagination(...)` | Search by name with pagination |
| `findRecordsByPagination(...)` | Get all records with pagination |
| `findRecordsByStatusPagination(...)` | Filter by status with pagination |
| `createRecord(dto)` | Create new record |
| `updateRecord(id, dto)` | Update existing record |
| `deleteRecord(id)` | Delete record |

---

## Testing Configuration

### Unit Testing Module

```typescript
// customer.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { CustomerModule } from './customer.module';
import { CustomerDatabaseServiceModule } from '@customer-database-service';

describe('CustomerModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                CqrsModule,
                CustomerDatabaseServiceModule,
                CustomerModule,
            ],
        }).compile();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should have CustomerController', () => {
        const controller = module.get('CustomerController');
        expect(controller).toBeDefined();
    });

    it('should have all command handlers', () => {
        expect(module.get('CreateCustomerHandler')).toBeDefined();
        expect(module.get('UpdateCustomerHandler')).toBeDefined();
        expect(module.get('DeleteCustomerHandler')).toBeDefined();
        expect(module.get('ApproveCustomerHandler')).toBeDefined();
        expect(module.get('DenyCustomerHandler')).toBeDefined();
    });

    it('should have all query handlers', () => {
        expect(module.get('GetCustomerByIdHandler')).toBeDefined();
        expect(module.get('GetCustomerByNameHandler')).toBeDefined();
        expect(module.get('GetCustomerRecordsPaginationHandler')).toBeDefined();
        expect(module.get('GetRecordsByStatusPaginationHandler')).toBeDefined();
    });
});
```

### Mock Database Service for Testing

```typescript
// Mock database service provider
const mockDatabaseService = {
    findRecordById: jest.fn(),
    findRecordsByNamePagination: jest.fn(),
    findRecordsByPagination: jest.fn(),
    findRecordsByStatusPagination: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    deleteRecord: jest.fn(),
};

// Use in test module
const module = await Test.createTestingModule({
    imports: [CqrsModule],
    controllers: [CustomerController],
    providers: [
        CreateCustomerHandler,
        UpdateCustomerHandler,
        // ... other handlers
        {
            provide: 'CustomerDatabaseService',
            useValue: mockDatabaseService,
        },
    ],
}).compile();
```

---

## Advanced Patterns

### Exporting Module Services

If other modules need to use this entity's services:

```typescript
@Module({
    imports: [CqrsModule, EntityDatabaseServiceModule],
    controllers: [EntityController],
    providers: [/* handlers */],
    exports: [EntityDatabaseServiceModule],  // Export for use in other modules
})
export class EntityModule {}
```

### Multiple Controllers

For large entities with many endpoints:

```typescript
@Module({
    imports: [CqrsModule, EntityDatabaseServiceModule],
    controllers: [
        EntityController,
        EntityAdminController,
        EntityReportController,
    ],
    providers: [/* handlers */],
})
export class EntityModule {}
```

### Shared Services

For services used across multiple entities:

```typescript
@Module({
    imports: [
        CqrsModule,
        EntityDatabaseServiceModule,
        SharedUtilitiesModule,  // Shared utilities
    ],
    controllers: [EntityController],
    providers: [
        /* handlers */,
        EntityValidationService,  // Entity-specific service
    ],
})
export class EntityModule {}
```

---

## Summary

**Module Checklist:**

- [ ] Import `CqrsModule` from `@nestjs/cqrs`
- [ ] Import entity-specific database service module
- [ ] Import controller class
- [ ] Import all command handlers (5 standard)
- [ ] Import all query handlers (4 standard)
- [ ] Register controller in `controllers` array
- [ ] Register all handlers in `providers` array
- [ ] Group providers by type (commands, queries)
- [ ] Add comments for organization
- [ ] Verify all imports have correct paths
- [ ] Ensure database service module name matches entity

**Standard Module Structure:**
```typescript
@Module({
    imports: [
        CqrsModule,                          // Required for CQRS
        EntityDatabaseServiceModule,         // Entity database operations
    ],
    controllers: [EntityController],         // REST API endpoints
    providers: [
        // Command Handlers (5)
        CreateEntityHandler,
        UpdateEntityHandler,
        DeleteEntityHandler,
        ApproveEntityHandler,
        DenyEntityHandler,
        
        // Query Handlers (4)
        GetEntityByIdHandler,
        GetEntityByNameHandler,
        GetEntityRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
    ],
})
export class EntityModule {}
```

**Key Principles:**
- ✅ Always import CqrsModule for CommandBus/QueryBus
- ✅ Import entity database service module for data operations
- ✅ Register all handlers as providers (not commands/queries)
- ✅ Use class references for dependency injection
- ✅ Organize providers by type for clarity
- ✅ Follow naming convention: `{Entity}Module`
- ✅ Keep module configuration simple and declarative

---

**Next Steps:**
- Review [Main CQRS Guide](./NESTJS_CQRS_MODULE_GUIDE.md) for complete architecture overview
- Study [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md) for controller implementation
- Check [Commands Guide](./NESTJS_CQRS_COMMANDS_GUIDE.md) and [Queries Guide](./NESTJS_CQRS_QUERIES_GUIDE.md) for handler integration
