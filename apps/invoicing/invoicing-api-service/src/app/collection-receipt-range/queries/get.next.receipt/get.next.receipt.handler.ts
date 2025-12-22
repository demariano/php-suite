import { ErrorResponseDto, ResponseDto } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetNextReceiptQuery } from './get.next.receipt.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetNextReceiptQuery)
export class GetNextReceiptHandler implements IQueryHandler<GetNextReceiptQuery> {
    protected readonly logger = new Logger(GetNextReceiptHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(query: GetNextReceiptQuery): Promise<ResponseDto<{ receiptNumber: number } | ErrorResponseDto>> {
        this.logger.log(`Processing get next receipt number request for area: ${query.areaId}`);

        try {
            const receiptNumber = await this.collectionReceiptRangeDatabaseService.getNextAvailableReceiptNumber(
                query.areaId
            );

            this.logger.log(`Next available receipt number retrieved successfully: ${receiptNumber} for area ${query.areaId}`);
            return new ResponseDto<{ receiptNumber: number }>({ receiptNumber }, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.areaId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, areaId: string): never {
        this.logger.error(`Error processing get next receipt number request for area ${areaId}:`, error);

        // Re-throw BadRequestException (for no range assigned, all exhausted, etc.)
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
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

        return 'An unexpected error occurred while fetching receipt number';
    }
}

