import { PageDto, ResponseDto } from '@dto';
import { StockTypeDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockTypeByNameQuery } from './get.stock.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockTypeByNameQuery)
export class GetStockTypeByNameHandler implements IQueryHandler<GetStockTypeByNameQuery> {
    private readonly logger = new Logger(GetStockTypeByNameHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockTypeByNameQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get stock type by name request for: ${query.name}`);

        try {
            // Fetch stock types by name with pagination
            const stockTypePage = await this.fetchStockTypesByName(query);

            this.logger.log(`Stock types retrieved successfully for name: ${query.name}`);
            return new ResponseDto<PageDto<any>>(stockTypePage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Fetches stock types by name with pagination
     */
    private async fetchStockTypesByName(query: GetStockTypeByNameQuery): Promise<PageDto<any>> {
        return await this.stockTypeDatabaseService.findRecordContainingName(
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
        this.logger.error(`Error fetching stock types by name ${name}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch stock types by name: ${name}`);
    }
}
