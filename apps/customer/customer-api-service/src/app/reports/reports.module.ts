import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GetCustomerListReportHandler } from './queries/get.customer.list/get.customer.list.handler';
import { ReportsController } from './reports.controller';

@Module({
    imports: [CqrsModule, DynamoDbLibModule, ConfigurationLibModule, AuthGuardLibModule, CustomerDatabaseServiceModule],
    controllers: [ReportsController],
    providers: [
        {
            provide: 'CustomerDatabaseService',
            useClass: CustomerDatabaseService,
        },
        GetCustomerListReportHandler,
    ],
})
export class ReportsModule {}
