import { ErrorResponseDto, PageDto, ResponseDto, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByFilterPaginationQuery } from './get.records.by.filter.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByFilterPaginationQuery)
export class GetRecordsByFilterPaginationHandler implements IQueryHandler<GetRecordsByFilterPaginationQuery> {
    protected readonly logger = new Logger(GetRecordsByFilterPaginationHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRecordsByFilterPaginationQuery
    ): Promise<ResponseDto<PageDto<StockDeliveryDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records by filter pagination request`);

        try {
            const stockDeliveries = await this.stockDeliveryDatabaseService.findStockDeliveryRecordsByFilterPagination(
                query.filter,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Stock deliveries retrieved successfully: ${stockDeliveries.data.length} records`);
            return new ResponseDto<PageDto<StockDeliveryDto>>(stockDeliveries, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing get records by filter pagination request:`, error);

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
