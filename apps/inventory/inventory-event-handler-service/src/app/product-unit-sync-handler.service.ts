import { Inject, Injectable, Logger } from '@nestjs/common';

import { ProductUnitEventDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';

@Injectable()
export class ProductUnitSyncHandlerService {
    private readonly logger = new Logger(ProductUnitSyncHandlerService.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    /**
     * Main handler - processes product unit name sync
     */
    async handleProductUnitUpdatedEvent(event: ProductUnitEventDto): Promise<void> {
        this.logger.log(
            `Received ProductUnitUpdatedEvent: productUnitId=${event.productUnitId}, newName=${event.newProductUnitName}`
        );

        const startTime = Date.now();

        try {
            await this.syncProductUnitNameToStock(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Product unit sync completed successfully in ${duration}ms for productUnitId: ${event.productUnitId}`
            );
        } catch (error) {
            this.logger.error(`❌ Product unit sync failed for productUnitId: ${event.productUnitId}`, error);
            throw error;
        }
    }

    /**
     * Sync product unit name to stock records
     */
    private async syncProductUnitNameToStock(event: ProductUnitEventDto): Promise<void> {
        const { productUnitId, newProductUnitName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting product unit sync for stock: productUnitId=${productUnitId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.stockDatabaseService.findRecordsByProductUnitIdPagination(
                    limit,
                    productUnitId,
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
                    productUnitName: newProductUnitName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              productUnitName: newProductUnitName,
                          }
                        : undefined,
                }));

                await this.stockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} stock records for productUnitId: ${productUnitId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync stock records for productUnitId: ${productUnitId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
