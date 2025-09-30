import { ProductDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { GetProductByIdQuery } from './get.product.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
    private readonly logger = new Logger(GetProductByIdHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductByIdQuery): Promise<ResponseDto<ProductDto>> {
        this.logger.log(`Processing get product request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product record
            const productRecord = await this.fetchProductById(query.recordId);

            this.logger.log(`Product retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductDto>(productRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product record by ID
     */
    private async fetchProductById(recordId: string): Promise<ProductDto> {
        const productRecord = await this.productDatabaseService.findProductRecordById(recordId);

        if (!productRecord) {
            this.logger.warn(`Product not found for ID: ${recordId}`);
            throw new NotFoundException(`Product not found for ID: ${recordId}`);
        }

        return productRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product not found for ID: ${recordId}`);
    }
}
