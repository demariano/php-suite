import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, RawMaterialUnitDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveRawMaterialUnitHandler } from './command/approve-record/approve.handler';
import { CreateRawMaterialUnitHandler } from './command/create/create.handler';
import { DeleteRawMaterialUnitHandler } from './command/delete/delete.handler';
import { DenyRawMaterialUnitHandler } from './command/deny-record/deny.handler';
import { UpdateRawMaterialUnitHandler } from './command/update/update.handler';
import { GetRawMaterialUnitByIdHandler } from './queries/get.by.id/get.raw.material.unit.by.id.handler';
import { GetRawMaterialUnitByNameHandler } from './queries/get.by.name/get.raw.material.unit.by.name.handler';
import { GetRawMaterialUnitRecordsByNamePaginationHandler } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.handler';
import { GetRawMaterialUnitRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialUnitRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialUnitController } from './raw-material-unit.controller';

const handlers = [
    ApproveRawMaterialUnitHandler,
    CreateRawMaterialUnitHandler,
    UpdateRawMaterialUnitHandler,
    DeleteRawMaterialUnitHandler,
    DenyRawMaterialUnitHandler,
    GetRawMaterialUnitByIdHandler,
    GetRawMaterialUnitByNameHandler,
    GetRawMaterialUnitRecordsPaginationHandler,
    GetRawMaterialUnitRecordsByStatusPaginationHandler,
    GetRawMaterialUnitRecordsByNamePaginationHandler,
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
    controllers: [RawMaterialUnitController],
    providers: [
        {
            provide: 'RawMaterialUnitDatabaseService',
            useClass: RawMaterialUnitDatabaseService,
        },
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        ...handlers,
    ],
})
export class RawMaterialUnitModule {}
