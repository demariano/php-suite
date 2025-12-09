import { ErrorResponseDto, ResponseDto, StatusEnum, TerritoryManagerDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyTerritoryManagerCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyTerritoryManagerCommand)
export class DenyTerritoryManagerHandler implements ICommandHandler<DenyTerritoryManagerCommand> {
    protected readonly logger = new Logger(DenyTerritoryManagerHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(command: DenyTerritoryManagerCommand): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for territory manager: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTerritoryManagerExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny territory manager change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: TerritoryManagerDto,
        command: DenyTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyTerritoryManager(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny territory manager with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a territory manager for approval
     */
    private async denyTerritoryManager(
        existingRecord: TerritoryManagerDto,
        command: DenyTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Clear forApprovalVersion first, then reset changeReason
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Territory manager denied successfully: ${existingRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a territory manager
     */
    private async denyDeletion(
        existingRecord: TerritoryManagerDto,
        command: DenyTerritoryManagerCommand
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        this.logger.log(`Territory manager deletion denied: ${existingRecord.territoryManagerId}`);

        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log entry
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Territory manager deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a territory manager when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: TerritoryManagerDto): Promise<ResponseDto<TerritoryManagerDto>> {
        this.logger.log(`Territory manager deleted: ${existingRecord.territoryManagerId}`);
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        await this.territoryManagerDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<TerritoryManagerDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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
