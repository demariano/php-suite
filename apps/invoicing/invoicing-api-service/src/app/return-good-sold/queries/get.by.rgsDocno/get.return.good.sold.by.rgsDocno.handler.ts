import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldByRgsDocnoQuery } from './get.return.good.sold.by.rgsDocno.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldByRgsDocnoQuery)
export class GetReturnGoodSoldByRgsDocnoHandler implements IQueryHandler<GetReturnGoodSoldByRgsDocnoQuery> {
    protected readonly logger = new Logger(GetReturnGoodSoldByRgsDocnoHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldByRgsDocnoQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by rgsDocno request for return good sold: ${query.rgsDocno}`);

        try {
            const limit = query.limit || 10;
            const direction = query.direction || undefined;
            const cursorPointer = query.cursorPointer || undefined;
            const rgsDocno = query.rgsDocno || '';

            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordsByRgsDocnoPagination(
                limit,
                direction,
                cursorPointer,
                rgsDocno
            );

            this.logger.log(`Return Good Sold records retrieved successfully for rgsDocno: ${rgsDocno}`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.rgsDocno);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, rgsDocno: string): never {
        this.logger.error(`Error processing get by rgsDocno request for ${rgsDocno}:`, error);

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

