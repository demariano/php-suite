import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, CreateAccountsDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateAccountsCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateAccountsCommand)
export class CreateAccountsHandler implements ICommandHandler<CreateAccountsCommand> {
    protected readonly logger = new Logger(CreateAccountsHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(command: CreateAccountsCommand): Promise<ResponseDto<AccountsDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for account: ${command.accountsDto.accountName}`);

        try {
            // Validate that account name doesn't already exist
            await this.validateAccountNameUnique(command.accountsDto.accountName);

            // Validate account type is provided
            this.validateAccountType(command.accountsDto);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateAccountStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.accountsDatabaseService.createRecord(command.accountsDto);

            this.logger.log(`Account created successfully: ${createdRecord.accountingId}`);
            return new ResponseDto<AccountsDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.accountsDto.accountName);
        }
    }

    /**
     * Validates that the account name is unique
     */
    private async validateAccountNameUnique(accountName: string): Promise<void> {
        const existingRecord = await this.accountsDatabaseService.findRecordByName(accountName);

        if (existingRecord) {
            this.logger.warn(`Account name already exists: ${accountName}`);
            throw new BadRequestException('Account name already exists');
        }
    }

    /**
     * Validates that account type is provided
     */
    private validateAccountType(accountsDto: CreateAccountsDto): void {
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
    private updateAccountStatus(command: CreateAccountsCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.accountsDto.status = StatusEnum.ACTIVE;
            command.accountsDto.activityLogs = [
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Account created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`,
            ];
            command.accountsDto.activityLogs = reduceArrayContents(
                command.accountsDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.accountsDto.forApprovalVersion = undefined;
        } else {
            // User needs approval - set to NEW_RECORD
            command.accountsDto.status = StatusEnum.NEW_RECORD;
            command.accountsDto.activityLogs = [
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Account created by ${command.user.username} for approval`,
            ];
            command.accountsDto.activityLogs = reduceArrayContents(
                command.accountsDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.accountsDto.forApprovalVersion = {
                accountName: command.accountsDto.accountName,
                accountType: command.accountsDto.accountType,
                subAccounts: command.accountsDto.subAccounts,
                changeReason: command.accountsDto.changeReason,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, accountName: string): never {
        this.logger.error(`Error processing create request for ${accountName}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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
