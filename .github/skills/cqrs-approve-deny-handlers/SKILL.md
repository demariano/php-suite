---
name: 'cqrs-approve-deny-handlers'
description: 'USE FOR: Creating Approve, Deny, and Reactivate CQRS command handlers. Covers approval workflow status transitions (FOR_APPROVAL/NEW_RECORD to ACTIVE, FOR_DEACTIVATION to INACTIVE), forApprovalVersion field application, deny logic (revert/hard delete NEW_RECORD), reactivate (INACTIVE to ACTIVE), ForbiddenException for non-admin, event publishing on name change after approval.'
---

# CQRS Approve / Deny / Reactivate Handlers

## Command Class Patterns

### Approve Command

```ts
import { UserCognito } from '@auth-guard-lib';

export class Approve{Entity}Command {
    {entityCamel}Id: string;
    user: UserCognito;

    constructor({entityCamel}Id: string, user: UserCognito) {
        this.user = user;
        this.{entityCamel}Id = {entityCamel}Id;
    }
}
```

### Deny Command

```ts
import { UserCognito } from '@auth-guard-lib';

export class Deny{Entity}Command {
    {entityCamel}Id: string;
    user: UserCognito;
    approverMessage: string;

    constructor({entityCamel}Id: string, user: UserCognito, approverMessage: string) {
        this.user = user;
        this.{entityCamel}Id = {entityCamel}Id;
        this.approverMessage = approverMessage;
    }
}
```

### Reactivate Command

```ts
import { UserCognito } from '@auth-guard-lib';

export class Reactivate{Entity}Command {
    constructor(
        public readonly {entityCamel}Id: string,
        public readonly user: UserCognito
    ) {}
}
```

## Approve Handler Template

```ts
import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, {Entity}Dto, {Entity}EventDto, {Entity}EventEnum, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Approve{Entity}Command } from './approve.command';

const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(Approve{Entity}Command)
export class Approve{Entity}Handler implements ICommandHandler<Approve{Entity}Command> {
    protected readonly logger = new Logger(Approve{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: Approve{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        try {
            const existingRecord = await this.validateExists(command.{entityCamel}Id);
            this.validateAuthorization(command.user.roles);
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Id);
        }
    }

    private async validateExists(id: string): Promise<{Entity}Dto> {
        const record = await this.{entityCamel}DatabaseService.findRecordById(id);
        if (!record) throw new NotFoundException(`{Entity} not found for id ${id}`);
        return record;
    }

    private validateAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }
        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
        if (!hasPermission) {
            throw new ForbiddenException('Not authorized to approve');
        }
    }

    private async processApproval(existingRecord: {Entity}Dto, user: UserCognito): Promise<ResponseDto<{Entity}Dto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve with status: ${existingRecord.status}`);
        }
    }

    // ──── Approve FOR_APPROVAL / NEW_RECORD → ACTIVE ────
    private async approveRecord(existingRecord: {Entity}Dto, user: UserCognito): Promise<ResponseDto<{Entity}Dto>> {
        const oldName = existingRecord.{entityCamel}Name;
        const approvalVersion = existingRecord.forApprovalVersion ?? {};

        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Apply forApprovalVersion fields
        existingRecord.{entityCamel}Name = (approvalVersion.{entityCamel}Name as string) ?? existingRecord.{entityCamel}Name;
        // ... apply all entity-specific fields from approvalVersion with ?? fallback

        existingRecord.changeReason = null;
        existingRecord.forApprovalVersion = {};

        const updatedRecord = await this.{entityCamel}DatabaseService.updateRecord(existingRecord);

        // Publish event if name changed
        if (oldName !== updatedRecord.{entityCamel}Name) {
            await this.publishUpdatedEvent(updatedRecord.{entityCamel}Id, updatedRecord.{entityCamel}Name);
        }

        return new ResponseDto<{Entity}Dto>(updatedRecord, HTTP_STATUS_OK);
    }

    // ──── Approve FOR_DEACTIVATION → INACTIVE ────
    private async approveDeactivation(existingRecord: {Entity}Dto): Promise<ResponseDto<{Entity}Dto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.{entityCamel}DatabaseService.updateRecord(existingRecord);
        return new ResponseDto<{Entity}Dto>(updatedRecord, HTTP_STATUS_OK);
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
        this.logger.error(`Error processing approval for ${id}:`, error);
        if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(msg);
    }
}
```

## Deny Handler Template

```ts
import { ErrorResponseDto, {Entity}Dto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Deny{Entity}Command } from './deny.command';

