import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, CreateAreaDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateAreaCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateAreaCommand)
export class CreateAreaHandler implements ICommandHandler<CreateAreaCommand> {
    protected readonly logger = new Logger(CreateAreaHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(command: CreateAreaCommand): Promise<ResponseDto<AreaDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for area: ${command.areaDto.areaName}`);

        try {
            // Validate that area name doesn't already exist
            await this.validateAreaNameUnique(command.areaDto.areaName);

            // Validate that prefix ID is unique (if provided)
            if (command.areaDto.idPrefix) {
                await this.validatePrefixIdUnique(command.areaDto.idPrefix);
            }

            // Validate territory manager fields
            this.validateTerritoryManagerFields(command.areaDto);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateAreaStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.areaDatabaseService.createRecord(command.areaDto);

            this.logger.log(`Area created successfully: ${createdRecord.areaId}`);
            return new ResponseDto<AreaDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.areaDto.areaName);
        }
    }

    /**
     * Validates that the area name is unique
     */
    private async validateAreaNameUnique(areaName: string): Promise<void> {
        const existingRecord = await this.areaDatabaseService.findRecordByName(areaName);

        if (existingRecord) {
            this.logger.warn(`Area name already exists: ${areaName}`);
            throw new BadRequestException('Area name already exists');
        }
    }

    /**
     * Validates that the prefix ID is unique
     */
    private async validatePrefixIdUnique(idPrefix: string): Promise<void> {
        const existingRecord = await this.areaDatabaseService.findRecordByIdPrefix(idPrefix);

        if (existingRecord) {
            this.logger.warn(`Prefix ID already exists: ${idPrefix}`);
            throw new BadRequestException('Prefix ID already exists');
        }
    }

    /**
     * Validates that territory manager fields are provided
     */
    private validateTerritoryManagerFields(areaDto: CreateAreaDto): void {
        if (!areaDto.territoryManagerId || !areaDto.territoryManagerName) {
            this.logger.warn('Territory Manager is required');
            throw new BadRequestException('Territory Manager is required');
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
    private updateAreaStatus(command: CreateAreaCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.areaDto.status = StatusEnum.ACTIVE;
            command.areaDto.activityLogs = [];
            command.areaDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Area created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            command.areaDto.activityLogs = reduceArrayContents(command.areaDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.areaDto.status = StatusEnum.NEW_RECORD;
            command.areaDto.activityLogs = [];
            command.areaDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Area created by ${command.user.username} for approval`
            );
            command.areaDto.activityLogs = reduceArrayContents(command.areaDto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.areaDto.forApprovalVersion = {};
            command.areaDto.forApprovalVersion.areaName = command.areaDto.areaName;
            command.areaDto.forApprovalVersion.towns = command.areaDto.towns;
            command.areaDto.forApprovalVersion.territoryManagerId = command.areaDto.territoryManagerId;
            command.areaDto.forApprovalVersion.territoryManagerName = command.areaDto.territoryManagerName;
            command.areaDto.forApprovalVersion.idPrefix = command.areaDto.idPrefix;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, areaName: string): never {
        this.logger.error(`Error processing create request for ${areaName}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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
