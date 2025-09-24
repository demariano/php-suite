import { ProductDealDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { GetProductDealByNameQuery } from './get.product.deal.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetProductDealByNameQuery)
export class GetProductDealByNameHandler implements IQueryHandler<GetProductDealByNameQuery> {
    private readonly logger = new Logger(GetProductDealByNameHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductDealByNameQuery): Promise<ResponseDto<ProductDealDto[]>> {
        this.logger.log(`Processing get product deal request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);

            // Fetch and validate product deal record
            const productDealRecords = await this.fetchProductDealByName(query.name);

            this.logger.log(
                `Product deals retrieved successfully: ${productDealRecords.length} records found for name: ${query.name}`
            );
            return new ResponseDto<ProductDealDto[]>(productDealRecords, HTTP_STATUS_OK);
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
     * Fetches product deal records by name
     */
    private async fetchProductDealByName(name: string): Promise<ProductDealDto[]> {
        const productDealRecords = await this.productDealDatabaseService.findRecordContainingName(name);

        if (!productDealRecords || productDealRecords.length === 0) {
            this.logger.warn(`No product deals found for name: ${name}`);
            return [];
        }

        return productDealRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product deal by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve product deals by name: ${errorMessage}`);
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
