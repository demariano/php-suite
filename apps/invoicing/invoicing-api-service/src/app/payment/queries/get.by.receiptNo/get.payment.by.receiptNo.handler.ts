import { ErrorResponseDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentByReceiptNoQuery } from './get.payment.by.receiptNo.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentByReceiptNoQuery)
export class GetPaymentByReceiptNoHandler implements IQueryHandler<GetPaymentByReceiptNoQuery> {
    protected readonly logger = new Logger(GetPaymentByReceiptNoHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentByReceiptNoQuery): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by receipt number request for payment: ${query.receiptNo}`);

        try {
            const payment = await this.paymentDatabaseService.findRecordByReceiptNo(query.receiptNo);

            if (!payment) {
                this.logger.warn(`Payment not found: ${query.receiptNo}`);
                throw new NotFoundException(`Payment record not found for receipt number ${query.receiptNo}`);
            }

            this.logger.log(`Payment retrieved successfully: ${payment.paymentId}`);
            return new ResponseDto<PaymentDto>(payment, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.receiptNo);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNo: string): never {
        this.logger.error(`Error processing get by receipt number request for ${receiptNo}:`, error);

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
