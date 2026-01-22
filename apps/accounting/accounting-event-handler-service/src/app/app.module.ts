import { Module } from '@nestjs/common';

import { AccountingDatabaseServiceModule } from '@php/accounting-database-service';
import { AccountSyncHandlerService } from './account-sync-handler/account-sync.handler.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync.handler.service';
import { CustomerSyncHandlerService } from './customer-sync-handler/';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [AccountingDatabaseServiceModule],
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
