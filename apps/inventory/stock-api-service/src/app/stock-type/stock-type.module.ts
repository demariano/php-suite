import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockTypeDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveStockTypeHandler } from './command/approve-record/approve.handler';
import { CreateStockTypeHandler } from './command/create/create.handler';
import { DeleteStockTypeHandler } from './command/delete/delete.handler';
import { DenyStockTypeHandler } from './command/deny-record/deny.handler';
import { UpdateStockTypeHandler } from './command/update/update.handler';
import { GetStockTypeByIdHandler } from './queries/get.by.id/get.stock.type.by.id.handler';
import { GetStockTypeByNameHandler } from './queries/get.by.name/get.stock.type.by.name.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { StockTypeController } from './stock-type.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [StockTypeController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'StockTypeDatabaseService',
            useClass: StockTypeDatabaseService,
        },
        CreateStockTypeHandler,
        GetStockTypeByIdHandler,
        GetStockTypeByNameHandler,
        GetRecordsPaginationHandler,
        UpdateStockTypeHandler,
        DeleteStockTypeHandler,
        ApproveStockTypeHandler,
        DenyStockTypeHandler,
    ],
})
export class StockTypeModule {}
