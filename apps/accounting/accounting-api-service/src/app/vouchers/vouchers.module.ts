import { AccountingDatabaseServiceModule, VoucherDatabaseService } from '@accounting-database-service';
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VouchersController } from './vouchers.controller';
import { ApproveVoucherHandler } from './command/approve-record/approve.handler';
import { CreateVoucherHandler } from './command/create/create.handler';
import { DeleteVoucherHandler } from './command/delete/delete.handler';
import { DenyVoucherHandler } from './command/deny-record/deny.handler';
import { UpdateVoucherHandler } from './command/update/update.handler';
import { GetVoucherByIdHandler } from './queries/get.by.id/get.voucher.by.id.handler';
import { GetVoucherByVoucherNoHandler } from './queries/get.by.voucher.no/get.voucher.by.voucher.no.handler';
import { GetVouchersContainingVoucherNoHandler } from './queries/get.containing.voucher.no/get.vouchers.containing.voucher.no.handler';
import { GetVouchersByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.vouchers.by.status.pagination.handler';
import { GetVouchersByVoucherDatePaginationHandler } from './queries/get.records.by.voucher.date.pagination/get.vouchers.by.voucher.date.pagination.handler';
import { GetVouchersPaginationHandler } from './queries/get.records.pagination/get.vouchers.pagination.handler';

const commandHandlers = [
    CreateVoucherHandler,
    UpdateVoucherHandler,
    DeleteVoucherHandler,
    ApproveVoucherHandler,
    DenyVoucherHandler,
];

const queryHandlers = [
    GetVoucherByIdHandler,
    GetVoucherByVoucherNoHandler,
    GetVouchersContainingVoucherNoHandler,
    GetVouchersPaginationHandler,
    GetVouchersByStatusPaginationHandler,
    GetVouchersByVoucherDatePaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        AccountingDatabaseServiceModule,
    ],
    controllers: [VouchersController],
    providers: [
        ...commandHandlers,
        ...queryHandlers,
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'VoucherDatabaseService',
            useClass: VoucherDatabaseService,
        },
    ],
})
export class VouchersModule {}

