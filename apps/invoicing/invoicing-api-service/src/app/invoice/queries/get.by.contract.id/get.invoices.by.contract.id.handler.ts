import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInvoicesByContractIdQuery } from './get.invoices.by.contract.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetInvoicesByContractIdQuery)
export class GetInvoicesByContractIdHandler implements IQueryHandler<GetInvoicesByContractIdQuery> {
    protected readonly logger = new Logger(GetInvoicesByContractIdHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetInvoicesByContractIdQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing get by contract id request for contract: ${query.contractId}`);

        try {
            const invoices = await this.invoiceDatabaseService.findRecordsByContractId(query.contractId);

            if (!invoices || invoices.length === 0) {
                this.logger.log(`No invoices found for contract: ${query.contractId}`);
                return new ResponseDto<InvoiceDto[]>([], HTTP_STATUS_OK);
            }

            this.logger.log(`Retrieved ${invoices.length} invoices for contract: ${query.contractId}`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.contractId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, contractId: string): never {
        this.logger.error(`Error processing get by contract id request for ${contractId}:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    /**
     * Safely extract error message from error object
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return 'An unexpected error occurred while retrieving invoices by contract ID';
    }
}
