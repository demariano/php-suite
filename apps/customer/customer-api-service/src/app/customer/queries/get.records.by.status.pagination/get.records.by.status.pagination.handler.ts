import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<any>> {
        this.logger.log(`Processing get customers by status pagination request`);

        try {
            // Fetch customers with status pagination
            const paginatedResult = await this.fetchCustomersByStatusPagination(query);

            this.logger.log(`Customers by status pagination retrieved successfully`);
            return new ResponseDto<any>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches customers with status pagination
     */
    private async fetchCustomersByStatusPagination(query: GetRecordsByStatusPaginationQuery): Promise<any> {
        const paginatedResult = await this.customerDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching customers by status pagination:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers by status pagination');
    }
}
