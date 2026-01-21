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

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateAreaStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

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
     * Updates area status and activity logs based on user permissions
     */
    private updateAreaStatus(
        command: DeleteAreaCommand,
        existingRecord: AreaDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.areaDto.areaId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DEACTIVATION for hard delete
            command.areaDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area deleted by ${command.user.username}`;
            command.areaDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DEACTIVATION for soft delete
            command.areaDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area marked for deletion by ${command.user.username}`;
            command.areaDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeleteAreaCommand, hasApprovalPermission: boolean): Promise<AreaDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.areaDatabaseService.deleteRecord(command.areaDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.areaDatabaseService.updateRecord(command.areaDto);
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
