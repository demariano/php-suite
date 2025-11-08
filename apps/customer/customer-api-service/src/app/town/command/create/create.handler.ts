import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TownDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTownCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateTownCommand)
export class CreateTownHandler implements ICommandHandler<CreateTownCommand> {
    protected readonly logger = new Logger(CreateTownHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(command: CreateTownCommand): Promise<ResponseDto<TownDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for town: ${command.townDto.townName}`);

        try {
            // Validate that town name doesn't already exist
            await this.validateTownNameUnique(command.townDto.townName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTownStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.townDatabaseService.createRecord(command.townDto);

            this.logger.log(`Town created successfully: ${createdRecord.townId}`);
            return new ResponseDto<TownDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.townDto.townName);
        }
    }

    /**
     * Validates that the town name is unique
     */
    private async validateTownNameUnique(townName: string): Promise<void> {
        const existingRecord = await this.townDatabaseService.findRecordByName(townName);

        if (existingRecord) {
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
    private updateTownStatus(command: CreateTownCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.townDto.status = StatusEnum.ACTIVE;
            command.townDto.activityLogs = [];
            command.townDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Town created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            command.townDto.activityLogs = reduceArrayContents(command.townDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.townDto.status = StatusEnum.NEW_RECORD;
            command.townDto.activityLogs = [];
            command.townDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Town created by ${command.user.username} for approval`
            );
            command.townDto.activityLogs = reduceArrayContents(command.townDto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.townDto.forApprovalVersion = {};
            command.townDto.forApprovalVersion.townName = command.townDto.townName;
            command.townDto.forApprovalVersion.areaId = command.townDto.areaId;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, townName: string): never {
        this.logger.error(`Error processing create request for ${townName}:`, error);

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
