import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<AreaDto>>> {
        this.logger.log(`Processing get areas pagination request`);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated areas
            const pageResult = await this.fetchAreasPagination(query);

            this.logger.log(`Areas pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<AreaDto>>(pageResult, HTTP_STATUS_OK);
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
    }

    /**
     * Fetches areas with pagination
     */
    private async fetchAreasPagination(query: GetRecordsPaginationQuery): Promise<PageDto<AreaDto>> {
        return await this.areaDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching areas pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch areas pagination');
    }
}
