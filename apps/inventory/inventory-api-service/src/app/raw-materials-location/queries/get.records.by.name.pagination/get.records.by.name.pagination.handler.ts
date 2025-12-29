import { PageDto, RawMaterialsLocationDto, ResponseDto } from '@dto';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsLocationRecordsByNamePaginationQuery } from './get.records.by.name.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsLocationRecordsByNamePaginationQuery)
export class GetRawMaterialsLocationRecordsByNamePaginationHandler
    implements IQueryHandler<GetRawMaterialsLocationRecordsByNamePaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsLocationRecordsByNamePaginationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsLocationRecordsByNamePaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsLocationDto>>> {
        const page = await this.rawMaterialsLocationDatabaseService.findRecordsByNamePagination(
            query.limit,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialsLocationDto>>(page, HTTP_STATUS_OK);
    }
}
