import { ProductDealDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { GetProductDealByIdQuery } from './get.product.deal.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductDealByIdQuery)
export class GetProductDealByIdHandler implements IQueryHandler<GetProductDealByIdQuery> {
    private readonly logger = new Logger(GetProductDealByIdHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductDealByIdQuery): Promise<ResponseDto<ProductDealDto>> {
        this.logger.log(`Processing get product deal request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product deal record
            const productDealRecord = await this.fetchProductDealById(query.recordId);

            this.logger.log(`Product deal retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductDealDto>(productDealRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product deal record by ID
     */
    private async fetchProductDealById(recordId: string): Promise<ProductDealDto> {
        const productDealRecord = await this.productDealDatabaseService.findRecordById(recordId);

        if (!productDealRecord) {
            this.logger.warn(`Product deal not found for ID: ${recordId}`);
            throw new NotFoundException(`Product deal not found for ID: ${recordId}`);
        }

        return productDealRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product deal by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product deal not found for ID: ${recordId}`);
    }
}
