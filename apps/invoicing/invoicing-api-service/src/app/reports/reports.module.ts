import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    PaymentDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GetInvoicePaymentStatusReportHandler } from './queries/get.invoice.payment.status.report/get.invoice.payment.status.report.handler';
import { GetInvoicesPerContractHandler } from './queries/get.invoices.per.contract/get.invoices.per.contract.handler';
import { GetInvoicesPerCustomerHandler } from './queries/get.invoices.per.customer/get.invoices.per.customer.handler';
import { GetInvoicesPerDateHandler } from './queries/get.invoices.per.date/get.invoices.per.date.handler';
import { GetPaymentsReceivedReportHandler } from './queries/get.payments.received/get.payments.received.handler';
import { GetRgsPerCustomerHandler } from './queries/get.rgs.per.customer/get.rgs.per.customer.handler';
import { GetRgsPerDateHandler } from './queries/get.rgs.per.date/get.rgs.per.date.handler';
import { ReportsController } from './reports.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [ReportsController],
    providers: [
        {
            provide: 'InvoiceDatabaseService',
            useClass: InvoiceDatabaseService,
        },
        {
            provide: 'PaymentDatabaseService',
            useClass: PaymentDatabaseService,
        },
        {
            provide: 'ReturnGoodSoldDatabaseService',
            useClass: ReturnGoodSoldDatabaseService,
        },
        GetInvoicesPerDateHandler,
        GetInvoicesPerCustomerHandler,
        GetInvoicePaymentStatusReportHandler,
        GetInvoicesPerContractHandler,
        GetPaymentsReceivedReportHandler,
        GetRgsPerDateHandler,
        GetRgsPerCustomerHandler,
    ],
})
export class ReportsModule {}
