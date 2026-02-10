import { Module } from '@nestjs/common';

import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    InventoryDatabaseServiceModule,
    RawMaterialsPurchaseOrderDatabaseService,
    RawMaterialsStockDatabaseService,
    StockDatabaseService,
    StockDeliveryDatabaseService,
    StockPurchaseOrderDatabaseService,
} from '@inventory-database-service';
import { ProductDatabaseServiceModule, ProductUnitRawMaterialDatabaseService } from '@product-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';
import { ProductSyncHandlerService } from './product-sync-handler.service';
import { ProductUnitSyncHandlerService } from './product-unit-sync-handler.service';
import { RawMaterialSupplierSyncHandlerService } from './raw-material-supplier-sync-handler.service';
import { RawMaterialSyncHandlerService } from './raw-material-sync-handler.service';
import { RawMaterialUnitSyncHandlerService } from './raw-material-unit-sync-handler.service';
import { RawMaterialsAutoOrderService } from './raw-materials-auto-order/raw.materials.auto.order.service';
import { RawMaterialsLocationSyncHandlerService } from './raw-materials-location-sync-handler.service';
import { SqsLocalService } from './sqs.local.service';
import { StockQtyHandlerService } from './stock-qty-handler/stock.qty.handler.service';
import { StockTypeSyncHandlerService } from './stock-type-sync-handler.service';
import { SupplierSyncHandlerService } from './supplier-sync-handler.service';

@Module({
    imports: [InventoryDatabaseServiceModule, DynamoDbLibModule, ProductDatabaseServiceModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        {
            provide: 'RawMaterialsStockDatabaseService',
            useClass: RawMaterialsStockDatabaseService,
        },
        {
            provide: 'RawMaterialsPurchaseOrderDatabaseService',
            useClass: RawMaterialsPurchaseOrderDatabaseService,
        },
        {
            provide: 'StockPurchaseOrderDatabaseService',
            useClass: StockPurchaseOrderDatabaseService,
        },
        {
            provide: 'StockDeliveryDatabaseService',
            useClass: StockDeliveryDatabaseService,
        },
        {
            provide: 'ProductUnitRawMaterialDatabaseService',
            useClass: ProductUnitRawMaterialDatabaseService,
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
        RawMaterialsAutoOrderService,
    ],
})
export class AppModule {}
