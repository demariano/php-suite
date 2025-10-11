import { ErrorResponseDto, ResponseDto, TerritoryManagerDto } from '@dto';
import { TerritoryManagerDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTerritoryManagerByIdQuery } from './get.territory.manager.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetTerritoryManagerByIdQuery)
export class GetTerritoryManagerByIdHandler implements IQueryHandler<GetTerritoryManagerByIdQuery> {
    protected readonly logger = new Logger(GetTerritoryManagerByIdHandler.name);

    constructor(
        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract
    ) {}

    async execute(query: GetTerritoryManagerByIdQuery): Promise<ResponseDto<TerritoryManagerDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for territory manager: ${query.recordId}`);

        try {
            const territoryManager = await this.territoryManagerDatabaseService.findRecordById(query.recordId);

            if (!territoryManager) {
                this.logger.warn(`Territory manager not found: ${query.recordId}`);
                throw new NotFoundException(`Territory manager record not found for id ${query.recordId}`);
            }

            this.logger.log(`Territory manager retrieved successfully: ${territoryManager.territoryManagerId}`);
            return new ResponseDto<TerritoryManagerDto>(territoryManager, HTTP_STATUS_OK);
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
