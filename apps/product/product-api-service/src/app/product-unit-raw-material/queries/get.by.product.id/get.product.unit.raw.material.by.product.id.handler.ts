import { ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialByProductIdQuery } from './get.product.unit.raw.material.by.product.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductUnitRawMaterialByProductIdQuery)
export class GetProductUnitRawMaterialByProductIdHandler
    implements IQueryHandler<GetProductUnitRawMaterialByProductIdQuery>
{
    private readonly logger = new Logger(GetProductUnitRawMaterialByProductIdHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductUnitRawMaterialByProductIdQuery): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        this.logger.log(`Processing get product unit raw material request for product ID: ${query.productId}`);

        try {
            // Fetch and validate product unit raw material record
            const record = await this.fetchProductUnitRawMaterialByProductId(query.productId);

            this.logger.log(`Product unit raw material retrieved successfully for product: ${query.productId}`);
            return new ResponseDto<ProductUnitRawMaterialDto>(record, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.productId);
        }
    }

    /**
     * Fetches and validates a product unit raw material record by product ID
     */
    private async fetchProductUnitRawMaterialByProductId(productId: string): Promise<ProductUnitRawMaterialDto> {
        const record = await this.productUnitRawMaterialDatabaseService.findRecordByProductId(productId);

        if (!record) {
            this.logger.warn(`Product unit raw material not found for product ID: ${productId}`);
            throw new NotFoundException(`Product unit raw material not found for product ID: ${productId}`);
        }

        return record;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error fetching product unit raw material by product ID ${productId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product unit raw material not found for product ID: ${productId}`);
    }
}
