import { PageDto, ProductPriceTypeDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { GetProductPriceTypeRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductPriceTypeRecordsPaginationQuery)
export class GetProductPriceTypeRecordsPaginationHandler
    implements IQueryHandler<GetProductPriceTypeRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetProductPriceTypeRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetProductPriceTypeRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<ProductPriceTypeDto>>> {
        this.logger.log(`Processing pagination request for product price types with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productPriceTypeRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(
                `Retrieved ${productPriceTypeRecords.data.length} product price type records with pagination`
            );
            return new ResponseDto<PageDto<ProductPriceTypeDto>>(productPriceTypeRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetProductPriceTypeRecordsPaginationQuery): void {
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
     * Fetches paginated product price type records
     */
    private async fetchPaginatedRecords(
        query: GetProductPriceTypeRecordsPaginationQuery
    ): Promise<PageDto<ProductPriceTypeDto>> {
        const { limit, direction, status, lastEvaluatedKey } = query;

        return await this.productPriceTypeDatabaseService.findRecordsPagination(
            limit,
            status,
            direction,
            lastEvaluatedKey
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetProductPriceTypeRecordsPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product price types: ${errorMessage}`);
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
