import { Module } from '@nestjs/common';

import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    ProductDatabaseService,
    ProductDatabaseServiceModule,
    ProductUnitRawMaterialDatabaseService,
} from '@product-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';
import { ProductCategorySyncHandlerService } from './product-category-sync-handler/product-category-sync.handler.service';
import { ProductClassSyncHandlerService } from './product-class-sync-handler/product-class-sync.handler.service';
import { ProductSyncHandlerService } from './product-sync-handler/product-sync.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [DynamoDbLibModule, ProductDatabaseServiceModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        ProductCategorySyncHandlerService,
        ProductClassSyncHandlerService,
        ProductSyncHandlerService,
        {
            provide: 'ProductDatabaseService',
            useClass: ProductDatabaseService,
        },
        {
            provide: 'ProductUnitRawMaterialDatabaseService',
            useClass: ProductUnitRawMaterialDatabaseService,
        },
    ],
})
export class AppModule {}
