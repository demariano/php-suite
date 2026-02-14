import { PaymentInvoiceDetailsDto, ResponseDto } from '@dto';
import {
    PaymentDatabaseServiceAbstractClass,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentInvoicesByInvoiceIdQuery } from './get.payment.invoices.by.invoiceId.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentInvoicesByInvoiceIdQuery)
export class GetPaymentInvoicesByInvoiceIdHandler implements IQueryHandler<GetPaymentInvoicesByInvoiceIdQuery> {
    protected readonly logger = new Logger(GetPaymentInvoicesByInvoiceIdHandler.name);

    constructor(
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,

        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentInvoicesByInvoiceIdQuery): Promise<ResponseDto<PaymentInvoiceDetailsDto[]>> {
        this.logger.log(`Processing get payment invoices by invoice ID: ${query.invoiceId}`);

        try {
            const paymentInvoices = await this.paymentInvoiceDatabaseService.findRecordByInvoiceId(query.invoiceId);

            // Enrich each record with receiptNo and paymentDate from the Payment table
            for (const record of paymentInvoices) {
                if (record.paymentId) {
                    try {
                        const payment = await this.paymentDatabaseService.findRecordById(record.paymentId);
                        if (payment) {
                            record.receiptNo = payment.receiptNo;
                            record.paymentDate = payment.paymentDate;
                        }
                    } catch (err) {
                        this.logger.warn(`Could not fetch payment ${record.paymentId} for enrichment: ${err}`);
                    }
                }
            }

            this.logger.log(`Found ${paymentInvoices.length} payment invoice records for invoice ${query.invoiceId}`);

            return new ResponseDto<PaymentInvoiceDetailsDto[]>(paymentInvoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error fetching payment invoices for invoice ${query.invoiceId}:`, error);

            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
