import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerTypeByNameQuery } from './get.customer.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetCustomerTypeByNameQuery)
export class GetCustomerTypeByNameHandler implements IQueryHandler<GetCustomerTypeByNameQuery> {
    private readonly logger = new Logger(GetCustomerTypeByNameHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerTypeByNameQuery): Promise<ResponseDto<PageDto<CustomerTypeDto>>> {
        this.logger.log(`Processing get customer types by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch customer types by name
            const customerTypes = await this.fetchCustomerTypesByName(
                query.name,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Customer types retrieved successfully: ${customerTypes.data.length} found`);
            return new ResponseDto<PageDto<CustomerTypeDto>>(customerTypes, HTTP_STATUS_OK);
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
     * Fetches customer types by name
     */
    private async fetchCustomerTypesByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerTypeDto>> {
        const customerTypes = await this.customerTypeDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            name
        );

        if (!customerTypes || customerTypes.data.length === 0) {
            return new PageDto<CustomerTypeDto>([], null, null);
        }

        return customerTypes;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching customer types by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch customer types by name');
    }
}
