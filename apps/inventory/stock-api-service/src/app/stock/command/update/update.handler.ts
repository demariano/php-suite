import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockDatabaseServiceAbstract } from '@stock-database-service';
import { UpdateStockCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateStockCommand)
export class UpdateStockHandler implements ICommandHandler<UpdateStockCommand> {
    protected readonly logger = new Logger(UpdateStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateStockCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for stock: ${command.recordId}`);

        try {
            // Fetch and validate existing stock record
            const existingRecord = await this.fetchStockById(command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.stockDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Stock updated successfully: ${updatedRecord.stockId}`);
            return new ResponseDto<StockDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates stock status and activity logs based on user permissions
     */
    private updateStockStatus(
        command: UpdateStockCommand,
        existingRecord: StockDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productName = command.stockDto.productName;
            existingRecord.lotNo = command.stockDto.lotNo;
            existingRecord.productId = command.stockDto.productId;
            existingRecord.quantity = command.stockDto.quantity;
            existingRecord.productUnitId = command.stockDto.productUnitId;
            existingRecord.productUnitName = command.stockDto.productUnitName;
            existingRecord.expirationDate = command.stockDto.expirationDate;

            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                productName: command.stockDto.productName,
                lotNo: command.stockDto.lotNo,
                productId: command.stockDto.productId,
                quantity: command.stockDto.quantity,
                productUnitId: command.stockDto.productUnitId,
                productUnitName: command.stockDto.productUnitName,
                expirationDate: command.stockDto.expirationDate,
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
