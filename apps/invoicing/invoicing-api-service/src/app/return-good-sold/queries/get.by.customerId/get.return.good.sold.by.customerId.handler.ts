import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldByCustomerIdQuery } from './get.return.good.sold.by.customerId.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldByCustomerIdQuery)
export class GetReturnGoodSoldByCustomerIdHandler implements IQueryHandler<GetReturnGoodSoldByCustomerIdQuery> {
    protected readonly logger = new Logger(GetReturnGoodSoldByCustomerIdHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldByCustomerIdQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by customer id request for return good sold: ${query.customerId}`);

        try {
            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordsByCustomerId(
                query.limit,
                query.customerId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Return Good Sold records retrieved successfully for customer: ${query.customerId}`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing get by customer id request for ${customerId}:`, error);

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
