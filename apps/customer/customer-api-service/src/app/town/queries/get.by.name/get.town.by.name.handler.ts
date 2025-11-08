import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { PageDto, ResponseDto, TownDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTownByNameQuery } from './get.town.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetTownByNameQuery)
export class GetTownByNameHandler implements IQueryHandler<GetTownByNameQuery> {
    private readonly logger = new Logger(GetTownByNameHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(query: GetTownByNameQuery): Promise<ResponseDto<PageDto<TownDto>>> {
        this.logger.log(`Processing get towns by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch towns by name
            const towns = await this.fetchTownsByName(query.name, query.limit, query.direction, query.cursorPointer);

            this.logger.log(`Towns retrieved successfully: ${towns.data.length} found`);
            return new ResponseDto<PageDto<TownDto>>(towns, HTTP_STATUS_OK);
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
     * Fetches towns by name
     */
    private async fetchTownsByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>> {
        const towns = await this.townDatabaseService.findRecordsByNamePagination(limit, name, direction, cursorPointer);

        if (!towns || towns.data.length === 0) {
            return new PageDto<TownDto>([], null, null);
        }

        return towns;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching towns by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch towns by name');
    }
}
