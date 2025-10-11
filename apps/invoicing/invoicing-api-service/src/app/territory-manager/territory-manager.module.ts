import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InvoicingDatabaseServiceModule, TerritoryManagerDatabaseService } from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApproveTerritoryManagerHandler } from './command/approve-record/approve.handler';
import { CreateTerritoryManagerHandler } from './command/create/create.handler';
import { DeleteTerritoryManagerHandler } from './command/delete/delete.handler';
import { DenyTerritoryManagerHandler } from './command/deny-record/deny.handler';
import { UpdateTerritoryManagerHandler } from './command/update/update.handler';
import { GetTerritoryManagerByIdHandler } from './queries/get.by.id/get.territory.manager.by.id.handler';
import { GetTerritoryManagerByNameHandler } from './queries/get.by.name/get.territory.manager.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { TerritoryManagerController } from './territory-manager.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [TerritoryManagerController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'TerritoryManagerDatabaseService',
            useClass: TerritoryManagerDatabaseService,
        },
        CreateTerritoryManagerHandler,
        GetTerritoryManagerByIdHandler,
        GetTerritoryManagerByNameHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateTerritoryManagerHandler,
        DeleteTerritoryManagerHandler,
        ApproveTerritoryManagerHandler,
        DenyTerritoryManagerHandler,
    ],
})
export class TerritoryManagerModule {}
