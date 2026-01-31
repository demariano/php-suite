import { VoucherDatabaseService } from '@accounting-database-service';
import { CustomerEventDto, VoucherDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerSyncHandlerService {
    private readonly logger = new Logger(CustomerSyncHandlerService.name);

    constructor(private readonly voucherDatabaseService: VoucherDatabaseService) {}

    /**
     * Main handler - processes customer name sync
     */
    async handleCustomerUpdatedEvent(event: CustomerEventDto): Promise<void> {
        this.logger.log(
            `Received CustomerUpdatedEvent: customerId=${event.customerId}, newName=${event.newCustomerName}`
        );

        const startTime = Date.now();

        try {
            await this.syncCustomerNameToVouchers(event.customerId, event.newCustomerName);

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Customer sync completed successfully in ${duration}ms for customerId: ${event.customerId}`
            );
        } catch (error) {
            this.logger.error(`❌ Customer sync failed for customerId: ${event.customerId}`, error);
            throw error;
        }
    }

    private async syncCustomerNameToVouchers(customerId: string, newCustomerName: string): Promise<void> {
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting customer sync for vouchers: customerId=${customerId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.voucherDatabaseService.findRecordsByCustomerIdPagination(
                    limit,
                    customerId,
                    direction,
                    cursorPointer
                );

                if (!pageDto.data || pageDto.data.length === 0) {
                    this.logger.log('No more vouchers to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${pageDto.data.length} vouchers`);

                const updatedRecords: VoucherDto[] = pageDto.data.map((record) => ({
                    ...record,
                    customerName: newCustomerName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              customerName: newCustomerName,
                          }
                        : undefined,
                }));

                await this.voucherDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} vouchers for customerId: ${customerId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync vouchers for customerId: ${customerId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
