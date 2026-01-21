import { InvoiceDatabaseService } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface TerritoryManagerUpdatedEvent {
    territoryManagerId: string;
    newTerritoryManagerName: string;
}

@Injectable()
export class TerritoryManagerSyncHandlerService {
    private readonly logger = new Logger(TerritoryManagerSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseService
    ) {}

    /**
     * Main handler - processes territory manager name sync
     */
    async handleTerritoryManagerUpdatedEvent(event: TerritoryManagerUpdatedEvent): Promise<void> {
        this.logger.log(
            `Received TerritoryManagerUpdatedEvent: territoryManagerId=${event.territoryManagerId}, newName=${event.newTerritoryManagerName}`
        );

        const startTime = Date.now();

        try {
            // Only invoices need to be synced (only entity with territoryManagerName)
            await this.syncTerritoryManagerNameToInvoices(event);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Territory manager sync completed successfully in ${duration}ms for territoryManagerId: ${event.territoryManagerId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Territory manager sync failed for territoryManagerId: ${event.territoryManagerId}`,
                error
            );
            throw error;
        }
    }

    /**
     * Sync territory manager name changes to all invoices
     */
    private async syncTerritoryManagerNameToInvoices(event: TerritoryManagerUpdatedEvent): Promise<void> {
        const { territoryManagerId, newTerritoryManagerName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting territory manager sync for invoices: territoryManagerId=${territoryManagerId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.invoiceDatabaseService.findRecordsByTerritoryManagerIdPagination(
                    limit,
                    territoryManagerId,
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
                    territoryManagerName: newTerritoryManagerName,
                    forApprovalVersion: invoice.forApprovalVersion
                        ? {
                              ...invoice.forApprovalVersion,
                              territoryManagerName: newTerritoryManagerName,
                          }
                        : undefined,
                }));

                await this.invoiceDatabaseService.batchUpdateRecords(updatedInvoices);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} invoices for territoryManagerId: ${territoryManagerId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync invoices for territoryManagerId: ${territoryManagerId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
