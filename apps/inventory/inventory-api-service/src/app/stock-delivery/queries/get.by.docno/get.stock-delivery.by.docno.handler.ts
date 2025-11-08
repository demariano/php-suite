import { ErrorResponseDto, ResponseDto, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockDeliveryByDocnoQuery } from './get.stock-delivery.by.docno.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockDeliveryByDocnoQuery)
export class GetStockDeliveryByDocnoHandler implements IQueryHandler<GetStockDeliveryByDocnoQuery> {
    protected readonly logger = new Logger(GetStockDeliveryByDocnoHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockDeliveryByDocnoQuery): Promise<ResponseDto<StockDeliveryDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing get by docno request for stock delivery: ${query.docno}`);

        try {
            const stockDeliveries = await this.stockDeliveryDatabaseService.findRecordContainingDocno(query.docno);

            if (!stockDeliveries || stockDeliveries.length === 0) {
                this.logger.warn(`No stock deliveries found for docno: ${query.docno}`);
                return new ResponseDto<StockDeliveryDto[]>([], HTTP_STATUS_OK);
            }

            this.logger.log(`Stock deliveries retrieved successfully: ${stockDeliveries.length} records`);
            return new ResponseDto<StockDeliveryDto[]>(stockDeliveries, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.docno);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, docno: string): never {
        this.logger.error(`Error processing get by docno request for ${docno}:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
