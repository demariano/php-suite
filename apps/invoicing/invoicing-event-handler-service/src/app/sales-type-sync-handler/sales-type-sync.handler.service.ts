import { InvoiceDatabaseService } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface SalesTypeUpdatedEvent {
    salesTypeId: string;
    newSalesTypeName: string;
}

@Injectable()
export class SalesTypeSyncHandlerService {
    private readonly logger = new Logger(SalesTypeSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseService
    ) {}

    /**
     * Main handler - processes sales type name sync
     */
    async handleSalesTypeUpdatedEvent(event: SalesTypeUpdatedEvent): Promise<void> {
        this.logger.log(
            `Received SalesTypeUpdatedEvent: salesTypeId=${event.salesTypeId}, newName=${event.newSalesTypeName}`
        );

        const startTime = Date.now();

        try {
            // Only invoices need to be synced (only entity with salesTypeName)
            await this.syncSalesTypeNameToInvoices(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Sales type sync completed successfully in ${duration}ms for salesTypeId: ${event.salesTypeId}`
            );
        } catch (error) {
            this.logger.error(`❌ Sales type sync failed for salesTypeId: ${event.salesTypeId}`, error);
            throw error;
        }
    }

    /**
     * Sync sales type name changes to all invoices
     */
    private async syncSalesTypeNameToInvoices(event: SalesTypeUpdatedEvent): Promise<void> {
        const { salesTypeId, newSalesTypeName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting sales type sync for invoices: salesTypeId=${salesTypeId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.invoiceDatabaseService.findRecordsBySalesTypeIdPagination(
                    limit,
                    salesTypeId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more invoices to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} invoices`);

                const updatedInvoices = page.data.map((invoice) => ({
                    ...invoice,
                    salesTypeName: newSalesTypeName,
                    forApprovalVersion: invoice.forApprovalVersion
                        ? {
                              ...invoice.forApprovalVersion,
                              salesTypeName: newSalesTypeName,
                          }
                        : undefined,
                }));

                await this.invoiceDatabaseService.batchUpdateRecords(updatedInvoices);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} invoices for salesTypeId: ${salesTypeId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync invoices for salesTypeId: ${salesTypeId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
