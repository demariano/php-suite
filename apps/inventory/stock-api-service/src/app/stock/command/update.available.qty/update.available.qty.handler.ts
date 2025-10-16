import { ErrorResponseDto, ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateAvailableQtyCommand } from './update.available.qty.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateAvailableQtyCommand)
export class UpdateAvailableQtyHandler implements ICommandHandler<UpdateAvailableQtyCommand> {
    protected readonly logger = new Logger(UpdateAvailableQtyHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateAvailableQtyCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for stock: ${command.recordId}`);

        try {
            // Fetch and validate existing stock record
            const existingRecord = await this.fetchStockById(command.recordId);

            // Update status and activity logs based on permissions
            this.updateAvailableQty(command, existingRecord);

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
     * Updates stock status and activity logs based on user permissions
     */
    private updateAvailableQty(command: UpdateAvailableQtyCommand, existingRecord: StockDto): void {
        // Calculate new available quantity
        const newAvailableQuantity = existingRecord.availableQuantity - command.qty;

        // Validate that available quantity doesn't go negative when reducing stock
        if (command.qty > 0 && newAvailableQuantity < 0) {
            throw new BadRequestException(
                `Insufficient stock available. Requested: ${command.qty}, Available: ${existingRecord.availableQuantity}`
            );
        }

        // Update the available quantity
        existingRecord.availableQuantity = newAvailableQuantity;

        // Add activity log entry
        const action = command.qty > 0 ? 'reserved' : 'restored';
        const quantity = Math.abs(command.qty);
        const logEntry = `Stock quantity ${action}: ${quantity} units (${
            action === 'reserved' ? 'reduced' : 'increased'
        } available quantity from ${existingRecord.availableQuantity + command.qty} to ${
            existingRecord.availableQuantity
        })`;

        if (!existingRecord.activityLogs) {
            existingRecord.activityLogs = [];
        }
        existingRecord.activityLogs.push(logEntry);
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
