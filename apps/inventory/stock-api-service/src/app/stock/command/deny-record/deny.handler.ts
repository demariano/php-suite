import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockDatabaseServiceAbstract } from '@stock-database-service';
import { DenyStockCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyStockCommand)
export class DenyStockHandler implements ICommandHandler<DenyStockCommand> {
    protected readonly logger = new Logger(DenyStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: DenyStockCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for stock: ${command.recordId}`);

        try {
            // Fetch and validate existing stock record
            const existingRecord = await this.fetchStockById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            const result = await this.processDenial(existingRecord, command.user);

            this.logger.log(`Stock denied successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a stock record by ID
     */
    private async fetchStockById(recordId: string): Promise<StockDto> {
        const stockRecord = await this.stockDatabaseService.findRecordById(recordId);

        if (!stockRecord) {
            this.logger.warn(`Stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock not found for ID: ${recordId}`);
        }

        return stockRecord;
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
    private async processDenial(existingRecord: StockDto, user: UserCognito): Promise<ResponseDto<StockDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyStock(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny stock with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a stock record by reverting to ACTIVE status
     */
    private async denyStock(existingRecord: StockDto, user: UserCognito): Promise<ResponseDto<StockDto>> {
        // Clear forApprovalVersion and revert to ACTIVE
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a stock record
     */
    private async denyDeletion(existingRecord: StockDto): Promise<ResponseDto<StockDto>> {
        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a stock when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: StockDto): Promise<ResponseDto<StockDto>> {
        this.logger.log(`Stock deleted: ${existingRecord.stockId}`);
        await this.stockDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockDto>(existingRecord, HTTP_STATUS_OK);
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
