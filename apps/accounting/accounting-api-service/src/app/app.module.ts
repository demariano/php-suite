import { Module } from '@nestjs/common';

import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VouchersModule } from './vouchers/vouchers.module';

@Module({
    imports: [AccountsModule, VouchersModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
