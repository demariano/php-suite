import { PageDto, RawMaterialsStockDto, ResponseDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsStockRecordsByNamePaginationQuery } from './get.records.by.name.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsStockRecordsByNamePaginationQuery)
export class GetRawMaterialsStockRecordsByNamePaginationHandler
    implements IQueryHandler<GetRawMaterialsStockRecordsByNamePaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsStockRecordsByNamePaginationHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsStockRecordsByNamePaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsStockDto>>> {
        const page = await this.rawMaterialsStockDatabaseService.findRecordsByNamePagination(
            query.limit,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialsStockDto>>(page, HTTP_STATUS_OK);
    }
}
