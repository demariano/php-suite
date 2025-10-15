import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoiceModule } from './invoice/invoice.module';
import { SalesTypeModule } from './sales-type/sales-type.module';
import { TerritoryManagerModule } from './territory-manager/territory-manager.module';

@Module({
    imports: [SalesTypeModule, TerritoryManagerModule, InvoiceModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
