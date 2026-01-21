import { ErrorResponseDto, ResponseDto, StatusEnum, TerritoryManagerDto, UserRole } from '@dto';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTerritoryManagerCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteTerritoryManagerCommand)
export class DeleteTerritoryManagerHandler implements ICommandHandler<DeleteTerritoryManagerCommand> {
    protected readonly logger = new Logger(DeleteTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for territory manager: ${command.id}`);

        try {
            // Fetch and validate existing territory manager record
            const existingRecord = await this.validateTerritoryManagerExists(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTerritoryManagerStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Territory manager deleted successfully: ${deletedRecord.territoryManagerId}`);
            return new ResponseDto<TerritoryManagerDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the territory manager exists
     */
    private async validateTerritoryManagerExists(recordId: string): Promise<TerritoryManagerDto> {
        const existingRecord = await this.territoryManagerDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Territory manager not found: ${recordId}`);
            throw new NotFoundException(`Territory manager record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Checks if user has permission to delete directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates territory manager status and activity logs based on user permissions
     */
    private updateTerritoryManagerStatus(
        command: DeleteTerritoryManagerCommand,
        existingRecord: TerritoryManagerDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.territoryManagerDto.territoryManagerId = command.id;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DEACTIVATION for hard delete
            command.territoryManagerDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager deleted by ${command.user.username}`;
            command.territoryManagerDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DEACTIVATION for soft delete
            command.territoryManagerDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager marked for deletion by ${command.user.username}`;
            command.territoryManagerDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteTerritoryManagerCommand,
        hasApprovalPermission: boolean
    ): Promise<TerritoryManagerDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.territoryManagerDatabaseService.deleteRecord(command.territoryManagerDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.territoryManagerDatabaseService.updateRecord(command.territoryManagerDto);
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
