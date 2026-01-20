import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InvoiceDatabaseService, InvoicingDatabaseServiceModule } from '@invoicing-database-service';
import { StockDatabaseService, InventoryDatabaseServiceModule } from '@inventory-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ConfigurationDatabaseService, ConfigurationDatabaseServiceModule } from '@configuration-database-service';
import { ApproveInvoiceHandler } from './command/approve-record/approve.handler';
import { CreateInvoiceHandler } from './command/create/create.handler';
import { DeleteInvoiceHandler } from './command/delete/delete.handler';
import { DenyInvoiceHandler } from './command/deny-record/deny.handler';
import { SubmitDraftHandler } from './command/submit-draft/submit-draft.handler';
import { UpdateInvoiceHandler } from './command/update/update.handler';
import { ValidateStockHandler } from './command/validate-stock/validate-stock.handler';
import { InvoiceController } from './invoice.controller';
import { GetInvoiceByDocnoHandler } from './queries/get.by.docno/get.invoice.by.docno.handler';
import { GetInvoiceByIdHandler } from './queries/get.by.id/get.invoice.by.id.handler';
import { GetPendingPaymentInvoicesHandler } from './queries/get.pending.payment.invoices/get.pending.payment.invoices.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InvoicingDatabaseServiceModule,
        ConfigurationDatabaseServiceModule,
        InventoryDatabaseServiceModule,
    ],
    controllers: [InvoiceController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'InvoiceDatabaseService',
            useClass: InvoiceDatabaseService,
        },
        {
            provide: 'ConfigurationDatabaseService',
            useClass: ConfigurationDatabaseService,
        },
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        CreateInvoiceHandler,
        GetInvoiceByIdHandler,
        GetInvoiceByDocnoHandler,
        GetPendingPaymentInvoicesHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateInvoiceHandler,
        DeleteInvoiceHandler,
        ApproveInvoiceHandler,
        DenyInvoiceHandler,
        SubmitDraftHandler,
        ValidateStockHandler,
    ],
})
export class InvoiceModule {}
