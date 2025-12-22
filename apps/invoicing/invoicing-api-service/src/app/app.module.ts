import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectionReceiptRangeModule } from './collection-receipt-range/collection-receipt-range.module';
import { ContractModule } from './contract/contract.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { ReturnGoodSoldModule } from './return-good-sold/return.good.sold.module';
import { SalesTypeModule } from './sales-type/sales-type.module';
import { TerritoryManagerModule } from './territory-manager/territory-manager.module';

@Module({
    imports: [
        SalesTypeModule,
        TerritoryManagerModule,
        InvoiceModule,
        ContractModule,
        PaymentModule,
        ReturnGoodSoldModule,
        CollectionReceiptRangeModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
