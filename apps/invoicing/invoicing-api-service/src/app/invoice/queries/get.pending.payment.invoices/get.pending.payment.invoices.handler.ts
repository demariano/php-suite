import { ErrorResponseDto, InvoiceDto, ResponseDto } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPendingPaymentInvoicesQuery } from './get.pending.payment.invoices.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPendingPaymentInvoicesQuery)
export class GetPendingPaymentInvoicesHandler implements IQueryHandler<GetPendingPaymentInvoicesQuery> {
    protected readonly logger = new Logger(GetPendingPaymentInvoicesHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(query: GetPendingPaymentInvoicesQuery): Promise<ResponseDto<InvoiceDto[] | ErrorResponseDto>> {
        this.logger.log(
            `Processing pending payment invoices request for customer: ${query.customerId}, status: ${query.status}`
        );

        try {
            const invoices = await this.invoiceDatabaseService.findPendingPaymentInvoices(
                query.customerId,
                query.status
            );

            if (!invoices || invoices.length === 0) {
                this.logger.warn(
                    `No pending payment invoices found for customer: ${query.customerId}, status: ${query.status}`
                );
                throw new NotFoundException(
                    `No pending payment invoices found for customer ${query.customerId} with status ${query.status}`
                );
            }

            this.logger.log(`Found ${invoices.length} pending payment invoices for customer: ${query.customerId}`);
            return new ResponseDto<InvoiceDto[]>(invoices, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerId, query.status);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string, status: string): never {
        this.logger.error(
            `Error processing pending payment invoices request for customer ${customerId}, status ${status}:`,
            error
        );

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

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
