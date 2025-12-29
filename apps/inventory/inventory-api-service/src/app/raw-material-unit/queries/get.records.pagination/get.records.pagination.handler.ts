import { PageDto, RawMaterialUnitDto, ResponseDto } from '@dto';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialUnitRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialUnitRecordsPaginationQuery)
export class GetRawMaterialUnitRecordsPaginationHandler
    implements IQueryHandler<GetRawMaterialUnitRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialUnitRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialUnitRecordsPaginationQuery): Promise<ResponseDto<PageDto<RawMaterialUnitDto>>> {
        const page = await this.rawMaterialUnitDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialUnitDto>>(page, HTTP_STATUS_OK);
    }
}
