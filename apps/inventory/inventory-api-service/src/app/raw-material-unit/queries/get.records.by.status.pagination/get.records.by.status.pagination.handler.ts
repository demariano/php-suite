import { PageDto, RawMaterialUnitDto, ResponseDto } from '@dto';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialUnitRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialUnitRecordsByStatusPaginationQuery)
export class GetRawMaterialUnitRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialUnitRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialUnitRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialUnitRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialUnitDto>>> {
        const page = await this.rawMaterialUnitDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialUnitDto>>(page, HTTP_STATUS_OK);
    }
}
