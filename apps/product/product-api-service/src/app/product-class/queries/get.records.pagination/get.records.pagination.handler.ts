import { PageDto, ProductClassDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { GetProductClassRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductClassRecordsPaginationQuery)
export class GetProductClassRecordsPaginationHandler implements IQueryHandler<GetProductClassRecordsPaginationQuery> {
    private readonly logger = new Logger(GetProductClassRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductClassRecordsPaginationQuery): Promise<ResponseDto<PageDto<ProductClassDto>>> {
        this.logger.log(`Processing pagination request for product classes with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productClassRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(`Retrieved ${productClassRecords.data.length} product class records with pagination`);
            return new ResponseDto<PageDto<ProductClassDto>>(productClassRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetProductClassRecordsPaginationQuery): void {
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
     * Fetches paginated product class records
     */
    private async fetchPaginatedRecords(query: GetProductClassRecordsPaginationQuery): Promise<PageDto<ProductClassDto>> {
        const { limit, direction, status, lastEvaluatedKey } = query;

        return await this.productClassDatabaseService.findRecordsPagination(limit, status, direction, lastEvaluatedKey);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetProductClassRecordsPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product classes: ${errorMessage}`);
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
