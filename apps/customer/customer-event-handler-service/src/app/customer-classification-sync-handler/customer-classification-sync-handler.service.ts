import { CustomerDatabaseService } from '@customer-database-service';
import { CustomerClassificationEventDto, CustomerDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerClassificationSyncHandlerService {
    private readonly logger = new Logger(CustomerClassificationSyncHandlerService.name);

    constructor(private readonly customerDatabaseService: CustomerDatabaseService) {}

    /**
     * Main handler - processes customer classification name sync
     */
    async handleCustomerClassificationUpdatedEvent(event: CustomerClassificationEventDto): Promise<void> {
        this.logger.log(
            `Received CustomerClassificationUpdatedEvent: customerClassificationId=${event.customerClassificationId}, newName=${event.newCustomerClassificationName}`
        );

        const startTime = Date.now();

        try {
            await this.syncCustomerClassificationNameToCustomers(
                event.customerClassificationId,
                event.newCustomerClassificationName
            );

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Customer classification sync completed successfully in ${duration}ms for customerClassificationId: ${event.customerClassificationId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Customer classification sync failed for customerClassificationId: ${event.customerClassificationId}`,
                error
            );
            throw error;
        }
    }

    private async syncCustomerClassificationNameToCustomers(
        customerClassificationId: string,
        newCustomerClassificationName: string
    ): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(
            `Starting customer classification sync for customers: customerClassificationId=${customerClassificationId}`
        );

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.customerDatabaseService.findRecordsByCustomerClassificationIdPagination(
                    limit,
                    customerClassificationId,
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
                    customerClassificationName: newCustomerClassificationName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              customerClassificationName: newCustomerClassificationName,
                          }
                        : undefined,
                }));

                await this.customerDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} customers for customerClassificationId: ${customerClassificationId}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Failed to sync customers for customerClassificationId: ${customerClassificationId}`,
                error
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
