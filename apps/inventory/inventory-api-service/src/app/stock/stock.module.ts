import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveStockHandler } from './command/approve-record/approve.handler';
import { ConvertStockHandler } from './command/convert/convert.handler';
import { CreateStockHandler } from './command/create/create.handler';
import { DeleteStockHandler } from './command/delete/delete.handler';
import { DenyStockHandler } from './command/deny-record/deny.handler';
import { UpdateStockHandler } from './command/update/update.handler';
import { GetStockByIdHandler } from './queries/get.by.id/get.stock.by.id.handler';
import { GetStockByNameHandler } from './queries/get.by.name/get.stock.by.name.handler';
import { GetRecordsByFilterPaginationHandler } from './queries/get.records.by.filter/get.records.by.filter.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { StockController } from './stock.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [StockController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        ConvertStockHandler,
        CreateStockHandler,
        GetStockByIdHandler,
        GetStockByNameHandler,
        GetRecordsPaginationHandler,
        GetRecordsByFilterPaginationHandler,
        UpdateStockHandler,
        DeleteStockHandler,
        ApproveStockHandler,
        DenyStockHandler,
    ],
})
export class StockModule {}
