import { ResponseDto, StockTypeDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { GetStockTypeByIdQuery } from './get.stock.type.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockTypeByIdQuery)
export class GetStockTypeByIdHandler implements IQueryHandler<GetStockTypeByIdQuery> {
    private readonly logger = new Logger(GetStockTypeByIdHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockTypeByIdQuery): Promise<ResponseDto<StockTypeDto>> {
        this.logger.log(`Processing get stock type request for ID: ${query.recordId}`);

        try {
            // Fetch and validate stock type record
            const stockTypeRecord = await this.fetchStockTypeById(query.recordId);

            this.logger.log(`Stock type retrieved successfully: ${query.recordId}`);
            return new ResponseDto<StockTypeDto>(stockTypeRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a stock type record by ID
     */
    private async fetchStockTypeById(recordId: string): Promise<StockTypeDto> {
        const stockTypeRecord = await this.stockTypeDatabaseService.findRecordById(recordId);

        if (!stockTypeRecord) {
            this.logger.warn(`Stock type not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock type not found for ID: ${recordId}`);
        }

        return stockTypeRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching stock type by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Stock type not found for ID: ${recordId}`);
    }
}
