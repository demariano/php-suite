import { Module } from '@nestjs/common';

import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';
import { ProductSyncHandlerService } from './product-sync-handler.service';
import { ProductUnitSyncHandlerService } from './product-unit-sync-handler.service';
import { RawMaterialSupplierSyncHandlerService } from './raw-material-supplier-sync-handler.service';
import { RawMaterialSyncHandlerService } from './raw-material-sync-handler.service';
import { RawMaterialUnitSyncHandlerService } from './raw-material-unit-sync-handler.service';
import { RawMaterialsLocationSyncHandlerService } from './raw-materials-location-sync-handler.service';
import { SqsLocalService } from './sqs.local.service';
import { StockQtyHandlerService } from './stock-qty-handler/stock.qty.handler.service';
import { StockTypeSyncHandlerService } from './stock-type-sync-handler.service';
import { SupplierSyncHandlerService } from './supplier-sync-handler.service';

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
        StockTypeSyncHandlerService,
        RawMaterialSyncHandlerService,
        RawMaterialUnitSyncHandlerService,
        RawMaterialSupplierSyncHandlerService,
        RawMaterialsLocationSyncHandlerService,
        SupplierSyncHandlerService,
        ProductSyncHandlerService,
        ProductUnitSyncHandlerService,
    ],
})
export class AppModule {}
