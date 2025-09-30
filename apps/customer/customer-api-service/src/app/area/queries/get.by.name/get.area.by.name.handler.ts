import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAreaByNameQuery } from './get.area.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetAreaByNameQuery)
export class GetAreaByNameHandler implements IQueryHandler<GetAreaByNameQuery> {
    private readonly logger = new Logger(GetAreaByNameHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(query: GetAreaByNameQuery): Promise<ResponseDto<AreaDto[]>> {
        this.logger.log(`Processing get areas by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch areas by name
            const areas = await this.fetchAreasByName(query.name);

            this.logger.log(`Areas retrieved successfully: ${areas.length} found`);
            return new ResponseDto<AreaDto[]>(areas, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new BadRequestException(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches areas by name
     */
    private async fetchAreasByName(name: string): Promise<AreaDto[]> {
        const areas = await this.areaDatabaseService.findRecordContainingName(name);
        return areas || [];
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching areas by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch areas by name');
    }
}
