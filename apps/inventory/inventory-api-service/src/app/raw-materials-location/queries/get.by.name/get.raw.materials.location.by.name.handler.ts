import { RawMaterialsLocationDto, ResponseDto } from '@dto';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsLocationByNameQuery } from './get.raw.materials.location.by.name.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsLocationByNameQuery)
export class GetRawMaterialsLocationByNameHandler implements IQueryHandler<GetRawMaterialsLocationByNameQuery> {
    private readonly logger = new Logger(GetRawMaterialsLocationByNameHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialsLocationByNameQuery): Promise<ResponseDto<RawMaterialsLocationDto>> {
        const record = await this.rawMaterialsLocationDatabaseService.findRecordByName(query.name);
        if (!record) {
            throw new NotFoundException(`Raw materials location not found for name: ${query.name}`);
        }
        return new ResponseDto<RawMaterialsLocationDto>(record, HTTP_STATUS_OK);
    }
}
