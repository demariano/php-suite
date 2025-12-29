import { PageDto, RawMaterialsLocationDto, ResponseDto } from '@dto';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsLocationRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsLocationRecordsByStatusPaginationQuery)
export class GetRawMaterialsLocationRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialsLocationRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsLocationRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsLocationRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsLocationDto>>> {
        const page = await this.rawMaterialsLocationDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialsLocationDto>>(page, HTTP_STATUS_OK);
    }
}
