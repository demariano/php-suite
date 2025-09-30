import { Module } from '@nestjs/common';
import { StockDatabaseService } from './stock-database-service';
import { StockTypeDatabaseService } from './stock-type-database-service';

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
    ],
    exports: ['StockDatabaseService', 'StockTypeDatabaseService'],
})
export class InventoryDatabaseServiceModule {}
