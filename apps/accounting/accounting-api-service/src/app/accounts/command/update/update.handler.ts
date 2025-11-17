import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
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
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
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

            // Update status and activity logs based on permissions
            const recordToPersist = hasApprovalPermission
                ? this.applyAdminUpdates(command, existingRecord)
                : this.applyNonAdminUpdates(command, existingRecord);

            // Update record in database
            const updatedRecord = await this.accountsDatabaseService.updateRecord(recordToPersist);

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

        updatedRecord.status = StatusEnum.ACTIVE;
        updatedRecord.activityLogs = updatedRecord.activityLogs || [];
        updatedRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );
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
}
