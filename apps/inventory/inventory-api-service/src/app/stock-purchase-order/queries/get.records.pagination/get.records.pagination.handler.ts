import { PageDto, ResponseDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockPurchaseOrderRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockPurchaseOrderRecordsPaginationQuery)
export class GetStockPurchaseOrderRecordsPaginationHandler
    implements IQueryHandler<GetStockPurchaseOrderRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetStockPurchaseOrderRecordsPaginationHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetStockPurchaseOrderRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<StockPurchaseOrderDto>>> {
        const records = await this.stockPurchaseOrderDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<StockPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
