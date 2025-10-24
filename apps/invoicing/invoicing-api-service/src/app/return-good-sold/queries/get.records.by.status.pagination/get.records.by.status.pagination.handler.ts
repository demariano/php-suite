import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldRecordsByStatusPaginationQuery)
export class GetReturnGoodSoldRecordsByStatusPaginationHandler
    implements IQueryHandler<GetReturnGoodSoldRecordsByStatusPaginationQuery>
{
    protected readonly logger = new Logger(GetReturnGoodSoldRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records by status pagination request for return good sold: ${query.status}`);

        try {
            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordsByStatusPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Return Good Sold records retrieved successfully for status: ${query.status}`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.status);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, status: string): never {
        this.logger.error(`Error processing get records by status pagination request for ${status}:`, error);

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
