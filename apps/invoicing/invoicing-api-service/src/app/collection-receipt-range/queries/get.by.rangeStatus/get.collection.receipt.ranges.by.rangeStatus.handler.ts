import { CollectionReceiptRangeDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCollectionReceiptRangesByRangeStatusQuery } from './get.collection.receipt.ranges.by.rangeStatus.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCollectionReceiptRangesByRangeStatusQuery)
export class GetCollectionReceiptRangesByRangeStatusHandler
    implements IQueryHandler<GetCollectionReceiptRangesByRangeStatusQuery>
{
    protected readonly logger = new Logger(GetCollectionReceiptRangesByRangeStatusHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetCollectionReceiptRangesByRangeStatusQuery
    ): Promise<ResponseDto<PageDto<CollectionReceiptRangeDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by rangeStatus request for collection receipt ranges: ${query.rangeStatus}`);

        try {
            const ranges = await this.collectionReceiptRangeDatabaseService.findRecordsByRangeStatus(
                query.limit,
                query.rangeStatus,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(
                `Collection receipt ranges retrieved successfully for status ${query.rangeStatus}: ${ranges.data.length} records`
            );
            return new ResponseDto<PageDto<CollectionReceiptRangeDto>>(ranges, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.rangeStatus);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, rangeStatus: string): never {
        this.logger.error(`Error processing get by rangeStatus request for ${rangeStatus}:`, error);

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

