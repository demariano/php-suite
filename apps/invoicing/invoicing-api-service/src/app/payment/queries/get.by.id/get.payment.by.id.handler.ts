import { ErrorResponseDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentByIdQuery } from './get.payment.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentByIdQuery)
export class GetPaymentByIdHandler implements IQueryHandler<GetPaymentByIdQuery> {
    protected readonly logger = new Logger(GetPaymentByIdHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentByIdQuery): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for payment: ${query.recordId}`);

        try {
            const payment = await this.paymentDatabaseService.findRecordById(query.recordId);

            if (!payment) {
                this.logger.warn(`Payment not found: ${query.recordId}`);
                throw new NotFoundException(`Payment record not found for id ${query.recordId}`);
            }

            this.logger.log(`Payment retrieved successfully: ${payment.paymentId}`);
            return new ResponseDto<PaymentDto>(payment, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing get by id request for ${recordId}:`, error);

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
