import { CustomerDatabaseService } from '@customer-database-service';
import { AreaEventDto, CustomerDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AreaSyncHandlerService {
    private readonly logger = new Logger(AreaSyncHandlerService.name);

    constructor(private readonly customerDatabaseService: CustomerDatabaseService) {}

    /**
     * Main handler - processes area name sync
     */
    async handleAreaUpdatedEvent(event: AreaEventDto): Promise<void> {
        this.logger.log(`Received AreaUpdatedEvent: areaId=${event.areaId}, newName=${event.newAreaName}`);

        const startTime = Date.now();

        try {
            await this.syncAreaNameToCustomers(event.areaId, event.newAreaName);

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Area sync completed successfully in ${duration}ms for areaId: ${event.areaId}`);
        } catch (error) {
            this.logger.error(`❌ Area sync failed for areaId: ${event.areaId}`, error);
            throw error;
        }
    }

    private async syncAreaNameToCustomers(areaId: string, newAreaName: string): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting area sync for customers: areaId=${areaId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.customerDatabaseService.findRecordsByAreaIdPagination(
                    limit,
                    areaId,
                    direction,
                    cursorPointer
                );

                if (!pageDto.data || pageDto.data.length === 0) {
                    this.logger.log('No more customers to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${pageDto.data.length} customers`);

                const updatedRecords: CustomerDto[] = pageDto.data.map((record) => ({
                    ...record,
                    areaName: newAreaName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              areaName: newAreaName,
                          }
                        : undefined,
                }));

                await this.customerDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} customers for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync customers for areaId: ${areaId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
