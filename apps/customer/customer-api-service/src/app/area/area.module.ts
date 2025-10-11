import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { AreaDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AreaController } from './area.controller';
import { ApproveAreaHandler } from './command/approve-record/approve.handler';
import { CreateAreaHandler } from './command/create/create.handler';
import { DeleteAreaHandler } from './command/delete/delete.handler';
import { DenyAreaHandler } from './command/deny-record/deny.handler';
import { UpdateAreaHandler } from './command/update/update.handler';
import { GetAreaByIdHandler } from './queries/get.by.id/get.area.by.id.handler';
import { GetAreaByNameHandler } from './queries/get.by.name/get.area.by.name.handler';
import { GetAreasByTerritoryManagerIdHandler } from './queries/get.by.territory.manager.id/get.areas.by.territory.manager.id.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

const commandHandlers = [CreateAreaHandler, UpdateAreaHandler, DeleteAreaHandler, ApproveAreaHandler, DenyAreaHandler];

const queryHandlers = [
    GetAreaByIdHandler,
    GetAreaByNameHandler,
    GetAreasByTerritoryManagerIdHandler,
    GetRecordsPaginationHandler,
    GetRecordsByStatusPaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [AreaController],
    providers: [
        ...commandHandlers,
        ...queryHandlers,
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'AreaDatabaseService',
            useClass: AreaDatabaseService,
        },
    ],
})
export class AreaModule {}
