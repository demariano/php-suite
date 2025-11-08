import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, PageDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerByNameQuery } from './get.customer.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerByNameQuery)
export class GetCustomerByNameHandler implements IQueryHandler<GetCustomerByNameQuery> {
    private readonly logger = new Logger(GetCustomerByNameHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerByNameQuery): Promise<ResponseDto<PageDto<CustomerDto>>> {
        this.logger.log(`Processing get customers by name request for: ${query.customerName}`);

        try {
            // Fetch customers by name with pagination
            const paginatedResult = await this.fetchCustomersByName(query);

            this.logger.log(`Customers retrieved successfully for name: ${query.customerName}`);
            return new ResponseDto<PageDto<CustomerDto>>(paginatedResult, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerName);
        }
    }

    /**
     * Fetches customers by name with pagination support
     */
    private async fetchCustomersByName(query: GetCustomerByNameQuery): Promise<PageDto<CustomerDto>> {
        const limit = query.limit || 10;
        const direction = query.direction || undefined;
        const cursorPointer = query.cursorPointer || undefined;
        const customerName = query.customerName || '';

        const paginatedResult = await this.customerDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            customerName
        );

        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerName: string): never {
        this.logger.error(`Error fetching customers by name ${customerName}:`, error);

        // Handle unknown errors
        throw new Error('An unexpected error occurred while fetching customers');
    }
}
