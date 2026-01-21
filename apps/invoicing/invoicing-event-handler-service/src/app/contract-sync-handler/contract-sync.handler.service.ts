import { ContractUpdatedEvent, InvoiceDto, PageDto, PaymentDto } from '@dto';
import { InvoiceDatabaseServiceAbstract, PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContractSyncHandlerService {
    protected readonly logger = new Logger(ContractSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async handleContractUpdatedEvent(event: ContractUpdatedEvent): Promise<void> {
        this.logger.log(
            `Handling CONTRACT_UPDATED event for contractId: ${event.contractId}, new name: ${event.newContractName}`
        );

        // Sync contract name to Invoice and Payment entities in parallel
        const syncResults = await Promise.allSettled([
            this.syncContractNameToInvoices(event),
            this.syncContractNameToPayments(event),
        ]);

        // Log results
        syncResults.forEach((result, index) => {
            const entityName = ['Invoices', 'Payments'][index];
            if (result.status === 'fulfilled') {
                this.logger.log(`Successfully synced contract name to ${entityName}`);
            } else {
                this.logger.error(`Failed to sync contract name to ${entityName}:`, result.reason);
            }
        });
    }

    private async syncContractNameToInvoices(event: ContractUpdatedEvent): Promise<void> {
        this.logger.log(`Starting contract name sync to Invoices for contractId: ${event.contractId}`);

        let hasMoreRecords = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = '';
        let totalUpdated = 0;

        while (hasMoreRecords) {
            const pageResult: PageDto<InvoiceDto> = await this.invoiceDatabaseService.findRecordsByContractIdPagination(
                100, // Records per page
                event.contractId,
                null, // Direction is null for first page
                cursorPointer
            );

            if (pageResult.data && pageResult.data.length > 0) {
                // Update contract name for all records in this page
                const updatedRecords = pageResult.data.map((invoice) => ({
                    ...invoice,
                    contractName: event.newContractName,
                }));

                // Batch update records (25 at a time)
                await this.invoiceDatabaseService.batchUpdateRecords(updatedRecords);

                totalUpdated += updatedRecords.length;
                this.logger.log(
                    `Updated ${updatedRecords.length} invoices (total: ${totalUpdated}) for contractId: ${event.contractId}`
                );
            }

            // Check if there are more records
            if (pageResult.nextCursorPointer) {
                cursorPointer = pageResult.nextCursorPointer;
            } else {
                hasMoreRecords = false;
            }
        }

        this.logger.log(`Completed contract name sync to Invoices. Total updated: ${totalUpdated}`);
    }

    private async syncContractNameToPayments(event: ContractUpdatedEvent): Promise<void> {
        this.logger.log(`Starting contract name sync to Payments for contractId: ${event.contractId}`);

        let hasMoreRecords = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = '';
        let totalUpdated = 0;

        while (hasMoreRecords) {
            const pageResult: PageDto<PaymentDto> = await this.paymentDatabaseService.findRecordsByContractIdPagination(
                100, // Records per page
                event.contractId,
                null, // Direction is null for first page
                cursorPointer
            );

            if (pageResult.data && pageResult.data.length > 0) {
                // Update contract name for all records in this page
                const updatedRecords = pageResult.data.map((payment) => ({
                    ...payment,
                    contractName: event.newContractName,
                }));

                // Batch update records (25 at a time)
                await this.paymentDatabaseService.batchUpdateRecords(updatedRecords);

                totalUpdated += updatedRecords.length;
                this.logger.log(
                    `Updated ${updatedRecords.length} payments (total: ${totalUpdated}) for contractId: ${event.contractId}`
                );
            }

            // Check if there are more records
            if (pageResult.nextCursorPointer) {
                cursorPointer = pageResult.nextCursorPointer;
            } else {
                hasMoreRecords = false;
            }
        }

        this.logger.log(`Completed contract name sync to Payments. Total updated: ${totalUpdated}`);
    }
}
