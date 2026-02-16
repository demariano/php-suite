import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RawMaterialSupplierModule } from './raw-material-supplier/raw-material-supplier.module';
import { RawMaterialUnitModule } from './raw-material-unit/raw-material-unit.module';
import { RawMaterialModule } from './raw-material/raw-material.module';
import { RawMaterialsLocationModule } from './raw-materials-location/raw-materials-location.module';
import { RawMaterialsPurchaseOrderModule } from './raw-materials-purchase-order/raw-materials-purchase-order.module';
import { RawMaterialsStockModule } from './raw-materials-stock/raw-materials-stock.module';
import { ReportsModule } from './reports/reports.module';
import { StockDeliveryModule } from './stock-delivery/stock-delivery.module';
import { StockPurchaseOrderModule } from './stock-purchase-order/stock-purchase-order.module';
import { StockTypeModule } from './stock-type/stock-type.module';
import { StockModule } from './stock/stock.module';
import { SupplierModule } from './supplier/supplier.module';

@Module({
    imports: [
        SupplierModule,
        StockDeliveryModule,
        RawMaterialModule,
        RawMaterialUnitModule,
        RawMaterialSupplierModule,
        RawMaterialsLocationModule,
        RawMaterialsStockModule,
        RawMaterialsPurchaseOrderModule,
        StockPurchaseOrderModule,
        StockModule,
        StockTypeModule,
        ReportsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
