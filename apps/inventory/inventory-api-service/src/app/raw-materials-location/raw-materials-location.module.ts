import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, RawMaterialsLocationDatabaseService } from '@inventory-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveRawMaterialsLocationHandler } from './command/approve-record/approve.handler';
import { CreateRawMaterialsLocationHandler } from './command/create/create.handler';
import { DeleteRawMaterialsLocationHandler } from './command/delete/delete.handler';
import { DenyRawMaterialsLocationHandler } from './command/deny-record/deny.handler';
import { UpdateRawMaterialsLocationHandler } from './command/update/update.handler';
import { GetRawMaterialsLocationByIdHandler } from './queries/get.by.id/get.raw.materials.location.by.id.handler';
import { GetRawMaterialsLocationByNameHandler } from './queries/get.by.name/get.raw.materials.location.by.name.handler';
import { GetRawMaterialsLocationRecordsByNamePaginationHandler } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.handler';
import { GetRawMaterialsLocationRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialsLocationRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialsLocationController } from './raw-materials-location.controller';

const handlers = [
    ApproveRawMaterialsLocationHandler,
    CreateRawMaterialsLocationHandler,
    UpdateRawMaterialsLocationHandler,
    DeleteRawMaterialsLocationHandler,
    DenyRawMaterialsLocationHandler,
    GetRawMaterialsLocationByIdHandler,
    GetRawMaterialsLocationByNameHandler,
    GetRawMaterialsLocationRecordsPaginationHandler,
    GetRawMaterialsLocationRecordsByStatusPaginationHandler,
    GetRawMaterialsLocationRecordsByNamePaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [RawMaterialsLocationController],
    providers: [
        {
            provide: 'RawMaterialsLocationDatabaseService',
            useClass: RawMaterialsLocationDatabaseService,
        },
        ...handlers,
    ],
})
export class RawMaterialsLocationModule {}
