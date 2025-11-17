# AI Guide: NestJS CQRS Commands Implementation

## Table of Contents
1. [Overview](#overview)
2. [Command Class Structure](#command-class-structure)
3. [Create Command](#create-command)
4. [Update Command](#update-command)
5. [Delete Command](#delete-command)
6. [Approve Command](#approve-command)
7. [Deny Command](#deny-command)
8. [Command Patterns](#command-patterns)
9. [Complete Examples](#complete-examples)

---

## Overview

Commands represent write operations in the CQRS pattern. They encapsulate the intent to modify state and carry all necessary data and context for the operation.

**Key Characteristics:**
- Immutable data containers
- Include user context for authorization
- Named with imperative verbs (Create, Update, Delete, Approve, Deny)
- No business logic (logic belongs in handlers)
- Simple constructors

**Standard Commands:**
1. **Create** - Creates new entity (requires CreateEntityDto + user)
2. **Update** - Modifies existing entity (requires id + EntityDto + user)
3. **Delete** - Removes entity (requires id + EntityDto + user)
4. **Approve** - Approves pending changes (requires id + user)
5. **Deny** - Rejects pending changes (requires id + user)

---

## Command Class Structure

### Basic Pattern

```typescript
import { UserCognito } from '@auth-guard-lib';
import { CreateEntityDto } from '@dto';

export class CreateEntityCommand {
    constructor(
        public readonly entityDto: CreateEntityDto,
        public readonly user: UserCognito
    ) {}
}
```

**Components:**
- **Import DTOs** - From `@dto` library
- **Import UserCognito** - From `@auth-guard-lib`
- **Public readonly fields** - For immutability
- **Simple constructor** - Just parameter assignment

### File Naming Convention

```
command/{operation}/
├── {operation}.command.ts     ← Command class
└── {operation}.handler.ts     ← Handler class

Examples:
- create/create.command.ts
- update/update.command.ts
- delete/delete.command.ts
- approve-record/approve.command.ts
- deny-record/deny.command.ts
```

---

## Create Command

### Purpose
Encapsulates the intent to create a new entity with user context for authorization and auditing.

### Structure

```typescript
import { UserCognito } from '@auth-guard-lib';
import { CreateCustomerDto } from '@dto';

export class CreateCustomerCommand {
    customerDto: CreateCustomerDto;
    user: UserCognito;

    constructor(customerDto: CreateCustomerDto, user: UserCognito) {
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerDto` | `CreateCustomerDto` | Contains all fields needed to create the entity (excludes ID and auto-generated fields) |
| `user` | `UserCognito` | Current authenticated user with roles for authorization |

### CreateEntityDto Structure

```typescript
// Example: CreateCustomerDto
export class CreateCustomerDto {
    customerName: string;
    email: string;
    address1: string;
    address2: string;
    balance: number;
    contactNo: string;
    contactPerson: string;
    townId: string;
    townName: string;
    creditLimit: number;
    customerCredit: number;
    tinNumber: string;
    areaId: string;
    areaName: string;
    customerClassificationId: string;
    customerClassificationName: string;
    customerTypeId: string;
    customerTypeName: string;
    customerTerms?: Array<{ termsId: string; termsName: string }>;
    customerProductDeals?: Array<{ productDealId: string; /* ... */ }>;
    
    // Note: No customerId (auto-generated)
    // Note: No status (set by handler based on user role)
    // Note: No activityLogs (initialized by handler)
}
```

### Usage in Controller

```typescript
@Post()
createRecord(
    @Body() createCustomerDto: CreateCustomerDto,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles for testing
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    const command = new CreateCustomerCommand(createCustomerDto, user);
    return this.commandBus.execute(command);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/command/create/create.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CreateCustomerDto } from '@dto';

export class CreateCustomerCommand {
    customerDto: CreateCustomerDto;
    user: UserCognito;

    constructor(customerDto: CreateCustomerDto, user: UserCognito) {
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

---

## Update Command

### Purpose
Encapsulates the intent to modify an existing entity with ID, updated data, and user context.

### Structure

```typescript
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class UpdateCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | `string` | ID of entity to update (from URL path parameter) |
| `customerDto` | `CustomerDto` | Full entity DTO with all fields (including unchanged ones) |
| `user` | `UserCognito` | Current authenticated user with roles for authorization |

### EntityDto Structure

```typescript
// Example: CustomerDto (full entity)
export class CustomerDto {
    customerId: string;
    customerName: string;
    email: string;
    address1: string;
    address2: string;
    balance: number;
    contactNo: string;
    contactPerson: string;
    townId: string;
    townName: string;
    creditLimit: number;
    customerCredit: number;
    tinNumber: string;
    areaId: string;
    areaName: string;
    customerClassificationId: string;
    customerClassificationName: string;
    customerTypeId: string;
    customerTypeName: string;
    status: StatusEnum;
    dateCreated: string;
    activityLogs: string[];
    customerTerms?: Array<{ termsId: string; termsName: string }>;
    customerProductDeals?: Array<{ productDealId: string; /* ... */ }>;
    forApprovalVersion?: Partial<CustomerDto>;
    changeReason?: string;
}
```

### Usage in Controller

```typescript
@Put(':id')
updateRecord(
    @Param('id') id: string,
    @Body() customerDto: CustomerDto,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles for testing
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    const command = new UpdateCustomerCommand(id, customerDto, user);
    return this.commandBus.execute(command);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/command/update/update.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class UpdateCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

---

## Delete Command

### Purpose
Encapsulates the intent to delete an entity with ID and user context for authorization.

### Structure

```typescript
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class DeleteCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | `string` | ID of entity to delete (from URL path parameter) |
| `customerDto` | `CustomerDto` | Entity DTO (can be minimal with just ID populated) |
| `user` | `UserCognito` | Current authenticated user with roles for authorization |

### Usage in Controller

```typescript
@Delete(':id')
deleteRecord(
    @Param('id') id: string,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles for testing
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    // Create minimal DTO with ID
    const customerDto = new CustomerDto();
    customerDto.customerId = id;
    
    const command = new DeleteCustomerCommand(id, customerDto, user);
    return this.commandBus.execute(command);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/command/delete/delete.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class DeleteCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

---

## Approve Command

### Purpose
Encapsulates the intent to approve pending changes (NEW_RECORD, FOR_APPROVAL, FOR_DELETION) with admin/super-admin authorization.

### Structure

```typescript
import { UserCognito } from '@auth-guard-lib';

export class ApproveCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | `string` | ID of entity to approve (from URL path parameter) |
| `user` | `UserCognito` | Admin/Super-admin user for authorization check |

### Usage in Controller

```typescript
@Post(':id/approve')
approveRecord(
    @Param('id') id: string,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles for testing
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    const command = new ApproveCustomerCommand(id, user);
    return this.commandBus.execute(command);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/command/approve-record/approve.command.ts
import { UserCognito } from '@auth-guard-lib';

export class ApproveCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

---

## Deny Command

### Purpose
Encapsulates the intent to deny/reject pending changes with admin/super-admin authorization.

### Structure

```typescript
import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | `string` | ID of entity to deny (from URL path parameter) |
| `user` | `UserCognito` | Admin/Super-admin user for authorization check |

### Usage in Controller

```typescript
@Post(':id/deny')
denyRecord(
    @Param('id') id: string,
    @Query('userRole') userRole: string,
    @CurrentUser() user: UserCognito
) {
    // Override user roles for testing
    if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
        user.roles = [userRole];
    }

    const command = new DenyCustomerCommand(id, user);
    return this.commandBus.execute(command);
}
```

### Complete Example

```typescript
// File: apps/customer/customer-api-service/src/app/customer/command/deny-record/deny.command.ts
import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

---

## Command Patterns

### Pattern 1: DTO + User (Create)

**When to use:** Creating new entities

```typescript
export class CreateEntityCommand {
    constructor(
        public readonly entityDto: CreateEntityDto,
        public readonly user: UserCognito
    ) {}
}
```

**Characteristics:**
- Uses CreateEntityDto (no ID field)
- User context for role-based status assignment
- Handler determines status (ACTIVE for admin, NEW_RECORD for user)

### Pattern 2: ID + DTO + User (Update, Delete)

**When to use:** Modifying or deleting existing entities

```typescript
export class UpdateEntityCommand {
    constructor(
        public readonly entityId: string,
        public readonly entityDto: EntityDto,
        public readonly user: UserCognito
    ) {}
}
```

**Characteristics:**
- Includes entity ID from URL parameter
- Uses full EntityDto
- User context for permission checking
- Handler determines workflow (direct update vs approval needed)

### Pattern 3: ID + User (Approve, Deny)

**When to use:** Approval workflow operations

```typescript
export class ApproveEntityCommand {
    constructor(
        public readonly entityId: string,
        public readonly user: UserCognito
    ) {}
}
```

**Characteristics:**
- Minimal data (just ID)
- User context for admin permission check
- Handler fetches existing record from database
- No DTO needed (operations are predetermined)

### Comparison Table

| Command | DTO Type | Includes ID | User Context | Purpose |
|---------|----------|-------------|--------------|---------|
| **Create** | CreateEntityDto | ❌ No (auto-generated) | ✅ Yes | Create new entity |
| **Update** | EntityDto (full) | ✅ Yes | ✅ Yes | Modify existing entity |
| **Delete** | EntityDto (minimal) | ✅ Yes | ✅ Yes | Remove entity |
| **Approve** | None | ✅ Yes | ✅ Yes | Approve pending changes |
| **Deny** | None | ✅ Yes | ✅ Yes | Reject pending changes |

---

## Complete Examples

### Example 1: Customer Commands (Complete Set)

```typescript
// create.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CreateCustomerDto } from '@dto';

export class CreateCustomerCommand {
    customerDto: CreateCustomerDto;
    user: UserCognito;

    constructor(customerDto: CreateCustomerDto, user: UserCognito) {
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

```typescript
// update.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class UpdateCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

```typescript
// delete.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class DeleteCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}
```

```typescript
// approve.command.ts
import { UserCognito } from '@auth-guard-lib';

export class ApproveCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

```typescript
// deny.command.ts
import { UserCognito } from '@auth-guard-lib';

export class DenyCustomerCommand {
    customerId: string;
    user: UserCognito;

    constructor(customerId: string, user: UserCognito) {
        this.customerId = customerId;
        this.user = user;
    }
}
```

### Example 2: Product Commands

```typescript
// create.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CreateProductDto } from '@dto';

export class CreateProductCommand {
    productDto: CreateProductDto;
    user: UserCognito;

    constructor(productDto: CreateProductDto, user: UserCognito) {
        this.productDto = productDto;
        this.user = user;
    }
}
```

```typescript
// update.command.ts
import { UserCognito } from '@auth-guard-lib';
import { ProductDto } from '@dto';

export class UpdateProductCommand {
    productId: string;
    productDto: ProductDto;
    user: UserCognito;

    constructor(productId: string, productDto: ProductDto, user: UserCognito) {
        this.productId = productId;
        this.productDto = productDto;
        this.user = user;
    }
}
```

### Example 3: Invoice Commands

```typescript
// create.command.ts
import { UserCognito } from '@auth-guard-lib';
import { CreateInvoiceDto } from '@dto';

export class CreateInvoiceCommand {
    invoiceDto: CreateInvoiceDto;
    user: UserCognito;

    constructor(invoiceDto: CreateInvoiceDto, user: UserCognito) {
        this.invoiceDto = invoiceDto;
        this.user = user;
    }
}
```

```typescript
// update.command.ts
import { UserCognito } from '@auth-guard-lib';
import { InvoiceDto } from '@dto';

export class UpdateInvoiceCommand {
    invoiceId: string;
    invoiceDto: InvoiceDto;
    user: UserCognito;

    constructor(invoiceId: string, invoiceDto: InvoiceDto, user: UserCognito) {
        this.invoiceId = invoiceId;
        this.invoiceDto = invoiceDto;
        this.user = user;
    }
}
```

---

## Summary

**Command Implementation Checklist:**

- [ ] Create command file in `command/{operation}/{operation}.command.ts`
- [ ] Import DTOs from `@dto`
- [ ] Import UserCognito from `@auth-guard-lib`
- [ ] Define public readonly fields
- [ ] Create simple constructor with parameter assignment
- [ ] Follow naming convention: `{Operation}{Entity}Command`
- [ ] Include appropriate parameters:
  - Create: DTO + User
  - Update/Delete: ID + DTO + User
  - Approve/Deny: ID + User

**Key Points:**
- ✅ Commands are immutable data containers
- ✅ No business logic in commands
- ✅ Always include user context for authorization
- ✅ Use proper DTO types (CreateEntityDto vs EntityDto)
- ✅ Simple constructors only
- ✅ Public readonly fields for immutability

---

**Next Steps:**
- Review [Command Handlers Guide](./NESTJS_CQRS_COMMAND_HANDLERS_GUIDE.md) for business logic implementation
- Study [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md) for command execution patterns
