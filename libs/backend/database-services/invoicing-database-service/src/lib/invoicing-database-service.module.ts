import { Module } from '@nestjs/common';
import { InvoiceDatabaseService } from './invoice-database-service';
import { SalesTypeDatabaseService } from './sales-type-database-service';
import { TerritoryManagerDatabaseService } from './territory-manager-database-service';

@Module({
    controllers: [],
    providers: [SalesTypeDatabaseService, TerritoryManagerDatabaseService, InvoiceDatabaseService],
    exports: [SalesTypeDatabaseService, TerritoryManagerDatabaseService, InvoiceDatabaseService],
})
export class InvoicingDatabaseServiceModule {}
