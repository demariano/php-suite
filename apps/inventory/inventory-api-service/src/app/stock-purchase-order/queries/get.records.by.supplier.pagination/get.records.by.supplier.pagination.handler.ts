import { PageDto, ResponseDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockPurchaseOrderRecordsBySupplierPaginationQuery } from './get.records.by.supplier.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockPurchaseOrderRecordsBySupplierPaginationQuery)
export class GetStockPurchaseOrderRecordsBySupplierPaginationHandler
    implements IQueryHandler<GetStockPurchaseOrderRecordsBySupplierPaginationQuery>
{
    private readonly logger = new Logger(GetStockPurchaseOrderRecordsBySupplierPaginationHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetStockPurchaseOrderRecordsBySupplierPaginationQuery
    ): Promise<ResponseDto<PageDto<StockPurchaseOrderDto>>> {
        const records = await this.stockPurchaseOrderDatabaseService.findRecordsBySupplierPagination(
            query.limit,
            query.supplierId,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<StockPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
