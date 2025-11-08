import { ErrorResponseDto, ResponseDto, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockDeliveryByIdQuery } from './get.stock-delivery.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockDeliveryByIdQuery)
export class GetStockDeliveryByIdHandler implements IQueryHandler<GetStockDeliveryByIdQuery> {
    protected readonly logger = new Logger(GetStockDeliveryByIdHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockDeliveryByIdQuery): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for stock delivery: ${query.recordId}`);

        try {
            const stockDelivery = await this.stockDeliveryDatabaseService.findRecordById(query.recordId);

            if (!stockDelivery) {
                this.logger.warn(`Stock delivery not found: ${query.recordId}`);
                throw new NotFoundException(`Stock delivery record not found for id ${query.recordId}`);
            }

            this.logger.log(`Stock delivery retrieved successfully: ${stockDelivery.stockDeliveryId}`);
            return new ResponseDto<StockDeliveryDto>(stockDelivery, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing get by id request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

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
