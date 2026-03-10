---
name: 'nestjs-cqrs-module'
description: 'USE FOR: Creating NestJS CQRS feature modules, controllers with Swagger decorators, CommandBus/QueryBus dispatch, CognitoAuthGuard, CurrentUser decorator, string-token DI wiring, route definitions for CRUD and approval workflow endpoints.'
---

# NestJS CQRS Feature Module + Controller

## Directory Structure

```
src/app/{entity-kebab}/
├── {entity-kebab}.module.ts
├── {entity-kebab}.controller.ts
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
│   ├── deny-record/
│   │   ├── deny.command.ts
│   │   ├── deny.handler.ts
│   │   └── deny.dto.ts
│   └── reactivate/
│       ├── reactivate.command.ts
│       └── reactivate.handler.ts
└── queries/
    ├── get.by.id/
    │   ├── get.{entity}.by.id.query.ts
    │   └── get.{entity}.by.id.handler.ts
    ├── get.by.name/
    │   ├── get.{entity}.by.name.query.ts
    │   └── get.{entity}.by.name.handler.ts
    ├── get.records.pagination/
    │   ├── get.records.pagination.query.ts
    │   └── get.records.pagination.handler.ts
    └── get.records.by.status.pagination/
        ├── get.records.by.status.pagination.query.ts
        └── get.records.by.status.pagination.handler.ts
```

## Template: Feature Module

```ts
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { {Entity}DatabaseService, {Domain}DatabaseServiceModule } from '@{domain}-database-service';
import { Approve{Entity}Handler } from './command/approve-record/approve.handler';
import { Create{Entity}Handler } from './command/create/create.handler';
import { Delete{Entity}Handler } from './command/delete/delete.handler';
import { Deny{Entity}Handler } from './command/deny-record/deny.handler';
import { Reactivate{Entity}Handler } from './command/reactivate/reactivate.handler';
import { Update{Entity}Handler } from './command/update/update.handler';
import { {Entity}Controller } from './{entity-kebab}.controller';
import { Get{Entity}ByIdHandler } from './queries/get.by.id/get.{entity}.by.id.handler';
import { Get{Entity}ByNameHandler } from './queries/get.by.name/get.{entity}.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { Get{Entity}RecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        {Domain}DatabaseServiceModule,
    ],
    controllers: [{Entity}Controller],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: '{Entity}DatabaseService',
            useClass: {Entity}DatabaseService,
        },
        Create{Entity}Handler,
        Get{Entity}ByIdHandler,
        Get{Entity}ByNameHandler,
        Get{Entity}RecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        Update{Entity}Handler,
        Delete{Entity}Handler,
        Approve{Entity}Handler,
        Deny{Entity}Handler,
        Reactivate{Entity}Handler,
    ],
})
export class {Entity}Module {}
```

**Key DI patterns:**

-   `'MessageQueueAwsLibService'` — string token for SQS service
-   `'{Entity}DatabaseService'` — string token for DB service
-   All command/query handlers listed as providers (NestJS CQRS auto-registers them)

## Template: Controller

