import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicesPerCustomerQuery } from './get.invoices.per.customer.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesPerCustomerQuery)
export class GetInvoicesPerCustomerHandler implements IQueryHandler<GetInvoicesPerCustomerQuery> {
    protected readonly logger = new Logger(GetInvoicesPerCustomerHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicesPerCustomerQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(
            `Processing invoices per customer report: customer=${query.customerId}, ${query.startDate} - ${query.endDate}`
        );

        try {
            const invoices = await this.invoiceDatabaseService.getInvoicesByCustomerAndDateRange(
                query.customerId,
                query.startDate,
                query.endDate,
                [
                    'invoiceId',
                    'docno',
                    'invoiceDate',
                    'customerId',
                    'customerName',
                    'salesTypeName',
                    'invoiceAmount',
                    'taxAmount',
                    'finalAmount',
                    'paymentStatus',
                    'status',
                    'contractSales',
                    'contractName',
                ]
            );

            this.logger.log(`Invoices per customer report: ${invoices.length} records found`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing invoices per customer report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
