import { ProductPriceTypeDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { GetProductPriceTypeByNameQuery } from './get.product.price.type.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetProductPriceTypeByNameQuery)
export class GetProductPriceTypeByNameHandler implements IQueryHandler<GetProductPriceTypeByNameQuery> {
    private readonly logger = new Logger(GetProductPriceTypeByNameHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductPriceTypeByNameQuery): Promise<ResponseDto<ProductPriceTypeDto[]>> {
        this.logger.log(`Processing get product price type request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);

            // Fetch and validate product price type record
            const productPriceTypeRecords = await this.fetchProductPriceTypeByName(query.name);

            this.logger.log(
                `Product price types retrieved successfully: ${productPriceTypeRecords.length} records found for name: ${query.name}`
            );
            return new ResponseDto<ProductPriceTypeDto[]>(productPriceTypeRecords, HTTP_STATUS_OK);
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
     * Fetches product price type records by name
     */
    private async fetchProductPriceTypeByName(name: string): Promise<ProductPriceTypeDto[]> {
        const productPriceTypeRecords = await this.productPriceTypeDatabaseService.findRecordContainingName(name);

        if (!productPriceTypeRecords || productPriceTypeRecords.length === 0) {
            this.logger.warn(`No product price types found for name: ${name}`);
            return [];
        }

        return productPriceTypeRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product price type by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve product price types by name: ${errorMessage}`);
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
