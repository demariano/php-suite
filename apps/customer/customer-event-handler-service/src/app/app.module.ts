import { Module } from '@nestjs/common';

import { CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync-handler.service';
import { CustomerBalanceHandlerService } from './customer-balance-handler/customer-balance-handler.service';
import { CustomerClassificationSyncHandlerService } from './customer-classification-sync-handler/customer-classification-sync-handler.service';
import { CustomerTypeSyncHandlerService } from './customer-type-sync-handler/customer-type-sync-handler.service';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';
import { TerritoryManagerSyncHandlerService } from './territory-manager-sync-handler/territory-manager-sync-handler.service';

@Module({
    imports: [CustomerDatabaseServiceModule, DynamoDbLibModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        CustomerClassificationSyncHandlerService,
        CustomerTypeSyncHandlerService,
        AreaSyncHandlerService,
        TerritoryManagerSyncHandlerService,
        CustomerBalanceHandlerService,
    ],
})
export class AppModule {}
