import { ErrorResponseDto, ResponseDto, StatusEnum, StockTypeDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { UpdateStockTypeCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateStockTypeCommand)
export class UpdateStockTypeHandler implements ICommandHandler<UpdateStockTypeCommand> {
    protected readonly logger = new Logger(UpdateStockTypeHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateStockTypeCommand): Promise<ResponseDto<StockTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for stock type: ${command.recordId}`);

        try {
            // Fetch and validate existing stock type record
            const existingRecord = await this.fetchStockTypeById(command.recordId);

            // Validate that stock type name doesn't already exist (if changed)
            await this.validateStockTypeNameUnique(command.stockTypeDto.stockTypeName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockTypeStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.stockTypeDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Stock type updated successfully: ${updatedRecord.stockTypeId}`);
            return new ResponseDto<StockTypeDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the stock type name is unique (excluding current record)
     */
    private async validateStockTypeNameUnique(stockTypeName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.stockTypeDatabaseService.findRecordByName(stockTypeName);

        if (existingRecord && existingRecord.stockTypeId !== currentRecordId) {
            this.logger.warn(`Stock type name already exists: ${stockTypeName}`);
            throw new BadRequestException('Stock type name already exists');
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
     * Updates stock type status and activity logs based on user permissions
     */
    private updateStockTypeStatus(
        command: UpdateStockTypeCommand,
        existingRecord: StockTypeDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.stockTypeName = command.stockTypeDto.stockTypeName;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock type updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                stockTypeName: command.stockTypeDto.stockTypeName,
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
