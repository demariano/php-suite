import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InvoicingDatabaseServiceModule, SalesTypeDatabaseService } from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApproveSalesTypeHandler } from './command/approve-record/approve.handler';
import { CreateSalesTypeHandler } from './command/create/create.handler';
import { DeleteSalesTypeHandler } from './command/delete/delete.handler';
import { DenySalesTypeHandler } from './command/deny-record/deny.handler';
import { UpdateSalesTypeHandler } from './command/update/update.handler';
import { GetSalesTypeByIdHandler } from './queries/get.by.id/get.sales.type.by.id.handler';
import { GetSalesTypeByNameHandler } from './queries/get.by.name/get.sales.type.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { SalesTypeController } from './sales-type.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [SalesTypeController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'SalesTypeDatabaseService',
            useClass: SalesTypeDatabaseService,
        },
        CreateSalesTypeHandler,
        GetSalesTypeByIdHandler,
        GetSalesTypeByNameHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateSalesTypeHandler,
        DeleteSalesTypeHandler,
        ApproveSalesTypeHandler,
        DenySalesTypeHandler,
    ],
})
export class SalesTypeModule {}
