import { ErrorResponseDto, ResponseDto, StatusEnum, TerritoryManagerDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTerritoryManagerCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateTerritoryManagerCommand)
export class UpdateTerritoryManagerHandler implements ICommandHandler<UpdateTerritoryManagerCommand> {
    protected readonly logger = new Logger(UpdateTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for territory manager: ${command.id}`);

        try {
            // Validate that territory manager exists
            const existingRecord = await this.validateTerritoryManagerExists(command.id);

            // Validate that territory manager name doesn't already exist (excluding current record)
            await this.validateTerritoryManagerNameUnique(command.territoryManagerDto.territoryManagerName, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTerritoryManagerStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Territory manager updated successfully: ${updatedRecord.territoryManagerId}`);
            return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the territory manager name is unique (excluding current record)
     */
    private async validateTerritoryManagerNameUnique(territoryManagerName: string, currentId: string): Promise<void> {
        const existingRecord = await this.territoryManagerDatabaseService.findRecordByName(territoryManagerName);

        if (existingRecord && existingRecord.territoryManagerId !== currentId) {
            this.logger.warn(`Territory manager name already exists: ${territoryManagerName}`);
            throw new BadRequestException('Territory manager name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
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
        command: UpdateTerritoryManagerCommand,
        existingRecord: TerritoryManagerDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.territoryManagerName = command.territoryManagerDto.territoryManagerName;
            existingRecord.contactNo = command.territoryManagerDto.contactNo;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                territoryManagerName: command.territoryManagerDto.territoryManagerName,
                contactNo: command.territoryManagerDto.contactNo,
            };
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

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
