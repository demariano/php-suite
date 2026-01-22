import { Injectable, Logger } from '@nestjs/common';
import { RawMaterialsStockDatabaseService } from '@php/backend/database-services/inventory-database-service';
import { RawMaterialsLocationEventDto } from '@php/dto';

@Injectable()
export class RawMaterialsLocationSyncHandlerService {
    private readonly logger = new Logger(RawMaterialsLocationSyncHandlerService.name);

    constructor(private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseService) {}

    async handleRawMaterialsLocationUpdatedEvent(event: RawMaterialsLocationEventDto): Promise<void> {
        this.logger.log(
            `Received RawMaterialsLocationUpdatedEvent: rawMaterialsLocationId=${event.rawMaterialsLocationId}, newName=${event.newRawMaterialsLocationName}`
        );
        const startTime = Date.now();

        try {
            await this.syncRawMaterialsLocationNameToRawMaterialsStock(
                event.rawMaterialsLocationId,
                event.newRawMaterialsLocationName
            );
            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ RawMaterialsLocation sync completed successfully in ${duration}ms for rawMaterialsLocationId: ${event.rawMaterialsLocationId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ RawMaterialsLocation sync failed for rawMaterialsLocationId: ${event.rawMaterialsLocationId}`,
                error
            );
            throw error;
        }
    }

    private async syncRawMaterialsLocationNameToRawMaterialsStock(
        rawMaterialsLocationId: string,
        newRawMaterialsLocationName: string
    ): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(
            `Starting raw materials location sync for raw materials stock: rawMaterialsLocationId=${rawMaterialsLocationId}`
        );

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.rawMaterialsStockDatabaseService.findRecordsByRawMaterialsLocationIdPagination(
                    limit,
                    rawMaterialsLocationId,
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
                    rawMaterialsLocationName: newRawMaterialsLocationName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              rawMaterialsLocationName: newRawMaterialsLocationName,
                          }
                        : undefined,
                }));

                await this.rawMaterialsStockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} raw materials stock records for rawMaterialsLocationId: ${rawMaterialsLocationId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync raw materials stock records for rawMaterialsLocationId: ${rawMaterialsLocationId}`,
                error
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
