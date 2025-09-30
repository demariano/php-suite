import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAreaByIdQuery } from './get.area.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetAreaByIdQuery)
export class GetAreaByIdHandler implements IQueryHandler<GetAreaByIdQuery> {
    private readonly logger = new Logger(GetAreaByIdHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(query: GetAreaByIdQuery): Promise<ResponseDto<AreaDto>> {
        this.logger.log(`Processing get area request for ID: ${query.recordId}`);

        try {
            // Fetch and validate area record
            const areaRecord = await this.fetchAreaById(query.recordId);

            this.logger.log(`Area retrieved successfully: ${query.recordId}`);
            return new ResponseDto<AreaDto>(areaRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates an area record by ID
     */
    private async fetchAreaById(recordId: string): Promise<AreaDto> {
        const areaRecord = await this.areaDatabaseService.findRecordById(recordId);

        if (!areaRecord) {
            this.logger.warn(`Area not found for ID: ${recordId}`);
            throw new NotFoundException(`Area not found for ID: ${recordId}`);
        }

        return areaRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching area by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Area not found for ID: ${recordId}`);
    }
}
