import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAreasByTerritoryManagerIdQuery } from './get.areas.by.territory.manager.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetAreasByTerritoryManagerIdQuery)
export class GetAreasByTerritoryManagerIdHandler implements IQueryHandler<GetAreasByTerritoryManagerIdQuery> {
    private readonly logger = new Logger(GetAreasByTerritoryManagerIdHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(query: GetAreasByTerritoryManagerIdQuery): Promise<ResponseDto<AreaDto[]>> {
        this.logger.log(`Processing get areas request for territory manager ID: ${query.territoryManagerId}`);

        try {
            // Fetch areas by territory manager ID
            const areas = await this.areaDatabaseService.findRecordsByTerritoryManagerId(query.territoryManagerId);

            this.logger.log(
                `Areas retrieved successfully for territory manager: ${query.territoryManagerId}, count: ${areas.length}`
            );
            return new ResponseDto<AreaDto[]>(areas, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error fetching areas by territory manager ID ${query.territoryManagerId}:`, error);
            throw error;
        }
    }
}
