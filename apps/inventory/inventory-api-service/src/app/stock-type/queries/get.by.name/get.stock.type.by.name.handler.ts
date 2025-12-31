import { PageDto, ResponseDto, StockTypeDto } from '@dto';
import { StockTypeDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockTypeByNameQuery } from './get.stock.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetStockTypeByNameQuery)
export class GetStockTypeByNameHandler implements IQueryHandler<GetStockTypeByNameQuery> {
    private readonly logger = new Logger(GetStockTypeByNameHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockTypeByNameQuery): Promise<ResponseDto<PageDto<StockTypeDto>>> {
        this.logger.log(`Processing get stock types by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch stock types by name
            const stockTypes = await this.fetchStockTypesByName(
                query.name,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Stock types retrieved successfully: ${stockTypes.data.length} found`);
            return new ResponseDto<PageDto<StockTypeDto>>(stockTypes, HTTP_STATUS_OK);
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
     * Fetches stock types by name
     */
    private async fetchStockTypesByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockTypeDto>> {
        const stockTypes = await this.stockTypeDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            name
        );

        if (!stockTypes || stockTypes.data.length === 0) {
            return new PageDto<StockTypeDto>([], null, null);
        }

        return stockTypes;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching stock types by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch stock types by name');
    }
}
