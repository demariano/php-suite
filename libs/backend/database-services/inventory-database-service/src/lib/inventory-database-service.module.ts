import { Module } from '@nestjs/common';
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
        'StockTypeDatabaseService',
        'SupplierDatabaseService',
        'StockDeliveryDatabaseService',
    ],
})
export class InventoryDatabaseServiceModule {}
