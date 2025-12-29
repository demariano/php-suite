import { RawMaterialUnitDto, ResponseDto } from '@dto';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialUnitByNameQuery } from './get.raw.material.unit.by.name.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialUnitByNameQuery)
export class GetRawMaterialUnitByNameHandler implements IQueryHandler<GetRawMaterialUnitByNameQuery> {
    private readonly logger = new Logger(GetRawMaterialUnitByNameHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialUnitByNameQuery): Promise<ResponseDto<RawMaterialUnitDto>> {
        const record = await this.rawMaterialUnitDatabaseService.findRecordByName(query.name);
        if (!record) {
            throw new NotFoundException(`Raw material unit not found for name: ${query.name}`);
        }
        return new ResponseDto<RawMaterialUnitDto>(record, HTTP_STATUS_OK);
    }
}
