import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ResponseDto, TownDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTownByAreaStatusQuery } from './get.town.by.area.status.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetTownByAreaStatusQuery)
export class GetTownByAreaStatusHandler implements IQueryHandler<GetTownByAreaStatusQuery> {
    private readonly logger = new Logger(GetTownByAreaStatusHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(query: GetTownByAreaStatusQuery): Promise<ResponseDto<TownDto[]>> {
        this.logger.log(`Processing get towns by name request: ${query.status} ${query.areaId}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.status, query.areaId);

            // Fetch towns by name
            const towns = await this.fetchTownsByAreaStatus(query.status, query.areaId);

            this.logger.log(`Towns retrieved successfully: ${towns.length} found`);
            return new ResponseDto<TownDto[]>(towns, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.status, query.areaId);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(status: string, areaId: string): void {
        if (!status || typeof status !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (!areaId || typeof areaId !== 'string') {
            throw new BadRequestException('Area ID parameter is required and must be a string');
        }

        if (
            status.length < MIN_NAME_LENGTH ||
            status.length > MAX_NAME_LENGTH ||
            !areaId ||
            typeof areaId !== 'string'
        ) {
            throw new BadRequestException(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches towns by name
     */
    private async fetchTownsByAreaStatus(status: string, areaId: string): Promise<TownDto[]> {
        const towns = await this.townDatabaseService.findRecordByStatusAndAreaId(status, areaId);
        return towns || [];
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, status: string, areaId: string): never {
        this.logger.error(`Error fetching towns by name ${status} ${areaId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch towns by name ${status} ${areaId}');
    }
}
