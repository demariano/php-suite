---
name: 'cqrs-command-handlers'
description: 'USE FOR: Creating CQRS command classes and handlers for Create, Update, Delete operations. Covers approval workflow (ADMIN direct apply vs USER forApprovalVersion), field change detection with detectFieldChanges/formatFieldChanges, activity log management with reduceArrayContents, SQS event publishing on name changes, status transitions, ResponseDto wrapping.'
---

# CQRS Command Handlers (Create / Update / Delete)

## Command Class Patterns

### Create Command

```ts
import { UserCognito } from '@auth-guard-lib';
import { Create{Entity}Dto } from '@dto';

export class Create{Entity}Command {
    {entityCamel}Dto: Create{Entity}Dto;
    user: UserCognito;

    constructor({entityCamel}Dto: Create{Entity}Dto, user: UserCognito) {
        this.{entityCamel}Dto = {entityCamel}Dto;
        this.user = user;
    }
}
```

### Update Command

```ts
import { UserCognito } from '@auth-guard-lib';
import { {Entity}Dto } from '@dto';

export class Update{Entity}Command {
    {entityCamel}Dto: {Entity}Dto;
    {entityCamel}Id: string;
    user: UserCognito;

    constructor({entityCamel}Id: string, {entityCamel}Dto: {Entity}Dto, user: UserCognito) {
        this.{entityCamel}Dto = {entityCamel}Dto;
        this.{entityCamel}Id = {entityCamel}Id;
        this.user = user;
    }
}
```

### Delete Command

```ts
import { UserCognito } from '@auth-guard-lib';
import { {Entity}Dto } from '@dto';

export class Delete{Entity}Command {
    {entityCamel}Dto: {Entity}Dto;
    {entityCamel}Id: string;
    user: UserCognito;

    constructor({entityCamel}Id: string, {entityCamel}Dto: {Entity}Dto, user: UserCognito) {
        this.{entityCamel}Dto = {entityCamel}Dto;
        this.{entityCamel}Id = {entityCamel}Id;
        this.user = user;
    }
}
```

