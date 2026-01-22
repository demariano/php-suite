import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductDatabaseService } from '@product-database-service';

export interface ProductClassUpdatedEvent {
    productClassId: string;
    newProductClassName: string;
}

@Injectable()
export class ProductClassSyncHandlerService {
    private readonly logger = new Logger(ProductClassSyncHandlerService.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseService
    ) {}

    /**
     * Main handler - processes product class name sync
     */
    async handleProductClassUpdatedEvent(event: ProductClassUpdatedEvent): Promise<void> {
        this.logger.log(
            `Received ProductClassUpdatedEvent: productClassId=${event.productClassId}, newName=${event.newProductClassName}`
        );

        const startTime = Date.now();

        try {
            await this.syncProductClassNameToProducts(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Product class sync completed successfully in ${duration}ms for productClassId: ${event.productClassId}`
            );
        } catch (error) {
            this.logger.error(`❌ Product class sync failed for productClassId: ${event.productClassId}`, error);
            throw error;
        }
    }

    /**
     * Sync product class name changes to all products
     */
    private async syncProductClassNameToProducts(event: ProductClassUpdatedEvent): Promise<void> {
        const { productClassId, newProductClassName } = event;
        const limit = 100;
        let cursorPointer = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting product class sync for products: productClassId=${productClassId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.productDatabaseService.findRecordsByProductClassIdPagination(
                    limit,
                    productClassId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more products to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} products`);

                const updatedProducts = page.data.map((product) => ({
                    ...product,
                    productClassName: newProductClassName,
                    forApprovalVersion: product.forApprovalVersion
                        ? {
                              ...product.forApprovalVersion,
                              productClassName: newProductClassName,
                          }
                        : undefined,
                }));

                await this.productDatabaseService.batchUpdate(updatedProducts);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} products for productClassId: ${productClassId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync products for productClassId: ${productClassId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
