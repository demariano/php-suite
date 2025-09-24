import { PageDto, ProductUnitDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductUnitRecordsPaginationQuery)
export class GetProductUnitRecordsPaginationHandler implements IQueryHandler<GetProductUnitRecordsPaginationQuery> {
    private readonly logger = new Logger(GetProductUnitRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetProductUnitRecordsPaginationQuery): Promise<ResponseDto<PageDto<ProductUnitDto>>> {
        this.logger.log(`Processing pagination request for product units with status: ${query.status}`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productUnitRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(`Retrieved ${productUnitRecords.data.length} product unit records with pagination`);
            return new ResponseDto<PageDto<ProductUnitDto>>(productUnitRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetProductUnitRecordsPaginationQuery): void {
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
     * Fetches paginated product unit records
     */
    private async fetchPaginatedRecords(query: GetProductUnitRecordsPaginationQuery): Promise<PageDto<ProductUnitDto>> {
        const { limit, direction, status, lastEvaluatedKey } = query;

        return await this.productUnitDatabaseService.findRecordsPagination(limit, status, direction, lastEvaluatedKey);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, query: GetProductUnitRecordsPaginationQuery): never {
        this.logger.error(`Error processing pagination request for status ${query.status}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product units: ${errorMessage}`);
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
