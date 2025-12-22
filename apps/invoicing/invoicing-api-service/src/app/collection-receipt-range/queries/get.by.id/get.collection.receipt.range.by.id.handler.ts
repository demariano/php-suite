import { CollectionReceiptRangeDto, ErrorResponseDto, ResponseDto } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCollectionReceiptRangeByIdQuery } from './get.collection.receipt.range.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetCollectionReceiptRangeByIdQuery)
export class GetCollectionReceiptRangeByIdHandler
    implements IQueryHandler<GetCollectionReceiptRangeByIdQuery>
{
    protected readonly logger = new Logger(GetCollectionReceiptRangeByIdHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetCollectionReceiptRangeByIdQuery
    ): Promise<ResponseDto<CollectionReceiptRangeDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for collection receipt range: ${query.recordId}`);

        try {
            const range = await this.collectionReceiptRangeDatabaseService.findRecordById(query.recordId);

            if (!range) {
                this.logger.warn(`Collection receipt range not found: ${query.recordId}`);
                throw new NotFoundException(`Collection receipt range not found for id ${query.recordId}`);
            }

            this.logger.log(`Collection receipt range retrieved successfully: ${range.collectionReceiptRangeId}`);
            return new ResponseDto<CollectionReceiptRangeDto>(range, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing get by id request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

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

