import { ProductUnitDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitByNameQuery } from './get.product.unit.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetProductUnitByNameQuery)
export class GetProductUnitByNameHandler implements IQueryHandler<GetProductUnitByNameQuery> {
    private readonly logger = new Logger(GetProductUnitByNameHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductUnitByNameQuery): Promise<ResponseDto<ProductUnitDto[]>> {
        this.logger.log(`Processing get product unit request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);

            // Fetch and validate product unit record
            const productUnitRecords = await this.fetchProductUnitByName(query.name);

            this.logger.log(
                `Product units retrieved successfully: ${productUnitRecords.length} records found for name: ${query.name}`
            );
            return new ResponseDto<ProductUnitDto[]>(productUnitRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (name.trim().length < MIN_NAME_LENGTH) {
            throw new BadRequestException(`Name must be at least ${MIN_NAME_LENGTH} character long`);
        }

        if (name.length > MAX_NAME_LENGTH) {
            throw new BadRequestException(`Name must not exceed ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches product unit records by name
     */
    private async fetchProductUnitByName(name: string): Promise<ProductUnitDto[]> {
        const productUnitRecords = await this.productUnitDatabaseService.findRecordContainingName(name);

        if (!productUnitRecords || productUnitRecords.length === 0) {
            this.logger.warn(`No product units found for name: ${name}`);
            return [];
        }

        return productUnitRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product unit by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve product units by name: ${errorMessage}`);
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
