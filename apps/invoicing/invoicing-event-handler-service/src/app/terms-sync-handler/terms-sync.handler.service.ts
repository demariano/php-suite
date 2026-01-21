import { InvoiceDto, PageDto, TermsUpdatedEvent } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TermsSyncHandlerService {
    protected readonly logger = new Logger(TermsSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async handleTermsUpdatedEvent(event: TermsUpdatedEvent): Promise<void> {
        this.logger.log(`Handling TERMS_UPDATED event for termsId: ${event.termsId}, new name: ${event.newTermsName}`);

        await this.syncTermsNameToInvoices(event);
    }

    private async syncTermsNameToInvoices(event: TermsUpdatedEvent): Promise<void> {
        this.logger.log(`Starting terms name sync to Invoices for termsId: ${event.termsId}`);

        let hasMoreRecords = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = '';
        let totalUpdated = 0;

        while (hasMoreRecords) {
            const pageResult: PageDto<InvoiceDto> = await this.invoiceDatabaseService.findRecordsByTermsIdPagination(
                100, // Records per page
                event.termsId,
                null, // Direction is null for first page
                cursorPointer
            );

            if (pageResult.data && pageResult.data.length > 0) {
                // Update terms name for all records in this page
                const updatedRecords = pageResult.data.map((invoice) => ({
                    ...invoice,
                    termsName: event.newTermsName,
                }));

                // Batch update records (25 at a time)
                await this.invoiceDatabaseService.batchUpdateRecords(updatedRecords);

                totalUpdated += updatedRecords.length;
                this.logger.log(
                    `Updated ${updatedRecords.length} invoices (total: ${totalUpdated}) for termsId: ${event.termsId}`
                );
            }

            // Check if there are more records
            if (pageResult.nextCursorPointer) {
                cursorPointer = pageResult.nextCursorPointer;
            } else {
                hasMoreRecords = false;
            }
        }

        this.logger.log(`Completed terms name sync to Invoices. Total updated: ${totalUpdated}`);
    }
}
