import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsStockDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyRawMaterialsStockCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyRawMaterialsStockCommand)
export class DenyRawMaterialsStockHandler implements ICommandHandler<DenyRawMaterialsStockCommand> {
    protected readonly logger = new Logger(DenyRawMaterialsStockHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DenyRawMaterialsStockCommand
    ): Promise<ResponseDto<RawMaterialsStockDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for raw materials stock: ${command.recordId}`);

        try {
            // Fetch and validate existing record
            const existingRecord = await this.fetchRawMaterialsStockById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            const result = await this.processDenial(existingRecord, command.user);

            this.logger.log(`Raw materials stock denied successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a raw materials stock record by ID
     */
    private async fetchRawMaterialsStockById(recordId: string): Promise<RawMaterialsStockDto> {
        const record = await this.rawMaterialsStockDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw materials stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw materials stock not found for ID: ${recordId}`);
        }

        return record;
    }

    /**
     * Validates that the user has permission to deny records
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for denial');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can deny records');
        }
    }

    /**
     * Processes denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: RawMaterialsStockDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsStockDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyRawMaterialsStock(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny raw materials stock with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a raw materials stock record by reverting to ACTIVE status
     */
    private async denyRawMaterialsStock(
        existingRecord: RawMaterialsStockDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsStockDto>> {
        // Clear forApprovalVersion and revert to ACTIVE
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw materials stock changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Add activity log for the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Raw materials stock denied by ${user.username}, approver message: ${existingRecord.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;

        // Update record in database
        const updatedRecord = await this.rawMaterialsStockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<RawMaterialsStockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a raw materials stock record
     */
    private async denyDeletion(existingRecord: RawMaterialsStockDto): Promise<ResponseDto<RawMaterialsStockDto>> {
        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw materials stock deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.rawMaterialsStockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<RawMaterialsStockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a raw materials stock when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: RawMaterialsStockDto): Promise<ResponseDto<RawMaterialsStockDto>> {
        this.logger.log(`Raw materials stock deleted: ${existingRecord.rawMaterialsStockId}`);
        await this.rawMaterialsStockDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialsStockDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing deny request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
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
        return 'An unknown error occurred during denial';
    }
}
