import { ErrorResponseDto, InvoiceDto, PageDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoiceByDocnoQuery } from './get.invoice.by.docno.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoiceByDocnoQuery)
export class GetInvoiceByDocnoHandler implements IQueryHandler<GetInvoiceByDocnoQuery> {
    protected readonly logger = new Logger(GetInvoiceByDocnoHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoiceByDocnoQuery): Promise<ResponseDto<PageDto<InvoiceDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by docno request for invoice: ${query.docno}`);

        try {
            const invoices = await this.invoiceDatabaseService.findRecordContainingDocno(
                query.limit,
                query.docno,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Invoices retrieved successfully: ${invoices.data.length} records`);
            return new ResponseDto<PageDto<InvoiceDto>>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.docno);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, docno: string): never {
        this.logger.error(`Error processing get by docno request for ${docno}:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
