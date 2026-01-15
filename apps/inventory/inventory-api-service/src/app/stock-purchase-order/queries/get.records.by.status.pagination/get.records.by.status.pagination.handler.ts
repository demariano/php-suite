import { PageDto, ResponseDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockPurchaseOrderRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockPurchaseOrderRecordsByStatusPaginationQuery)
export class GetStockPurchaseOrderRecordsByStatusPaginationHandler
    implements IQueryHandler<GetStockPurchaseOrderRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetStockPurchaseOrderRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetStockPurchaseOrderRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<StockPurchaseOrderDto>>> {
        const records = await this.stockPurchaseOrderDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.poStatus,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<StockPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
