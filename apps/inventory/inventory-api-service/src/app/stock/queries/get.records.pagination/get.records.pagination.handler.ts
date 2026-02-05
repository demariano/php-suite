import { PageDto, ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const VALID_DIRECTIONS = ['next', 'prev'];
const VALID_STATUSES = [
    'ACTIVE',
    'INACTIVE',
    'FOR_APPROVAL',
    'FOR_DELETION',
    'FOR_DEACTIVATION',
    'NEW_RECORD',
    'DRAFT',
];

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<StockDto>>> {
        this.logger.log(`Processing get stocks pagination request - Status: ${query.status}, Limit: ${query.limit}`);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated stocks
            const pageResult = await this.fetchStocksPagination(query);

            this.logger.log(`Stocks pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<StockDto>>(pageResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetRecordsPaginationQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        // Validate direction
        if (query.direction && !VALID_DIRECTIONS.includes(query.direction)) {
            throw new BadRequestException(`Direction must be one of: ${VALID_DIRECTIONS.join(', ')}`);
        }

        // Validate status only if provided (allow null/undefined to fetch all records)
        if (query.status && !VALID_STATUSES.includes(query.status)) {
            throw new BadRequestException(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
    }

    /**
     * Fetches stocks with pagination
     */
    private async fetchStocksPagination(query: GetRecordsPaginationQuery): Promise<PageDto<StockDto>> {
        return await this.stockDatabaseService.findRecordsPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching stocks pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch stocks pagination');
    }
}
