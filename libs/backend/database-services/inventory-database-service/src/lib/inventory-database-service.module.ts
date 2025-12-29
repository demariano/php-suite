import { Module } from '@nestjs/common';
import { RawMaterialDatabaseService } from './raw-material-database-service';
import { RawMaterialSupplierDatabaseService } from './raw-material-supplier-database-service';
import { RawMaterialUnitDatabaseService } from './raw-material-unit-database-service';
import { RawMaterialsLocationDatabaseService } from './raw-materials-location-database-service';
import { RawMaterialsStockDatabaseService } from './raw-materials-stock-database-service';
import { RawMaterialsPurchaseOrderDatabaseService } from './raw-materials-purchase-order-database-service';
import { StockDatabaseService } from './stock-database-service';
import { StockDeliveryDatabaseService } from './stock-delivery-database-service';
import { StockTypeDatabaseService } from './stock-type-database-service';
import { SupplierDatabaseService } from './supplier-database-service';

@Module({
    controllers: [],
    providers: [
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        {
            provide: 'RawMaterialDatabaseService',
            useClass: RawMaterialDatabaseService,
        },
        {
            provide: 'RawMaterialSupplierDatabaseService',
            useClass: RawMaterialSupplierDatabaseService,
        },
        {
            provide: 'RawMaterialUnitDatabaseService',
            useClass: RawMaterialUnitDatabaseService,
        },
        {
            provide: 'RawMaterialsLocationDatabaseService',
            useClass: RawMaterialsLocationDatabaseService,
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
            provide: 'StockTypeDatabaseService',
            useClass: StockTypeDatabaseService,
        },
        {
            provide: 'SupplierDatabaseService',
            useClass: SupplierDatabaseService,
        },
        {
            provide: 'StockDeliveryDatabaseService',
            useClass: StockDeliveryDatabaseService,
        },
    ],
    exports: [
        'StockDatabaseService',
        'RawMaterialDatabaseService',
        'RawMaterialSupplierDatabaseService',
        'RawMaterialUnitDatabaseService',
        'RawMaterialsLocationDatabaseService',
        'RawMaterialsStockDatabaseService',
        'RawMaterialsPurchaseOrderDatabaseService',
        'StockTypeDatabaseService',
        'SupplierDatabaseService',
        'StockDeliveryDatabaseService',
    ],
})
export class InventoryDatabaseServiceModule {}
