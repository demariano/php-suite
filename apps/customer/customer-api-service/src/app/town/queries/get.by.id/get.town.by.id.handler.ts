import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto } from '@dto';
import { TownDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTownByIdQuery } from './get.town.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetTownByIdQuery)
export class GetTownByIdHandler implements IQueryHandler<GetTownByIdQuery> {
    private readonly logger = new Logger(GetTownByIdHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(query: GetTownByIdQuery): Promise<ResponseDto<TownDto>> {
        this.logger.log(`Processing get town request for ID: ${query.recordId}`);

        try {
            // Fetch and validate town record
            const townRecord = await this.fetchTownById(query.recordId);

            this.logger.log(`Town retrieved successfully: ${query.recordId}`);
            return new ResponseDto<TownDto>(townRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a town record by ID
     */
    private async fetchTownById(recordId: string): Promise<TownDto> {
        const townRecord = await this.townDatabaseService.findRecordById(recordId);

        if (!townRecord) {
            this.logger.warn(`Town not found for ID: ${recordId}`);
            throw new NotFoundException(`Town not found for ID: ${recordId}`);
        }

        return townRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching town by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Town not found for ID: ${recordId}`);
    }
}
