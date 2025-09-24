import { ProductCategoryDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { GetProductCategoryByNameQuery } from './get.product.category.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetProductCategoryByNameQuery)
export class GetProductCategoryByNameHandler implements IQueryHandler<GetProductCategoryByNameQuery> {
    private readonly logger = new Logger(GetProductCategoryByNameHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductCategoryByNameQuery): Promise<ResponseDto<ProductCategoryDto[]>> {
        this.logger.log(`Processing get product category request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);

            // Fetch and validate product category record
            const productCategoryRecords = await this.fetchProductCategoryByName(query.name);

            this.logger.log(
                `Product categories retrieved successfully: ${productCategoryRecords.length} records found for name: ${query.name}`
            );
            return new ResponseDto<ProductCategoryDto[]>(productCategoryRecords, HTTP_STATUS_OK);
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
     * Fetches product category records by name
     */
    private async fetchProductCategoryByName(name: string): Promise<ProductCategoryDto[]> {
        const productCategoryRecords = await this.productCategoryDatabaseService.findRecordContainingName(name);

        if (!productCategoryRecords || productCategoryRecords.length === 0) {
            this.logger.warn(`No product categories found for name: ${name}`);
            return [];
        }

        return productCategoryRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product category by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve product categories by name: ${errorMessage}`);
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
