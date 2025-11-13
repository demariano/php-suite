import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, TerritoryManagerDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveTerritoryManagerCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveTerritoryManagerCommand)
export class ApproveTerritoryManagerHandler implements ICommandHandler<ApproveTerritoryManagerCommand> {
    protected readonly logger = new Logger(ApproveTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for territory manager: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTerritoryManagerExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the territory manager record exists
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve territory manager change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: TerritoryManagerDto,
        user: UserCognito
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveTerritoryManager(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve territory manager with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a territory manager for approval
     */
    private async approveTerritoryManager(
        existingRecord: TerritoryManagerDto,
        user: UserCognito
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.territoryManagerName = forApprovalVersion.territoryManagerName as string;
        existingRecord.contactNo = forApprovalVersion.contactNo as string;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Territory manager approved successfully: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a territory manager
     */
    private async approveDeletion(existingRecord: TerritoryManagerDto): Promise<ResponseDto<TerritoryManagerDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        await this.territoryManagerDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Territory manager deletion approved: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
