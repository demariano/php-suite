# AI Guide: NestJS CQRS Controllers Implementation

## Table of Contents
1. [Overview](#overview)
2. [Controller Structure](#controller-structure)
3. [OpenAPI/Swagger Documentation](#openapiswagger-documentation)
4. [Authentication & Authorization](#authentication--authorization)
5. [Command Endpoints](#command-endpoints)
6. [Query Endpoints](#query-endpoints)
7. [Complete Controller Example](#complete-controller-example)
8. [Testing Patterns](#testing-patterns)

---

## Overview

Controllers handle HTTP requests and delegate to commands/queries via CommandBus and QueryBus. They serve as the entry point for all API operations.

**Key Responsibilities:**
- Define REST API endpoints
- Apply authentication guards
- Validate request parameters
- Execute commands/queries via buses
- Document API with OpenAPI/Swagger
- Support role override for testing

**Pattern:**
```typescript
@ApiBearerAuth()
@ApiTags('Entity')
@UseGuards(CognitoAuthGuard)
@Controller('entity')
export class EntityController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus
    ) {}
    
    @Post()
    @ApiOperation({ summary: 'Create entity' })
    create(@Body() dto: CreateEntityDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new CreateEntityCommand(dto, user));
    }
}
```

---

## Controller Structure

### Complete Template

```typescript
import { CreateCustomerDto, UpdateCustomerDto, DeleteCustomerDto, ApproveCustomerDto, DenyCustomerDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { CognitoAuthGuard } from '@auth-guard-lib';
import { CurrentUser } from '@auth-guard-lib';

// Import Commands
import { CreateCustomerCommand } from './commands/create/create.command';
import { UpdateCustomerCommand } from './commands/update/update.command';
import { DeleteCustomerCommand } from './commands/delete/delete.command';
import { ApproveCustomerCommand } from './commands/approve/approve.command';
import { DenyCustomerCommand } from './commands/deny/deny.command';

// Import Queries
import { GetCustomerByIdQuery } from './queries/get.by.id/get.customer.by.id.query';
import { GetCustomerByNameQuery } from './queries/get.by.name/get.customer.by.name.query';
import { GetCustomerRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';

@ApiBearerAuth()
@ApiTags('Customer')
@UseGuards(CognitoAuthGuard)
@Controller('customer')
export class CustomerController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus
    ) {}

    // Command endpoints here
    // Query endpoints here
}
```

### Key Decorators

| Decorator | Purpose | Location |
|-----------|---------|----------|
| `@ApiBearerAuth()` | Requires JWT token | Class level |
| `@ApiTags('Entity')` | Groups endpoints in Swagger UI | Class level |
| `@UseGuards(CognitoAuthGuard)` | Protects all endpoints | Class level |
| `@Controller('entity')` | Defines route prefix | Class level |
| `@ApiOperation()` | Describes endpoint | Method level |
| `@ApiParam()` | Documents path parameter | Method level |
| `@ApiQuery()` | Documents query parameter | Method level |
| `@ApiBody()` | Documents request body | Method level |
| `@ApiResponse()` | Documents response format | Method level |
| `@Post()`, `@Get()`, `@Put()`, `@Delete()` | HTTP methods | Method level |
| `@Body()` | Extracts request body | Parameter level |
| `@Param()` | Extracts path parameter | Parameter level |
| `@Query()` | Extracts query parameter | Parameter level |
| `@CurrentUser()` | Extracts authenticated user | Parameter level |

---

## OpenAPI/Swagger Documentation

### Complete Documentation Pattern

```typescript
@Post()
@ApiOperation({ summary: 'Create a new customer record' })
@ApiBody({ type: CreateCustomerDto, description: 'Customer data to create' })
@ApiResponse({ 
    status: 201, 
    description: 'Customer created successfully',
    type: CustomerDto 
})
@ApiResponse({ status: 400, description: 'Invalid input data' })
@ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
@ApiResponse({ status: 409, description: 'Customer already exists' })
create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new CreateCustomerCommand(createCustomerDto, userWithRole));
}
```

### Documentation Components

**1. ApiOperation**
```typescript
@ApiOperation({ summary: 'Brief description of endpoint purpose' })
```

**2. ApiBody**
```typescript
@ApiBody({ 
    type: CreateEntityDto, 
    description: 'Entity data to create',
    examples: {
        'standard': {
            summary: 'Standard creation',
            value: {
                entityName: 'ABC Corporation',
                // ... other fields
            }
        }
    }
})
```

**3. ApiParam**
```typescript
@ApiParam({ 
    name: 'id', 
    description: 'Unique identifier of the entity',
    type: 'string',
    example: '01234567-89ab-cdef-0123-456789abcdef'
})
```

**4. ApiQuery**
```typescript
@ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of records to return',
    example: 10
})
@ApiQuery({ 
    name: 'direction', 
    required: false, 
    type: String,
    enum: ['next', 'prev'],
    description: 'Pagination direction'
})
@ApiQuery({ 
    name: 'cursorPointer', 
    required: false, 
    type: String,
    description: 'Cursor for pagination (null for first page)'
})
```

**5. ApiResponse**
```typescript
@ApiResponse({ 
    status: 200, 
    description: 'Operation successful',
    type: ResponseDto 
})
@ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
@ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
@ApiResponse({ status: 404, description: 'Not Found - Entity does not exist' })
@ApiResponse({ status: 409, description: 'Conflict - Entity already exists' })
@ApiResponse({ status: 500, description: 'Internal Server Error' })
```

---

## Authentication & Authorization

### CognitoAuthGuard

```typescript
@ApiBearerAuth()  // Indicates Bearer token required
@UseGuards(CognitoAuthGuard)  // Validates JWT token
@Controller('customer')
export class CustomerController {
    // All endpoints require authentication
}
```

### CurrentUser Decorator

```typescript
create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: UserCognito  // Extracts authenticated user from token
): Promise<any> {
    return this.commandBus.execute(new CreateCustomerCommand(dto, user));
}
```

### UserCognito Type

```typescript
export interface UserCognito {
    username: string;          // Cognito username
    email: string;             // User email
    role: UserRole;            // USER | ADMIN | SUPER_ADMIN
    sub: string;               // Cognito user ID
    // ... other Cognito attributes
}
```

### Role Override for Testing

```typescript
private applyUserRoleOverride(user: UserCognito, userRole?: string): UserCognito {
    if (userRole) {
        return { ...user, role: userRole as any };
    }
    return user;
}

// Usage in endpoint
@Post()
create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string  // Optional role override
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new CreateCustomerCommand(dto, userWithRole));
}
```

**Example API Call with Role Override:**
```bash
POST /customer?userRole=ADMIN
Authorization: Bearer <token>
Content-Type: application/json

{
    "customerName": "Test Customer",
    ...
}
```

---

## Command Endpoints

### Create Endpoint

```typescript
@Post()
@ApiOperation({ summary: 'Create a new customer record' })
@ApiBody({ type: CreateCustomerDto })
@ApiResponse({ status: 201, description: 'Customer created successfully' })
@ApiResponse({ status: 409, description: 'Customer already exists' })
create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new CreateCustomerCommand(createCustomerDto, userWithRole));
}
```

### Update Endpoint

```typescript
@Put(':id')
@ApiOperation({ summary: 'Update an existing customer record' })
@ApiParam({ name: 'id', description: 'Customer ID' })
@ApiBody({ type: UpdateCustomerDto })
@ApiResponse({ status: 200, description: 'Customer updated successfully' })
@ApiResponse({ status: 404, description: 'Customer not found' })
update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new UpdateCustomerCommand(id, updateCustomerDto, userWithRole));
}
```

### Delete Endpoint

```typescript
@Delete(':id')
@ApiOperation({ summary: 'Delete a customer record' })
@ApiParam({ name: 'id', description: 'Customer ID' })
@ApiBody({ type: DeleteCustomerDto })
@ApiResponse({ status: 200, description: 'Customer deleted successfully' })
@ApiResponse({ status: 404, description: 'Customer not found' })
delete(
    @Param('id') id: string,
    @Body() deleteCustomerDto: DeleteCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new DeleteCustomerCommand(id, deleteCustomerDto, userWithRole));
}
```

### Approve Endpoint

```typescript
@Put(':id/approve')
@ApiOperation({ summary: 'Approve a pending customer record' })
@ApiParam({ name: 'id', description: 'Customer ID' })
@ApiBody({ type: ApproveCustomerDto })
@ApiResponse({ status: 200, description: 'Customer approved successfully' })
@ApiResponse({ status: 403, description: 'Insufficient permissions to approve' })
@ApiResponse({ status: 404, description: 'Customer not found' })
approve(
    @Param('id') id: string,
    @Body() approveCustomerDto: ApproveCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new ApproveCustomerCommand(id, approveCustomerDto, userWithRole));
}
```

### Deny Endpoint

```typescript
@Put(':id/deny')
@ApiOperation({ summary: 'Deny a pending customer record' })
@ApiParam({ name: 'id', description: 'Customer ID' })
@ApiBody({ type: DenyCustomerDto })
@ApiResponse({ status: 200, description: 'Customer denied successfully' })
@ApiResponse({ status: 403, description: 'Insufficient permissions to deny' })
@ApiResponse({ status: 404, description: 'Customer not found' })
deny(
    @Param('id') id: string,
    @Body() denyCustomerDto: DenyCustomerDto,
    @CurrentUser() user: UserCognito,
    @Query('userRole') userRole?: string
): Promise<any> {
    const userWithRole = this.applyUserRoleOverride(user, userRole);
    return this.commandBus.execute(new DenyCustomerCommand(id, denyCustomerDto, userWithRole));
}
```

---

## Query Endpoints

### GetById Endpoint

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get customer by ID' })
@ApiParam({ name: 'id', description: 'Customer ID' })
@ApiResponse({ status: 200, description: 'Customer found', type: CustomerDto })
@ApiResponse({ status: 404, description: 'Customer not found' })
getById(@Param('id') id: string): Promise<any> {
    return this.queryBus.execute(new GetCustomerByIdQuery(id));
}
```

### GetByName Endpoint

```typescript
@Get('name/:name')
@ApiOperation({ summary: 'Get customers by name with pagination' })
@ApiParam({ name: 'name', description: 'Customer name to search' })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'direction', required: false, type: String })
@ApiQuery({ name: 'cursorPointer', required: false, type: String })
@ApiResponse({ status: 200, description: 'Customers found', type: [CustomerDto] })
getByName(
    @Param('name') name: string,
    @Query('limit') limit?: number,
    @Query('direction') direction?: string,
    @Query('cursorPointer') cursorPointer?: string
): Promise<any> {
    return this.queryBus.execute(new GetCustomerByNameQuery(name, limit, direction, cursorPointer));
}
```

### GetRecordsPagination Endpoint

```typescript
@Get()
@ApiOperation({ summary: 'Get all customer records with pagination' })
@ApiQuery({ name: 'limit', required: true, type: Number, example: 10 })
@ApiQuery({ name: 'direction', required: false, type: String, enum: ['next', 'prev'] })
@ApiQuery({ name: 'cursorPointer', required: false, type: String })
@ApiResponse({ status: 200, description: 'Customers retrieved', type: [CustomerDto] })
getRecordsPagination(
    @Query('limit') limit: number,
    @Query('direction') direction: string,
    @Query('cursorPointer') cursorPointer: string
): Promise<any> {
    return this.queryBus.execute(new GetCustomerRecordsPaginationQuery(limit, direction, cursorPointer));
}
```

### GetRecordsByStatusPagination Endpoint

```typescript
@Get('/status')
@ApiOperation({ summary: 'Get customer records by status with pagination' })
@ApiQuery({ name: 'status', required: true, type: String, enum: ['ACTIVE', 'FOR_APPROVAL', 'NEW_RECORD', 'FOR_DELETION'] })
@ApiQuery({ name: 'limit', required: true, type: Number, example: 10 })
@ApiQuery({ name: 'direction', required: false, type: String, enum: ['next', 'prev'] })
@ApiQuery({ name: 'cursorPointer', required: false, type: String })
@ApiQuery({ name: 'name', required: false, type: String, description: 'Filter by customer name' })
@ApiResponse({ status: 200, description: 'Customers retrieved', type: [CustomerDto] })
getRecordsPaginationByStatus(
    @Query('limit') limit: number,
    @Query('direction') direction: string,
    @Query('cursorPointer') cursorPointer: string,
    @Query('status') status: string,
    @Query('name') name: string
): Promise<any> {
    return this.queryBus.execute(new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name));
}
```

---

## Complete Controller Example

```typescript
// apps/customer/customer-api-service/src/app/customer/customer.controller.ts
import { 
    CreateCustomerDto, 
    UpdateCustomerDto, 
    DeleteCustomerDto, 
    ApproveCustomerDto, 
    DenyCustomerDto,
    CustomerDto 
} from '@dto';
import { UserCognito, CognitoAuthGuard, CurrentUser } from '@auth-guard-lib';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

// Commands
import { CreateCustomerCommand } from './commands/create/create.command';
import { UpdateCustomerCommand } from './commands/update/update.command';
import { DeleteCustomerCommand } from './commands/delete/delete.command';
import { ApproveCustomerCommand } from './commands/approve/approve.command';
import { DenyCustomerCommand } from './commands/deny/deny.command';

// Queries
import { GetCustomerByIdQuery } from './queries/get.by.id/get.customer.by.id.query';
import { GetCustomerByNameQuery } from './queries/get.by.name/get.customer.by.name.query';
import { GetCustomerRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';

@ApiBearerAuth()
@ApiTags('Customer')
@UseGuards(CognitoAuthGuard)
@Controller('customer')
export class CustomerController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus
    ) {}

    // ============================================
    // COMMAND ENDPOINTS
    // ============================================

    @Post()
    @ApiOperation({ summary: 'Create a new customer record' })
    @ApiBody({ type: CreateCustomerDto })
    @ApiResponse({ status: 201, description: 'Customer created successfully', type: CustomerDto })
    @ApiResponse({ status: 409, description: 'Customer already exists' })
    create(
        @Body() createCustomerDto: CreateCustomerDto,
        @CurrentUser() user: UserCognito,
        @Query('userRole') userRole?: string
    ): Promise<any> {
        const userWithRole = this.applyUserRoleOverride(user, userRole);
        return this.commandBus.execute(new CreateCustomerCommand(createCustomerDto, userWithRole));
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an existing customer record' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiBody({ type: UpdateCustomerDto })
    @ApiResponse({ status: 200, description: 'Customer updated successfully', type: CustomerDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    update(
        @Param('id') id: string,
        @Body() updateCustomerDto: UpdateCustomerDto,
        @CurrentUser() user: UserCognito,
        @Query('userRole') userRole?: string
    ): Promise<any> {
        const userWithRole = this.applyUserRoleOverride(user, userRole);
        return this.commandBus.execute(new UpdateCustomerCommand(id, updateCustomerDto, userWithRole));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a customer record' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiBody({ type: DeleteCustomerDto })
    @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    delete(
        @Param('id') id: string,
        @Body() deleteCustomerDto: DeleteCustomerDto,
        @CurrentUser() user: UserCognito,
        @Query('userRole') userRole?: string
    ): Promise<any> {
        const userWithRole = this.applyUserRoleOverride(user, userRole);
        return this.commandBus.execute(new DeleteCustomerCommand(id, deleteCustomerDto, userWithRole));
    }

    @Put(':id/approve')
    @ApiOperation({ summary: 'Approve a pending customer record' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiBody({ type: ApproveCustomerDto })
    @ApiResponse({ status: 200, description: 'Customer approved successfully', type: CustomerDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    approve(
        @Param('id') id: string,
        @Body() approveCustomerDto: ApproveCustomerDto,
        @CurrentUser() user: UserCognito,
        @Query('userRole') userRole?: string
    ): Promise<any> {
        const userWithRole = this.applyUserRoleOverride(user, userRole);
        return this.commandBus.execute(new ApproveCustomerCommand(id, approveCustomerDto, userWithRole));
    }

    @Put(':id/deny')
    @ApiOperation({ summary: 'Deny a pending customer record' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiBody({ type: DenyCustomerDto })
    @ApiResponse({ status: 200, description: 'Customer denied successfully', type: CustomerDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    deny(
        @Param('id') id: string,
        @Body() denyCustomerDto: DenyCustomerDto,
        @CurrentUser() user: UserCognito,
        @Query('userRole') userRole?: string
    ): Promise<any> {
        const userWithRole = this.applyUserRoleOverride(user, userRole);
        return this.commandBus.execute(new DenyCustomerCommand(id, denyCustomerDto, userWithRole));
    }

    // ============================================
    // QUERY ENDPOINTS
    // ============================================

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by ID' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer found', type: CustomerDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    getById(@Param('id') id: string): Promise<any> {
        return this.queryBus.execute(new GetCustomerByIdQuery(id));
    }

    @Get('name/:name')
    @ApiOperation({ summary: 'Get customers by name with pagination' })
    @ApiParam({ name: 'name', description: 'Customer name' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'direction', required: false, type: String })
    @ApiQuery({ name: 'cursorPointer', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Customers found' })
    getByName(
        @Param('name') name: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ): Promise<any> {
        return this.queryBus.execute(new GetCustomerByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({ summary: 'Get all customers with pagination' })
    @ApiQuery({ name: 'limit', required: true, type: Number })
    @ApiQuery({ name: 'direction', required: false, type: String })
    @ApiQuery({ name: 'cursorPointer', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Customers retrieved' })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ): Promise<any> {
        return this.queryBus.execute(new GetCustomerRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({ summary: 'Get customers by status with pagination' })
    @ApiQuery({ name: 'status', required: true, type: String })
    @ApiQuery({ name: 'limit', required: true, type: Number })
    @ApiQuery({ name: 'direction', required: false, type: String })
    @ApiQuery({ name: 'cursorPointer', required: false, type: String })
    @ApiQuery({ name: 'name', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Customers retrieved' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ): Promise<any> {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Apply user role override for testing purposes
     * Allows overriding the authenticated user's role via query parameter
     */
    private applyUserRoleOverride(user: UserCognito, userRole?: string): UserCognito {
        if (userRole) {
            return { ...user, role: userRole as any };
        }
        return user;
    }
}
```

---

## Testing Patterns

### Role Override Testing

```bash
# Test as USER (default from token)
POST /customer
Authorization: Bearer <token>

# Test as ADMIN (override)
POST /customer?userRole=ADMIN
Authorization: Bearer <token>

# Test as SUPER_ADMIN (override)
POST /customer?userRole=SUPER_ADMIN
Authorization: Bearer <token>
```

### Pagination Testing

```bash
# First page
GET /customer?limit=10

# Next page
GET /customer?limit=10&direction=next&cursorPointer=<cursor>

# Previous page
GET /customer?limit=10&direction=prev&cursorPointer=<cursor>
```

### Filter Testing

```bash
# Filter by status
GET /customer/status?status=FOR_APPROVAL&limit=10

# Filter by status and name
GET /customer/status?status=ACTIVE&name=ABC&limit=10
```

---

## Summary

**Controller Checklist:**

- [ ] Add @ApiBearerAuth() decorator
- [ ] Add @ApiTags('Entity') decorator
- [ ] Add @UseGuards(CognitoAuthGuard) decorator
- [ ] Add @Controller('entity') decorator
- [ ] Inject CommandBus and QueryBus
- [ ] Implement all command endpoints (Create, Update, Delete, Approve, Deny)
- [ ] Implement all query endpoints (GetById, GetByName, GetRecordsPagination, GetRecordsByStatusPagination)
- [ ] Add @ApiOperation() to all endpoints
- [ ] Add @ApiParam() for path parameters
- [ ] Add @ApiQuery() for query parameters
- [ ] Add @ApiBody() for request bodies
- [ ] Add @ApiResponse() for all possible responses
- [ ] Use @CurrentUser() to extract authenticated user
- [ ] Support userRole query parameter for testing
- [ ] Implement applyUserRoleOverride() helper method

**Key Principles:**
- ✅ All endpoints require authentication (CognitoAuthGuard)
- ✅ Commands receive user context, queries do not
- ✅ Comprehensive Swagger documentation for all endpoints
- ✅ Support role override via query parameter for testing
- ✅ Delegate all business logic to handlers
- ✅ Return promises directly from bus execution
- ✅ Follow RESTful patterns (POST, PUT, DELETE, GET)

---

**Next Steps:**
- Review [Modules Guide](./NESTJS_CQRS_MODULES_GUIDE.md) for module configuration
- Check [Main CQRS Guide](./NESTJS_CQRS_MODULE_GUIDE.md) for overall architecture
