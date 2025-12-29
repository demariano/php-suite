import { RawMaterialUnitDto, ResponseDto } from '@dto';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialUnitByIdQuery } from './get.raw.material.unit.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialUnitByIdQuery)
export class GetRawMaterialUnitByIdHandler implements IQueryHandler<GetRawMaterialUnitByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialUnitByIdHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialUnitByIdQuery): Promise<ResponseDto<RawMaterialUnitDto>> {
        const record = await this.rawMaterialUnitDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw material unit not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialUnitDto>(record, HTTP_STATUS_OK);
    }
}
