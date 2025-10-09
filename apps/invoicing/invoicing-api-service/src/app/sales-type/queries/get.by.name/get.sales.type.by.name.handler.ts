import { PageDto, ResponseDto } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSalesTypeByNameQuery } from './get.sales.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetSalesTypeByNameQuery)
export class GetSalesTypeByNameHandler implements IQueryHandler<GetSalesTypeByNameQuery> {
    private readonly logger = new Logger(GetSalesTypeByNameHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetSalesTypeByNameQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get sales type by name request for: ${query.name}`);

        try {
            // Fetch sales types by name with pagination
            const salesTypePage = await this.fetchSalesTypesByName(query);

            this.logger.log(`Sales types retrieved successfully for name: ${query.name}`);
            return new ResponseDto<PageDto<any>>(salesTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Fetches sales types by name with pagination
     */
    private async fetchSalesTypesByName(query: GetSalesTypeByNameQuery): Promise<PageDto<any>> {
        return await this.salesTypeDatabaseService.findRecordContainingName(
            query.limit,
            query.name,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching sales types by name ${name}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch sales types by name: ${name}`);
    }
}
