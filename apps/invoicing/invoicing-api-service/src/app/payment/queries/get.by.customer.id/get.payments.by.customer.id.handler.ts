import { ErrorResponseDto, PageDto, PaymentDto, ResponseDto } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaymentsByCustomerIdQuery } from './get.payments.by.customer.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetPaymentsByCustomerIdQuery)
export class GetPaymentsByCustomerIdHandler implements IQueryHandler<GetPaymentsByCustomerIdQuery> {
    protected readonly logger = new Logger(GetPaymentsByCustomerIdHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetPaymentsByCustomerIdQuery): Promise<ResponseDto<PageDto<PaymentDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get payments by customer ID: ${query.customerId}`);

        try {
            const payments = await this.paymentDatabaseService.findRecordByCustomerId(
                query.limit,
                query.customerId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Retrieved ${payments.data.length} payments for customer: ${query.customerId}`);
            return new ResponseDto<PageDto<PaymentDto>>(payments, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerId);
        }
    }

    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing get payments by customer ID ${customerId}:`, error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return 'An unexpected error occurred while retrieving payments by customer ID';
    }
}
