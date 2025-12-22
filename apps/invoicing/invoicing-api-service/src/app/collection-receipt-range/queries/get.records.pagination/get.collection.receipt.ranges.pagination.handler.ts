import { CollectionReceiptRangeDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCollectionReceiptRangesPaginationQuery } from './get.collection.receipt.ranges.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCollectionReceiptRangesPaginationQuery)
export class GetCollectionReceiptRangesPaginationHandler
    implements IQueryHandler<GetCollectionReceiptRangesPaginationQuery>
{
    protected readonly logger = new Logger(GetCollectionReceiptRangesPaginationHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetCollectionReceiptRangesPaginationQuery
    ): Promise<ResponseDto<PageDto<CollectionReceiptRangeDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records pagination request for collection receipt ranges`);

        try {
            const ranges = await this.collectionReceiptRangeDatabaseService.findRecordsByPagination(
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Collection receipt ranges retrieved successfully: ${ranges.data.length} records`);
            return new ResponseDto<PageDto<CollectionReceiptRangeDto>>(ranges, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing get records pagination request:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
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

