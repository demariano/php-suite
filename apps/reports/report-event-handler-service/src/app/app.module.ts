import { Module } from '@nestjs/common';

import { CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { ExcelGeneratorServiceModule } from '@excel-generator-service';
import { InvoicingDatabaseServiceModule } from '@invoicing-database-service';
import { ProductDatabaseServiceModule } from '@product-database-service';
import { ReportDatabaseServiceModule } from '@report-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerListReportHandlerService } from './customer-list-report-handler/customer-list-report-handler.service';
import { InvoicePerDatePerAreaReportHandlerService } from './invoice-per-date-per-area-report-handler/invoice-per-date-per-area-report-handler.service';
import { InvoicePerDatePerProductReportHandlerService } from './invoice-per-date-per-product-report-handler/invoice-per-date-per-product-report-handler.service';
import { InvoicePerDateReportHandlerService } from './invoice-per-date-report-handler/invoice-per-date-report-handler.service';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [
        CustomerDatabaseServiceModule,
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
    ],
})
export class AppModule {}
