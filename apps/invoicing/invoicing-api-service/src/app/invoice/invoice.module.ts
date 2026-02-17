import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { InventoryDatabaseServiceModule, StockDatabaseService } from '@inventory-database-service';
import {
    ContractDatabaseService,
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    PaymentInvoiceDatabaseService,
} from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ConfigurationDatabaseService, ConfigurationDatabaseServiceModule } from '@configuration-database-service';
import { InvoiceStockDeltaService } from '../shared/invoice-stock-delta.service';
import { ApproveInvoiceHandler } from './command/approve-record/approve.handler';
import { CreateInvoiceHandler } from './command/create/create.handler';
import { DeleteInvoiceHandler } from './command/delete/delete.handler';
import { DenyInvoiceHandler } from './command/deny-record/deny.handler';
import { SubmitDraftHandler } from './command/submit-draft/submit-draft.handler';
import { UpdateInvoiceHandler } from './command/update/update.handler';
import { ValidateInvoiceHandler } from './command/validate-invoice/validate-invoice.handler';
import { ValidateStockHandler } from './command/validate-stock/validate-stock.handler';
import { InvoiceController } from './invoice.controller';
import { GetInvoicesByContractIdHandler } from './queries/get.by.contract.id/get.invoices.by.contract.id.handler';
import { GetInvoicesByCustomerIdHandler } from './queries/get.by.customer.id/get.invoices.by.customer.id.handler';
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
        CustomerDatabaseServiceModule,
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
        {
            provide: 'ContractDatabaseService',
            useClass: ContractDatabaseService,
        },
        {
            provide: 'PaymentInvoiceDatabaseService',
            useClass: PaymentInvoiceDatabaseService,
        },
        {
            provide: 'CustomerDatabaseService',
            useClass: CustomerDatabaseService,
        },
        CreateInvoiceHandler,
        GetInvoiceByIdHandler,
        GetInvoiceByDocnoHandler,
        GetInvoicesByContractIdHandler,
        GetInvoicesByCustomerIdHandler,
        GetPendingPaymentInvoicesHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateInvoiceHandler,
        DeleteInvoiceHandler,
        ApproveInvoiceHandler,
        DenyInvoiceHandler,
        SubmitDraftHandler,
        ValidateStockHandler,
        ValidateInvoiceHandler,
        InvoiceStockDeltaService,
    ],
})
export class InvoiceModule {}
