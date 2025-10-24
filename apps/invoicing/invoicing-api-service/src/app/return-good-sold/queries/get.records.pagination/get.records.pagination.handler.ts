import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldRecordsPaginationQuery)
export class GetReturnGoodSoldRecordsPaginationHandler
    implements IQueryHandler<GetReturnGoodSoldRecordsPaginationQuery>
{
    protected readonly logger = new Logger(GetReturnGoodSoldRecordsPaginationHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records pagination request for return good sold`);

        try {
            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordsByPagination(
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Return Good Sold records retrieved successfully with pagination`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
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
