import {
    CollectionReceiptRangeDatabaseService,
    ContractDatabaseService,
    InvoiceDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface AreaUpdatedEvent {
    areaId: string;
    newAreaName: string;
}

@Injectable()
export class AreaSyncHandlerService {
    private readonly logger = new Logger(AreaSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseService,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseService,
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseService,
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseService
    ) {}

    /**
     * Main handler - processes area name sync for all entities
     */
    async handleAreaUpdatedEvent(event: AreaUpdatedEvent): Promise<void> {
        this.logger.log(`Received AreaUpdatedEvent: areaId=${event.areaId}, newName=${event.newAreaName}`);

        const startTime = Date.now();

        try {
            // Process all entities in parallel
            const results = await Promise.allSettled([
                this.syncAreaNameToInvoices(event),
                this.syncAreaNameToContracts(event),
                this.syncAreaNameToReturnGoodSold(event),
                this.syncAreaNameToCollectionReceiptRanges(event),
            ]);

            // Log results
            const entityNames = ['Invoices', 'Contracts', 'ReturnGoodSold', 'CollectionReceiptRanges'];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    this.logger.log(`✅ ${entityNames[index]} sync completed`);
                } else {
                    this.logger.error(`❌ ${entityNames[index]} sync failed:`, result.reason);
                }
            });

            // Check if any failed
            const failures = results.filter((r) => r.status === 'rejected');
            if (failures.length > 0) {
                throw new Error(`Failed to sync ${failures.length} entity types`);
            }

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Area sync completed successfully in ${duration}ms for areaId: ${event.areaId}`);
        } catch (error) {
            this.logger.error(`❌ Area sync failed for areaId: ${event.areaId}`, error);
            throw error;
        }
    }

    /**
     * Sync area name changes to all invoices
     */
    private async syncAreaNameToInvoices(event: AreaUpdatedEvent): Promise<void> {
        const { areaId, newAreaName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting area sync for invoices: areaId=${areaId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.invoiceDatabaseService.findRecordsByAreaIdPagination(
                    limit,
                    areaId,
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
                    areaName: newAreaName,
                    forApprovalVersion: invoice.forApprovalVersion
                        ? {
                              ...invoice.forApprovalVersion,
                              areaName: newAreaName,
                          }
                        : undefined,
                }));

                await this.invoiceDatabaseService.batchUpdateRecords(updatedInvoices);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} invoices for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync invoices for areaId: ${areaId}`, error);
            throw error;
        }
    }

    /**
     * Sync area name to contracts
     */
    private async syncAreaNameToContracts(event: AreaUpdatedEvent): Promise<void> {
        const { areaId, newAreaName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting area sync for contracts: areaId=${areaId}`);

        try {
            do {
                const direction = cursorPointer ? 'next' : null;

                const page = await this.contractDatabaseService.findRecordsByAreaIdPagination(
                    limit,
                    areaId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedContracts = page.data.map((contract) => ({
                    ...contract,
                    areaName: newAreaName,
                    forApprovalVersion: contract.forApprovalVersion
                        ? {
                              ...contract.forApprovalVersion,
                              areaName: newAreaName,
                          }
                        : undefined,
                }));

                await this.contractDatabaseService.batchUpdateRecords(updatedContracts);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} contracts for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync contracts for areaId: ${areaId}`, error);
            throw error;
        }
    }

    /**
     * Sync area name to return good sold records
     */
    private async syncAreaNameToReturnGoodSold(event: AreaUpdatedEvent): Promise<void> {
        const { areaId, newAreaName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting area sync for return good sold: areaId=${areaId}`);

        try {
            do {
                const direction = cursorPointer ? 'next' : null;

                const page = await this.returnGoodSoldDatabaseService.findRecordsByAreaIdPagination(
                    limit,
                    areaId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedReturnGoodSold = page.data.map((rgs) => ({
                    ...rgs,
                    areaName: newAreaName,
                    forApprovalVersion: rgs.forApprovalVersion
                        ? {
                              ...rgs.forApprovalVersion,
                              areaName: newAreaName,
                          }
                        : undefined,
                }));

                await this.returnGoodSoldDatabaseService.batchUpdateRecords(updatedReturnGoodSold);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} return good sold records for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync return good sold for areaId: ${areaId}`, error);
            throw error;
        }
    }

    /**
     * Sync area name to collection receipt ranges
     */
    private async syncAreaNameToCollectionReceiptRanges(event: AreaUpdatedEvent): Promise<void> {
        const { areaId, newAreaName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting area sync for collection receipt ranges: areaId=${areaId}`);

        try {
            do {
                const direction = cursorPointer ? 'next' : null;

                const page = await this.collectionReceiptRangeDatabaseService.findRecordsByAreaIdPagination(
                    limit,
                    areaId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedRanges = page.data.map((range) => ({
                    ...range,
                    areaName: newAreaName,
                }));

                await this.collectionReceiptRangeDatabaseService.batchUpdateRecords(updatedRanges);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} collection receipt ranges for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync collection receipt ranges for areaId: ${areaId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
