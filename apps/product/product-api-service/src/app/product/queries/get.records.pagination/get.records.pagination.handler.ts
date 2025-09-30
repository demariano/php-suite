import { PageDto, ProductDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { GetProductRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductRecordsPaginationQuery)
export class GetProductRecordsPaginationHandler implements IQueryHandler<GetProductRecordsPaginationQuery> {
    private readonly logger = new Logger(GetProductRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductRecordsPaginationQuery): Promise<ResponseDto<PageDto<ProductDto>>> {
        this.logger.log(`Processing pagination request for products with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(`Retrieved ${productRecords.data.length} product records with pagination`);
            return new ResponseDto<PageDto<ProductDto>>(productRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetProductRecordsPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        if (query.direction && !['next', 'prev'].includes(query.direction.toLowerCase())) {
            throw new BadRequestException('Direction must be either next or prev');
        }

        if (query.status && typeof query.status !== 'string') {
            throw new BadRequestException('Status must be a string');
        }
    }

    /**
     * Fetches paginated product records
     */
    private async fetchPaginatedRecords(query: GetProductRecordsPaginationQuery): Promise<PageDto<ProductDto>> {
        const { limit, direction, status, lastEvaluatedKey } = query;

        return await this.productDatabaseService.findProductRecordsPagination(
            limit,
            status,
            direction,
            lastEvaluatedKey
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetProductRecordsPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated products: ${errorMessage}`);
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
