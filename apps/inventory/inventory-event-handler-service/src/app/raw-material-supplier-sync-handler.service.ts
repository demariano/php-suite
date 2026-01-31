import {
    RawMaterialsPurchaseOrderDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
} from '@inventory-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { RawMaterialSupplierEventDto } from '@dto';

@Injectable()
export class RawMaterialSupplierSyncHandlerService {
    private readonly logger = new Logger(RawMaterialSupplierSyncHandlerService.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract,
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    /**
     * Main handler - processes raw material supplier name sync for all entities
     */
    async handleRawMaterialSupplierUpdatedEvent(event: RawMaterialSupplierEventDto): Promise<void> {
        this.logger.log(
            `Received RawMaterialSupplierUpdatedEvent: rawMaterialSupplierId=${event.rawMaterialSupplierId}, newName=${event.newRawMaterialSupplierName}`
        );

        const startTime = Date.now();

        try {
            // Process all entities in parallel
            const results = await Promise.allSettled([
                this.syncRawMaterialSupplierNameToRawMaterialsStock(event),
                this.syncRawMaterialSupplierNameToRawMaterialsPurchaseOrder(event),
            ]);

            // Log results
            const entityNames = ['RawMaterialsStock', 'RawMaterialsPurchaseOrder'];
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
            this.logger.log(
                `✅ RawMaterialSupplier sync completed successfully in ${duration}ms for rawMaterialSupplierId: ${event.rawMaterialSupplierId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ RawMaterialSupplier sync failed for rawMaterialSupplierId: ${event.rawMaterialSupplierId}`,
                error
            );
            throw error;
        }
    }

    /**
     * Sync raw material supplier name to raw materials stock
     */
    private async syncRawMaterialSupplierNameToRawMaterialsStock(event: RawMaterialSupplierEventDto): Promise<void> {
        const { rawMaterialSupplierId, newRawMaterialSupplierName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(
            `Starting raw material supplier sync for raw materials stock: rawMaterialSupplierId=${rawMaterialSupplierId}`
        );

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.rawMaterialsStockDatabaseService.findRecordsByRawMaterialSupplierIdPagination(
                    limit,
                    rawMaterialSupplierId,
                    direction as 'next' | 'prev',
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more raw materials stock records to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} raw materials stock records`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    rawMaterialSupplierName: newRawMaterialSupplierName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              rawMaterialSupplierName: newRawMaterialSupplierName,
                          }
                        : undefined,
                }));

                await this.rawMaterialsStockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} raw materials stock records for rawMaterialSupplierId: ${rawMaterialSupplierId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync raw materials stock records for rawMaterialSupplierId: ${rawMaterialSupplierId}`,
                error
            );
            throw error;
        }
    }

    /**
     * Sync raw material supplier name to raw materials purchase orders
     */
    private async syncRawMaterialSupplierNameToRawMaterialsPurchaseOrder(
        event: RawMaterialSupplierEventDto
    ): Promise<void> {
        const { rawMaterialSupplierId, newRawMaterialSupplierName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(
            `Starting raw material supplier sync for raw materials purchase orders: rawMaterialSupplierId=${rawMaterialSupplierId}`
        );

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page =
                    await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsByRawMaterialSupplierIdPagination(
                        limit,
                        rawMaterialSupplierId,
                        direction,
                        cursorPointer
                    );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more raw materials purchase orders to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} raw materials purchase orders`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    rawMaterialSupplierName: newRawMaterialSupplierName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              rawMaterialSupplierName: newRawMaterialSupplierName,
                          }
                        : undefined,
                }));

                await this.rawMaterialsPurchaseOrderDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} raw materials purchase orders for rawMaterialSupplierId: ${rawMaterialSupplierId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync raw materials purchase orders for rawMaterialSupplierId: ${rawMaterialSupplierId}`,
                error
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
