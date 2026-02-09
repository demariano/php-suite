import { Module } from '@nestjs/common';

import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    CollectionReceiptRangeDatabaseService,
    ContractDatabaseService,
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    OverPaymentDatabaseService,
    PaymentDatabaseService,
    PaymentInvoiceDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { MessageQueueAwsLibService } from '@message-queue-lib';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync.handler.service';
import { ContractInvoiceHandlerService } from './contract-invoice-handler/contract.invoice.handler.service';
import { ContractPaymentHandlerService } from './contract-payment-handler/contract.payment.handler.service';
import { ContractSyncHandlerService } from './contract-sync-handler/contract-sync.handler.service';
import { CustomerSyncHandlerService } from './customer-sync-handler/customer-sync.handler.service';
import { InvoiceAmountCalculatorHandlerService } from './invoice-amount-calculator/invoice.amount.calculator.handler.service';
import { InvoicePaymentHandlerService } from './invoice-payment-handler/invoice.payment.handler.service';
import { MessageHandlerService } from './message.handler.service';
import { ProductPriceTypeSyncHandlerService } from './product-price-type-sync-handler/product-price-type-sync.handler.service';
import { SalesTypeSyncHandlerService } from './sales-type-sync-handler/sales-type-sync.handler.service';
import { SqsLocalService } from './sqs.local.service';
import { TermsSyncHandlerService } from './terms-sync-handler/terms-sync.handler.service';
import { TerritoryManagerSyncHandlerService } from './territory-manager-sync-handler/territory-manager-sync.handler.service';

@Module({
    imports: [DynamoDbLibModule, InvoicingDatabaseServiceModule],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        InvoicePaymentHandlerService,
        ContractPaymentHandlerService,
        ContractInvoiceHandlerService,
        CustomerSyncHandlerService,
        AreaSyncHandlerService,
        TerritoryManagerSyncHandlerService,
        SalesTypeSyncHandlerService,
        ContractSyncHandlerService,
        TermsSyncHandlerService,
        ProductPriceTypeSyncHandlerService,
        InvoiceAmountCalculatorHandlerService,
        {
            provide: 'InvoiceDatabaseService',
            useClass: InvoiceDatabaseService,
        },
        {
            provide: 'ContractDatabaseService',
            useClass: ContractDatabaseService,
        },
        {
            provide: 'PaymentDatabaseService',
            useClass: PaymentDatabaseService,
        },
        {
            provide: 'OverPaymentDatabaseService',
            useClass: OverPaymentDatabaseService,
        },
        {
            provide: 'ReturnGoodSoldDatabaseService',
            useClass: ReturnGoodSoldDatabaseService,
        },
        {
            provide: 'CollectionReceiptRangeDatabaseService',
            useClass: CollectionReceiptRangeDatabaseService,
        },
        {
            provide: 'PaymentInvoiceDatabaseService',
            useClass: PaymentInvoiceDatabaseService,
        },
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
    ],
})
export class AppModule {}
