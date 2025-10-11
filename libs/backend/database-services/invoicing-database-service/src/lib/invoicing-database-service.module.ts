import { Module } from '@nestjs/common';
import { SalesTypeDatabaseService } from './sales-type-database-service';
import { TerritoryManagerDatabaseService } from './territory-manager-database-service';

@Module({
    controllers: [],
    providers: [SalesTypeDatabaseService, TerritoryManagerDatabaseService],
    exports: [SalesTypeDatabaseService, TerritoryManagerDatabaseService],
})
export class InvoicingDatabaseServiceModule {}
