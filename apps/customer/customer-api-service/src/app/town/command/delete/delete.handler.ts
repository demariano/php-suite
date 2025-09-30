import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TownDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTownCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteTownCommand)
export class DeleteTownHandler implements ICommandHandler<DeleteTownCommand> {
    protected readonly logger = new Logger(DeleteTownHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteTownCommand): Promise<ResponseDto<TownDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for town: ${command.recordId}`);

        try {
            // Fetch and validate existing town record
            const existingRecord = await this.fetchTownById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTownStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Town deleted successfully: ${deletedRecord.townId}`);
            return new ResponseDto<TownDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a town record by ID
     */
    private async fetchTownById(recordId: string): Promise<TownDto> {
        const townRecord = await this.townDatabaseService.findRecordById(recordId);

        if (!townRecord) {
            this.logger.warn(`Town not found for ID: ${recordId}`);
            throw new NotFoundException(`Town not found for ID: ${recordId}`);
        }

        return townRecord;
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
     * Updates town status and activity logs based on user permissions
     */
    private updateTownStatus(
        command: DeleteTownCommand,
        existingRecord: TownDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.townDto.townId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.townDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town deleted by ${command.user.username}`;
            command.townDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.townDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town marked for deletion by ${command.user.username}`;
            command.townDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeleteTownCommand, hasApprovalPermission: boolean): Promise<TownDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.townDatabaseService.deleteRecord(command.townDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.townDatabaseService.updateRecord(command.townDto);
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
