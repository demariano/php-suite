import { RawMaterialDto, ResponseDto } from '@dto';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialByIdQuery } from './get.raw.material.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialByIdQuery)
export class GetRawMaterialByIdHandler implements IQueryHandler<GetRawMaterialByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialByIdHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialByIdQuery): Promise<ResponseDto<RawMaterialDto>> {
        const record = await this.rawMaterialDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw material not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialDto>(record, HTTP_STATUS_OK);
    }
}
