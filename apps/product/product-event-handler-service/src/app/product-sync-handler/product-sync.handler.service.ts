import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductUnitRawMaterialDatabaseService } from '@product-database-service';

export interface ProductUpdatedEvent {
    productId: string;
    newProductName: string;
}

@Injectable()
export class ProductSyncHandlerService {
    private readonly logger = new Logger(ProductSyncHandlerService.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseService
    ) {}

    /**
     * Main handler - processes product name sync
     */
    async handleProductUpdatedEvent(event: ProductUpdatedEvent): Promise<void> {
        this.logger.log(`Received ProductUpdatedEvent: productId=${event.productId}, newName=${event.newProductName}`);

        const startTime = Date.now();

        try {
            await this.syncProductNameToProductUnitRawMaterials(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Product sync completed successfully in ${duration}ms for productId: ${event.productId}`
            );
        } catch (error) {
            this.logger.error(`❌ Product sync failed for productId: ${event.productId}`, error);
            throw error;
        }
    }

    /**
     * Sync product name changes to all product unit raw materials
     */
    private async syncProductNameToProductUnitRawMaterials(event: ProductUpdatedEvent): Promise<void> {
        const { productId, newProductName } = event;
        const limit = 100;
        let cursorPointer = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting product sync for product unit raw materials: productId=${productId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.productUnitRawMaterialDatabaseService.findRecordsByProductIdPagination(
                    limit,
                    productId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more product unit raw materials to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} product unit raw materials`);

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

                await this.productUnitRawMaterialDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} product unit raw materials for productId: ${productId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync product unit raw materials for productId: ${productId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
