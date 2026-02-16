import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicesPerContractQuery } from './get.invoices.per.contract.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesPerContractQuery)
export class GetInvoicesPerContractHandler implements IQueryHandler<GetInvoicesPerContractQuery> {
    protected readonly logger = new Logger(GetInvoicesPerContractHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicesPerContractQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing invoices per contract report: ${query.startDate} - ${query.endDate}`);

        try {
            const fields = [
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
                'contractId',
                'contractName',
            ];

            let invoices = await this.invoiceDatabaseService.getInvoicesByDateRange(
                query.startDate,
                query.endDate,
                fields
            );

            // Filter to contract sales only
            invoices = invoices.filter((inv) => inv.contractSales === true);

            // Filter by specific contractId if provided
            if (query.contractId) {
                invoices = invoices.filter((inv) => inv.contractId === query.contractId);
            }

            this.logger.log(`Invoices per contract report: ${invoices.length} records found`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing invoices per contract report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
