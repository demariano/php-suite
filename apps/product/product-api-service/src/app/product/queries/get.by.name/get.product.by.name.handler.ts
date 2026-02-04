import { PageDto, ProductDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { GetProductByNameQuery } from './get.product.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

@QueryHandler(GetProductByNameQuery)
export class GetProductByNameHandler implements IQueryHandler<GetProductByNameQuery> {
    private readonly logger = new Logger(GetProductByNameHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductByNameQuery): Promise<ResponseDto<PageDto<ProductDto>>> {
        console.log(query);
        this.logger.log(`Processing get product request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);
            const limit = this.normalizeLimit(query.limit);

            // Fetch and validate product record
            const productRecords = await this.fetchProductByName(
                query.name,
                limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(
                `Products retrieved successfully: ${productRecords.data.length} records found for name: ${query.name}`
            );
            return new ResponseDto<PageDto<ProductDto>>(productRecords, HTTP_STATUS_OK);
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
     * Normalizes and validates limit parameter
     */
    private normalizeLimit(limit?: number): number {
        const normalizedLimit = Number(limit ?? DEFAULT_LIMIT);

        if (Number.isNaN(normalizedLimit) || normalizedLimit < MIN_LIMIT || normalizedLimit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        return normalizedLimit;
    }

    /**
     * Fetches product records by name
     */
    private async fetchProductByName(
        name: string,
        limit: number,
        direction?: string,
        cursorPointer?: string
    ): Promise<PageDto<ProductDto>> {
        const productRecords = await this.productDatabaseService.findRecordsByNamePagination(
            limit,
            direction ?? '',
            cursorPointer ?? '',
            name
        );

        if (!productRecords || !productRecords.data || productRecords.data.length === 0) {
            this.logger.warn(`No products found for name: ${name}`);
        }

        return productRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve products by name: ${errorMessage}`);
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
