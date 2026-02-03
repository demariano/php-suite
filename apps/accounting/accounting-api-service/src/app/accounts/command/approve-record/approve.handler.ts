import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { UserCognito } from '@auth-guard-lib';
import {
    AccountEventDto,
    AccountEventEnum,
    AccountsDto,
    AccountTypeEnum,
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveAccountsCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveAccountsCommand)
export class ApproveAccountsHandler implements ICommandHandler<ApproveAccountsCommand> {
    protected readonly logger = new Logger(ApproveAccountsHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract,

        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,

        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveAccountsCommand): Promise<ResponseDto<AccountsDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for account: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateAccountExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the account record exists
     */
    private async validateAccountExists(recordId: string): Promise<AccountsDto> {
        const existingRecord = await this.accountsDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Account not found: ${recordId}`);
            throw new NotFoundException(`Account record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve account change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: AccountsDto, user: UserCognito): Promise<ResponseDto<AccountsDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveAccount(existingRecord, user);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve account with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves an account for approval
     */
    private async approveAccount(existingRecord: AccountsDto, user: UserCognito): Promise<ResponseDto<AccountsDto>> {
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        const oldAccountName = existingRecord.accountName;
        if (forApprovalVersion) {
            existingRecord.accountName = (forApprovalVersion.accountName as string) ?? existingRecord.accountName;
            existingRecord.accountType =
                (forApprovalVersion.accountType as AccountTypeEnum) ?? existingRecord.accountType;
            existingRecord.subAccounts = (forApprovalVersion.subAccounts as string[]) ?? existingRecord.subAccounts;
        }
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;

        const updatedRecord = await this.accountsDatabaseService.updateRecord(existingRecord);

        // Publish account updated event if name changed
        if (oldAccountName !== existingRecord.accountName) {
            await this.publishAccountUpdatedEvent(updatedRecord.accountingId, existingRecord.accountName);
        }

        this.logger.log(`Account approved successfully: ${existingRecord.accountingId}`);
        return new ResponseDto<AccountsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of an account (soft delete)
     */
    private async approveDeactivation(existingRecord: AccountsDto): Promise<ResponseDto<AccountsDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.accountsDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Account deactivation approved: ${existingRecord.accountingId}`);
        return new ResponseDto<AccountsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
