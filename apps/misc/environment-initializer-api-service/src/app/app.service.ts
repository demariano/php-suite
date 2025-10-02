import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import {
    AreaDatabaseServiceAbstract,
    CustomerClassificationDatabaseServiceAbstract,
    CustomerDatabaseServiceAbstract,
    CustomerTypeDatabaseServiceAbstract,
    TermsDatabaseServiceAbstract,
    TownDatabaseServiceAbstract,
} from '@customer-database-service';
import {
    AreaDto,
    ConfigurationDto,
    CustomerClassificationDto,
    CustomerDto,
    CustomerTypeDto,
    InitializeEnvironmentDto,
    ProductCategoryDto,
    ProductClassDto,
    ProductDealDetailsDto,
    ProductDealDto,
    ProductDto,
    ProductPriceTypeDto,
    ProductUnitDto,
    ProductUnitPriceDto,
    StatusEnum,
    StockDto,
    StockTypeDto,
    TermsDto,
    TownDto,
} from '@dto';
import { StockDatabaseServiceAbstract, StockTypeDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Injectable } from '@nestjs/common';
import {
    ProductCategoryDatabaseServiceAbstract,
    ProductClassDatabaseServiceAbstract,
    ProductDatabaseServiceAbstract,
    ProductDealDatabaseServiceAbstract,
    ProductPriceTypeDatabaseServiceAbstract,
    ProductUnitDatabaseServiceAbstract,
} from '@product-database-service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
    constructor(
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract,
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract,
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract,
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract,
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract,
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract,
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract,

        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract,

        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract,

        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract,

        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract,

        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract,

        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract,

        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract,

        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    healthCheck(): { status: string; version: string } {
        //get the version and return it as part of the health check
        const version = this.getVersion();
        return { status: 'ok', version: version.version };
    }

    getVersion(): { version: string } {
        // read the version.dat file from the assets directory
        const versionPath = path.join(__dirname, 'assets', 'version.dat');
        let version: string;
        try {
            version = fs.readFileSync(versionPath, 'utf8').trim();
        } catch (err) {
            console.error(`Error reading version.dat file: ${err}`);
            version = '0.0.0';
        }
        return { version };
    }

    async initializeEnvironment(initializeEnvironmentDto: InitializeEnvironmentDto) {
        const configurationData3: ConfigurationDto = new ConfigurationDto();
        configurationData3.configurationName = 'DEFAULT_SENDER_EMAIL';
        configurationData3.configurationValue = initializeEnvironmentDto.defaultSenderEmail;
        try {
            await this.configurationDatabaseService.createRecord(configurationData3);
        } catch (error) {
            console.error('Failed to create configuration record:', error);
        }

        //create dummy data for all tables in the database

        //create 2 product category
        const productCategoryData = new ProductCategoryDto();
        productCategoryData.productCategoryName = 'Product Category 1';
        productCategoryData.status = StatusEnum.ACTIVE;
        const productCategoryRecord1 = await this.productCategoryDatabaseService.createRecord(productCategoryData);

        const productCategoryData2 = new ProductCategoryDto();
        productCategoryData2.productCategoryName = 'Product Category 2';
        productCategoryData2.status = StatusEnum.ACTIVE;
        const productCategoryRecord2 = await this.productCategoryDatabaseService.createRecord(productCategoryData2);

        //create 2 product class
        const productClassData = new ProductClassDto();
        productClassData.productClassName = 'Product Class 1';
        productClassData.status = StatusEnum.ACTIVE;
        const productClassRecord1 = await this.productClassDatabaseService.createRecord(productClassData);

        const productClassData2 = new ProductClassDto();
        productClassData2.productClassName = 'Product Class 2';
        productClassData2.status = StatusEnum.ACTIVE;
        const productClassRecord2 = await this.productClassDatabaseService.createRecord(productClassData2);

        //create 2 product unit
        const productUnitData = new ProductUnitDto();
        productUnitData.productUnitName = 'Product Unit 1';
        productUnitData.status = StatusEnum.ACTIVE;
        const productUnitRecord1 = await this.productUnitDatabaseService.createRecord(productUnitData);

        const productUnitData2 = new ProductUnitDto();
        productUnitData2.productUnitName = 'Product Unit 2';
        productUnitData2.status = StatusEnum.ACTIVE;
        const productUnitRecord2 = await this.productUnitDatabaseService.createRecord(productUnitData2);

        //create 2 product price type
        const productPriceTypeData = new ProductPriceTypeDto();
        productPriceTypeData.productPriceTypeName = 'Product Price Type 1';
        productPriceTypeData.status = StatusEnum.ACTIVE;
        const productPriceTypeRecord1 = await this.productPriceTypeDatabaseService.createRecord(productPriceTypeData);

        const productPriceTypeData2 = new ProductPriceTypeDto();
        productPriceTypeData2.productPriceTypeName = 'Product Price Type 2';
        productPriceTypeData2.status = StatusEnum.ACTIVE;
        const productPriceTypeRecord2 = await this.productPriceTypeDatabaseService.createRecord(productPriceTypeData2);

        //create 2 product deals
        const productDealData = new ProductDealDto();
        productDealData.productDealName = 'Product Deal 1';
        productDealData.additionalQty = 1;
        productDealData.minQty = 2;
        productDealData.status = StatusEnum.ACTIVE;
        const productDealRecord1 = await this.productDealDatabaseService.createRecord(productDealData);

        const productDealData2 = new ProductDealDto();
        productDealData2.productDealName = 'Product Deal 2';
        productDealData2.additionalQty = 1;
        productDealData2.minQty = 2;
        productDealData2.status = StatusEnum.ACTIVE;
        const productDealRecord2 = await this.productDealDatabaseService.createRecord(productDealData2);

        //create 3 products with different categories, classes, units, price types, and deals
        const productData = new ProductDto();
        productData.productName = 'Product 1';
        productData.productCategoryId = productCategoryRecord1.productCategoryId;
        productData.productCategoryName = productCategoryRecord1.productCategoryName;
        productData.productClassId = productClassRecord1.productClassId;
        productData.productClassName = productClassRecord1.productClassName;
        productData.status = StatusEnum.ACTIVE;

        const productDealDetails1 = new ProductDealDetailsDto();
        productDealDetails1.productDealId = productDealRecord1.productDealId;
        productDealDetails1.productDealName = productDealRecord1.productDealName;
        productDealDetails1.additionalQty = productDealRecord1.additionalQty;
        productDealDetails1.minQty = productDealRecord1.minQty;

        const productDealDetails2 = new ProductDealDetailsDto();
        productDealDetails2.productDealId = productDealRecord2.productDealId;
        productDealDetails2.productDealName = productDealRecord2.productDealName;
        productDealDetails2.additionalQty = productDealRecord2.additionalQty;
        productDealDetails2.minQty = productDealRecord2.minQty;

        productData.productDeals = [productDealDetails1, productDealDetails2];

        const productUnitPrice1 = new ProductUnitPriceDto();
        productUnitPrice1.productUnitId = productUnitRecord1.productUnitId;
        productUnitPrice1.productUnitName = productUnitRecord1.productUnitName;
        productUnitPrice1.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        productUnitPrice1.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        productUnitPrice1.cost = 111.0;
        productUnitPrice1.price = 160.99;

        const productUnitPrice2 = new ProductUnitPriceDto();
        productUnitPrice2.productUnitId = productUnitRecord2.productUnitId;
        productUnitPrice2.productUnitName = productUnitRecord2.productUnitName;
        productUnitPrice2.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        productUnitPrice2.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        productUnitPrice2.cost = 222.0;
        productUnitPrice2.price = 260.99;

        productData.productUnitPrice = [productUnitPrice1, productUnitPrice2];

        const productRecord1 = await this.productDatabaseService.createRecord(productData);

        //create 2 products with different categories, classes, units, price types, and deals
        const productData2 = new ProductDto();
        productData2.productName = 'Product 2';
        productData2.productCategoryId = productCategoryRecord2.productCategoryId;
        productData2.productCategoryName = productCategoryRecord2.productCategoryName;
        productData2.productClassId = productClassRecord2.productClassId;
        productData2.productClassName = productClassRecord2.productClassName;
        productData2.status = StatusEnum.ACTIVE;

        const productDealDetails3 = new ProductDealDetailsDto();
        productDealDetails3.productDealId = productDealRecord1.productDealId;
        productDealDetails3.productDealName = productDealRecord1.productDealName;
        productDealDetails3.additionalQty = productDealRecord1.additionalQty;
        productDealDetails3.minQty = productDealRecord1.minQty;

        const productDealDetails4 = new ProductDealDetailsDto();
        productDealDetails4.productDealId = productDealRecord2.productDealId;
        productDealDetails4.productDealName = productDealRecord2.productDealName;
        productDealDetails4.additionalQty = productDealRecord2.additionalQty;
        productDealDetails4.minQty = productDealRecord2.minQty;

        productData2.productDeals = [productDealDetails3, productDealDetails4];

        const productUnitPrice3 = new ProductUnitPriceDto();
        productUnitPrice3.productUnitId = productUnitRecord1.productUnitId;
        productUnitPrice3.productUnitName = productUnitRecord1.productUnitName;
        productUnitPrice3.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        productUnitPrice3.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        productUnitPrice3.cost = 333.0;
        productUnitPrice3.price = 360.99;

        const productUnitPrice4 = new ProductUnitPriceDto();
        productUnitPrice4.productUnitId = productUnitRecord2.productUnitId;
        productUnitPrice4.productUnitName = productUnitRecord2.productUnitName;
        productUnitPrice4.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        productUnitPrice4.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        productUnitPrice4.cost = 444.0;
        productUnitPrice4.price = 460.99;

        productData2.productUnitPrice = [productUnitPrice3, productUnitPrice4];

        const productRecord2 = await this.productDatabaseService.createRecord(productData2);

        //create the tables for customer domain

        //create 2 customer classifications
        const customerClassificationData = new CustomerClassificationDto();
        customerClassificationData.customerClassificationName = 'Customer Classification 1';
        customerClassificationData.status = StatusEnum.ACTIVE;
        const customerClassificationRecord1 = await this.customerClassificationDatabaseService.createRecord(
            customerClassificationData
        );

        const customerClassificationData2 = new CustomerClassificationDto();
        customerClassificationData2.customerClassificationName = 'Customer Classification 2';
        customerClassificationData2.status = StatusEnum.ACTIVE;
        const customerClassificationRecord2 = await this.customerClassificationDatabaseService.createRecord(
            customerClassificationData2
        );

        //create 2 customer types
        const customerTypeData = new CustomerTypeDto();
        customerTypeData.customerTypeName = 'Customer Type 1';
        customerTypeData.status = StatusEnum.ACTIVE;
        const customerTypeRecord1 = await this.customerTypeDatabaseService.createRecord(customerTypeData);

        const customerTypeData2 = new CustomerTypeDto();
        customerTypeData2.customerTypeName = 'Customer Type 2';
        customerTypeData2.status = StatusEnum.ACTIVE;
        const customerTypeRecord2 = await this.customerTypeDatabaseService.createRecord(customerTypeData2);

        //create 2 area
        const areaData = new AreaDto();
        areaData.areaName = 'Area 1';
        areaData.status = StatusEnum.ACTIVE;
        const areaRecord1 = await this.areaDatabaseService.createRecord(areaData);

        const areaData2 = new AreaDto();
        areaData2.areaName = 'Area 2';
        areaData2.status = StatusEnum.ACTIVE;
        const areaRecord2 = await this.areaDatabaseService.createRecord(areaData2);

        //create 2 town
        const townData = new TownDto();
        townData.townName = 'Town 1';
        townData.areaId = areaRecord1.areaId;
        townData.status = StatusEnum.ACTIVE;
        const townRecord1 = await this.townDatabaseService.createRecord(townData);

        const townData2 = new TownDto();
        townData2.townName = 'Town 2';
        townData2.areaId = areaRecord2.areaId;
        townData2.status = StatusEnum.ACTIVE;
        const townRecord2 = await this.townDatabaseService.createRecord(townData2);

        //create 2 terms
        const termsData = new TermsDto();
        termsData.termsName = 'Terms 1';
        termsData.status = StatusEnum.ACTIVE;
        termsData.days = 10;
        const termsRecord1 = await this.termsDatabaseService.createRecord(termsData);

        const termsData2 = new TermsDto();
        termsData2.termsName = 'Terms 2';
        termsData2.status = StatusEnum.ACTIVE;
        termsData2.days = 20;
        const termsRecord2 = await this.termsDatabaseService.createRecord(termsData2);

        //create 2 customer
        const customerData = new CustomerDto();
        customerData.customerName = 'Customer 1';
        customerData.status = StatusEnum.ACTIVE;
        customerData.customerClassificationId = customerClassificationRecord1.customerClassificationId;
        customerData.customerTypeId = customerTypeRecord1.customerTypeId;
        customerData.areaId = areaRecord1.areaId;
        customerData.townId = townRecord1.townId;
        customerData.customerTerms = [termsRecord1];
        customerData.customerDeals = [productDealRecord1];
        const customerRecord1 = await this.customerDatabaseService.createRecord(customerData);

        const customerData2 = new CustomerDto();
        customerData2.customerName = 'Customer 2';
        customerData2.status = StatusEnum.ACTIVE;
        customerData2.customerClassificationId = customerClassificationRecord2.customerClassificationId;
        customerData2.customerTypeId = customerTypeRecord2.customerTypeId;
        customerData2.areaId = areaRecord2.areaId;
        customerData2.townId = townRecord2.townId;
        customerData2.customerTerms = [termsRecord2];
        customerData2.customerDeals = [productDealRecord2];
        const customerRecord2 = await this.customerDatabaseService.createRecord(customerData2);

        //create 2 stock type
        const stockTypeData = new StockTypeDto();
        stockTypeData.stockTypeName = 'Stock Type 1';
        stockTypeData.status = StatusEnum.ACTIVE;
        const stockTypeRecord1 = await this.stockTypeDatabaseService.createRecord(stockTypeData);

        const stockTypeData2 = new StockTypeDto();
        stockTypeData2.stockTypeName = 'Stock Type 2';
        stockTypeData2.status = StatusEnum.ACTIVE;
        const stockTypeRecord2 = await this.stockTypeDatabaseService.createRecord(stockTypeData2);

        //create 4 stock records with different stock type and product id
        const stockData = new StockDto();
        stockData.productName = productRecord1.productName;
        stockData.lotNo = '1234567890';
        stockData.productId = productRecord1.productId;
        stockData.productUnitId = productUnitRecord1.productUnitId;
        stockData.productUnitName = productUnitRecord1.productUnitName;
        stockData.stockTypeId = stockTypeRecord1.stockTypeId;
        stockData.stockTypeName = stockTypeRecord1.stockTypeName;
        stockData.quantity = 100;
        stockData.expirationDate = '2025-12-01';
        stockData.status = StatusEnum.ACTIVE;
        await this.stockDatabaseService.createRecord(stockData);

        const stockData2 = new StockDto();
        stockData2.productName = productRecord2.productName;
        stockData2.lotNo = '0987654321';
        stockData2.productId = productRecord2.productId;
        stockData2.productUnitId = productUnitRecord2.productUnitId;
        stockData2.productUnitName = productUnitRecord2.productUnitName;
        stockData2.stockTypeId = stockTypeRecord2.stockTypeId;
        stockData2.stockTypeName = stockTypeRecord2.stockTypeName;
        stockData2.quantity = 200;
        stockData2.expirationDate = '2025-12-02';
        stockData2.status = StatusEnum.ACTIVE;
        await this.stockDatabaseService.createRecord(stockData2);
    }

    async deleteAllRecords() {
        await this.productCategoryDatabaseService.deleteAllRecords();
        await this.productClassDatabaseService.deleteAllRecords();
        await this.productUnitDatabaseService.deleteAllRecords();
        await this.productPriceTypeDatabaseService.deleteAllRecords();
        await this.productDealDatabaseService.deleteAllRecords();
        await this.customerClassificationDatabaseService.deleteAllRecords();
        await this.customerTypeDatabaseService.deleteAllRecords();
        await this.areaDatabaseService.deleteAllRecords();
        await this.townDatabaseService.deleteAllRecords();
        await this.termsDatabaseService.deleteAllRecords();
        await this.stockTypeDatabaseService.deleteAllRecords();
        await this.stockDatabaseService.deleteAllRecords();
        await this.customerDatabaseService.deleteAllRecords();
        await this.productDatabaseService.deleteAllRecords();
    }
}
