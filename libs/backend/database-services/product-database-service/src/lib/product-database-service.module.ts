import { Module } from '@nestjs/common';
import { ProductCategoryDatabaseService } from './product-category-database-service';
import { ProductClassDatabaseService } from './product-class-database-service';
import { ProductDatabaseService } from './product-database-service';
import { ProductDealDatabaseService } from './product-deal-database-service';
import { ProductPriceTypeDatabaseService } from './product-price-type-database-service';
import { ProductUnitDatabaseService } from './product-unit-database-service';

@Module({
    controllers: [],
    providers: [
        ProductDatabaseService,
        ProductCategoryDatabaseService,
        ProductClassDatabaseService,
        ProductUnitDatabaseService,
        ProductPriceTypeDatabaseService,
        ProductDealDatabaseService,
    ],
    exports: [
        ProductDatabaseService,
        ProductCategoryDatabaseService,
        ProductClassDatabaseService,
        ProductUnitDatabaseService,
        ProductPriceTypeDatabaseService,
        ProductDealDatabaseService,
    ],
})
export class ProductDatabaseServiceModule {}
