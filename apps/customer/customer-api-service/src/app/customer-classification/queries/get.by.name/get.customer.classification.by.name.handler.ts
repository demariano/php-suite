import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerClassificationByNameQuery } from './get.customer.classification.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetCustomerClassificationByNameQuery)
export class GetCustomerClassificationByNameHandler implements IQueryHandler<GetCustomerClassificationByNameQuery> {
    private readonly logger = new Logger(GetCustomerClassificationByNameHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerClassificationByNameQuery): Promise<ResponseDto<CustomerClassificationDto[]>> {
        this.logger.log(`Processing get customer classifications by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch customer classifications by name
            const customerClassifications = await this.fetchCustomerClassificationsByName(query.name);

            this.logger.log(`Customer classifications retrieved successfully: ${customerClassifications.length} found`);
            return new ResponseDto<CustomerClassificationDto[]>(customerClassifications, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new BadRequestException(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches customer classifications by name
     */
    private async fetchCustomerClassificationsByName(name: string): Promise<CustomerClassificationDto[]> {
        const customerClassifications = await this.customerClassificationDatabaseService.findRecordContainingName(name);
        return customerClassifications || [];
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching customer classifications by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch customer classifications by name');
    }
}
