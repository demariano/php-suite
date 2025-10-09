import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveCustomerHandler } from './command/approve-record/approve.handler';
import { CreateCustomerHandler } from './command/create/create.handler';
import { DeleteCustomerHandler } from './command/delete/delete.handler';
import { DenyCustomerHandler } from './command/deny-record/deny.handler';
import { UpdateCustomerHandler } from './command/update/update.handler';
import { CustomerController } from './customer.controller';
import { GetCustomerByIdHandler } from './queries/get.by.id/get.customer.by.id.handler';
import { GetCustomerByNameHandler } from './queries/get.by.name/get.customer.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetCustomerRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        CustomerDatabaseServiceModule,
    ],
    controllers: [CustomerController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'CustomerDatabaseService',
            useClass: CustomerDatabaseService,
        },
        CreateCustomerHandler,
        GetCustomerByIdHandler,
        GetCustomerByNameHandler,
        GetCustomerRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateCustomerHandler,
        DeleteCustomerHandler,
        ApproveCustomerHandler,
        DenyCustomerHandler,
    ],
})
export class CustomerModule {}
