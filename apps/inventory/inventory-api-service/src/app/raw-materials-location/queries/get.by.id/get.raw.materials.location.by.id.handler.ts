import { RawMaterialsLocationDto, ResponseDto } from '@dto';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsLocationByIdQuery } from './get.raw.materials.location.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsLocationByIdQuery)
export class GetRawMaterialsLocationByIdHandler implements IQueryHandler<GetRawMaterialsLocationByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialsLocationByIdHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialsLocationByIdQuery): Promise<ResponseDto<RawMaterialsLocationDto>> {
        const record = await this.rawMaterialsLocationDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw materials location not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialsLocationDto>(record, HTTP_STATUS_OK);
    }
}
