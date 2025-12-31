import { PageDto, ResponseDto } from '@dto';
import { StockTypeDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get stock types pagination request`);

        try {
            // Fetch stock types with pagination
            const stockTypePage = await this.fetchStockTypesPagination(query);

            this.logger.log(`Stock types retrieved successfully with pagination`);
            return new ResponseDto<PageDto<any>>(stockTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches stock types with pagination
     */
    private async fetchStockTypesPagination(query: GetRecordsPaginationQuery): Promise<PageDto<any>> {
        return await this.stockTypeDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching stock types with pagination:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error('Failed to fetch stock types with pagination');
    }
}
