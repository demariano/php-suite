import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    InventoryDatabaseServiceModule,
    RawMaterialsPurchaseOrderDatabaseService,
    RawMaterialsStockDatabaseService,
} from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveRawMaterialsPurchaseOrderHandler } from './command/approve-record/approve.handler';
import { CreateRawMaterialsPurchaseOrderHandler } from './command/create/create.handler';
import { DeleteDeliveredPurchaseOrderHandler } from './command/delete-delivered-purchase-order/delete-delivered-purchase-order.handler';
import { DeleteRawMaterialsPurchaseOrderHandler } from './command/delete/delete.handler';
import { DenyRawMaterialsPurchaseOrderHandler } from './command/deny-record/deny.handler';
import { IncomingPurchaseOrderHandler } from './command/incoming-purchase-order/incoming-purchase-order.handler';
import { SystemGeneratedToPendingHandler } from './command/system-generated-to-pending/system-generated-to-pending.handler';
import { UpdateRawMaterialsPurchaseOrderHandler } from './command/update/update.handler';
import { GetRawMaterialsPurchaseOrderByIdHandler } from './queries/get.by.id/get.raw.materials.purchase-order.by.id.handler';
import { GetRawMaterialsPurchaseOrderRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationHandler } from './queries/get.records.by.supplier.pagination/get.records.by.supplier.pagination.handler';
import { GetRawMaterialsPurchaseOrderRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialsPurchaseOrderController } from './raw-materials-purchase-order.controller';

const handlers = [
    ApproveRawMaterialsPurchaseOrderHandler,
    CreateRawMaterialsPurchaseOrderHandler,
    DeleteRawMaterialsPurchaseOrderHandler,
    DenyRawMaterialsPurchaseOrderHandler,
    IncomingPurchaseOrderHandler,
    DeleteDeliveredPurchaseOrderHandler,
    SystemGeneratedToPendingHandler,
    UpdateRawMaterialsPurchaseOrderHandler,
    GetRawMaterialsPurchaseOrderByIdHandler,
    GetRawMaterialsPurchaseOrderRecordsPaginationHandler,
    GetRawMaterialsPurchaseOrderRecordsByStatusPaginationHandler,
    GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationHandler,
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
    controllers: [RawMaterialsPurchaseOrderController],
    providers: [
        {
            provide: 'RawMaterialsPurchaseOrderDatabaseService',
            useClass: RawMaterialsPurchaseOrderDatabaseService,
        },
        {
            provide: 'RawMaterialsStockDatabaseService',
            useClass: RawMaterialsStockDatabaseService,
        },
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        ...handlers,
    ],
})
export class RawMaterialsPurchaseOrderModule {}