## Create Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Create{Entity}Command } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(Create{Entity}Command)
export class Create{Entity}Handler implements ICommandHandler<Create{Entity}Command> {
    protected readonly logger = new Logger(Create{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(command: Create{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for {entity}: ${command.{entityCamel}Dto.{entityCamel}Name}`);

        try {
            // Validate name unique
            await this.validateNameUnique(command.{entityCamel}Dto.{entityCamel}Name);

            // Check role and set status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);
            this.updateStatus(command, hasApprovalPermission);

            // Create record
            const createdRecord = await this.{entityCamel}DatabaseService.createRecord(command.{entityCamel}Dto);

            this.logger.log(`{Entity} created successfully: ${createdRecord.{entityCamel}Id}`);
            return new ResponseDto<{Entity}Dto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Dto.{entityCamel}Name);
        }
    }

    private async validateNameUnique(name: string): Promise<void> {
        const existing = await this.{entityCamel}DatabaseService.findRecordByName(name);
        if (existing) {
            throw new BadRequestException('{Entity} name already exists');
        }
    }

    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) return false;
        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    private updateStatus(command: Create{Entity}Command, hasApprovalPermission: boolean): void {
        command.{entityCamel}Dto.activityLogs = command.{entityCamel}Dto.activityLogs ?? [];

        if (hasApprovalPermission) {
            // ADMIN: Set directly to ACTIVE
            command.{entityCamel}Dto.status = StatusEnum.ACTIVE;
            command.{entityCamel}Dto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            command.{entityCamel}Dto.activityLogs = reduceArrayContents(command.{entityCamel}Dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.{entityCamel}Dto.forApprovalVersion = {};
            command.{entityCamel}Dto.changeReason = undefined;
        } else {
            // USER: Set to NEW_RECORD with forApprovalVersion snapshot
            command.{entityCamel}Dto.status = StatusEnum.NEW_RECORD;
            command.{entityCamel}Dto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} created by ${command.user.username} for approval`
            );
            command.{entityCamel}Dto.activityLogs = reduceArrayContents(command.{entityCamel}Dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            // Snapshot all editable fields into forApprovalVersion
            command.{entityCamel}Dto.forApprovalVersion = {
                {entityCamel}Name: command.{entityCamel}Dto.{entityCamel}Name,
                // ... add all entity-specific fields here
            };
        }
    }

    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error processing create request for ${name}:`, error);
        if (error instanceof BadRequestException) throw error;
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(msg);
    }
}
```

## Update Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, {Entity}EventDto, {Entity}EventEnum, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Update{Entity}Command } from './update.command';

const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(Update{Entity}Command)
export class Update{Entity}Handler implements ICommandHandler<Update{Entity}Command> {
    protected readonly logger = new Logger(Update{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: Update{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for {entity}: ${command.{entityCamel}Id}`);

        try {
            command.{entityCamel}Dto.{entityCamel}Id = command.{entityCamel}Id;

            // Validate exists
            const existingRecord = await this.validateExists(command.{entityCamel}Id);

            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);
            const oldName = existingRecord.{entityCamel}Name;

            // Update based on role
            await this.updateStatus(existingRecord, command, hasApprovalPermission);
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs ?? [], ACTIVITY_LOGS_LIMIT);

            const updatedRecord = await this.{entityCamel}DatabaseService.updateRecord(existingRecord);

            // Publish event if name changed (admin only)
            if (hasApprovalPermission && oldName !== command.{entityCamel}Dto.{entityCamel}Name) {
                await this.publishUpdatedEvent(existingRecord.{entityCamel}Id, command.{entityCamel}Dto.{entityCamel}Name);
            }

            return new ResponseDto<{Entity}Dto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Id);
        }
    }

    private async validateExists(id: string): Promise<{Entity}Dto> {
        const record = await this.{entityCamel}DatabaseService.findRecordById(id);
        if (!record) throw new NotFoundException(`{Entity} not found for id ${id}`);
        if (record.status == StatusEnum.FOR_DELETION || record.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('{Entity} is already for deletion or approval');
        }
        return record;
    }

    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) return false;
        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    private async updateStatus(
        existingRecord: {Entity}Dto,
        command: Update{Entity}Command,
        hasApprovalPermission: boolean
    ): Promise<void> {
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];

        if (hasApprovalPermission) {
            // ADMIN: Apply changes directly
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.{entityCamel}Name = command.{entityCamel}Dto.{entityCamel}Name;
            // ... apply all entity-specific fields from command.{entityCamel}Dto
            existingRecord.forApprovalVersion = {};
            existingRecord.changeReason = undefined;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // USER: Detect changes, set FOR_APPROVAL, store snapshot
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const fieldChanges = detectFieldChanges(existingRecord, command.{entityCamel}Dto, {
                // For array fields, specify the ID field for diff matching
                arrayIdFields: {
                    // e.g., productDeals: 'productDealId',
                },
            });
            const formattedChanges = formatFieldChanges(fieldChanges);
            const trimmedReason = command.{entityCamel}Dto.changeReason?.trim();

            existingRecord.forApprovalVersion = {
                {entityCamel}Name: command.{entityCamel}Dto.{entityCamel}Name,
                // ... snapshot all editable fields
            };

            const combinedReason = [trimmedReason, formattedChanges]
                .filter((v) => v && v.length > 0)
                .join('\n\n');
            existingRecord.changeReason = combinedReason || undefined;

            let logMsg = `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} updated by ${command.user.username} for approval`;
            if (formattedChanges) logMsg += ` - ${formattedChanges}`;
            existingRecord.activityLogs.push(logMsg);
        }
    }

    private async publishUpdatedEvent(entityId: string, newName: string): Promise<void> {
        try {
            const eventDto: {Entity}EventDto = {
                {entityCamel}Id: entityId,
                new{Entity}Name: newName,
                eventType: {Entity}EventEnum.{ENTITY}_UPDATED,
                timestamp: new Date().toISOString(),
            };
            const queueUrl = this.configService.get<string>('{DOMAIN}_EVENT_SQS');
            if (!queueUrl) return;
            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
        } catch (error) {
            this.logger.error(`Failed to publish event`, error);
        }
    }

    private handleError(error: unknown, id: string): never {
        this.logger.error(`Error processing update for ${id}:`, error);
        if (error instanceof NotFoundException) throw error;
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(msg);
    }
}
```

## Delete Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Delete{Entity}Command } from './delete.command';

const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(Delete{Entity}Command)
export class Delete{Entity}Handler implements ICommandHandler<Delete{Entity}Command> {
    protected readonly logger = new Logger(Delete{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(command: Delete{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for {entity}: ${command.{entityCamel}Id}`);

        try {
            const existingRecord = await this.validateExists(command.{entityCamel}Id);
            const hasPermission = this.hasDeletePermission(command.user.roles);
            const payload = this.updateStatus(command, existingRecord, hasPermission);

            // ALWAYS soft delete (updateRecord) — master data is never hard deleted
            const deletedRecord = await this.{entityCamel}DatabaseService.updateRecord(payload);

            return new ResponseDto<{Entity}Dto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Id);
        }
    }

    private async validateExists(id: string): Promise<{Entity}Dto> {
        const record = await this.{entityCamel}DatabaseService.findRecordById(id);
        if (!record) throw new NotFoundException(`{Entity} not found for id ${id}`);
        return record;
    }

    private hasDeletePermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) return false;
        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    private updateStatus(
        command: Delete{Entity}Command,
        existingRecord: {Entity}Dto,
        hasPermission: boolean
    ): {Entity}Dto {
        command.{entityCamel}Dto.{entityCamel}Id = command.{entityCamel}Id;

        if (hasPermission) {
            // ADMIN: Immediate soft delete
            command.{entityCamel}Dto.status = StatusEnum.INACTIVE;
            const log = `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} soft deleted by ${command.user.username}`;
            command.{entityCamel}Dto.activityLogs = reduceArrayContents(
                [...(existingRecord.activityLogs || []), log], ACTIVITY_LOGS_LIMIT
            );
        } else {
            // USER: Mark for deactivation
            command.{entityCamel}Dto.status = StatusEnum.FOR_DEACTIVATION;
            command.{entityCamel}Dto.changeReason = command.{entityCamel}Dto.changeReason || 'Pending deactivation approval';
            const log = `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} marked for deactivation by ${command.user.username}`;
            command.{entityCamel}Dto.activityLogs = reduceArrayContents(
                [...(existingRecord.activityLogs || []), log], ACTIVITY_LOGS_LIMIT
            );
        }
        return command.{entityCamel}Dto;
    }

    private handleError(error: unknown, id: string): never {
        this.logger.error(`Error processing delete for ${id}:`, error);
        if (error instanceof NotFoundException) throw error;
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(msg);
    }
}
```

## Key Rules

1. **Activity logs** — Always `reduceArrayContents(logs, 10)` to keep last 10 entries
2. **Approval workflow** — ADMIN/SUPER_ADMIN → direct apply + ACTIVE; USER → forApprovalVersion + pending status
3. **Field change detection** — `detectFieldChanges()` + `formatFieldChanges()` from `@field-change-utils-lib` for user updates
4. **Event publishing** — Only on ADMIN updates that change the entity name; publish to `{DOMAIN}_EVENT_SQS`
5. **Cross-domain events** — If entity name is denormalized in other domains, also publish to their SQS queues
6. **Soft delete only** — Master data uses `updateRecord()` with `INACTIVE`/`FOR_DEACTIVATION`, never hard delete
7. **Timestamp format** — `new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })`
8. **`forApprovalVersion`** — Must snapshot ALL editable fields, not just changed ones
