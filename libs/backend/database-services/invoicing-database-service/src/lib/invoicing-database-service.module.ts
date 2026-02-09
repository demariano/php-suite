import { Module } from '@nestjs/common';
import { CollectionReceiptRangeDatabaseService } from './collection-receipt-range-database-service';
import { InvoiceDatabaseService } from './invoice-database-service';
import { OverPaymentDatabaseService } from './over-payment-database-service';
import { PaymentInvoiceDatabaseService } from './payment-invoice-database-service';
import { SalesTypeDatabaseService } from './sales-type-database-service';
import { TerritoryManagerDatabaseService } from './territory-manager-database-service';

@Module({
    controllers: [],
    providers: [
        SalesTypeDatabaseService,
        TerritoryManagerDatabaseService,
        InvoiceDatabaseService,
        CollectionReceiptRangeDatabaseService,
        OverPaymentDatabaseService,
        PaymentInvoiceDatabaseService,
    ],
    exports: [
        SalesTypeDatabaseService,
        TerritoryManagerDatabaseService,
        InvoiceDatabaseService,
        CollectionReceiptRangeDatabaseService,
        OverPaymentDatabaseService,
        PaymentInvoiceDatabaseService,
    ],
})
export class InvoicingDatabaseServiceModule {}
