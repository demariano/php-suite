import { Injectable, Logger } from '@nestjs/common';
import {
    RawMaterialsPurchaseOrderDatabaseService,
    RawMaterialsStockDatabaseService,
} from '@php/backend/database-services/inventory-database-service';
import { RawMaterialEventDto, RawMaterialSupplierEventDto } from '@php/dto';

@Injectable()
export class RawMaterialSyncHandlerService {
    private readonly logger = new Logger(RawMaterialSyncHandlerService.name);

    constructor(private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseService) {}

    async handleRawMaterialUpdatedEvent(event: RawMaterialEventDto): Promise<void> {
        this.logger.log(
            `Received RawMaterialUpdatedEvent: rawMaterialId=${event.rawMaterialId}, newName=${event.newRawMaterialName}`
        );
        const startTime = Date.now();

        try {
            await this.syncRawMaterialNameToRawMaterialsStock(event.rawMaterialId, event.newRawMaterialName);
            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ RawMaterial sync completed successfully in ${duration}ms for rawMaterialId: ${event.rawMaterialId}`
            );
        } catch (error) {
            this.logger.error(`❌ RawMaterial sync failed for rawMaterialId: ${event.rawMaterialId}`, error);
            throw error;
        }
    }

    private async syncRawMaterialNameToRawMaterialsStock(
        rawMaterialId: string,
        newRawMaterialName: string
    ): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting raw material sync for raw materials stock: rawMaterialId=${rawMaterialId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.rawMaterialsStockDatabaseService.findRecordsByRawMaterialIdPagination(
                    limit,
                    rawMaterialId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more raw materials stock records to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} raw materials stock records`);

                const updatedRecords = page.data.map((record) => ({
                    ...record,
                    rawMaterialName: newRawMaterialName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              rawMaterialName: newRawMaterialName,
                          }
                        : undefined,
                }));

                await this.rawMaterialsStockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} raw materials stock records for rawMaterialId: ${rawMaterialId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync raw materials stock records for rawMaterialId: ${rawMaterialId}`,
                error
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
cat >
    'd:/other_coding_projects/php/apps/inventory/inventory-event-handler-service/src/app/raw-material-supplier-sync-handler.service.ts' <<
        'EOF';

@Injectable()
export class RawMaterialSupplierSyncHandlerService {
    constructor(
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseService,
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseService
    ) {}

    async handleRawMaterialSupplierUpdatedEvent(event: RawMaterialSupplierEventDto): Promise<void> {
        try {
            await this.syncRawMaterialSupplierNameToRawMaterialsStock(
                event.rawMaterialSupplierId,
                event.newRawMaterialSupplierName
            );
        } catch {}

        try {
            await this.syncRawMaterialSupplierNameToPurchaseOrder(
                event.rawMaterialSupplierId,
                event.newRawMaterialSupplierName
            );
        } catch {}
    }

    private async syncRawMaterialSupplierNameToRawMaterialsStock(
        rawMaterialSupplierId: string,
        newRawMaterialSupplierName: string
    ): Promise<void> {
        let cursorPointer: string | undefined = undefined;
        let hasMore = true;

        while (hasMore) {
            const result = await this.rawMaterialsStockDatabaseService.findRecordsByRawMaterialSupplierIdPagination(
                100,
                rawMaterialSupplierId,
                'forward',
                cursorPointer
            );

            if (result.data.length > 0) {
                const updatedRecords = result.data.map((stock) => {
                    stock.rawMaterialSupplierName = newRawMaterialSupplierName;
                    if (stock.forApprovalVersion && stock.forApprovalVersion.rawMaterialSupplierName) {
                        stock.forApprovalVersion.rawMaterialSupplierName = newRawMaterialSupplierName;
                    }
                    return stock;
                });

                await this.rawMaterialsStockDatabaseService.batchUpdate(updatedRecords);
            }

            hasMore = !!result.nextCursor;
            cursorPointer = result.nextCursor;
        }
    }

    private async syncRawMaterialSupplierNameToPurchaseOrder(
        rawMaterialSupplierId: string,
        newRawMaterialSupplierName: string
    ): Promise<void> {
        let cursorPointer: string | undefined = undefined;
        let hasMore = true;

        while (hasMore) {
            const result =
                await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsByRawMaterialSupplierIdPagination(
                    100,
                    rawMaterialSupplierId,
                    'forward',
                    cursorPointer
                );

            if (result.data.length > 0) {
                const updatedRecords = result.data.map((order) => {
                    order.rawMaterialSupplierName = newRawMaterialSupplierName;
                    if (order.forApprovalVersion && order.forApprovalVersion.rawMaterialSupplierName) {
                        order.forApprovalVersion.rawMaterialSupplierName = newRawMaterialSupplierName;
                    }
                    return order;
                });

                await this.rawMaterialsPurchaseOrderDatabaseService.batchUpdate(updatedRecords);
            }

            hasMore = !!result.nextCursor;
            cursorPointer = result.nextCursor;
        }
    }
}
