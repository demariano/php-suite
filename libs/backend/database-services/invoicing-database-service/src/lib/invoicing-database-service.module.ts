import { Module } from '@nestjs/common';
import { CollectionReceiptRangeDatabaseService } from './collection-receipt-range-database-service';
import { ContractDatabaseService } from './contract-database-service';
import { InvoiceDatabaseService } from './invoice-database-service';
import { OverPaymentDatabaseService } from './over-payment-database-service';
import { PaymentContractDatabaseService } from './payment-contract-database-service';
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
        ContractDatabaseService,
        OverPaymentDatabaseService,
        PaymentContractDatabaseService,
        PaymentInvoiceDatabaseService,
    ],
    exports: [
        SalesTypeDatabaseService,
        TerritoryManagerDatabaseService,
        InvoiceDatabaseService,
        CollectionReceiptRangeDatabaseService,
        ContractDatabaseService,
        OverPaymentDatabaseService,
        PaymentContractDatabaseService,
        PaymentInvoiceDatabaseService,
    ],
})
export class InvoicingDatabaseServiceModule {}
