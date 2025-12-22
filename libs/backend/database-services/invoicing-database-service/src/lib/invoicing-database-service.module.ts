import { Module } from '@nestjs/common';
import { CollectionReceiptRangeDatabaseService } from './collection-receipt-range-database-service';
import { InvoiceDatabaseService } from './invoice-database-service';
import { SalesTypeDatabaseService } from './sales-type-database-service';
import { TerritoryManagerDatabaseService } from './territory-manager-database-service';

@Module({
    controllers: [],
    providers: [
        SalesTypeDatabaseService,
        TerritoryManagerDatabaseService,
        InvoiceDatabaseService,
        CollectionReceiptRangeDatabaseService,
    ],
    exports: [
        SalesTypeDatabaseService,
        TerritoryManagerDatabaseService,
        InvoiceDatabaseService,
        CollectionReceiptRangeDatabaseService,
    ],
})
export class InvoicingDatabaseServiceModule {}
