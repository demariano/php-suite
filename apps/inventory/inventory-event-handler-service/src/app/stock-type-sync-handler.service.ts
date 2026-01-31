import { StockTypeEventDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StockTypeSyncHandlerService {
    private readonly logger = new Logger(StockTypeSyncHandlerService.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async handleStockTypeUpdatedEvent(event: StockTypeEventDto): Promise<void> {
        this.logger.log(
            `Received StockTypeUpdatedEvent: stockTypeId=${event.stockTypeId}, newName=${event.newStockTypeName}`
        );
        const startTime = Date.now();

        try {
            await this.syncStockTypeNameToStock(event.stockTypeId, event.newStockTypeName);
            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ StockType sync completed successfully in ${duration}ms for stockTypeId: ${event.stockTypeId}`
            );
        } catch (error) {
            this.logger.error(`❌ StockType sync failed for stockTypeId: ${event.stockTypeId}`, error);
            throw error;
        }
    }

    private async syncStockTypeNameToStock(stockTypeId: string, newStockTypeName: string): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting stock type sync for stock: stockTypeId=${stockTypeId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.stockDatabaseService.findRecordsByStockTypeIdPagination(
                    limit,
                    stockTypeId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more stock records to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} stock records`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    stockTypeName: newStockTypeName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              stockTypeName: newStockTypeName,
                          }
                        : undefined,
                }));

                await this.stockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} stock records for stockTypeId: ${stockTypeId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync stock records for stockTypeId: ${stockTypeId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
