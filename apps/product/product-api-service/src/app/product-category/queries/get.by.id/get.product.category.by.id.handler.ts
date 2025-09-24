import { ProductCategoryDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { GetProductCategoryByIdQuery } from './get.product.category.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductCategoryByIdQuery)
export class GetProductCategoryByIdHandler implements IQueryHandler<GetProductCategoryByIdQuery> {
    private readonly logger = new Logger(GetProductCategoryByIdHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductCategoryByIdQuery): Promise<ResponseDto<ProductCategoryDto>> {
        this.logger.log(`Processing get product category request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product category record
            const productCategoryRecord = await this.fetchProductCategoryById(query.recordId);

            this.logger.log(`Product category retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductCategoryDto>(productCategoryRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product category record by ID
     */
    private async fetchProductCategoryById(recordId: string): Promise<ProductCategoryDto> {
        const productCategoryRecord = await this.productCategoryDatabaseService.findRecordById(recordId);

        if (!productCategoryRecord) {
            this.logger.warn(`Product category not found for ID: ${recordId}`);
            throw new NotFoundException(`Product category not found for ID: ${recordId}`);
        }

        return productCategoryRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product category by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product category not found for ID: ${recordId}`);
    }
}
