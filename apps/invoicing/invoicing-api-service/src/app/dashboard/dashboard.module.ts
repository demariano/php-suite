import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    ContractDatabaseService,
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    PaymentDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DashboardController } from './dashboard.controller';
import { GetContractExpirationHandler } from './queries/get.contract.expiration/get.contract.expiration.handler';
import { GetInvoicePaymentStatusChartHandler } from './queries/get.invoice.payment.status.chart/get.invoice.payment.status.chart.handler';
import { GetInvoicesCreatedChartHandler } from './queries/get.invoices.created.chart/get.invoices.created.chart.handler';
import { GetPaymentsCreatedChartHandler } from './queries/get.payments.created.chart/get.payments.created.chart.handler';
import { GetReturnGoodsSoldChartHandler } from './queries/get.return.goods.sold.chart/get.return.goods.sold.chart.handler';
import { GetDashboardSummaryHandler } from './queries/get.summary/get.dashboard.summary.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [DashboardController],
    providers: [
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
            provide: 'ReturnGoodSoldDatabaseService',
            useClass: ReturnGoodSoldDatabaseService,
        },
        GetDashboardSummaryHandler,
        GetInvoicesCreatedChartHandler,
        GetInvoicePaymentStatusChartHandler,
        GetPaymentsCreatedChartHandler,
        GetReturnGoodsSoldChartHandler,
        GetContractExpirationHandler,
    ],
})
export class DashboardModule {}
