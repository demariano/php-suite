import { Module } from '@nestjs/common';

import { AuthGuardLibModule } from '@auth-guard-lib';
import { AwsCognitoLibModule } from '@aws-cognito-lib';
import { ConfigurationDatabaseService, ConfigurationDatabaseServiceModule } from '@configuration-database-service';
import {
    AreaDatabaseService,
    CustomerClassificationDatabaseService,
    CustomerDatabaseService,
    CustomerDatabaseServiceModule,
    CustomerTypeDatabaseService,
    TermsDatabaseService,
    TownDatabaseService,
} from '@customer-database-service';
import {
    InventoryDatabaseServiceModule,
    StockDatabaseService,
    StockTypeDatabaseService,
} from '@inventory-database-service';
import {
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    SalesTypeDatabaseService,
    TerritoryManagerDatabaseService,
} from '@invoicing-database-service';
import {
    ProductCategoryDatabaseService,
    ProductClassDatabaseService,
    ProductDatabaseService,
    ProductDatabaseServiceModule,
    ProductDealDatabaseService,
    ProductPriceTypeDatabaseService,
    ProductUnitDatabaseService,
} from '@product-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        ConfigurationDatabaseServiceModule,
        AwsCognitoLibModule,
        AuthGuardLibModule,
        ProductDatabaseServiceModule,
        CustomerDatabaseServiceModule,
        InventoryDatabaseServiceModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: 'ConfigurationDatabaseService',
            useClass: ConfigurationDatabaseService,
        },
        {
            provide: 'ProductDatabaseService',
            useClass: ProductDatabaseService,
        },
        {
            provide: 'ProductCategoryDatabaseService',
            useClass: ProductCategoryDatabaseService,
        },
        {
            provide: 'ProductClassDatabaseService',
            useClass: ProductClassDatabaseService,
        },
        {
            provide: 'ProductUnitDatabaseService',
            useClass: ProductUnitDatabaseService,
        },
        {
            provide: 'ProductPriceTypeDatabaseService',
            useClass: ProductPriceTypeDatabaseService,
        },
        {
            provide: 'ProductDealDatabaseService',
            useClass: ProductDealDatabaseService,
        },
        {
            provide: 'CustomerClassificationDatabaseService',
            useClass: CustomerClassificationDatabaseService,
        },
        {
            provide: 'CustomerTypeDatabaseService',
            useClass: CustomerTypeDatabaseService,
        },
        {
            provide: 'AreaDatabaseService',
            useClass: AreaDatabaseService,
        },
        {
            provide: 'TownDatabaseService',
            useClass: TownDatabaseService,
        },
        {
            provide: 'TermsDatabaseService',
            useClass: TermsDatabaseService,
        },
        {
            provide: 'CustomerDatabaseService',
            useClass: CustomerDatabaseService,
        },
        {
            provide: 'StockTypeDatabaseService',
            useClass: StockTypeDatabaseService,
        },
        {
            provide: 'StockDatabaseService',
            useClass: StockDatabaseService,
        },
        {
            provide: 'SalesTypeDatabaseService',
            useClass: SalesTypeDatabaseService,
        },
        {
            provide: 'TerritoryManagerDatabaseService',
            useClass: TerritoryManagerDatabaseService,
        },
        {
            provide: 'InvoiceDatabaseService',
            useClass: InvoiceDatabaseService,
        },
    ],
})
export class AppModule {}
