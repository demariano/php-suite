import { Module } from '@nestjs/common';
import { AccountsDatabaseService } from './accounts-database-service';

@Module({
    controllers: [],
    providers: [AccountsDatabaseService],
    exports: [AccountsDatabaseService],
})
export class AccountingDatabaseServiceModule {}
