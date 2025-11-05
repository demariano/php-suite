import { Module } from '@nestjs/common';
import { AccountsDatabaseService } from './accounts-database-service';
import { VoucherDatabaseService } from './voucher-database-service';

@Module({
    controllers: [],
    providers: [AccountsDatabaseService, VoucherDatabaseService],
    exports: [AccountsDatabaseService, VoucherDatabaseService],
})
export class AccountingDatabaseServiceModule {}
