import {
    StockDeliveryDatabaseServiceAbstract,
    StockPurchaseOrderDatabaseServiceAbstract,
} from '@inventory-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { SupplierEventDto } from '@dto';

@Injectable()
export class SupplierSyncHandlerService {
    private readonly logger = new Logger(SupplierSyncHandlerService.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract,

        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    /**
     * Main handler - processes supplier name sync for all entities
     */
    async handleSupplierUpdatedEvent(event: SupplierEventDto): Promise<void> {
        this.logger.log(
            `Received SupplierUpdatedEvent: supplierId=${event.supplierId}, newName=${event.newSupplierName}`
        );

        const startTime = Date.now();

        try {
            // Process all entities in parallel
            const results = await Promise.allSettled([
                this.syncSupplierNameToStockPurchaseOrders(event),
                this.syncSupplierNameToStockDeliveries(event),
            ]);

            // Log results
            const entityNames = ['StockPurchaseOrders', 'StockDeliveries'];
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
                `✅ Supplier sync completed successfully in ${duration}ms for supplierId: ${event.supplierId}`
            );
        } catch (error) {
            this.logger.error(`❌ Supplier sync failed for supplierId: ${event.supplierId}`, error);
            throw error;
        }
    }

    /**
     * Sync supplier name to stock purchase orders
     */
    private async syncSupplierNameToStockPurchaseOrders(event: SupplierEventDto): Promise<void> {
        const { supplierId, newSupplierName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting supplier sync for stock purchase orders: supplierId=${supplierId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.stockPurchaseOrderDatabaseService.findRecordsBySupplierIdPagination(
                    limit,
                    supplierId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more stock purchase orders to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} stock purchase orders`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    supplierName: newSupplierName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              supplierName: newSupplierName,
                          }
                        : undefined,
                }));

                await this.stockPurchaseOrderDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} stock purchase orders for supplierId: ${supplierId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync stock purchase orders for supplierId: ${supplierId}`, error);
            throw error;
        }
    }

    /**
     * Sync supplier name to stock deliveries
     */
    private async syncSupplierNameToStockDeliveries(event: SupplierEventDto): Promise<void> {
        const { supplierId, newSupplierName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting supplier sync for stock deliveries: supplierId=${supplierId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.stockDeliveryDatabaseService.findRecordsBySupplierIdPagination(
                    limit,
                    supplierId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more stock deliveries to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} stock deliveries`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    supplierName: newSupplierName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              supplierName: newSupplierName,
                          }
                        : undefined,
                }));

                await this.stockDeliveryDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} stock deliveries for supplierId: ${supplierId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync stock deliveries for supplierId: ${supplierId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
