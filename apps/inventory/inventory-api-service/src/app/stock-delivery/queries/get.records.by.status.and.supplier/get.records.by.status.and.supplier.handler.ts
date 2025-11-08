import { ErrorResponseDto, ResponseDto, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusAndSupplierQuery } from './get.records.by.status.and.supplier.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusAndSupplierQuery)
export class GetRecordsByStatusAndSupplierHandler implements IQueryHandler<GetRecordsByStatusAndSupplierQuery> {
    protected readonly logger = new Logger(GetRecordsByStatusAndSupplierHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRecordsByStatusAndSupplierQuery
    ): Promise<ResponseDto<StockDeliveryDto[] | ErrorResponseDto>> {
        this.logger.log(
            `Processing get records by status and supplier request for supplier: ${query.supplierId}, status: ${query.status}`
        );

        try {
            const stockDeliveries =
                await this.stockDeliveryDatabaseService.findStockDeliveryRecordsByStatusAndSupplierId(
                    query.status,
                    query.supplierId
                );

            if (!stockDeliveries || stockDeliveries.length === 0) {
                this.logger.warn(
                    `No stock deliveries found for supplier ${query.supplierId} with status ${query.status}`
                );
                throw new NotFoundException(
                    `No stock deliveries found for supplier ${query.supplierId} with status ${query.status}`
                );
            }

            this.logger.log(`Stock deliveries retrieved successfully: ${stockDeliveries.length} records`);
            return new ResponseDto<StockDeliveryDto[]>(stockDeliveries, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.supplierId, query.status);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, supplierId: string, status: string): never {
        this.logger.error(`Error processing get records by status and supplier request for ${supplierId}:`, error);

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
