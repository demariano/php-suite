import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PageDto, ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { GetRecordsByFilterPaginationQuery } from './get.records.by.filter.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const VALID_DIRECTIONS = ['next', 'prev'];
const DEFAULT_REVERSE = false;

@QueryHandler(GetRecordsByFilterPaginationQuery)
export class GetRecordsByFilterPaginationHandler implements IQueryHandler<GetRecordsByFilterPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByFilterPaginationHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByFilterPaginationQuery): Promise<ResponseDto<PageDto<StockDto>>> {
        this.logger.log(
            `Processing get stocks by filter pagination request - Limit: ${query.limit}, Direction: ${query.direction}`
        );

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated stocks by filter
            const pageResult = await this.fetchStocksByFilter(query);

            this.logger.log(`Stocks by filter pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<StockDto>>(pageResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetRecordsByFilterPaginationQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        // Validate direction
        if (query.direction && !VALID_DIRECTIONS.includes(query.direction)) {
            throw new BadRequestException(`Direction must be one of: ${VALID_DIRECTIONS.join(', ')}`);
        }

        // Set default reverse value if null
        if (query.stockFilterDto.reverse == null) {
            query.stockFilterDto.reverse = DEFAULT_REVERSE;
        }
    }

    /**
     * Fetches stocks with filter and pagination
     */
    private async fetchStocksByFilter(query: GetRecordsByFilterPaginationQuery): Promise<PageDto<StockDto>> {
        return await this.stockDatabaseService.findStockRecordsByFilterPagination(
            query.stockFilterDto,
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching stocks by filter pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch stocks by filter pagination');
    }
}
