import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldByIdQuery } from './get.return.good.sold.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldByIdQuery)
export class GetReturnGoodSoldByIdHandler implements IQueryHandler<GetReturnGoodSoldByIdQuery> {
    protected readonly logger = new Logger(GetReturnGoodSoldByIdHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(query: GetReturnGoodSoldByIdQuery): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for return good sold: ${query.recordId}`);

        try {
            const returnGoodSold = await this.returnGoodSoldDatabaseService.findRecordById(query.recordId);

            if (!returnGoodSold) {
                this.logger.warn(`Return Good Sold not found: ${query.recordId}`);
                throw new NotFoundException(`Return Good Sold record not found for id ${query.recordId}`);
            }

            this.logger.log(`Return Good Sold retrieved successfully: ${returnGoodSold.returnGoodSoldId}`);
            return new ResponseDto<ReturnGoodSoldDto>(returnGoodSold, HTTP_STATUS_OK);
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
