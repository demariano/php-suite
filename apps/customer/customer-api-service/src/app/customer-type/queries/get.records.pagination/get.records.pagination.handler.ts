import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const VALID_DIRECTIONS = ['next', 'prev'];
const VALID_STATUSES = ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'];

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<CustomerTypeDto>>> {
        this.logger.log(
            `Processing get customer types pagination request - Status: ${query.status}, Limit: ${query.limit}`
        );

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated customer types
            const pageResult = await this.fetchCustomerTypesPagination(query);

            this.logger.log(`Customer types pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<CustomerTypeDto>>(pageResult, HTTP_STATUS_OK);
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

        // Validate status
        if (!query.status || !VALID_STATUSES.includes(query.status)) {
            throw new BadRequestException(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
    }

    /**
     * Fetches customer types with pagination
     */
    private async fetchCustomerTypesPagination(query: GetRecordsPaginationQuery): Promise<PageDto<CustomerTypeDto>> {
        return await this.customerTypeDatabaseService.findRecordsPagination(
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
        this.logger.error(`Error fetching customer types pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch customer types pagination');
    }
}
