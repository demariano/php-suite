import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerClassificationByIdQuery } from './get.customer.classification.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerClassificationByIdQuery)
export class GetCustomerClassificationByIdHandler implements IQueryHandler<GetCustomerClassificationByIdQuery> {
    private readonly logger = new Logger(GetCustomerClassificationByIdHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerClassificationByIdQuery): Promise<ResponseDto<CustomerClassificationDto>> {
        this.logger.log(`Processing get customer classification request for ID: ${query.recordId}`);

        try {
            // Fetch and validate customer classification record
            const customerClassificationRecord = await this.fetchCustomerClassificationById(query.recordId);

            this.logger.log(`Customer classification retrieved successfully: ${query.recordId}`);
            return new ResponseDto<CustomerClassificationDto>(customerClassificationRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a customer classification record by ID
     */
    private async fetchCustomerClassificationById(recordId: string): Promise<CustomerClassificationDto> {
        const customerClassificationRecord = await this.customerClassificationDatabaseService.findRecordById(recordId);

        if (!customerClassificationRecord) {
            this.logger.warn(`Customer classification not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer classification not found for ID: ${recordId}`);
        }

        return customerClassificationRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching customer classification by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Customer classification not found for ID: ${recordId}`);
    }
}
