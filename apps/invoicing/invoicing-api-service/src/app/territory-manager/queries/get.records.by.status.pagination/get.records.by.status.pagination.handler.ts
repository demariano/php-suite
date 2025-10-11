import { ErrorResponseDto, PageDto, ResponseDto, TerritoryManagerDto } from '@dto';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    protected readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records by status pagination request for status: ${query.status}`);

        try {
            const territoryManagers = await this.territoryManagerDatabaseService.findRecordsByStatusPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer,
                query.name
            );

            this.logger.log(`Territory managers retrieved successfully: ${territoryManagers.data.length} records`);
            return new ResponseDto<PageDto<TerritoryManagerDto>>(territoryManagers, HTTP_STATUS_OK);
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
