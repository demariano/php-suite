import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseServiceModule, TownDatabaseService } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveTownHandler } from './command/approve-record/approve.handler';
import { CreateTownHandler } from './command/create/create.handler';
import { DeleteTownHandler } from './command/delete/delete.handler';
import { DenyTownHandler } from './command/deny-record/deny.handler';
import { UpdateTownHandler } from './command/update/update.handler';
import { GetTownByAreaStatusHandler } from './queries/get.by.area.status/get.town.by.area.status.handler';
import { GetTownByIdHandler } from './queries/get.by.id/get.town.by.id.handler';
import { GetTownByNameHandler } from './queries/get.by.name/get.town.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { TownController } from './town.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [TownController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'TownDatabaseService',
            useClass: TownDatabaseService,
        },
        CreateTownHandler,
        GetTownByIdHandler,
        GetTownByNameHandler,
        GetRecordsPaginationHandler,
        UpdateTownHandler,
        DeleteTownHandler,
        ApproveTownHandler,
        DenyTownHandler,
        GetRecordsByStatusPaginationHandler,
        GetTownByAreaStatusHandler,
    ],
})
export class TownModule {}
