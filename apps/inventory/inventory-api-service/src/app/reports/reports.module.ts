import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GetStockListReportHandler } from './queries/get.stock.list/get.stock.list.handler';
import { ReportsController } from './reports.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [ReportsController],
    providers: [
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        GetStockListReportHandler,
    ],
})
export class ReportsModule {}
