import { PageDto, ResponseDto } from '@dto';
import { StockTypeDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get stock types by status pagination request for status: ${query.status}`);

        try {
            // Fetch stock types by status with pagination
            const stockTypePage = await this.fetchStockTypesByStatusPagination(query);

            this.logger.log(`Stock types retrieved successfully by status: ${query.status}`);
            return new ResponseDto<PageDto<any>>(stockTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.status);
        }
    }

    /**
     * Fetches stock types by status with pagination
     */
    private async fetchStockTypesByStatusPagination(query: GetRecordsByStatusPaginationQuery): Promise<PageDto<any>> {
        return await this.stockTypeDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, status: string): never {
        this.logger.error(`Error fetching stock types by status ${status}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch stock types by status: ${status}`);
    }
}
