import { ErrorResponseDto, ResponseDto, StatusEnum, TerritoryManagerDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTerritoryManagerCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateTerritoryManagerCommand)
export class CreateTerritoryManagerHandler implements ICommandHandler<CreateTerritoryManagerCommand> {
    protected readonly logger = new Logger(CreateTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing create request for territory manager: ${command.territoryManagerDto.territoryManagerName}`
        );

        try {
            // Validate that territory manager name doesn't already exist
            await this.validateTerritoryManagerNameUnique(command.territoryManagerDto.territoryManagerName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTerritoryManagerStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.territoryManagerDatabaseService.createRecord(command.territoryManagerDto);

            this.logger.log(`Territory manager created successfully: ${createdRecord.territoryManagerId}`);
            return new ResponseDto<TerritoryManagerDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.territoryManagerDto.territoryManagerName);
        }
    }

    /**
     * Validates that the territory manager name is unique
     */
    private async validateTerritoryManagerNameUnique(territoryManagerName: string): Promise<void> {
        const existingRecord = await this.territoryManagerDatabaseService.findRecordByName(territoryManagerName);

        if (existingRecord) {
            this.logger.warn(`Territory manager name already exists: ${territoryManagerName}`);
            throw new BadRequestException('Territory manager name already exists');
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
     * Updates territory manager status and activity logs based on user permissions
     */
    private updateTerritoryManagerStatus(command: CreateTerritoryManagerCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.territoryManagerDto.status = StatusEnum.ACTIVE;
            command.territoryManagerDto.activityLogs = [];
            command.territoryManagerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Territory manager created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            // Limit activity logs to last 10 entries
            command.territoryManagerDto.activityLogs = reduceArrayContents(command.territoryManagerDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.territoryManagerDto.status = StatusEnum.NEW_RECORD;
            command.territoryManagerDto.activityLogs = [];
            command.territoryManagerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Territory manager created by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.territoryManagerDto.activityLogs = reduceArrayContents(command.territoryManagerDto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.territoryManagerDto.forApprovalVersion = {};
            command.territoryManagerDto.forApprovalVersion.territoryManagerName =
                command.territoryManagerDto.territoryManagerName;
            command.territoryManagerDto.forApprovalVersion.contactNo = command.territoryManagerDto.contactNo;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, territoryManagerName: string): never {
        this.logger.error(`Error processing create request for ${territoryManagerName}:`, error);

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
