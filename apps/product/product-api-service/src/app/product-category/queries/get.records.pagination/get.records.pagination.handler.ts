import { PageDto, ProductCategoryDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<ProductCategoryDto>>> {
        this.logger.log(`Processing pagination request for product categories with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productCategoryRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(`Retrieved ${productCategoryRecords.data.length} product category records with pagination`);
            return new ResponseDto<PageDto<ProductCategoryDto>>(productCategoryRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetRecordsPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        if (query.direction && !['ASC', 'DESC'].includes(query.direction.toUpperCase())) {
            throw new BadRequestException('Direction must be either ASC or DESC');
        }

        if (query.status && typeof query.status !== 'string') {
            throw new BadRequestException('Status must be a string');
        }
    }

    /**
     * Fetches paginated product category records
     */
    private async fetchPaginatedRecords(query: GetRecordsPaginationQuery): Promise<PageDto<ProductCategoryDto>> {
        const { limit, direction, cursorPointer, status } = query;

        return await this.productCategoryDatabaseService.findRecordsPagination(limit, status, direction, cursorPointer);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetRecordsPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product categories: ${errorMessage}`);
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
