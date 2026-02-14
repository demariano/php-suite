import { ErrorResponseDto, InvoiceDto, PageDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicesByCustomerIdQuery } from './get.invoices.by.customer.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesByCustomerIdQuery)
export class GetInvoicesByCustomerIdHandler implements IQueryHandler<GetInvoicesByCustomerIdQuery> {
    protected readonly logger = new Logger(GetInvoicesByCustomerIdHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicesByCustomerIdQuery): Promise<ResponseDto<PageDto<InvoiceDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get invoices by customer ID: ${query.customerId}`);

        try {
            const invoices = await this.invoiceDatabaseService.findRecordsByCustomerIdPagination(
                query.limit,
                query.customerId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Retrieved ${invoices.data.length} invoices for customer: ${query.customerId}`);
            return new ResponseDto<PageDto<InvoiceDto>>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerId);
        }
    }

    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing get invoices by customer ID ${customerId}:`, error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return 'An unexpected error occurred while retrieving invoices by customer ID';
    }
}
