import { AccountingDatabaseServiceModule, VoucherDatabaseService } from '@accounting-database-service';
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GetVouchersPerCustomerHandler } from './queries/get.vouchers.per.customer/get.vouchers.per.customer.handler';
import { GetVouchersPerDateHandler } from './queries/get.vouchers.per.date/get.vouchers.per.date.handler';
import { ReportsController } from './reports.controller';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        AccountingDatabaseServiceModule,
    ],
    controllers: [ReportsController],
    providers: [
        {
            provide: 'VoucherDatabaseService',
            useClass: VoucherDatabaseService,
        },
        GetVouchersPerDateHandler,
        GetVouchersPerCustomerHandler,
    ],
})
export class ReportsModule {}
