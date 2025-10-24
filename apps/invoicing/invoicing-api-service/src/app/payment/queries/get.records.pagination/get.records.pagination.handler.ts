import { ErrorResponseDto, PageDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    protected readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<PaymentDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records pagination request`);

        try {
            const payments = await this.paymentDatabaseService.findRecordsByPagination(
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Payments retrieved successfully: ${payments.data.length} records`);
            return new ResponseDto<PageDto<PaymentDto>>(payments, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing get records pagination request:`, error);

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
