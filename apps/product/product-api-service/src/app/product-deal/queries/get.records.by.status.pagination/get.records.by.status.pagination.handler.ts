import { PageDto, ProductDealDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<ProductDealDto>>> {
        this.logger.log(`Processing pagination request for product deals with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productDealRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(`Retrieved ${productDealRecords.data.length} product deal records with pagination`);
            return new ResponseDto<PageDto<ProductDealDto>>(productDealRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetRecordsByStatusPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        if (query.status && typeof query.status !== 'string') {
            throw new BadRequestException('Status must be a string');
        }
    }

    /**
     * Fetches paginated product deal records
     */
    private async fetchPaginatedRecords(query: GetRecordsByStatusPaginationQuery): Promise<PageDto<ProductDealDto>> {
        const { limit, direction, cursorPointer, status, name } = query;

        return await this.productDealDatabaseService.findRecordsByStatusPagination(
            limit,
            status,
            direction,
            cursorPointer,
            name
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetRecordsByStatusPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product deals: ${errorMessage}`);
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
