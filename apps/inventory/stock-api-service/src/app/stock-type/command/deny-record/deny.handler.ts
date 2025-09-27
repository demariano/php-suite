import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockTypeDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { DenyStockTypeCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyStockTypeCommand)
export class DenyStockTypeHandler implements ICommandHandler<DenyStockTypeCommand> {
    protected readonly logger = new Logger(DenyStockTypeHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenyStockTypeCommand): Promise<ResponseDto<StockTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for stock type: ${command.recordId}`);

        try {
            // Fetch and validate existing stock type record
            const existingRecord = await this.fetchStockTypeById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            const result = await this.processDenial(existingRecord, command.user);

            this.logger.log(`Stock type denied successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a stock type record by ID
     */
    private async fetchStockTypeById(recordId: string): Promise<StockTypeDto> {
        const stockTypeRecord = await this.stockTypeDatabaseService.findRecordById(recordId);

        if (!stockTypeRecord) {
            this.logger.warn(`Stock type not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock type not found for ID: ${recordId}`);
        }

        return stockTypeRecord;
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
    private async processDenial(existingRecord: StockTypeDto, user: UserCognito): Promise<ResponseDto<StockTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyStockType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny stock type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a stock type record by reverting to ACTIVE status
     */
    private async denyStockType(existingRecord: StockTypeDto, user: UserCognito): Promise<ResponseDto<StockTypeDto>> {
        // Clear forApprovalVersion and revert to ACTIVE
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock type changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockTypeDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a stock type record
     */
    private async denyDeletion(existingRecord: StockTypeDto): Promise<ResponseDto<StockTypeDto>> {
        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock type deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockTypeDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a stock type when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: StockTypeDto): Promise<ResponseDto<StockTypeDto>> {
        this.logger.log(`Stock type deleted: ${existingRecord.stockTypeId}`);
        await this.stockTypeDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockTypeDto>(existingRecord, HTTP_STATUS_OK);
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

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
