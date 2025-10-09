import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerByIdQuery } from './get.customer.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerByIdQuery)
export class GetCustomerByIdHandler implements IQueryHandler<GetCustomerByIdQuery> {
    private readonly logger = new Logger(GetCustomerByIdHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerByIdQuery): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing get customer request for ID: ${query.recordId}`);

        try {
            // Fetch and validate customer record
            const customerRecord = await this.fetchCustomerById(query.recordId);

            this.logger.log(`Customer retrieved successfully: ${query.recordId}`);
            return new ResponseDto<CustomerDto>(customerRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a customer record by ID
     */
    private async fetchCustomerById(recordId: string): Promise<CustomerDto> {
        const customerRecord = await this.customerDatabaseService.findRecordById(recordId);

        if (!customerRecord) {
            this.logger.warn(`Customer not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer not found for ID: ${recordId}`);
        }

        return customerRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching customer by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Customer not found for ID: ${recordId}`);
    }
}
