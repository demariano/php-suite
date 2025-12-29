import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, RawMaterialDatabaseService } from '@inventory-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateRawMaterialHandler } from './command/create/create.handler';
import { DeleteRawMaterialHandler } from './command/delete/delete.handler';
import { UpdateRawMaterialHandler } from './command/update/update.handler';
import { GetRawMaterialByIdHandler } from './queries/get.by.id/get.raw.material.by.id.handler';
import { GetRawMaterialByNameHandler } from './queries/get.by.name/get.raw.material.by.name.handler';
import { GetRawMaterialRecordsByNamePaginationHandler } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.handler';
import { GetRawMaterialRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialController } from './raw-material.controller';

const handlers = [
    CreateRawMaterialHandler,
    UpdateRawMaterialHandler,
    DeleteRawMaterialHandler,
    GetRawMaterialByIdHandler,
    GetRawMaterialByNameHandler,
    GetRawMaterialRecordsPaginationHandler,
    GetRawMaterialRecordsByStatusPaginationHandler,
    GetRawMaterialRecordsByNamePaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [RawMaterialController],
    providers: [
        {
            provide: 'RawMaterialDatabaseService',
            useClass: RawMaterialDatabaseService,
        },
        ...handlers,
    ],
})
export class RawMaterialModule {}
