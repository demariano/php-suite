import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto } from '@dto';
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

    async execute(query: GetCustomerByNameQuery): Promise<ResponseDto<CustomerDto[]>> {
        this.logger.log(`Processing get customers by name request for: ${query.customerName}`);

        try {
            // Fetch customers by name
            const customerRecords = await this.fetchCustomersByName(query.customerName);

            this.logger.log(`Customers retrieved successfully for name: ${query.customerName}`);
            return new ResponseDto<CustomerDto[]>(customerRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerName);
        }
    }

    /**
     * Fetches customers by name
     */
    private async fetchCustomersByName(customerName: string): Promise<CustomerDto[]> {
        const customerRecords = await this.customerDatabaseService.findRecordContainingName(customerName);
        return customerRecords || [];
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerName: string): never {
        this.logger.error(`Error fetching customers by name ${customerName}:`, error);

        // Handle unknown errors by returning empty array
        throw new Error('An unexpected error occurred while fetching customers');
    }
}
