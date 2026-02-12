import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import {
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    PaymentInvoiceDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InvoiceStockDeltaService } from '../shared/invoice-stock-delta.service';
import { ApproveReturnGoodSoldHandler } from './command/approve-record/approve.handler';
import { CreateReturnGoodSoldHandler } from './command/create/create.handler';
import { DeleteReturnGoodSoldHandler } from './command/delete/delete.handler';
import { DenyReturnGoodSoldHandler } from './command/deny-record/deny.handler';
import { UpdateReturnGoodSoldHandler } from './command/update/update.handler';
import { GetReturnGoodSoldByCustomerIdHandler } from './queries/get.by.customerId/get.return.good.sold.by.customerId.handler';
import { GetReturnGoodSoldByIdHandler } from './queries/get.by.id/get.return.good.sold.by.id.handler';
import { GetReturnGoodSoldByInvoiceIdHandler } from './queries/get.by.invoiceId/get.return.good.sold.by.invoiceId.handler';
import { GetReturnGoodSoldByRgsDocnoHandler } from './queries/get.by.rgsDocno/get.return.good.sold.by.rgsDocno.handler';
import { GetReturnGoodSoldRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetReturnGoodSoldRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';
import { ReturnGoodSoldController } from './return.good.sold.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [ReturnGoodSoldController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ReturnGoodSoldDatabaseService',
            useClass: ReturnGoodSoldDatabaseService,
        },
        {
            provide: 'InvoiceDatabaseService',
            useClass: InvoiceDatabaseService,
        },
        {
            provide: 'PaymentInvoiceDatabaseService',
            useClass: PaymentInvoiceDatabaseService,
        },
        CreateReturnGoodSoldHandler,
        GetReturnGoodSoldByIdHandler,
        GetReturnGoodSoldByInvoiceIdHandler,
        GetReturnGoodSoldByCustomerIdHandler,
        GetReturnGoodSoldByRgsDocnoHandler,
        GetReturnGoodSoldRecordsPaginationHandler,
        GetReturnGoodSoldRecordsByStatusPaginationHandler,
        UpdateReturnGoodSoldHandler,
        DeleteReturnGoodSoldHandler,
        ApproveReturnGoodSoldHandler,
        DenyReturnGoodSoldHandler,
        InvoiceStockDeltaService,
    ],
})
export class ReturnGoodSoldModule {}
