import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldContainingDocnoQuery } from './get.return.good.sold.containing.docno.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldContainingDocnoQuery)
export class GetReturnGoodSoldContainingDocnoHandler implements IQueryHandler<GetReturnGoodSoldContainingDocnoQuery> {
    protected readonly logger = new Logger(GetReturnGoodSoldContainingDocnoHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldContainingDocnoQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get containing docno request for return good sold: ${query.docno}`);

        try {
            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordContainingDocNo(
                query.limit,
                query.docno,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Return Good Sold records retrieved successfully for docno: ${query.docno}`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.docno);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, docno: string): never {
        this.logger.error(`Error processing get containing docno request for ${docno}:`, error);

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
