import { ProductUnitDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitByIdQuery } from './get.product.unit.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductUnitByIdQuery)
export class GetProductUnitByIdHandler implements IQueryHandler<GetProductUnitByIdQuery> {
    private readonly logger = new Logger(GetProductUnitByIdHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductUnitByIdQuery): Promise<ResponseDto<ProductUnitDto>> {
        this.logger.log(`Processing get product unit request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product unit record
            const productUnitRecord = await this.fetchProductUnitById(query.recordId);

            this.logger.log(`Product unit retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductUnitDto>(productUnitRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product unit record by ID
     */
    private async fetchProductUnitById(recordId: string): Promise<ProductUnitDto> {
        const productUnitRecord = await this.productUnitDatabaseService.findRecordById(recordId);

        if (!productUnitRecord) {
            this.logger.warn(`Product unit not found for ID: ${recordId}`);
            throw new NotFoundException(`Product unit not found for ID: ${recordId}`);
        }

        return productUnitRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product unit by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product unit not found for ID: ${recordId}`);
    }
}
