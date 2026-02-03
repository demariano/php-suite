import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyAccountsCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyAccountsCommand)
export class DenyAccountsHandler implements ICommandHandler<DenyAccountsCommand> {
    protected readonly logger = new Logger(DenyAccountsHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(command: DenyAccountsCommand): Promise<ResponseDto<AccountsDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for account: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateAccountExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny account change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: AccountsDto,
        command: DenyAccountsCommand
    ): Promise<ResponseDto<AccountsDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyAccount(existingRecord, command);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny account with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies an account for approval
     */
    private async denyAccount(
        existingRecord: AccountsDto,
        command: DenyAccountsCommand
    ): Promise<ResponseDto<AccountsDto>> {
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const updatedRecord = await this.accountsDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Account denied successfully: ${existingRecord.accountingId}`);
        return new ResponseDto<AccountsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of an account
     */
    private async denyDeletion(
        existingRecord: AccountsDto,
        command: DenyAccountsCommand
    ): Promise<ResponseDto<AccountsDto>> {
        this.logger.log(`Account deletion denied: ${existingRecord.accountingId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Account deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.changeReason = null;
        const updatedRecord = await this.accountsDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<AccountsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes an account when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: AccountsDto): Promise<ResponseDto<AccountsDto>> {
        this.logger.log(`Account deleted: ${existingRecord.accountingId}`);
        existingRecord.changeReason = null;
        await this.accountsDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<AccountsDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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
}
