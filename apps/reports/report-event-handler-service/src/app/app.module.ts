import { Module } from '@nestjs/common';

import { AccountingDatabaseServiceModule } from '@accounting-database-service';
import { CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { ExcelGeneratorServiceModule } from '@excel-generator-service';
import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import {
    InvoicingDatabaseServiceModule,
    PaymentDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { ProductDatabaseServiceModule } from '@product-database-service';
import { ReportDatabaseServiceModule } from '@report-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerListReportHandlerService } from './customer-list-report-handler/customer-list-report-handler.service';
import { InvoicePerDatePerAreaReportHandlerService } from './invoice-per-date-per-area-report-handler/invoice-per-date-per-area-report-handler.service';
import { InvoicePerDatePerProductReportHandlerService } from './invoice-per-date-per-product-report-handler/invoice-per-date-per-product-report-handler.service';
import { InvoicePerDateReportHandlerService } from './invoice-per-date-report-handler/invoice-per-date-report-handler.service';
import { MessageHandlerService } from './message.handler.service';
import { PaymentsReceivedReportHandlerService } from './payments-received-report-handler/payments-received-report-handler.service';
import { ProductListReportHandlerService } from './product-list-report-handler/product-list-report-handler.service';
import { RgsPerDateReportHandlerService } from './rgs-per-date-report-handler/rgs-per-date-report-handler.service';
import { SqsLocalService } from './sqs.local.service';
import { StockListReportHandlerService } from './stock-list-report-handler/stock-list-report-handler.service';
import { VoucherPerDateReportHandlerService } from './voucher-per-date-report-handler/voucher-per-date-report-handler.service';

@Module({
    imports: [
        AccountingDatabaseServiceModule,
        CustomerDatabaseServiceModule,
        InventoryDatabaseServiceModule,
        InvoicingDatabaseServiceModule,
        ProductDatabaseServiceModule,
        ReportDatabaseServiceModule,
        ExcelGeneratorServiceModule,
        DynamoDbLibModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        CustomerListReportHandlerService,
        InvoicePerDateReportHandlerService,
        InvoicePerDatePerAreaReportHandlerService,
        InvoicePerDatePerProductReportHandlerService,
        PaymentDatabaseService,
        PaymentsReceivedReportHandlerService,
        RgsPerDateReportHandlerService,
        ReturnGoodSoldDatabaseService,
        StockDatabaseService,
        StockListReportHandlerService,
        ProductListReportHandlerService,
        VoucherPerDateReportHandlerService,
    ],
})
export class AppModule {}
