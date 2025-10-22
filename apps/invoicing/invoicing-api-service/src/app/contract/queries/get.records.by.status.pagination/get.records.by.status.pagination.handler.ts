import { ContractDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    protected readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<ContractDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records by status pagination request for status: ${query.status}`);

        try {
            const contracts = await this.contractDatabaseService.findRecordsByStatusPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer,
                query.customerId
            );

            this.logger.log(`Contracts retrieved successfully: ${contracts.data.length} records`);
            return new ResponseDto<PageDto<ContractDto>>(contracts, HTTP_STATUS_OK);
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
