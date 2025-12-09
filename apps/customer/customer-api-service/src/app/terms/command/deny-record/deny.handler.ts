import { UserCognito } from '@auth-guard-lib';
import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TermsDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyTermsCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyTermsCommand)
export class DenyTermsHandler implements ICommandHandler<DenyTermsCommand> {
    protected readonly logger = new Logger(DenyTermsHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract
    ) {}

    async execute(command: DenyTermsCommand): Promise<ResponseDto<TermsDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for terms: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTermsExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the terms record exists
     */
    private async validateTermsExists(recordId: string): Promise<TermsDto> {
        const existingRecord = await this.termsDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Terms not found: ${recordId}`);
            throw new NotFoundException(`Terms record not found for id ${recordId}`);
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

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to deny terms change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(existingRecord: TermsDto, command: DenyTermsCommand): Promise<ResponseDto<TermsDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyTerms(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny terms with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a terms for approval
     */
    private async denyTerms(existingRecord: TermsDto, command: DenyTermsCommand): Promise<ResponseDto<TermsDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Add activity log for approver message if provided
        if (command.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Terms denied by ${command.user.username}, approver message: ${command.approverMessage}`
            );
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.termsDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Terms denied successfully: ${existingRecord.termsId}`);
        return new ResponseDto<TermsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a terms
     */
    private async denyDeletion(existingRecord: TermsDto, command: DenyTermsCommand): Promise<ResponseDto<TermsDto>> {
        this.logger.log(`Terms deletion denied: ${existingRecord.termsId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        
        // Add activity log for denial
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms deletion denied by ${command.user.username}, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Add approver message if provided
        if (command.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Terms deletion denied by ${command.user.username}, approver message: ${command.approverMessage}`
            );
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        
        const updatedRecord = await this.termsDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<TermsDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a terms when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: TermsDto): Promise<ResponseDto<TermsDto>> {
        this.logger.log(`Terms deleted: ${existingRecord.termsId}`);
        await this.termsDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<TermsDto>(existingRecord, HTTP_STATUS_OK);
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
