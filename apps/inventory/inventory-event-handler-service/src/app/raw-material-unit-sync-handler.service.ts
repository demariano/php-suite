import { Injectable, Logger } from '@nestjs/common';
import { RawMaterialsStockDatabaseService } from '@php/backend/database-services/inventory-database-service';
import { RawMaterialUnitEventDto } from '@php/dto';

@Injectable()
export class RawMaterialUnitSyncHandlerService {
    private readonly logger = new Logger(RawMaterialUnitSyncHandlerService.name);

    constructor(private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseService) {}

    async handleRawMaterialUnitUpdatedEvent(event: RawMaterialUnitEventDto): Promise<void> {
        this.logger.log(
            `Received RawMaterialUnitUpdatedEvent: rawMaterialUnitId=${event.rawMaterialUnitId}, newName=${event.newRawMaterialUnitName}`
        );
        const startTime = Date.now();

        try {
            await this.syncRawMaterialUnitNameToRawMaterialsStock(
                event.rawMaterialUnitId,
                event.newRawMaterialUnitName
            );
            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ RawMaterialUnit sync completed successfully in ${duration}ms for rawMaterialUnitId: ${event.rawMaterialUnitId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ RawMaterialUnit sync failed for rawMaterialUnitId: ${event.rawMaterialUnitId}`,
                error
            );
            throw error;
        }
    }

    private async syncRawMaterialUnitNameToRawMaterialsStock(
        rawMaterialUnitId: string,
        newRawMaterialUnitName: string
    ): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(
            `Starting raw material unit sync for raw materials stock: rawMaterialUnitId=${rawMaterialUnitId}`
        );

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const page = await this.rawMaterialsStockDatabaseService.findRecordsByRawMaterialUnitIdPagination(
                    limit,
                    rawMaterialUnitId,
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
                    rawMaterialUnitName: newRawMaterialUnitName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              rawMaterialUnitName: newRawMaterialUnitName,
                          }
                        : undefined,
                }));

                await this.rawMaterialsStockDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} raw materials stock records for rawMaterialUnitId: ${rawMaterialUnitId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync raw materials stock records for rawMaterialUnitId: ${rawMaterialUnitId}`,
                error
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
