import { ProductClassDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { GetProductClassByIdQuery } from './get.product.class.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductClassByIdQuery)
export class GetProductClassByIdHandler implements IQueryHandler<GetProductClassByIdQuery> {
    private readonly logger = new Logger(GetProductClassByIdHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductClassByIdQuery): Promise<ResponseDto<ProductClassDto>> {
        this.logger.log(`Processing get product class request for ID: ${query.recordId}`);

        try {
            // Fetch and validate product class record
            const productClassRecord = await this.fetchProductClassById(query.recordId);

            this.logger.log(`Product class retrieved successfully: ${query.recordId}`);
            return new ResponseDto<ProductClassDto>(productClassRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a product class record by ID
     */
    private async fetchProductClassById(recordId: string): Promise<ProductClassDto> {
        const productClassRecord = await this.productClassDatabaseService.findRecordById(recordId);

        if (!productClassRecord) {
            this.logger.warn(`Product class not found for ID: ${recordId}`);
            throw new NotFoundException(`Product class not found for ID: ${recordId}`);
        }

        return productClassRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching product class by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Product class not found for ID: ${recordId}`);
    }
}
