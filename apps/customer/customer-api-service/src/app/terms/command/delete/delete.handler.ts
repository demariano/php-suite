import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TermsDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTermsCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteTermsCommand)
export class DeleteTermsHandler implements ICommandHandler<DeleteTermsCommand> {
    protected readonly logger = new Logger(DeleteTermsHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteTermsCommand): Promise<ResponseDto<TermsDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for terms: ${command.recordId}`);

        try {
            // Fetch and validate existing terms record
            const existingRecord = await this.fetchTermsById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Build the terms DTO with updated status and activity logs
            const updatedTerms = this.buildTermsDto(existingRecord, command, hasApprovalPermission);

            // Perform soft delete (always update, never hard delete)
            const deletedRecord = await this.performDeletion(updatedTerms);

            this.logger.log(`Terms deleted successfully: ${deletedRecord.termsId}`);
            return new ResponseDto<TermsDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a terms record by ID
     */
    private async fetchTermsById(recordId: string): Promise<TermsDto> {
        const termsRecord = await this.termsDatabaseService.findRecordById(recordId);

        if (!termsRecord) {
            this.logger.warn(`Terms not found for ID: ${recordId}`);
            throw new NotFoundException(`Terms not found for ID: ${recordId}`);
        }

        return termsRecord;
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
     * Builds the updated terms DTO with proper status and activity logs
     * MASTER DATA PATTERN: Soft delete only - NEVER hard delete
     */
    private buildTermsDto(
        existingRecord: TermsDto,
        command: DeleteTermsCommand,
        hasApprovalPermission: boolean
    ): TermsDto {
        // Determine status based on user permissions
        // ADMIN/SUPER_ADMIN: ACTIVE → INACTIVE (immediate soft delete)
        // Regular user: ACTIVE → FOR_DEACTIVATION (requires approval)
        const status = hasApprovalPermission ? StatusEnum.INACTIVE : StatusEnum.FOR_DEACTIVATION;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, ${hasApprovalPermission ? 'Terms deleted' : 'Terms marked for deactivation'} by ${command.user.username}`;

        // Use spread operator to maintain all existing fields
        return {
            ...existingRecord,
            status,
            deletionReason: command.deletionReason,
            activityLogs: [...(existingRecord.activityLogs || []), activityLog],
        };
    }

    /**
     * Performs soft deletion by updating the record
     * MASTER DATA PATTERN: ALWAYS update, NEVER hard delete
     */
    private async performDeletion(updatedTerms: TermsDto): Promise<TermsDto> {
        return await this.termsDatabaseService.updateRecord(updatedTerms);
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
