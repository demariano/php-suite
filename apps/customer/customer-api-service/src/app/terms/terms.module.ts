import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseServiceModule, TermsDatabaseService } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveTermsHandler } from './command/approve-record/approve.handler';
import { CreateTermsHandler } from './command/create/create.handler';
import { DeleteTermsHandler } from './command/delete/delete.handler';
import { DenyTermsHandler } from './command/deny-record/deny.handler';
import { UpdateTermsHandler } from './command/update/update.handler';
import { TermsController } from './terms.controller';
import { GetTermsByIdHandler } from './queries/get.by.id/get.terms.by.id.handler';
import { GetTermsByNameHandler } from './queries/get.by.name/get.terms.by.name.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [TermsController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'TermsDatabaseService',
            useClass: TermsDatabaseService,
        },
        CreateTermsHandler,
        GetTermsByIdHandler,
        GetTermsByNameHandler,
        GetRecordsPaginationHandler,
        UpdateTermsHandler,
        DeleteTermsHandler,
        ApproveTermsHandler,
        DenyTermsHandler,
    ],
})
export class TermsModule {}
