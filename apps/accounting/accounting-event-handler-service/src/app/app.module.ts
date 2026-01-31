import { Module } from '@nestjs/common';

import { DynamoDbLibModule } from '@dynamo-db-lib';

import { AccountSyncHandlerService } from './account-sync-handler/account-sync.handler.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync.handler.service';

import { AccountingDatabaseServiceModule } from '@accounting-database-service';
import { CustomerSyncHandlerService } from './customer-sync-handler/customer-sync.handler.service';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [AccountingDatabaseServiceModule, DynamoDbLibModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        AccountSyncHandlerService,
        CustomerSyncHandlerService,
        AreaSyncHandlerService,
    ],
})
export class AppModule {}
