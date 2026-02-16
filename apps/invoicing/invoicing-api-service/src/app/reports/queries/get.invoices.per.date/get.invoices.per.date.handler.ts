import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicesPerDateQuery } from './get.invoices.per.date.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesPerDateQuery)
export class GetInvoicesPerDateHandler implements IQueryHandler<GetInvoicesPerDateQuery> {
    protected readonly logger = new Logger(GetInvoicesPerDateHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicesPerDateQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing invoices per date report: ${query.startDate} - ${query.endDate}`);

        try {
            const fields = [
                'invoiceId',
                'docno',
                'invoiceDate',
                'customerId',
                'customerName',
                'salesTypeId',
                'salesTypeName',
                'invoiceAmount',
                'taxAmount',
                'finalAmount',
                'paymentStatus',
                'status',
                'contractSales',
                'contractId',
                'contractName',
            ];

            let invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(
                query.startDate,
                query.endDate,
                fields
            );

            // Filter by salesTypeId if provided
            if (query.salesTypeId) {
                invoices = invoices.filter((inv) => inv.salesTypeId === query.salesTypeId);
            }

            this.logger.log(`Invoices per date report: ${invoices.length} records found`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing invoices per date report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
