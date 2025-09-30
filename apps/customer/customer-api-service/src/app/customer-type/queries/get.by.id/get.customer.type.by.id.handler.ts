import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerTypeByIdQuery } from './get.customer.type.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerTypeByIdQuery)
export class GetCustomerTypeByIdHandler implements IQueryHandler<GetCustomerTypeByIdQuery> {
    private readonly logger = new Logger(GetCustomerTypeByIdHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerTypeByIdQuery): Promise<ResponseDto<CustomerTypeDto>> {
        this.logger.log(`Processing get customer type request for ID: ${query.recordId}`);

        try {
            // Fetch and validate customer type record
            const customerTypeRecord = await this.fetchCustomerTypeById(query.recordId);

            this.logger.log(`Customer type retrieved successfully: ${query.recordId}`);
            return new ResponseDto<CustomerTypeDto>(customerTypeRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a customer type record by ID
     */
    private async fetchCustomerTypeById(recordId: string): Promise<CustomerTypeDto> {
        const customerTypeRecord = await this.customerTypeDatabaseService.findRecordById(recordId);

        if (!customerTypeRecord) {
            this.logger.warn(`Customer type not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer type not found for ID: ${recordId}`);
        }

        return customerTypeRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching customer type by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Customer type not found for ID: ${recordId}`);
    }
}
