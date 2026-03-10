---
description: 'Use when creating or modifying NestJS backend services, controllers, command handlers, query handlers, modules, or database services. Covers CQRS structure, approval workflow, event publishing, and database service patterns.'
applyTo: 'apps/**/src/**/*.ts,libs/backend/**/*.ts'
---

# Backend Service Conventions

## CQRS Feature Module Checklist

When creating a new feature module:

1. Create `{feature}.module.ts` — import `CqrsModule`, DB service module, register all command/query handlers
2. Create `{feature}.controller.ts` — inject `CommandBus` + `QueryBus`, use `@UseGuards(CognitoAuthGuard)`, decorate with `@CurrentUser()`
3. Create `command/` folder with subdirectories: `create/`, `update/`, `delete/`, `approve-record/`, `deny-record/`
4. Create `queries/` folder with subdirectories: `get.by.id/`, `get.by.name/`, `get.records.pagination/`, `get.records.by.status.pagination/`
5. Each command/query has two files: `{action}.command.ts` (or `.query.ts`) + `{action}.handler.ts`

## Controller Pattern

```typescript
@Controller('entities')
@UseGuards(CognitoAuthGuard)
export class EntityController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    create(@Body() dto: CreateEntityDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new CreateEntityCommand(dto, user));
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetEntityByIdQuery(id));
    }
}
```

## Command Handler Pattern

```typescript
@CommandHandler(CreateEntityCommand)
export class CreateEntityHandler implements ICommandHandler<CreateEntityCommand> {
    constructor(
        @Inject('EntityDatabaseService') private readonly db: EntityDatabaseServiceAbstract,
        @Inject('MessageQueueService') private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: CreateEntityCommand): Promise<ResponseDto<EntityDto | ErrorResponseDto>> {
        // 1. Validate input
        // 2. Set status based on role: ADMIN → ACTIVE, USER → NEW_RECORD
        // 3. Build entity object with dateCreated, createdBy, activityLogs
        // 4. Save via database service
        // 5. Publish SQS event if needed
        // 6. Return ResponseDto with statusCode 201
    }
}
```

## Database Service Pattern

-   **Abstract class** defines the contract — all CRUD + query methods as abstract
-   **Implementation** injects `DynamoDbLibService`, gets OneTable model, implements abstract methods
-   **String-token DI**: Provide as `'EntityDatabaseService'`, inject via `@Inject('EntityDatabaseService')`
-   **Pagination**: Use `pageRecordHandler(model, queryOptions, direction, cursorPointer)`

## Approval Workflow Rules (Command Handlers)

### Create

-   `ADMIN`/`SUPER_ADMIN` → status = `ACTIVE`
-   `USER` → status = `NEW_RECORD`

### Update

-   `ADMIN`/`SUPER_ADMIN` → apply changes directly, keep `ACTIVE`
-   `USER` → status = `FOR_APPROVAL`, store current changes in `forApprovalVersion`

### Delete

-   `ADMIN`/`SUPER_ADMIN` → hard delete (remove record)
-   `USER` → status = `FOR_DELETION` (soft delete)

### Approve

-   Apply `forApprovalVersion` fields to record, set status = `ACTIVE`, clear `forApprovalVersion`
-   Append to `activityLogs`: `"Date: {ISO}, Approved by {email}. {approverMessage}"`

### Deny

-   Set status = `ACTIVE`, clear `forApprovalVersion`, set `approverMessage`
-   Append to `activityLogs`: `"Date: {ISO}, Denied by {email}. {approverMessage}"`

-   `changeReason` is **required** for all USER edits
-   Always append to `activityLogs[]`, never replace

## Event Publishing

After DB operations that change entity names or trigger cross-domain effects:

```typescript
await this.messageQueueService.sendMessageToSQS(
    this.configService.get('DOMAIN_EVENT_SQS'),
    JSON.stringify({ eventType: DomainEventEnum.ENTITY_UPDATED, entityId, entityName })
);
```

## Event Handler Pattern (SQS Services)

-   `MessageHandlerService.handleMessage(message)` parses body, switches on `eventType`
-   Denormalized name propagation: paginate all referencing records (100/page, 50ms delay), batch-update name field
-   `SqsLocalService.pollQueue()` long-polls local SQS when `LOCALSTACK_STATUS=ENABLED`

## Response Wrapping

-   Always return `ResponseDto<T>` with `statusCode` and `data`
-   Pagination responses include `nextCursorPointer` and `prevCursorPointer`
-   Errors: throw `BadRequestException` or return `ErrorResponseDto`

## Swagger

-   Decorate all endpoints with `@ApiOperation`, `@ApiResponse`, `@ApiQuery`, `@ApiBody`
-   Decorate all DTO fields with `@ApiProperty()`
