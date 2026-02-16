import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicePaymentStatusReportQuery } from './get.invoice.payment.status.report.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicePaymentStatusReportQuery)
export class GetInvoicePaymentStatusReportHandler implements IQueryHandler<GetInvoicePaymentStatusReportQuery> {
    protected readonly logger = new Logger(GetInvoicePaymentStatusReportHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicePaymentStatusReportQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing invoice payment status report: ${query.startDate} - ${query.endDate}`);

        try {
            const fields = [
                'invoiceId',
                'docno',
                'invoiceDate',
                'customerId',
                'customerName',
                'invoiceAmount',
                'finalAmount',
                'paymentStatus',
                'status',
            ];

            let invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(
                query.startDate,
                query.endDate,
                fields
            );

            // Filter by paymentStatus if provided
            if (query.paymentStatus) {
                invoices = invoices.filter((inv) => inv.paymentStatus === query.paymentStatus);
            }

            this.logger.log(`Invoice payment status report: ${invoices.length} records found`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing invoice payment status report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
