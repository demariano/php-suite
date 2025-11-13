import { ErrorResponseDto, PageDto, ResponseDto, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
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

    async execute(query: GetStockDeliveryByDocnoQuery): Promise<ResponseDto<PageDto<StockDeliveryDto>>> {
        this.logger.log(`Processing get stock deliveries by docno request: ${query.docno}`);

        try {
            // Validate docno parameter
            this.validateDocnoParameter(query.docno);

            // Fetch stock deliveries by docno
            const stockDeliveries = await this.fetchStockDeliveriesByDocno(
                query.docno,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Stock deliveries retrieved successfully: ${stockDeliveries.data.length} found`);
            return new ResponseDto<PageDto<StockDeliveryDto>>(stockDeliveries, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.docno);
        }
    }

    /**
     * Validates the docno parameter
     */
    private validateDocnoParameter(docno: string): void {
        if (!docno || docno.trim() === '') {
            throw new BadRequestException('Document number is required');
        }
    }

    /**
     * Fetches stock deliveries by docno using pagination
     */
    private async fetchStockDeliveriesByDocno(
        docno: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDeliveryDto>> {
        const stockDeliveries = await this.stockDeliveryDatabaseService.findRecordsByDocnoPagination(
            limit,
            direction,
            cursorPointer,
            docno
        );

        if (!stockDeliveries || stockDeliveries.data.length === 0) {
            return new PageDto<StockDeliveryDto>([], null, null);
        }

        return stockDeliveries;
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
