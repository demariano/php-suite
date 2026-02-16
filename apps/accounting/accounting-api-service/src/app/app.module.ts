import { Module } from '@nestjs/common';

import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReportsModule } from './reports/reports.module';
import { VouchersModule } from './vouchers/vouchers.module';

@Module({
    imports: [AccountsModule, VouchersModule, ReportsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
