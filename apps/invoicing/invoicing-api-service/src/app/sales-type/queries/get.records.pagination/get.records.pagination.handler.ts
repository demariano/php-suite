import { PageDto, ResponseDto } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get sales types pagination request`);

        try {
            // Fetch sales types with pagination
            const salesTypePage = await this.fetchSalesTypesPagination(query);

            this.logger.log(`Sales types retrieved successfully with pagination`);
            return new ResponseDto<PageDto<any>>(salesTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches sales types with pagination
     */
    private async fetchSalesTypesPagination(query: GetRecordsPaginationQuery): Promise<PageDto<any>> {
        return await this.salesTypeDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching sales types with pagination:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error('Failed to fetch sales types with pagination');
    }
}
