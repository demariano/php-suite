import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, RawMaterialsStockDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveRawMaterialsStockHandler } from './command/approve-record/approve.handler';
import { CreateRawMaterialsStockHandler } from './command/create/create.handler';
import { DeleteRawMaterialsStockHandler } from './command/delete/delete.handler';
import { DenyRawMaterialsStockHandler } from './command/deny-record/deny.handler';
import { UpdateRawMaterialsStockHandler } from './command/update/update.handler';
import { GetRawMaterialsStockByIdHandler } from './queries/get.by.id/get.raw.materials.stock.by.id.handler';
import { GetRawMaterialsStockByNameHandler } from './queries/get.by.name/get.raw.materials.stock.by.name.handler';
import { GetRawMaterialsStockRecordsByNamePaginationHandler } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.handler';
import { GetRawMaterialsStockRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialsStockRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialsStockController } from './raw-materials-stock.controller';

const handlers = [
    CreateRawMaterialsStockHandler,
    UpdateRawMaterialsStockHandler,
    DeleteRawMaterialsStockHandler,
    ApproveRawMaterialsStockHandler,
    DenyRawMaterialsStockHandler,
    GetRawMaterialsStockByIdHandler,
    GetRawMaterialsStockByNameHandler,
    GetRawMaterialsStockRecordsPaginationHandler,
    GetRawMaterialsStockRecordsByStatusPaginationHandler,
    GetRawMaterialsStockRecordsByNamePaginationHandler,
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
    controllers: [RawMaterialsStockController],
    providers: [
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
export class RawMaterialsStockModule {}
