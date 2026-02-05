import { PageDto, ResponseDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery } from './get.records.by.approval.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery)
export class GetStockPurchaseOrderRecordsByApprovalStatusPaginationHandler
    implements IQueryHandler<GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery>
{
    private readonly logger = new Logger(GetStockPurchaseOrderRecordsByApprovalStatusPaginationHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<StockPurchaseOrderDto>>> {
        const records = await this.stockPurchaseOrderDatabaseService.findRecordsByApprovalStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.docNo
        );
        return new ResponseDto<PageDto<StockPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
