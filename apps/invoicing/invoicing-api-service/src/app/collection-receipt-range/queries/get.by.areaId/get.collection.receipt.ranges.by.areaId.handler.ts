import { CollectionReceiptRangeDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCollectionReceiptRangesByAreaIdQuery } from './get.collection.receipt.ranges.by.areaId.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCollectionReceiptRangesByAreaIdQuery)
export class GetCollectionReceiptRangesByAreaIdHandler
    implements IQueryHandler<GetCollectionReceiptRangesByAreaIdQuery>
{
    protected readonly logger = new Logger(GetCollectionReceiptRangesByAreaIdHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetCollectionReceiptRangesByAreaIdQuery
    ): Promise<ResponseDto<PageDto<CollectionReceiptRangeDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by areaId request for collection receipt ranges: ${query.areaId}`);

        try {
            const ranges = await this.collectionReceiptRangeDatabaseService.findRecordsByAreaId(
                query.limit,
                query.areaId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(
                `Collection receipt ranges retrieved successfully for area ${query.areaId}: ${ranges.data.length} records`
            );
            return new ResponseDto<PageDto<CollectionReceiptRangeDto>>(ranges, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.areaId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, areaId: string): never {
        this.logger.error(`Error processing get by areaId request for ${areaId}:`, error);

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

