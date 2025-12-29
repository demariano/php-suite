import { PageDto, RawMaterialDto, ResponseDto } from '@dto';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialRecordsByStatusPaginationQuery)
export class GetRawMaterialRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<RawMaterialDto>>> {
        const page = await this.rawMaterialDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialDto>>(page, HTTP_STATUS_OK);
    }
}
