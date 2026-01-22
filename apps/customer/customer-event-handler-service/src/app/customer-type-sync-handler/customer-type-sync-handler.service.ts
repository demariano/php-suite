import { CustomerDatabaseService } from '@customer-database-service';
import { CustomerDto, CustomerTypeEventDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerTypeSyncHandlerService {
    private readonly logger = new Logger(CustomerTypeSyncHandlerService.name);

    constructor(private readonly customerDatabaseService: CustomerDatabaseService) {}

    /**
     * Main handler - processes customer type name sync
     */
    async handleCustomerTypeUpdatedEvent(event: CustomerTypeEventDto): Promise<void> {
        this.logger.log(
            `Received CustomerTypeUpdatedEvent: customerTypeId=${event.customerTypeId}, newName=${event.newCustomerTypeName}`
        );

        const startTime = Date.now();

        try {
            await this.syncCustomerTypeNameToCustomers(event.customerTypeId, event.newCustomerTypeName);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Customer type sync completed successfully in ${duration}ms for customerTypeId: ${event.customerTypeId}`
            );
        } catch (error) {
            this.logger.error(`❌ Customer type sync failed for customerTypeId: ${event.customerTypeId}`, error);
            throw error;
        }
    }

    private async syncCustomerTypeNameToCustomers(customerTypeId: string, newCustomerTypeName: string): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting customer type sync for customers: customerTypeId=${customerTypeId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.customerDatabaseService.findRecordsByCustomerTypeIdPagination(
                    limit,
                    customerTypeId,
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
                    customerTypeName: newCustomerTypeName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              customerTypeName: newCustomerTypeName,
                          }
                        : undefined,
                }));

                await this.customerDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} customers for customerTypeId: ${customerTypeId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync customers for customerTypeId: ${customerTypeId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
