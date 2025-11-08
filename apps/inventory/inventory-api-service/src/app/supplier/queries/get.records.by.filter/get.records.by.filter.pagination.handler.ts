import { PageDto, ResponseDto, SupplierDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
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
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByFilterPaginationQuery): Promise<ResponseDto<PageDto<SupplierDto>>> {
        this.logger.log(
            `Processing get suppliers by filter pagination request - Limit: ${query.limit}, Direction: ${query.direction}`
        );

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated suppliers by filter
            const pageResult = await this.fetchSuppliersByFilter(query);

            this.logger.log(`Suppliers by filter pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<SupplierDto>>(pageResult, HTTP_STATUS_OK);
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
        if (query.supplierFilterDto.reverse == null) {
            query.supplierFilterDto.reverse = DEFAULT_REVERSE;
        }
    }

    /**
     * Fetches suppliers with filter and pagination
     */
    private async fetchSuppliersByFilter(query: GetRecordsByFilterPaginationQuery): Promise<PageDto<SupplierDto>> {
        return await this.supplierDatabaseService.findSupplierRecordsByFilterPagination(
            query.supplierFilterDto,
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching suppliers by filter pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch suppliers by filter pagination');
    }
}
