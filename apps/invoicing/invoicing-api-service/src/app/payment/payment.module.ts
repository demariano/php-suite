import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { CustomerDatabaseService, CustomerDatabaseServiceModule } from '@customer-database-service';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    CollectionReceiptRangeDatabaseService,
    InvoicingDatabaseServiceModule,
    PaymentContractDatabaseService,
    PaymentDatabaseService,
    PaymentInvoiceDatabaseService,
} from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApprovePaymentHandler } from './command/approve-record/approve.handler';
import { CreatePaymentHandler } from './command/create/create.handler';
import { DeletePaymentHandler } from './command/delete/delete.handler';
import { DenyPaymentHandler } from './command/deny-record/deny.handler';
import { UpdatePaymentHandler } from './command/update/update.handler';
import { PaymentController } from './payment.controller';
import { GetPaymentsByCustomerIdHandler } from './queries/get.by.customer.id/get.payments.by.customer.id.handler';
import { GetPaymentByIdHandler } from './queries/get.by.id/get.payment.by.id.handler';
import { GetPaymentInvoicesByInvoiceIdHandler } from './queries/get.by.invoiceId/get.payment.invoices.by.invoiceId.handler';
import { GetPaymentByNameHandler } from './queries/get.by.name/get.payment.by.name.handler';
import { GetPaymentByReceiptNoHandler } from './queries/get.by.receiptNo/get.payment.by.receiptNo.handler';
import { GetPaymentsContainingReceiptNoHandler } from './queries/get.containing.receiptNo/get.payments.containing.receiptNo.handler';
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
        CustomerDatabaseServiceModule,
    ],
    controllers: [PaymentController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'PaymentDatabaseService',
            useClass: PaymentDatabaseService,
        },
        {
            provide: 'CollectionReceiptRangeDatabaseService',
            useClass: CollectionReceiptRangeDatabaseService,
        },
        {
            provide: 'CustomerDatabaseService',
            useClass: CustomerDatabaseService,
        },
        {
            provide: 'PaymentInvoiceDatabaseService',
            useClass: PaymentInvoiceDatabaseService,
        },
        {
            provide: 'PaymentContractDatabaseService',
            useClass: PaymentContractDatabaseService,
        },
        CreatePaymentHandler,
        GetPaymentByIdHandler,
        GetPaymentInvoicesByInvoiceIdHandler,
        GetPaymentByNameHandler,
        GetPaymentByReceiptNoHandler,
        GetPaymentsContainingReceiptNoHandler,
        GetPaymentsByCustomerIdHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdatePaymentHandler,
        DeletePaymentHandler,
        ApprovePaymentHandler,
        DenyPaymentHandler,
    ],
})
export class PaymentModule {}
