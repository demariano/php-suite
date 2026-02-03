import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteAreaCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteAreaCommand)
export class DeleteAreaHandler implements ICommandHandler<DeleteAreaCommand> {
    protected readonly logger = new Logger(DeleteAreaHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteAreaCommand): Promise<ResponseDto<AreaDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for area: ${command.recordId}`);

        try {
            // Fetch and validate existing area record
            const existingRecord = await this.fetchAreaById(command.recordId);

            // Process and store deletion reason
            const deletionReason = command.deletionReason?.trim();
            const finalDeletionReason = deletionReason || undefined;

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Create AreaDto with updated status and activity logs
            const areaDto = this.buildAreaDto(
                existingRecord,
                command.user.username,
                hasApprovalPermission,
                finalDeletionReason
            );

            // Delete or mark for deletion based on permissions and record status
            const deletedRecord = await this.performDeletion(areaDto, existingRecord);

            this.logger.log(`Area deleted successfully: ${deletedRecord.areaId}`);
            return new ResponseDto<AreaDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates an area record by ID
     */
    private async fetchAreaById(recordId: string): Promise<AreaDto> {
        const areaRecord = await this.areaDatabaseService.findRecordById(recordId);

        if (!areaRecord) {
            this.logger.warn(`Area not found for ID: ${recordId}`);
            throw new NotFoundException(`Area not found for ID: ${recordId}`);
        }

        return areaRecord;
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
     * Builds AreaDto with updated status, activity logs, and deletion reason
     */
    private buildAreaDto(
        existingRecord: AreaDto,
        username: string,
        hasApprovalPermission: boolean,
        deletionReason?: string
    ): AreaDto {
        // Copy all fields from existing record to preserve data integrity
        const areaDto = { ...existingRecord };
        areaDto.deletionReason = deletionReason;

        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        const reasonText = deletionReason ? ` Reason: ${deletionReason}` : '';

        if (hasApprovalPermission) {
            // ADMIN can soft delete directly - set to INACTIVE (Master Data pattern)
            areaDto.status = StatusEnum.INACTIVE;
            const activityLog = `Date: ${timestamp}, Area marked for deactivation by ${username}.${reasonText}`;
            areaDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // USER needs approval - set to FOR_DEACTIVATION (requires admin approval)
            areaDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${timestamp}, Area marked for deactivation by ${username}, requires approval.${reasonText}`;
            areaDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }

        return areaDto;
    }

    /**
     * Performs the actual deletion based on record status
     */
    private async performDeletion(areaDto: AreaDto, existingRecord: AreaDto): Promise<AreaDto> {
        // SPECIAL CASE: NEW_RECORD can be hard deleted (not yet in production)
        if (existingRecord.status === StatusEnum.NEW_RECORD) {
            this.logger.log(`Hard deleting NEW_RECORD area: ${areaDto.areaId}`);
            return await this.areaDatabaseService.deleteRecord(areaDto);
        }

        // MASTER DATA PATTERN: Always use soft delete for ACTIVE/FOR_APPROVAL records
        // Record stays in database for referential integrity and audit trail
        // Both ADMIN (direct INACTIVE) and USER (FOR_DEACTIVATION) use updateRecord
        return await this.areaDatabaseService.updateRecord(areaDto);
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
