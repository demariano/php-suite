import { InvoiceDto, ProductPriceTypeEventDto, ProductPriceTypeEventEnum } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductPriceTypeSyncHandlerService {
    private readonly logger = new Logger(ProductPriceTypeSyncHandlerService.name);
    private readonly PAGINATION_LIMIT = 100;
    private readonly BATCH_SIZE = 25;

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    /**
     * Handles PRODUCT_PRICE_TYPE_UPDATED events and syncs productPriceTypeName across affected entities
     */
    async handleProductPriceTypeUpdatedEvent(event: ProductPriceTypeEventDto): Promise<void> {
        this.logger.log(
            `Processing PRODUCT_PRICE_TYPE_UPDATED event for productPriceTypeId: ${event.productPriceTypeId}`
        );

        if (event.eventType !== ProductPriceTypeEventEnum.PRODUCT_PRICE_TYPE_UPDATED) {
            this.logger.warn(`Unexpected event type: ${event.eventType}. Skipping.`);
            return;
        }

        try {
            await this.syncProductPriceTypeNameToInvoices(event.productPriceTypeId, event.newProductPriceTypeName);
            this.logger.log(
                `Successfully synced productPriceTypeName for productPriceTypeId: ${event.productPriceTypeId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to sync productPriceTypeName for productPriceTypeId: ${event.productPriceTypeId}`,
                error
            );
            throw error;
        }
    }

    /**
     * Syncs productPriceTypeName to Invoice entities
     */
    private async syncProductPriceTypeNameToInvoices(
        productPriceTypeId: string,
        newProductPriceTypeName: string
    ): Promise<void> {
        this.logger.log(`Syncing productPriceTypeName to Invoices for productPriceTypeId: ${productPriceTypeId}`);

        let cursorPointer: any = '';
        let hasMoreRecords = true;
        let totalUpdated = 0;

        while (hasMoreRecords) {
            const pageResult = await this.invoiceDatabaseService.findRecordsByProductPriceTypeIdPagination(
                this.PAGINATION_LIMIT,
                productPriceTypeId,
                cursorPointer ? 'next' : null,
                cursorPointer
            );

            if (pageResult.data.length > 0) {
                const updatedInvoices = pageResult.data.map((invoice: InvoiceDto) => ({
                    ...invoice,
                    productPriceTypeName: newProductPriceTypeName,
                }));

                // Update in batches of 25
                for (let i = 0; i < updatedInvoices.length; i += this.BATCH_SIZE) {
                    const batch = updatedInvoices.slice(i, i + this.BATCH_SIZE);
                    await Promise.all(batch.map((invoice) => this.invoiceDatabaseService.updateRecord(invoice)));
                    totalUpdated += batch.length;
                    this.logger.log(`Updated ${totalUpdated} invoices so far`);
                }
            }

            cursorPointer = pageResult.nextCursorPointer;
            hasMoreRecords = !!cursorPointer;
        }

        this.logger.log(`Completed sync: Updated ${totalUpdated} invoices`);
    }
}
