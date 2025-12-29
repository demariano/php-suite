import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, RawMaterialSupplierDatabaseService } from '@inventory-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveRawMaterialSupplierHandler } from './command/approve-record/approve.handler';
import { CreateRawMaterialSupplierHandler } from './command/create/create.handler';
import { DeleteRawMaterialSupplierHandler } from './command/delete/delete.handler';
import { DenyRawMaterialSupplierHandler } from './command/deny-record/deny.handler';
import { UpdateRawMaterialSupplierHandler } from './command/update/update.handler';
import { GetRawMaterialSupplierByIdHandler } from './queries/get.by.id/get.raw.material.supplier.by.id.handler';
import { GetRawMaterialSupplierByNameHandler } from './queries/get.by.name/get.raw.material.supplier.by.name.handler';
import { GetRawMaterialSupplierRecordsByNamePaginationHandler } from './queries/get.records.by.name.pagination/get.records.by.name.pagination.handler';
import { GetRawMaterialSupplierRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRawMaterialSupplierRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { RawMaterialSupplierController } from './raw-material-supplier.controller';

const handlers = [
    ApproveRawMaterialSupplierHandler,
    CreateRawMaterialSupplierHandler,
    UpdateRawMaterialSupplierHandler,
    DeleteRawMaterialSupplierHandler,
    DenyRawMaterialSupplierHandler,
    GetRawMaterialSupplierByIdHandler,
    GetRawMaterialSupplierByNameHandler,
    GetRawMaterialSupplierRecordsPaginationHandler,
    GetRawMaterialSupplierRecordsByStatusPaginationHandler,
    GetRawMaterialSupplierRecordsByNamePaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [RawMaterialSupplierController],
    providers: [
        {
            provide: 'RawMaterialSupplierDatabaseService',
            useClass: RawMaterialSupplierDatabaseService,
        },
        ...handlers,
    ],
})
export class RawMaterialSupplierModule {}
