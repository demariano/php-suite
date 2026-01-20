import { Module } from '@nestjs/common';

import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';
import { StockQtyHandlerService } from './stock-qty-handler/stock.qty.handler.service';
import { DynamoDbLibModule } from '@dynamo-db-lib';

@Module({
    imports: [InventoryDatabaseServiceModule, DynamoDbLibModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        StockQtyHandlerService,
    ],
})
export class AppModule {}
