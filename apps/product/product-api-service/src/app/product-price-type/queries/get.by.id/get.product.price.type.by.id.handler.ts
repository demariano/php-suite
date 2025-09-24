import { ProductPriceTypeDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { GetProductPriceTypeByIdQuery } from './get.product.price.type.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductPriceTypeByIdQuery)
export class GetProductPriceTypeByIdHandler implements IQueryHandler<GetProductPriceTypeByIdQuery> {
    private readonly logger = new Logger(GetProductPriceTypeByIdHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductPriceTypeByIdQuery): Promise<ResponseDto<ProductPriceTypeDto>> {
        this.logger.log(`Processing get product price type request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product price type record
            const productPriceTypeRecord = await this.fetchProductPriceTypeById(query.recordId);

            this.logger.log(`Product price type retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductPriceTypeDto>(productPriceTypeRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product price type record by ID
     */
    private async fetchProductPriceTypeById(recordId: string): Promise<ProductPriceTypeDto> {
        const productPriceTypeRecord = await this.productPriceTypeDatabaseService.findRecordById(recordId);

        if (!productPriceTypeRecord) {
            this.logger.warn(`Product price type not found for ID: ${recordId}`);
            throw new NotFoundException(`Product price type not found for ID: ${recordId}`);
        }

        return productPriceTypeRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product price type by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product price type not found for ID: ${recordId}`);
    }
}
