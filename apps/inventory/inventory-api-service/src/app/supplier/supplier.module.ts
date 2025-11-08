import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, SupplierDatabaseService } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveSupplierHandler } from './command/approve-record/approve.handler';
import { CreateSupplierHandler } from './command/create/create.handler';
import { DeleteSupplierHandler } from './command/delete/delete.handler';
import { DenySupplierHandler } from './command/deny-record/deny.handler';
import { UpdateSupplierHandler } from './command/update/update.handler';
import { GetSupplierByIdHandler } from './queries/get.by.id/get.supplier.by.id.handler';
import { GetSupplierByNameHandler } from './queries/get.by.name/get.supplier.by.name.handler';
import { GetRecordsByFilterPaginationHandler } from './queries/get.records.by.filter/get.records.by.filter.pagination.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { SupplierController } from './supplier.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [SupplierController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'SupplierDatabaseService',
            useClass: SupplierDatabaseService,
        },
        CreateSupplierHandler,
        GetSupplierByIdHandler,
        GetSupplierByNameHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        GetRecordsByFilterPaginationHandler,
        UpdateSupplierHandler,
        DeleteSupplierHandler,
        ApproveSupplierHandler,
        DenySupplierHandler,
    ],
})
export class SupplierModule {}

