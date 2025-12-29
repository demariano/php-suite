import { PageDto, RawMaterialsStockDto, ResponseDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsStockRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsStockRecordsByStatusPaginationQuery)
export class GetRawMaterialsStockRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialsStockRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsStockRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsStockRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsStockDto>>> {
        const page = await this.rawMaterialsStockDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialsStockDto>>(page, HTTP_STATUS_OK);
    }
}