const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(Deny{Entity}Command)
export class Deny{Entity}Handler implements ICommandHandler<Deny{Entity}Command> {
    protected readonly logger = new Logger(Deny{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(command: Deny{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        try {
            const existingRecord = await this.validateExists(command.{entityCamel}Id);
            this.validateAuthorization(command.user.roles);
            return await this.processDeny(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Id);
        }
    }

    private async validateExists(id: string): Promise<{Entity}Dto> {
        const record = await this.{entityCamel}DatabaseService.findRecordById(id);
        if (!record) throw new NotFoundException(`{Entity} not found for id ${id}`);
        return record;
    }

    private validateAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) throw new ForbiddenException('User roles not found');
        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
        if (!hasPermission) throw new ForbiddenException('Not authorized to deny');
    }

    private async processDeny(existingRecord: {Entity}Dto, command: Deny{Entity}Command): Promise<ResponseDto<{Entity}Dto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyChanges(existingRecord, command);
            case StatusEnum.FOR_DELETION:
            case StatusEnum.FOR_DEACTIVATION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteNewRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny with status: ${existingRecord.status}`);
        }
    }

    // ──── Deny FOR_APPROVAL → revert to ACTIVE, clear forApprovalVersion ────
    private async denyChanges(existingRecord: {Entity}Dto, command: Deny{Entity}Command): Promise<ResponseDto<{Entity}Dto>> {
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} changes denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} changes denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        const updatedRecord = await this.{entityCamel}DatabaseService.updateRecord(existingRecord);
        return new ResponseDto<{Entity}Dto>(updatedRecord, HTTP_STATUS_OK);
    }

    // ──── Deny NEW_RECORD → hard delete ────
    private async deleteNewRecord(existingRecord: {Entity}Dto): Promise<ResponseDto<{Entity}Dto>> {
        existingRecord.changeReason = null;
        await this.{entityCamel}DatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<{Entity}Dto>(existingRecord, HTTP_STATUS_OK);
    }

    // ──── Deny FOR_DELETION/FOR_DEACTIVATION → revert to ACTIVE ────
    private async denyDeletion(existingRecord: {Entity}Dto, command: Deny{Entity}Command): Promise<ResponseDto<{Entity}Dto>> {
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.changeReason = null;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} deletion denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.{entityCamel}DatabaseService.updateRecord(existingRecord);
        return new ResponseDto<{Entity}Dto>(updatedRecord, HTTP_STATUS_OK);
    }

    private handleError(error: unknown, id: string): never {
        this.logger.error(`Error processing deny for ${id}:`, error);
        if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(msg);
    }
}
```

## Reactivate Handler Template

```ts
import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, {Entity}Dto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { {Entity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { Reactivate{Entity}Command } from './reactivate.command';

const HTTP_STATUS_OK = 200;

@CommandHandler(Reactivate{Entity}Command)
export class Reactivate{Entity}Handler implements ICommandHandler<Reactivate{Entity}Command> {
    protected readonly logger = new Logger(Reactivate{Entity}Handler.name);

    constructor(
        @Inject('{Entity}DatabaseService')
        private readonly {entityCamel}DatabaseService: {Entity}DatabaseServiceAbstract
    ) {}

    async execute(command: Reactivate{Entity}Command): Promise<ResponseDto<{Entity}Dto | ErrorResponseDto>> {
        try {
            this.validatePermissions(command.user);

            const existing = await this.{entityCamel}DatabaseService.findRecordById(command.{entityCamel}Id);
            if (!existing) throw new NotFoundException(`{Entity} not found for id ${command.{entityCamel}Id}`);
            if (existing.status !== StatusEnum.INACTIVE) {
                throw new BadRequestException(`Cannot reactivate with status: ${existing.status}. Only INACTIVE records can be reactivated.`);
            }

            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs = existing.activityLogs || [];
            existing.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, {Entity} reactivated by ${command.user.username}`
            );

            const updated = await this.{entityCamel}DatabaseService.updateRecord(existing);
            return new ResponseDto<{Entity}Dto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.{entityCamel}Id);
        }
    }

    private validatePermissions(user: UserCognito): void {
        const hasPermission = user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN));
        if (!hasPermission) throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can reactivate');
    }

    private handleError(error: unknown, id: string): never {
        this.logger.error(`Error reactivating ${id}:`, error);
        if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
        throw new BadRequestException(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
}
```

## Status Transition Summary

| Current Status     | Approve →                           | Deny →                                      |
| ------------------ | ----------------------------------- | ------------------------------------------- |
| `FOR_APPROVAL`     | `ACTIVE` (apply forApprovalVersion) | `ACTIVE` (revert, clear forApprovalVersion) |
| `NEW_RECORD`       | `ACTIVE` (apply forApprovalVersion) | **HARD DELETE** (remove record)             |
| `FOR_DEACTIVATION` | `INACTIVE`                          | `ACTIVE` (revert)                           |
| `FOR_DELETION`     | `INACTIVE`                          | `ACTIVE` (revert)                           |
| `INACTIVE`         | N/A                                 | N/A (use Reactivate → `ACTIVE`)             |
