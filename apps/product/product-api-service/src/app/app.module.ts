import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductCategoryModule } from './product-category/product-category.module';
import { ProductClassModule } from './product-class/product-class.module';
import { ProductDealModule } from './product-deal/product-deal.module';
import { ProductPriceTypeModule } from './product-price-type/product-price-type.module';
import { ProductUnitModule } from './product-unit/product-unit.module';

@Module({
    imports: [ProductCategoryModule, ProductUnitModule, ProductClassModule, ProductDealModule, ProductPriceTypeModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
