import { ErrorResponseDto, PageDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentsContainingReceiptNoQuery } from './get.payments.containing.receiptNo.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentsContainingReceiptNoQuery)
export class GetPaymentsContainingReceiptNoHandler implements IQueryHandler<GetPaymentsContainingReceiptNoQuery> {
    protected readonly logger = new Logger(GetPaymentsContainingReceiptNoHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetPaymentsContainingReceiptNoQuery
    ): Promise<ResponseDto<PageDto<PaymentDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get payments containing receipt number request for: ${query.receiptNo}`);

        try {
            const payments = await this.paymentDatabaseService.findRecordContainingReceiptNo(
                query.limit,
                query.receiptNo,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Payments retrieved successfully: ${payments.data.length} records`);
            return new ResponseDto<PageDto<PaymentDto>>(payments, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.receiptNo);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNo: string): never {
        this.logger.error(`Error processing get payments containing receipt number request for ${receiptNo}:`, error);

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
