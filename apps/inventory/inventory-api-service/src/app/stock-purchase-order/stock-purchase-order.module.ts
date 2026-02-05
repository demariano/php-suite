import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    InventoryDatabaseServiceModule,
    StockDatabaseService,
    StockPurchaseOrderDatabaseService,
} from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveStockPurchaseOrderHandler } from './command/approve-record/approve.handler';
import { CreateStockPurchaseOrderHandler } from './command/create/create.handler';
import { DeleteDeliveredPurchaseOrderHandler } from './command/delete-delivered-purchase-order/delete-delivered-purchase-order.handler';
import { DeleteStockPurchaseOrderHandler } from './command/delete/delete.handler';
import { DenyStockPurchaseOrderHandler } from './command/deny-record/deny.handler';
import { IncomingPurchaseOrderHandler } from './command/incoming-purchase-order/incoming-purchase-order.handler';
import { UpdateStockPurchaseOrderHandler } from './command/update/update.handler';
import { GetStockPurchaseOrderByIdHandler } from './queries/get.by.id/get.stock.purchase-order.by.id.handler';
import { GetStockPurchaseOrderRecordsByApprovalStatusPaginationHandler } from './queries/get.records.by.approval.status.pagination/get.records.by.approval.status.pagination.handler';
import { GetStockPurchaseOrderRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetStockPurchaseOrderRecordsBySupplierPaginationHandler } from './queries/get.records.by.supplier.pagination/get.records.by.supplier.pagination.handler';
import { GetStockPurchaseOrderRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { StockPurchaseOrderController } from './stock-purchase-order.controller';

const handlers = [
    ApproveStockPurchaseOrderHandler,
    CreateStockPurchaseOrderHandler,
    DeleteStockPurchaseOrderHandler,
    DenyStockPurchaseOrderHandler,
    IncomingPurchaseOrderHandler,
    DeleteDeliveredPurchaseOrderHandler,
    UpdateStockPurchaseOrderHandler,
    GetStockPurchaseOrderByIdHandler,
    GetStockPurchaseOrderRecordsPaginationHandler,
    GetStockPurchaseOrderRecordsByApprovalStatusPaginationHandler,
    GetStockPurchaseOrderRecordsByStatusPaginationHandler,
    GetStockPurchaseOrderRecordsBySupplierPaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InventoryDatabaseServiceModule,
        MessageQueueLibModule,
    ],
    controllers: [StockPurchaseOrderController],
    providers: [
        {
            provide: 'StockPurchaseOrderDatabaseService',
            useClass: StockPurchaseOrderDatabaseService,
        },
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        ...handlers,
    ],
})
export class StockPurchaseOrderModule {}
