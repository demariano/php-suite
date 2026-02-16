import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductDatabaseService, ProductDatabaseServiceModule } from '@product-database-service';

import { GetProductListReportHandler } from './queries/get.product.list/get.product.list.handler';
import { ReportsController } from './reports.controller';

@Module({
    imports: [CqrsModule, DynamoDbLibModule, ConfigurationLibModule, AuthGuardLibModule, ProductDatabaseServiceModule],
    controllers: [ReportsController],
    providers: [
        {
            provide: 'ProductDatabaseService',
            useClass: ProductDatabaseService,
        },
        GetProductListReportHandler,
    ],
})
export class ReportsModule {}
