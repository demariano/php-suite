import { RawMaterialDto, ResponseDto } from '@dto';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialByNameQuery } from './get.raw.material.by.name.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialByNameQuery)
export class GetRawMaterialByNameHandler implements IQueryHandler<GetRawMaterialByNameQuery> {
    private readonly logger = new Logger(GetRawMaterialByNameHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialByNameQuery): Promise<ResponseDto<RawMaterialDto>> {
        const record = await this.rawMaterialDatabaseService.findRecordByName(query.name);
        if (!record) {
            throw new NotFoundException(`Raw material not found for name: ${query.name}`);
        }
        return new ResponseDto<RawMaterialDto>(record, HTTP_STATUS_OK);
    }
}
