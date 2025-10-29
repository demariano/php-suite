import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteAccountsCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteAccountsCommand)
export class DeleteAccountsHandler implements ICommandHandler<DeleteAccountsCommand> {
    protected readonly logger = new Logger(DeleteAccountsHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteAccountsCommand): Promise<ResponseDto<AccountsDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for account: ${command.recordId}`);

        try {
            // Fetch and validate existing account record
            const existingRecord = await this.fetchAccountById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateAccountStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Account deleted successfully: ${deletedRecord.accountingId}`);
            return new ResponseDto<AccountsDto>(deletedRecord, HTTP_STATUS_OK);
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
    private updateAccountStatus(
        command: DeleteAccountsCommand,
        existingRecord: AccountsDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.accountsDto.accountingId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.accountsDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account deleted by ${command.user.username}`;
            command.accountsDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.accountsDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account marked for deletion by ${command.user.username}`;
            command.accountsDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteAccountsCommand,
        hasApprovalPermission: boolean
    ): Promise<AccountsDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.accountsDatabaseService.deleteRecord(command.accountsDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.accountsDatabaseService.updateRecord(command.accountsDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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
