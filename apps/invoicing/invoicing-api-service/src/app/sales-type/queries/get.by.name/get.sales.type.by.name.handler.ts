import { PageDto, ResponseDto, SalesTypeDto } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSalesTypeByNameQuery } from './get.sales.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetSalesTypeByNameQuery)
export class GetSalesTypeByNameHandler implements IQueryHandler<GetSalesTypeByNameQuery> {
    private readonly logger = new Logger(GetSalesTypeByNameHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetSalesTypeByNameQuery): Promise<ResponseDto<PageDto<SalesTypeDto>>> {
        this.logger.log(`Processing get sales types by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch sales types by name
            const salesTypes = await this.fetchSalesTypesByName(
                query.name,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Sales types retrieved successfully: ${salesTypes.data.length} found`);
            return new ResponseDto<PageDto<SalesTypeDto>>(salesTypes, HTTP_STATUS_OK);
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
     * Fetches sales types by name
     */
    private async fetchSalesTypesByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SalesTypeDto>> {
        const salesTypes = await this.salesTypeDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            name
        );

        if (!salesTypes || salesTypes.data.length === 0) {
            return new PageDto<SalesTypeDto>([], null, null);
        }

        return salesTypes;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching sales types by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch sales types by name');
    }
}
