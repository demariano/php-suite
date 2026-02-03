import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import {
    AccountEventDto,
    AccountEventEnum,
    AccountsDto,
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateAccountsCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateAccountsCommand)
export class UpdateAccountsHandler implements ICommandHandler<UpdateAccountsCommand> {
    protected readonly logger = new Logger(UpdateAccountsHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateAccountsCommand): Promise<ResponseDto<AccountsDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for account: ${command.recordId}`);

        try {
            // Fetch and validate existing account record
            const existingRecord = await this.fetchAccountById(command.recordId);

            // Validate that account name doesn't already exist (if changed)
            await this.validateAccountNameUnique(command.accountsDto.accountName, command.recordId);

            // Validate account type is provided
            this.validateAccountType(command.accountsDto);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Validate status transitions for admins
            if (hasApprovalPermission && command.accountsDto.status) {
                this.validateStatusTransition(existingRecord.status, command.accountsDto.status);
            }

            // Update status and activity logs based on permissions
            const recordToPersist = hasApprovalPermission
                ? this.applyAdminUpdates(command, existingRecord)
                : this.applyNonAdminUpdates(command, existingRecord);

            // Update record in database
            const updatedRecord = await this.accountsDatabaseService.updateRecord(recordToPersist);

            // Publish account updated event if name changed and approved
            if (hasApprovalPermission && existingRecord.accountName !== command.accountsDto.accountName) {
                await this.publishAccountUpdatedEvent(updatedRecord.accountingId, command.accountsDto.accountName);
            }

            // Publish reactivation event if status changed from INACTIVE to ACTIVE
            if (
                hasApprovalPermission &&
                existingRecord.status === StatusEnum.INACTIVE &&
                updatedRecord.status === StatusEnum.ACTIVE
            ) {
                await this.publishAccountReactivatedEvent(updatedRecord.accountingId);
            }

            this.logger.log(`Account updated successfully: ${updatedRecord.accountingId}`);
            return new ResponseDto<AccountsDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates an account record by ID
     */
    private async fetchAccountById(recordId: string): Promise<AccountsDto> {
        const accountRecord = await this.accountsDatabaseService.findRecordById(recordId);

        if (!accountRecord) {
            this.logger.warn(`Account not found for ID: ${recordId}`);
            throw new NotFoundException(`Account not found for ID: ${recordId}`);
        }

        return accountRecord;
    }

    /**
     * Validates that the account name is unique (excluding current record)
     */
    private async validateAccountNameUnique(accountName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.accountsDatabaseService.findRecordByName(accountName);

        if (existingRecord && existingRecord.accountingId !== currentRecordId) {
            this.logger.warn(`Account name already exists: ${accountName}`);
            throw new BadRequestException('Account name already exists');
        }
    }

    /**
     * Validates that account type is provided
     */
    private validateAccountType(accountsDto: AccountsDto): void {
        if (!accountsDto.accountType) {
            this.logger.warn('Account type is required');
            throw new BadRequestException('Account type is required');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates account status and activity logs based on user permissions
     */
    private applyAdminUpdates(command: UpdateAccountsCommand, existingRecord: AccountsDto): AccountsDto {
        const updatedRecord: AccountsDto = {
            ...existingRecord,
            ...command.accountsDto,
        };

        // Allow admin to set status from DTO (for reactivation) or default to ACTIVE
        const newStatus = command.accountsDto.status || StatusEnum.ACTIVE;
        updatedRecord.status = newStatus;

        updatedRecord.activityLogs = updatedRecord.activityLogs || [];

        // Create specific log message for reactivation
        let activityMessage;
        if (existingRecord.status === StatusEnum.INACTIVE && newStatus === StatusEnum.ACTIVE) {
            activityMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account reactivated from INACTIVE to ACTIVE by ${command.user.username}`;
        } else {
            activityMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account updated by ${command.user.username}, status set to ${newStatus}`;
        }

        updatedRecord.activityLogs.push(activityMessage);
        updatedRecord.activityLogs = reduceArrayContents(updatedRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        updatedRecord.changeReason = undefined;
        updatedRecord.forApprovalVersion = {};

        return updatedRecord;
    }

    private applyNonAdminUpdates(command: UpdateAccountsCommand, existingRecord: AccountsDto): AccountsDto {
        const updatedRecord: AccountsDto = { ...existingRecord };
        updatedRecord.status = StatusEnum.FOR_APPROVAL;
        updatedRecord.activityLogs = updatedRecord.activityLogs || [];

        const fieldChanges = detectFieldChanges(existingRecord, command.accountsDto);
        const formattedChanges = formatFieldChanges(fieldChanges);

        let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Account updated by ${command.user.username} for approval`;
        if (formattedChanges) {
            activityLogMessage += ` - ${formattedChanges}`;
        }
        updatedRecord.activityLogs.push(activityLogMessage);
        updatedRecord.activityLogs = reduceArrayContents(updatedRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const userChangeReason = command.accountsDto.changeReason?.trim();
        if (userChangeReason && formattedChanges) {
            updatedRecord.changeReason = `${userChangeReason}\n\n${formattedChanges}`;
        } else if (userChangeReason) {
            updatedRecord.changeReason = userChangeReason;
        } else if (formattedChanges) {
            updatedRecord.changeReason = formattedChanges;
        } else {
            updatedRecord.changeReason = undefined;
        }

        updatedRecord.forApprovalVersion = {
            ...(updatedRecord.forApprovalVersion ?? {}),
            accountName: command.accountsDto.accountName,
            accountType: command.accountsDto.accountType,
            subAccounts: command.accountsDto.subAccounts,
        };

        return updatedRecord;
    }

    /**
     * Validates status transitions for admin users
     */
    private validateStatusTransition(existingStatus: StatusEnum, newStatus: StatusEnum | undefined): void {
        // If no status change requested, skip validation
        if (!newStatus || newStatus === existingStatus) {
            return;
        }

        // Only allow INACTIVE -> ACTIVE transition for reactivation
        if (existingStatus === StatusEnum.INACTIVE && newStatus !== StatusEnum.ACTIVE) {
            this.logger.warn(`Invalid status transition from ${existingStatus} to ${newStatus}`);
            throw new BadRequestException(`Can only reactivate INACTIVE accounts to ACTIVE status`);
        }
    }

    /**
     * Publishes account reactivated event to SQS
     */
    private async publishAccountReactivatedEvent(accountingId: string): Promise<void> {
        try {
            const accountEventSqsUrl = this.configService.get<string>('ACCOUNTING_EVENT_SQS');
            if (!accountEventSqsUrl) {
                this.logger.warn('ACCOUNTING_EVENT_SQS URL not configured');
                return;
            }

            const event: AccountEventDto = {
                eventType: AccountEventEnum.ACCOUNT_REACTIVATED,
                accountingId,
                timestamp: new Date().toISOString(),
            };

            await this.messageQueueService.sendMessageToSQS(accountEventSqsUrl, JSON.stringify(event));
            this.logger.log(`Account reactivated event published for accountingId: ${accountingId}`);
        } catch (error) {
            this.logger.error(`Failed to publish account reactivated event: ${error.message}`, error.stack);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }

    /**
     * Publishes account updated event to SQS
     */
    private async publishAccountUpdatedEvent(accountingId: string, newAccountName: string): Promise<void> {
        try {
            const accountEventSqsUrl = this.configService.get<string>('ACCOUNTING_EVENT_SQS');
            if (!accountEventSqsUrl) {
                this.logger.warn('ACCOUNTING_EVENT_SQS URL not configured');
                return;
            }

            const event: AccountEventDto = {
                eventType: AccountEventEnum.ACCOUNT_UPDATED,
                accountingId,
                newAccountName,
                timestamp: new Date().toISOString(),
            };

            await this.messageQueueService.sendMessageToSQS(accountEventSqsUrl, JSON.stringify(event));
            this.logger.log(`Account updated event published for accountingId: ${accountingId}`);
        } catch (error) {
            this.logger.error(`Failed to publish account updated event: ${error.message}`, error.stack);
        }
    }
}
