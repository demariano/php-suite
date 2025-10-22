import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContractModule } from './contract/contract.module';
import { InvoiceModule } from './invoice/invoice.module';
import { SalesTypeModule } from './sales-type/sales-type.module';
import { TerritoryManagerModule } from './territory-manager/territory-manager.module';

@Module({
    imports: [SalesTypeModule, TerritoryManagerModule, InvoiceModule, ContractModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
