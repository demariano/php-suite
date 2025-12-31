import { ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialByIdQuery } from './get.product.unit.raw.material.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductUnitRawMaterialByIdQuery)
export class GetProductUnitRawMaterialByIdHandler implements IQueryHandler<GetProductUnitRawMaterialByIdQuery> {
    private readonly logger = new Logger(GetProductUnitRawMaterialByIdHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductUnitRawMaterialByIdQuery): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        this.logger.log(`Processing get product unit raw material request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product unit raw material record
            const record = await this.fetchProductUnitRawMaterialById(query.recordId);

            this.logger.log(`Product unit raw material retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductUnitRawMaterialDto>(record, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product unit raw material record by ID
     */
    private async fetchProductUnitRawMaterialById(recordId: string): Promise<ProductUnitRawMaterialDto> {
        const record = await this.productUnitRawMaterialDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Product unit raw material not found for ID: ${recordId}`);
            throw new NotFoundException(`Product unit raw material not found for ID: ${recordId}`);
        }

        return record;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product unit raw material by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product unit raw material not found for ID: ${recordId}`);
    }
}
