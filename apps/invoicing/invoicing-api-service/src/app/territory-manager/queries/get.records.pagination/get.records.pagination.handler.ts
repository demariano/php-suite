import { ErrorResponseDto, PageDto, ResponseDto, TerritoryManagerDto } from '@dto';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    protected readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get records pagination request`);

        try {
            const territoryManagers = await this.territoryManagerDatabaseService.findRecordsByPagination(
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Territory managers retrieved successfully: ${territoryManagers.data.length} records`);
            return new ResponseDto<PageDto<TerritoryManagerDto>>(territoryManagers, HTTP_STATUS_OK);
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
