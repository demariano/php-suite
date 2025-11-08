import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockDeliveryDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveStockDeliveryHandler } from './command/approve-record/approve.handler';
import { CreateStockDeliveryHandler } from './command/create/create.handler';
import { DeleteStockDeliveryHandler } from './command/delete/delete.handler';
import { DenyStockDeliveryHandler } from './command/deny-record/deny.handler';
import { UpdateStockDeliveryHandler } from './command/update/update.handler';
import { GetStockDeliveryByDocnoHandler } from './queries/get.by.docno/get.stock-delivery.by.docno.handler';
import { GetStockDeliveryByIdHandler } from './queries/get.by.id/get.stock-delivery.by.id.handler';
import { GetRecordsByFilterPaginationHandler } from './queries/get.records.by.filter.pagination/get.records.by.filter.pagination.handler';
import { GetRecordsByStatusAndSupplierHandler } from './queries/get.records.by.status.and.supplier/get.records.by.status.and.supplier.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { StockDeliveryController } from './stock-delivery.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [StockDeliveryController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'StockDeliveryDatabaseService',
            useClass: StockDeliveryDatabaseService,
        },
        CreateStockDeliveryHandler,
        GetStockDeliveryByIdHandler,
        GetStockDeliveryByDocnoHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        GetRecordsByFilterPaginationHandler,
        GetRecordsByStatusAndSupplierHandler,
        UpdateStockDeliveryHandler,
        DeleteStockDeliveryHandler,
        ApproveStockDeliveryHandler,
        DenyStockDeliveryHandler,
    ],
})
export class StockDeliveryModule {}
