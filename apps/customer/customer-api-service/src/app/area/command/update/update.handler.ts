import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateAreaCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateAreaCommand)
export class UpdateAreaHandler implements ICommandHandler<UpdateAreaCommand> {
    protected readonly logger = new Logger(UpdateAreaHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateAreaCommand): Promise<ResponseDto<AreaDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for area: ${command.recordId}`);

        try {
            // Fetch and validate existing area record
            const existingRecord = await this.fetchAreaById(command.recordId);

            // Validate that area name doesn't already exist (if changed)
            await this.validateAreaNameUnique(command.areaDto.areaName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateAreaStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.areaDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Area updated successfully: ${updatedRecord.areaId}`);
            return new ResponseDto<AreaDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the area name is unique (excluding current record)
     */
    private async validateAreaNameUnique(areaName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.areaDatabaseService.findRecordByName(areaName);

        if (existingRecord && existingRecord.areaId !== currentRecordId) {
            this.logger.warn(`Area name already exists: ${areaName}`);
            throw new BadRequestException('Area name already exists');
        }
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
        command: UpdateAreaCommand,
        existingRecord: AreaDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.areaName = command.areaDto.areaName;
            existingRecord.towns = command.areaDto.towns;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                areaName: command.areaDto.areaName,
                towns: command.areaDto.towns,
            };
        }
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
