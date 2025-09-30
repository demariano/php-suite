import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerClassificationDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveCustomerClassificationHandler } from './command/approve-record/approve.handler';
import { CreateCustomerClassificationHandler } from './command/create/create.handler';
import { DeleteCustomerClassificationHandler } from './command/delete/delete.handler';
import { DenyCustomerClassificationHandler } from './command/deny-record/deny.handler';
import { UpdateCustomerClassificationHandler } from './command/update/update.handler';
import { CustomerClassificationController } from './customer-classification.controller';
import { GetCustomerClassificationByIdHandler } from './queries/get.by.id/get.customer.classification.by.id.handler';
import { GetCustomerClassificationByNameHandler } from './queries/get.by.name/get.customer.classification.by.name.handler';
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
    controllers: [CustomerClassificationController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'CustomerClassificationDatabaseService',
            useClass: CustomerClassificationDatabaseService,
        },
        CreateCustomerClassificationHandler,
        GetCustomerClassificationByIdHandler,
        GetCustomerClassificationByNameHandler,
        GetRecordsPaginationHandler,
        UpdateCustomerClassificationHandler,
        DeleteCustomerClassificationHandler,
        ApproveCustomerClassificationHandler,
        DenyCustomerClassificationHandler,
    ],
})
export class CustomerClassificationModule {}