```ts
import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { Create{Entity}Dto, {Entity}Dto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Approve{Entity}Command } from './command/approve-record/approve.command';
import { Create{Entity}Command } from './command/create/create.command';
import { Delete{Entity}Command } from './command/delete/delete.command';
import { Deny{Entity}Command } from './command/deny-record/deny.command';
import { Deny{Entity}Dto } from './command/deny-record/deny.dto';
import { Reactivate{Entity}Command } from './command/reactivate/reactivate.command';
import { Update{Entity}Command } from './command/update/update.command';
import { Get{Entity}ByIdQuery } from './queries/get.by.id/get.{entity}.by.id.query';
import { Get{Entity}ByNameQuery } from './queries/get.by.name/get.{entity}.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { Get{Entity}RecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('{entity-plural-kebab}')
@ApiTags('{entity-plural-kebab}')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class {Entity}Controller {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus
    ) {}

    // ──── CREATE ────
    @Post()
    @ApiOperation({ summary: 'Create new {entity}' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiBody({ type: Create{Entity}Dto })
    @ApiResponse({ status: 201, type: {Entity}Dto })
    createRecord(
        @Body() createDto: Create{Entity}Dto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return this.commandBus.execute(new Create{Entity}Command(createDto, user));
    }

    // ──── UPDATE ────
    @Put(':id')
    @ApiOperation({ summary: 'Update {entity}' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiBody({ type: {Entity}Dto })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    updateRecord(
        @Param('id') id: string,
        @Body() dto: {Entity}Dto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return this.commandBus.execute(new Update{Entity}Command(id, dto, user));
    }

    // ──── DELETE ────
    @Delete(':id')
    @ApiOperation({ summary: 'Delete {entity}' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    deleteRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        const dto = new {Entity}Dto();
        dto.{entityCamel}Id = id;
        return this.commandBus.execute(new Delete{Entity}Command(id, dto, user));
    }

    // ──── APPROVE ────
    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve {entity}' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    approveRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return this.commandBus.execute(new Approve{Entity}Command(id, user));
    }

    // ──── DENY ────
    @Post(':id/deny')
    @ApiOperation({ summary: 'Deny {entity}' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiBody({ type: Deny{Entity}Dto })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    denyRecord(
        @Param('id') id: string,
        @Body() denyDto: Deny{Entity}Dto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return this.commandBus.execute(new Deny{Entity}Command(id, user, denyDto.approverMessage));
    }

    // ──── REACTIVATE ────
    @Post(':id/reactivate')
    @ApiOperation({ summary: 'Reactivate {entity}' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiQuery({ name: 'userRole', type: String, required: false, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    async reactivateRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return this.commandBus.execute(new Reactivate{Entity}Command(id, user));
    }

    // ──── GET BY NAME (paginated) ────
    @Get('name/:name')
    @ApiOperation({ summary: 'Get {entity-plural} by name' })
    @ApiParam({ name: 'name', description: '{Entity} name to search' })
    @ApiQuery({ name: 'limit', type: Number, required: false })
    @ApiQuery({ name: 'direction', type: String, required: false, enum: ['next', 'prev'] })
    @ApiQuery({ name: 'cursorPointer', type: String, required: false })
    getByName(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        const normalizedLimit = limit ? Number(limit) : 10;
        return this.queryBus.execute(
            new Get{Entity}ByNameQuery(name, normalizedLimit, direction, cursorPointer)
        );
    }

    // ──── GET ALL (paginated) ────
    @Get()
    @ApiOperation({ summary: 'Get {entity-plural} with pagination' })
    @ApiQuery({ name: 'limit', type: Number, required: true })
    @ApiQuery({ name: 'direction', type: String, required: false, enum: ['next', 'prev'] })
    @ApiQuery({ name: 'cursorPointer', type: String, required: false })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new Get{Entity}RecordsPaginationQuery(limit, direction, cursorPointer)
        );
    }

    // ──── GET BY STATUS (paginated) ────
    @Get('/status')
    @ApiOperation({ summary: 'Get {entity-plural} by status with pagination' })
    @ApiQuery({ name: 'limit', type: Number, required: true })
    @ApiQuery({ name: 'direction', type: String, required: false, enum: ['next', 'prev'] })
    @ApiQuery({ name: 'cursorPointer', type: String, required: false })
    @ApiQuery({ name: 'status', type: String, required: false, enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'] })
    @ApiQuery({ name: 'name', type: String, required: false })
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

    // ──── GET BY ID ────
    @Get(':id')
    @ApiOperation({ summary: 'Get {entity} by ID' })
    @ApiParam({ name: 'id', description: '{Entity} ID' })
    @ApiResponse({ status: 200, type: {Entity}Dto })
    @ApiResponse({ status: 404, description: '{Entity} not found' })
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new Get{Entity}ByIdQuery(id));
    }
}
```

## Template: Deny DTO

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class Deny{Entity}Dto {
    @ApiProperty({
        description: 'Reason for denying the {entity} record',
        minLength: 3,
    })
    @IsNotEmpty({ message: 'Approver message is required' })
    @IsString({ message: 'Approver message must be a string' })
    @MinLength(3, { message: 'Approver message must be at least 3 characters long' })
    approverMessage!: string;
}
```

## Route Order Rule

**IMPORTANT:** Named routes must come BEFORE parameterized routes to avoid conflicts:

1. `@Get('name/:name')` — before `@Get(':id')`
2. `@Get('/status')` — before `@Get(':id')`
3. `@Get(':id')` — LAST among GET routes

## Key Rules

1. **`@UseGuards(CognitoAuthGuard)`** at controller level — all routes require JWT
2. **`@CurrentUser()` decorator** — extracts `UserCognito { username, roles }` from JWT
3. **`userRole` query param** — allows role override when `BYPASS_AUTH=ENABLED` (dev only)
4. **Command routes**: POST (create), PUT (update), DELETE (delete), POST (approve/deny/reactivate)
5. **Query routes**: GET (by-id, by-name, pagination, status-pagination)
6. **Commands get `@CurrentUser()`**, queries typically don't (read-only)
7. **Each handler is in its own subfolder** with command/query class + handler file
