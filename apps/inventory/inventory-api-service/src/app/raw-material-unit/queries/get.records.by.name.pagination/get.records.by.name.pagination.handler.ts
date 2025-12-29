import { PageDto, RawMaterialUnitDto, ResponseDto } from '@dto';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialUnitRecordsByNamePaginationQuery } from './get.records.by.name.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialUnitRecordsByNamePaginationQuery)
export class GetRawMaterialUnitRecordsByNamePaginationHandler
    implements IQueryHandler<GetRawMaterialUnitRecordsByNamePaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialUnitRecordsByNamePaginationHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialUnitRecordsByNamePaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialUnitDto>>> {
        const page = await this.rawMaterialUnitDatabaseService.findRecordsByNamePagination(
            query.limit,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialUnitDto>>(page, HTTP_STATUS_OK);
    }
}
