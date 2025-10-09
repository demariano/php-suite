import { PageDto, ResponseDto } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get sales types by status pagination request for status: ${query.status}`);

        try {
            // Fetch sales types by status with pagination
            const salesTypePage = await this.fetchSalesTypesByStatusPagination(query);

            this.logger.log(`Sales types retrieved successfully by status: ${query.status}`);
            return new ResponseDto<PageDto<any>>(salesTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.status);
        }
    }

    /**
     * Fetches sales types by status with pagination
     */
    private async fetchSalesTypesByStatusPagination(query: GetRecordsByStatusPaginationQuery): Promise<PageDto<any>> {
        return await this.salesTypeDatabaseService.findRecordsByStatusPagination(
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
        this.logger.error(`Error fetching sales types by status ${status}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch sales types by status: ${status}`);
    }
}
