import { StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StockQtyHandlerService {
    private readonly logger = new Logger(StockQtyHandlerService.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    /**
     * Updates stock quantities for invoice operations
     * @param stockId - The stock record ID
     * @param quantity - The quantity to adjust (always positive number)
     * @param isAddition - If true, adds quantity back (for deletion/cancellation). If false, deducts quantity (for approval)
     */
    async handle(stockId: string, quantity: number, isAddition = false): Promise<void> {
        const operation = isAddition ? 'Adding' : 'Deducting';
        this.logger.log(`${operation} ${quantity} ${isAddition ? 'to' : 'from'} stock ID: ${stockId}`);

        // Find the stock record by ID
        const existingRecord = await this.fetchStockById(stockId);
        if (!existingRecord) {
            this.logger.error(`Cannot update stock - record not found for ID: ${stockId}`);
            return;
        }

        // Store original value for logging
        const originalTotalQuantity = existingRecord.totalQuantity || 0;

        if (isAddition) {
            // Add back to totalQuantity (for invoice deletion/cancellation)
            existingRecord.totalQuantity = (existingRecord.totalQuantity || 0) + quantity;
        } else {
            // Deduct from totalQuantity (for invoice approval)
            existingRecord.totalQuantity = (existingRecord.totalQuantity || 0) - quantity;
        }

        this.logger.log(
            `Updated stock ${stockId}: totalQuantity ${originalTotalQuantity} -> ${existingRecord.totalQuantity}`
        );

        // Update record in database
        await this.stockDatabaseService.updateRecord(existingRecord);
        this.logger.log(`Successfully updated stock record: ${stockId}`);
    }

    private async fetchStockById(recordId: string): Promise<StockDto | null> {
        const stockRecord = await this.stockDatabaseService.findRecordById(recordId);

        if (!stockRecord) {
            this.logger.error(`Stock not found for ID: ${recordId}`);
            return null;
        }

        return stockRecord;
    }
}
