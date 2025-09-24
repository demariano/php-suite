import { ProductClassDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { GetProductClassByNameQuery } from './get.product.class.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetProductClassByNameQuery)
export class GetProductClassByNameHandler implements IQueryHandler<GetProductClassByNameQuery> {
    private readonly logger = new Logger(GetProductClassByNameHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductClassByNameQuery): Promise<ResponseDto<ProductClassDto[]>> {
        this.logger.log(`Processing get product class request for name: ${query.name}`);

        try {
            // Validate input parameters
            this.validateNameParameter(query.name);

            // Fetch and validate product class record
            const productClassRecords = await this.fetchProductClassByName(query.name);

            this.logger.log(
                `Product classes retrieved successfully: ${productClassRecords.length} records found for name: ${query.name}`
            );
            return new ResponseDto<ProductClassDto[]>(productClassRecords, HTTP_STATUS_OK);
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
     * Fetches product class records by name
     */
    private async fetchProductClassByName(name: string): Promise<ProductClassDto[]> {
        const productClassRecords = await this.productClassDatabaseService.findRecordContainingName(name);

        if (!productClassRecords || productClassRecords.length === 0) {
            this.logger.warn(`No product classes found for name: ${name}`);
            return [];
        }

        return productClassRecords;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching product class by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve product classes by name: ${errorMessage}`);
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
