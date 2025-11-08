import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TownDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTownCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateTownCommand)
export class UpdateTownHandler implements ICommandHandler<UpdateTownCommand> {
    protected readonly logger = new Logger(UpdateTownHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateTownCommand): Promise<ResponseDto<TownDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for town: ${command.recordId}`);

        try {
            // Fetch and validate existing town record
            const existingRecord = await this.fetchTownById(command.recordId);

            // Validate that town name doesn't already exist (if changed)
            await this.validateTownNameUnique(command.townDto.townName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTownStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.townDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Town updated successfully: ${updatedRecord.townId}`);
            return new ResponseDto<TownDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the town name is unique (excluding current record)
     */
    private async validateTownNameUnique(townName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.townDatabaseService.findRecordByName(townName);

        if (existingRecord && existingRecord.townId !== currentRecordId) {
            this.logger.warn(`Town name already exists: ${townName}`);
            throw new BadRequestException('Town name already exists');
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
     * Updates town status and activity logs based on user permissions
     */
    private updateTownStatus(
        command: UpdateTownCommand,
        existingRecord: TownDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.townName = command.townDto.townName;
            existingRecord.areaId = command.townDto.areaId;
            existingRecord.areaName = command.townDto.areaName;
            // Clear changeReason for admin users
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;

            // Detect field changes and combine with user's changeReason
            const changes = detectFieldChanges(existingRecord, command.townDto);
            const formattedChanges = formatFieldChanges(changes);
            const combinedReason = command.townDto.changeReason
                ? `${command.townDto.changeReason}\n\n${formattedChanges}`
                : formattedChanges;
            existingRecord.changeReason = combinedReason;

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs = existingRecord.activityLogs || [];
            existingRecord.activityLogs.push(activityLogMessage);
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                townName: command.townDto.townName,
                areaId: command.townDto.areaId,
                areaName: command.townDto.areaName,
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
