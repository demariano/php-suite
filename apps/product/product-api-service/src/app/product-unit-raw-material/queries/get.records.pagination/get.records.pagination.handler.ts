import { PageDto, ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductUnitRawMaterialRecordsPaginationQuery)
export class GetProductUnitRawMaterialRecordsPaginationHandler
    implements IQueryHandler<GetProductUnitRawMaterialRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetProductUnitRawMaterialRecordsPaginationHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetProductUnitRawMaterialRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<ProductUnitRawMaterialDto>>> {
        this.logger.log(`Processing pagination request for product unit raw materials`);

        try {
            // Validate query parameters
            this.validateQueryParameters(query);

            // Fetch paginated records
            const productRecords = await this.fetchPaginatedRecords(query);

            this.logger.log(
                `Retrieved ${productRecords.data.length} product unit raw material records with pagination`
            );
            return new ResponseDto<PageDto<ProductUnitRawMaterialDto>>(productRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Validates query parameters for pagination
     */
    private validateQueryParameters(query: GetProductUnitRawMaterialRecordsPaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }
    }

    /**
     * Fetches paginated product unit raw material records
     */
    private async fetchPaginatedRecords(
        query: GetProductUnitRawMaterialRecordsPaginationQuery
    ): Promise<PageDto<ProductUnitRawMaterialDto>> {
        const { limit, direction, cursorPointer, status, productName } = query;

        // If status is provided, use the global status pagination method
        if (status && status.trim() !== '') {
            return await this.productUnitRawMaterialDatabaseService.findRecordsByGlobalStatusPagination(
                limit,
                status,
                direction,
                cursorPointer,
                productName
            );
        }

        // Otherwise, use the standard pagination with optional client-side filtering
        return await this.productUnitRawMaterialDatabaseService.findRecordsByPagination(
            limit,
            direction,
            cursorPointer,
            status,
            productName
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing pagination request for product unit raw materials:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(`Failed to retrieve paginated product unit raw materials: ${errorMessage}`);
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
