import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOutstandingPaymentsReportQuery } from './get.outstanding.payments.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetOutstandingPaymentsReportQuery)
export class GetOutstandingPaymentsReportHandler implements IQueryHandler<GetOutstandingPaymentsReportQuery> {
    protected readonly logger = new Logger(GetOutstandingPaymentsReportHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetOutstandingPaymentsReportQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing outstanding payments report: ${query.startDate} - ${query.endDate}`);

        try {
            const invoices = await this.invoiceDatabaseService.getPendingPaymentInvoices(
                query.startDate,
                query.endDate
            );

            this.logger.log(`Outstanding payments report: ${invoices.length} records found`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing outstanding payments report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
