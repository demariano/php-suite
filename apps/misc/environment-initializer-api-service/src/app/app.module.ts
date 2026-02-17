import { Module } from '@nestjs/common';

import {
    AccountingDatabaseServiceModule,
    AccountsDatabaseService,
    VoucherDatabaseService,
} from '@accounting-database-service';
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
} from '@customer-database-service';
import {
    InventoryDatabaseServiceModule,
    RawMaterialDatabaseService,
    RawMaterialsLocationDatabaseService,
    RawMaterialsStockDatabaseService,
    RawMaterialSupplierDatabaseService,
    RawMaterialUnitDatabaseService,
    StockDatabaseService,
    StockTypeDatabaseService,
    SupplierDatabaseService,
} from '@inventory-database-service';
import {
    CollectionReceiptRangeDatabaseService,
    ContractDatabaseService,
    InvoiceDatabaseService,
    InvoicingDatabaseServiceModule,
    OverPaymentDatabaseService,
    PaymentDatabaseService,
    PaymentInvoiceDatabaseService,
    ReturnGoodSoldDatabaseService,
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
        AccountingDatabaseServiceModule,
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
        {
            provide: 'ContractDatabaseService',
            useClass: ContractDatabaseService,
        },
        {
            provide: 'AccountsDatabaseService',
            useClass: AccountsDatabaseService,
        },
        {
            provide: 'SupplierDatabaseService',
            useClass: SupplierDatabaseService,
        },
        {
            provide: 'RawMaterialDatabaseService',
            useClass: RawMaterialDatabaseService,
        },
        {
            provide: 'RawMaterialUnitDatabaseService',
            useClass: RawMaterialUnitDatabaseService,
        },
        {
            provide: 'RawMaterialsLocationDatabaseService',
            useClass: RawMaterialsLocationDatabaseService,
        },
        {
            provide: 'RawMaterialSupplierDatabaseService',
            useClass: RawMaterialSupplierDatabaseService,
        },
        {
            provide: 'RawMaterialsStockDatabaseService',
            useClass: RawMaterialsStockDatabaseService,
        },
        {
            provide: 'CollectionReceiptRangeDatabaseService',
            useClass: CollectionReceiptRangeDatabaseService,
        },
        {
            provide: 'VoucherDatabaseService',
            useClass: VoucherDatabaseService,
        },
        {
            provide: 'PaymentDatabaseService',
            useClass: PaymentDatabaseService,
        },
        {
            provide: 'PaymentInvoiceDatabaseService',
            useClass: PaymentInvoiceDatabaseService,
        },
        {
            provide: 'OverPaymentDatabaseService',
            useClass: OverPaymentDatabaseService,
        },
        {
            provide: 'ReturnGoodSoldDatabaseService',
            useClass: ReturnGoodSoldDatabaseService,
        },
    ],
})
export class AppModule {}
