import { PageDto, ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockByNameQuery } from './get.stock.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetStockByNameQuery)
export class GetStockByNameHandler implements IQueryHandler<GetStockByNameQuery> {
    private readonly logger = new Logger(GetStockByNameHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockByNameQuery): Promise<ResponseDto<PageDto<StockDto>>> {
        this.logger.log(`Processing get stocks by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch stocks by name with pagination
            const paginatedResult = await this.fetchStocksByName(query);

            this.logger.log(`Stocks retrieved successfully: ${paginatedResult.data.length} found`);
            return new ResponseDto<PageDto<StockDto>>(paginatedResult, HTTP_STATUS_OK);
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
     * Fetches stocks by name with pagination support
     */
    private async fetchStocksByName(query: GetStockByNameQuery): Promise<PageDto<StockDto>> {
        const limit = query.limit || 10;
        const direction = query.direction || undefined;
        const cursorPointer = query.cursorPointer || undefined;
        const name = query.name || '';

        const paginatedResult = await this.stockDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            name
        );

        return paginatedResult;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching stocks by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch stocks by name');
    }
}
