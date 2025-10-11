import { ErrorResponseDto, PageDto, ResponseDto, TerritoryManagerDto } from '@dto';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTerritoryManagerByNameQuery } from './get.territory.manager.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetTerritoryManagerByNameQuery)
export class GetTerritoryManagerByNameHandler implements IQueryHandler<GetTerritoryManagerByNameQuery> {
    protected readonly logger = new Logger(GetTerritoryManagerByNameHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetTerritoryManagerByNameQuery
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by name request for territory manager: ${query.name}`);

        try {
            const territoryManagers = await this.territoryManagerDatabaseService.findRecordContainingName(
                query.limit,
                query.name,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Territory managers retrieved successfully: ${territoryManagers.data.length} records`);
            return new ResponseDto<PageDto<TerritoryManagerDto>>(territoryManagers, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error processing get by name request for ${name}:`, error);

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
