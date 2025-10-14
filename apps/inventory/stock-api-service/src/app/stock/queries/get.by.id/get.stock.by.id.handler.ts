import { ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockByIdQuery } from './get.stock.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockByIdQuery)
export class GetStockByIdHandler implements IQueryHandler<GetStockByIdQuery> {
    private readonly logger = new Logger(GetStockByIdHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockByIdQuery): Promise<ResponseDto<StockDto>> {
        this.logger.log(`Processing get stock request for ID: ${query.recordId}`);

        try {
            // Fetch and validate stock record
            const stockRecord = await this.fetchStockById(query.recordId);

            this.logger.log(`Stock retrieved successfully: ${query.recordId}`);
            return new ResponseDto<StockDto>(stockRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a stock record by ID
     */
    private async fetchStockById(recordId: string): Promise<StockDto> {
        const stockRecord = await this.stockDatabaseService.findRecordById(recordId);

        if (!stockRecord) {
            this.logger.warn(`Stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock not found for ID: ${recordId}`);
        }

        return stockRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching stock by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Stock not found for ID: ${recordId}`);
    }
}
