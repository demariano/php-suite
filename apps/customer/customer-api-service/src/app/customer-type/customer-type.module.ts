import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseServiceModule, CustomerTypeDatabaseService } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApproveCustomerTypeHandler } from './command/approve-record/approve.handler';
import { CreateCustomerTypeHandler } from './command/create/create.handler';
import { DeleteCustomerTypeHandler } from './command/delete/delete.handler';
import { DenyCustomerTypeHandler } from './command/deny-record/deny.handler';
import { UpdateCustomerTypeHandler } from './command/update/update.handler';
import { CustomerTypeController } from './customer-type.controller';
import { GetCustomerTypeByIdHandler } from './queries/get.by.id/get.customer.type.by.id.handler';
import { GetCustomerTypeByNameHandler } from './queries/get.by.name/get.customer.type.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
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
    controllers: [CustomerTypeController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'CustomerTypeDatabaseService',
            useClass: CustomerTypeDatabaseService,
        },
        CreateCustomerTypeHandler,
        GetCustomerTypeByIdHandler,
        GetCustomerTypeByNameHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateCustomerTypeHandler,
        DeleteCustomerTypeHandler,
        ApproveCustomerTypeHandler,
        DenyCustomerTypeHandler,
    ],
})
export class CustomerTypeModule {}
