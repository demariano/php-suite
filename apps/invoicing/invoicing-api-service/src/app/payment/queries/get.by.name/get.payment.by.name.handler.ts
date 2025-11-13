import { PageDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentByNameQuery } from './get.payment.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentByNameQuery)
export class GetPaymentByNameHandler implements IQueryHandler<GetPaymentByNameQuery> {
    private readonly logger = new Logger(GetPaymentByNameHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentByNameQuery): Promise<ResponseDto<PageDto<PaymentDto>>> {
        this.logger.log(`Processing get payments by receipt number request for: ${query.receiptNo}`);

        try {
            // Fetch payments by receipt number with pagination
            const paginatedResult = await this.fetchPaymentsByName(query);

            this.logger.log(`Payments retrieved successfully for receipt number: ${query.receiptNo}`);
            return new ResponseDto<PageDto<PaymentDto>>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.receiptNo);
        }
    }

    /**
     * Fetches payments by receipt number with pagination support
     */
    private async fetchPaymentsByName(query: GetPaymentByNameQuery): Promise<PageDto<PaymentDto>> {
        const limit = query.limit || 10;
        const direction = query.direction || undefined;
        const cursorPointer = query.cursorPointer || undefined;
        const receiptNo = query.receiptNo || '';

        const paginatedResult = await this.paymentDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            receiptNo
        );

        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNo: string): never {
        this.logger.error(`Error fetching payments by receipt number ${receiptNo}:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching payments');
    }
}

