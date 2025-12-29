import { PageDto, RawMaterialsLocationDto, ResponseDto } from '@dto';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsLocationRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsLocationRecordsPaginationQuery)
export class GetRawMaterialsLocationRecordsPaginationHandler
    implements IQueryHandler<GetRawMaterialsLocationRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsLocationRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsLocationRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsLocationDto>>> {
        const page = await this.rawMaterialsLocationDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialsLocationDto>>(page, HTTP_STATUS_OK);
    }
}
