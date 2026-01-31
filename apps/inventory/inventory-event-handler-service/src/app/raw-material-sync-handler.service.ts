import { Inject, Injectable, Logger } from '@nestjs/common';

import { RawMaterialEventDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';

@Injectable()
export class RawMaterialSyncHandlerService {
    private readonly logger = new Logger(RawMaterialSyncHandlerService.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

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
