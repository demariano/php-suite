import { PageDto, RawMaterialDto, ResponseDto } from '@dto';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialRecordsByNamePaginationQuery } from './get.records.by.name.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialRecordsByNamePaginationQuery)
export class GetRawMaterialRecordsByNamePaginationHandler
    implements IQueryHandler<GetRawMaterialRecordsByNamePaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialRecordsByNamePaginationHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialRecordsByNamePaginationQuery): Promise<ResponseDto<PageDto<RawMaterialDto>>> {
        const page = await this.rawMaterialDatabaseService.findRecordsByNamePagination(
            query.limit,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialDto>>(page, HTTP_STATUS_OK);
    }
}
