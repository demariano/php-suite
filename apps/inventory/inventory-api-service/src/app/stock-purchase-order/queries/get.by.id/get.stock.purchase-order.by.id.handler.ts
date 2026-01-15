import { ResponseDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockPurchaseOrderByIdQuery } from './get.stock.purchase-order.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockPurchaseOrderByIdQuery)
export class GetStockPurchaseOrderByIdHandler implements IQueryHandler<GetStockPurchaseOrderByIdQuery> {
    private readonly logger = new Logger(GetStockPurchaseOrderByIdHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(query: GetStockPurchaseOrderByIdQuery): Promise<ResponseDto<StockPurchaseOrderDto>> {
        const record = await this.stockPurchaseOrderDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Stock purchase order not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<StockPurchaseOrderDto>(record, HTTP_STATUS_OK);
    }
}
