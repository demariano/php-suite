import { Injectable, Logger } from '@nestjs/common';
import { StockDatabaseService } from '@php/backend/database-services/inventory-database-service';
import { ProductEventDto } from '@php/dto';

@Injectable()
export class ProductSyncHandlerService {
    private readonly logger = new Logger(ProductSyncHandlerService.name);

    constructor(private readonly stockDatabaseService: StockDatabaseService) {}

    async handleProductUpdatedEvent(event: ProductEventDto): Promise<void> {
        this.logger.log(`Received ProductUpdatedEvent: productId=${event.productId}, newName=${event.newProductName}`);
        const startTime = Date.now();

        try {
            await this.syncProductNameToStock(event.productId, event.newProductName);
            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Product sync completed successfully in ${duration}ms for productId: ${event.productId}`
            );
        } catch (error) {
            this.logger.error(`❌ Product sync failed for productId: ${event.productId}`, error);
            throw error;
        }
    }

    private async syncProductNameToStock(productId: string, newProductName: string): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting product sync for stock: productId=${productId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.stockDatabaseService.findRecordsByProductIdPagination(
                    limit,
                    productId,
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
                    productName: newProductName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              productName: newProductName,
                          }
                        : undefined,
                }));

                await this.stockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} stock records for productId: ${productId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync stock records for productId: ${productId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
