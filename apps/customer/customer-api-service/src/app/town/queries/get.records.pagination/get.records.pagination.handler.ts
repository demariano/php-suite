import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { PageDto, ResponseDto, TownDto } from '@dto';
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
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<TownDto>>> {
        this.logger.log(`Processing get towns pagination request `);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch paginated towns
            const pageResult = await this.fetchTownsPagination(query);

            this.logger.log(`Towns pagination retrieved successfully: ${pageResult.data.length} items`);
            return new ResponseDto<PageDto<TownDto>>(pageResult, HTTP_STATUS_OK);
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
     * Fetches towns with pagination
     */
    private async fetchTownsPagination(query: GetRecordsPaginationQuery): Promise<PageDto<TownDto>> {
        return await this.townDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching towns pagination:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch towns pagination');
    }
}
