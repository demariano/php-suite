import { AreaDatabaseService } from '@customer-database-service';
import { AreaDto, TerritoryManagerEventDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TerritoryManagerSyncHandlerService {
    private readonly logger = new Logger(TerritoryManagerSyncHandlerService.name);

    constructor(private readonly areaDatabaseService: AreaDatabaseService) {}

    /**
     * Main handler - processes territory manager name sync
     */
    async handleTerritoryManagerUpdatedEvent(event: TerritoryManagerEventDto): Promise<void> {
        this.logger.log(
            `Received TerritoryManagerUpdatedEvent: territoryManagerId=${event.territoryManagerId}, newName=${event.newTerritoryManagerName}`
        );

        const startTime = Date.now();

        try {
            await this.syncTerritoryManagerNameToAreas(event.territoryManagerId, event.newTerritoryManagerName);

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
     * Handles territory manager reactivation events
     * Note: Reactivation only changes status INACTIVE→ACTIVE, name doesn't change
     * So no action needed for Areas (they still reference the correct name)
     */
    async handleTerritoryManagerReactivatedEvent(event: TerritoryManagerEventDto): Promise<void> {
        this.logger.log(`Received TerritoryManagerReactivatedEvent: territoryManagerId=${event.territoryManagerId}`);

        // No action required - Areas are still valid with existing territoryManagerName
        // Log for audit trail only
        this.logger.log(
            `✅ Territory manager reactivated - no area updates needed for territoryManagerId: ${event.territoryManagerId}`
        );
    }

    private async syncTerritoryManagerNameToAreas(
        territoryManagerId: string,
        newTerritoryManagerName: string
    ): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting territory manager sync for areas: territoryManagerId=${territoryManagerId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.areaDatabaseService.findRecordsByTerritoryManagerIdPagination(
                    limit,
                    territoryManagerId,
                    direction,
                    cursorPointer
                );

                if (!pageDto.data || pageDto.data.length === 0) {
                    this.logger.log('No more areas to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${pageDto.data.length} areas`);

                const updatedRecords: AreaDto[] = pageDto.data.map((record) => ({
                    ...record,
                    territoryManagerName: newTerritoryManagerName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              territoryManagerName: newTerritoryManagerName,
                          }
                        : undefined,
                }));

                await this.areaDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} areas for territoryManagerId: ${territoryManagerId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync areas for territoryManagerId: ${territoryManagerId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
