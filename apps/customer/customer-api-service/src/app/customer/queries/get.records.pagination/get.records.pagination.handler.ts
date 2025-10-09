import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerRecordsPaginationQuery)
export class GetCustomerRecordsPaginationHandler implements IQueryHandler<GetCustomerRecordsPaginationQuery> {
    private readonly logger = new Logger(GetCustomerRecordsPaginationHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerRecordsPaginationQuery): Promise<ResponseDto<any>> {
        this.logger.log(`Processing get customers pagination request`);

        try {
            // Fetch customers with pagination
            const paginatedResult = await this.fetchCustomersWithPagination(query);

            this.logger.log(`Customers pagination retrieved successfully`);
            return new ResponseDto<any>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches customers with pagination
     */
    private async fetchCustomersWithPagination(query: GetCustomerRecordsPaginationQuery): Promise<any> {
        const paginatedResult = await this.customerDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching customers pagination:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers pagination');
    }
}
