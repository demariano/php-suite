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

            // Update status and activity logs based on permissions
            this.updateTermsStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

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
     * Updates terms status and activity logs based on user permissions
     */
    private updateTermsStatus(
        command: DeleteTermsCommand,
        existingRecord: TermsDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.termsDto.termsId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.termsDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms deleted by ${command.user.username}`;
            command.termsDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.termsDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms marked for deletion by ${command.user.username}`;
            command.termsDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeleteTermsCommand, hasApprovalPermission: boolean): Promise<TermsDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.termsDatabaseService.deleteRecord(command.termsDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.termsDatabaseService.updateRecord(command.termsDto);
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
