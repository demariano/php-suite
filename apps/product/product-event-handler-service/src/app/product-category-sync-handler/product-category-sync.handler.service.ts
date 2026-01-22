import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductDatabaseService } from '@product-database-service';

export interface ProductCategoryUpdatedEvent {
    productCategoryId: string;
    newProductCategoryName: string;
}

@Injectable()
export class ProductCategorySyncHandlerService {
    private readonly logger = new Logger(ProductCategorySyncHandlerService.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseService
    ) {}

    /**
     * Main handler - processes product category name sync
     */
    async handleProductCategoryUpdatedEvent(event: ProductCategoryUpdatedEvent): Promise<void> {
        this.logger.log(
            `Received ProductCategoryUpdatedEvent: productCategoryId=${event.productCategoryId}, newName=${event.newProductCategoryName}`
        );

        const startTime = Date.now();

        try {
            await this.syncProductCategoryNameToProducts(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Product category sync completed successfully in ${duration}ms for productCategoryId: ${event.productCategoryId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Product category sync failed for productCategoryId: ${event.productCategoryId}`,
                error
            );
            throw error;
        }
    }

    /**
     * Sync product category name changes to all products
     */
    private async syncProductCategoryNameToProducts(event: ProductCategoryUpdatedEvent): Promise<void> {
        const { productCategoryId, newProductCategoryName } = event;
        const limit = 100;
        let cursorPointer = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting product category sync for products: productCategoryId=${productCategoryId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.productDatabaseService.findRecordsByProductCategoryIdPagination(
                    limit,
                    productCategoryId,
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
                    productCategoryName: newProductCategoryName,
                    forApprovalVersion: product.forApprovalVersion
                        ? {
                              ...product.forApprovalVersion,
                              productCategoryName: newProductCategoryName,
                          }
                        : undefined,
                }));

                await this.productDatabaseService.batchUpdate(updatedProducts);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} products for productCategoryId: ${productCategoryId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync products for productCategoryId: ${productCategoryId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
