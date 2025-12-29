import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import {
    AreaDatabaseServiceAbstract,
    CustomerClassificationDatabaseServiceAbstract,
    CustomerDatabaseServiceAbstract,
    CustomerTypeDatabaseServiceAbstract,
    TermsDatabaseServiceAbstract,
} from '@customer-database-service';
import {
    AccountsDto,
    AccountTypeEnum,
    AreaDto,
    ConfigurationDto,
    ContractDto,
    CustomerClassificationDto,
    CustomerDto,
    CustomerProductDealDto,
    CustomerTypeDto,
    DeliveryStatusEnum,
    InitializeEnvironmentDto,
    PaymentStatusEnum,
    ProductCategoryDto,
    ProductClassDto,
    ProductDealDetailsDto,
    ProductDealDto,
    ProductDto,
    ProductPriceTypeDto,
    ProductUnitDto,
    ProductUnitPriceDto,
    RawMaterialDto,
    RawMaterialsLocationDto,
    RawMaterialsStockDto,
    RawMaterialSupplierDto,
    RawMaterialUnitDto,
    SalesTypeDto,
    StatusEnum,
    StockDto,
    StockTypeDto,
    SupplierDto,
    TermsDto,
    TerritoryManagerDto,
} from '@dto';
import {
    RawMaterialDatabaseServiceAbstract,
    RawMaterialsLocationDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
    RawMaterialSupplierDatabaseServiceAbstract,
    RawMaterialUnitDatabaseServiceAbstract,
    StockDatabaseServiceAbstract,
    StockTypeDatabaseServiceAbstract,
    SupplierDatabaseServiceAbstract,
} from '@inventory-database-service';
import {
    ContractDatabaseServiceAbstract,
    InvoiceDatabaseServiceAbstract,
    SalesTypeDatabaseServiceAbstract,
    TerritoryManagerDatabaseServiceAbstract,
} from '@invoicing-database-service';
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

        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract,

        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract,

        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract,

        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract,

        @Inject('TerritoryManagerDatabaseService')
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseServiceAbstract,

        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,

        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,

        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract,

        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract,

        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract,

        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract,

        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract,

        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract,

        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
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

        //creating invoice amount needed for approval as a configuration
        const invoiceAmountNeededForApproval = 1000;
        const configurationData4: ConfigurationDto = new ConfigurationDto();
        configurationData4.configurationName = 'INVOICE_AMOUNT_NEEDED_FOR_APPROVAL';
        configurationData4.configurationValue = invoiceAmountNeededForApproval.toString();
        try {
            await this.configurationDatabaseService.createRecord(configurationData4);
        } catch (error) {
            console.error('Failed to create configuration record:', error);
        }

        //create the starting invoice number
        const startingInvoiceNumber = 1;
        const configurationData5: ConfigurationDto = new ConfigurationDto();
        configurationData5.configurationName = 'STARTING_INVOICE_NUMBER';
        configurationData5.configurationValue = startingInvoiceNumber.toString();
        try {
            await this.configurationDatabaseService.createRecord(configurationData5);
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

        //create 2 sales types
        const salesTypeData = new SalesTypeDto();
        salesTypeData.salesTypeName = 'Contract Sales';
        salesTypeData.status = StatusEnum.ACTIVE;
        salesTypeData.contractSales = true;
        const salesTypeRecord1 = await this.salesTypeDatabaseService.createRecord(salesTypeData);

        const salesTypeData2 = new SalesTypeDto();
        salesTypeData2.salesTypeName = 'Non-Contract Sales Type';
        salesTypeData2.status = StatusEnum.ACTIVE;
        salesTypeData2.contractSales = false;
        const salesTypeRecord2 = await this.salesTypeDatabaseService.createRecord(salesTypeData2);

        //create 2 territory managers

        const territoryManagerData = new TerritoryManagerDto();
        territoryManagerData.territoryManagerName = 'Territory Manager 1';
        territoryManagerData.status = StatusEnum.ACTIVE;
        const territoryManagerRecord1 = await this.territoryManagerDatabaseService.createRecord(territoryManagerData);

        const territoryManagerData2 = new TerritoryManagerDto();
        territoryManagerData2.territoryManagerName = 'Territory Manager 2';
        territoryManagerData2.status = StatusEnum.ACTIVE;
        const territoryManagerRecord2 = await this.territoryManagerDatabaseService.createRecord(territoryManagerData2);

        //create 2 area
        const areaData = new AreaDto();
        areaData.areaName = 'Area 1';
        areaData.status = StatusEnum.ACTIVE;
        areaData.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        areaData.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        areaData.towns = ['Town 1'];
        const areaRecord1 = await this.areaDatabaseService.createRecord(areaData);

        const areaData2 = new AreaDto();
        areaData2.areaName = 'Area 2';
        areaData2.status = StatusEnum.ACTIVE;
        areaData2.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        areaData2.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        areaData2.towns = ['Town 2'];
        const areaRecord2 = await this.areaDatabaseService.createRecord(areaData2);

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
        customerData.customerClassificationName = customerClassificationRecord1.customerClassificationName;
        customerData.customerTypeId = customerTypeRecord1.customerTypeId;
        customerData.customerTypeName = customerTypeRecord1.customerTypeName;
        customerData.areaId = areaRecord1.areaId;
        customerData.areaName = areaRecord1.areaName;
        customerData.townName = areaRecord1.towns[0];
        customerData.customerTerms = [termsRecord1];
        const customerProductDeal1 = new CustomerProductDealDto();
        customerProductDeal1.productId = productRecord1.productId;
        customerProductDeal1.productName = productRecord1.productName;
        customerProductDeal1.productDealId = productDealRecord1.productDealId;
        customerProductDeal1.productDealName = productDealRecord1.productDealName;
        customerProductDeal1.additionalQty = productDealRecord1.additionalQty;
        customerProductDeal1.minQty = productDealRecord1.minQty;
        customerData.customerProductDeals = [customerProductDeal1];
        const customerRecord1 = await this.customerDatabaseService.createRecord(customerData);

        const customerData2 = new CustomerDto();
        customerData2.customerName = 'Customer 2';
        customerData2.status = StatusEnum.ACTIVE;
        customerData2.customerClassificationId = customerClassificationRecord2.customerClassificationId;
        customerData2.customerClassificationName = customerClassificationRecord2.customerClassificationName;
        customerData2.customerTypeId = customerTypeRecord2.customerTypeId;
        customerData2.customerTypeName = customerTypeRecord2.customerTypeName;
        customerData2.areaId = areaRecord2.areaId;
        customerData2.areaName = areaRecord2.areaName;

        customerData2.townName = areaRecord2.towns[0];
        customerData2.customerTerms = [termsRecord2];
        const customerProductDeal2 = new CustomerProductDealDto();
        customerProductDeal2.productId = productRecord2.productId;
        customerProductDeal2.productName = productRecord2.productName;
        customerProductDeal2.productDealId = productDealRecord2.productDealId;
        customerProductDeal2.productDealName = productDealRecord2.productDealName;
        customerProductDeal2.additionalQty = productDealRecord2.additionalQty;
        customerProductDeal2.minQty = productDealRecord2.minQty;
        customerData2.customerProductDeals = [customerProductDeal2];
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
        stockData.quantityOnHand = 100;
        stockData.availableQuantity = 100;
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
        stockData2.quantityOnHand = 200;
        stockData2.availableQuantity = 200;
        stockData2.expirationDate = '2025-12-02';
        stockData2.status = StatusEnum.ACTIVE;
        await this.stockDatabaseService.createRecord(stockData2);

        const stockData3 = new StockDto();
        stockData3.productName = productRecord1.productName;
        stockData3.lotNo = '111111';
        stockData3.productId = productRecord1.productId;
        stockData3.productUnitId = productUnitRecord1.productUnitId;
        stockData3.productUnitName = productUnitRecord1.productUnitName;
        stockData3.stockTypeId = stockTypeRecord1.stockTypeId;
        stockData3.stockTypeName = stockTypeRecord1.stockTypeName;
        stockData3.quantityOnHand = 600;
        stockData3.availableQuantity = 600;
        stockData3.expirationDate = '2025-12-01';
        stockData3.status = StatusEnum.ACTIVE;
        await this.stockDatabaseService.createRecord(stockData3);

        //add contract record for each customer
        const contractData1 = new ContractDto();
        contractData1.contractNo = '1234567890';
        contractData1.contractName = 'Contract 1';
        contractData1.customerId = customerRecord1.customerId;
        contractData1.customerName = customerRecord1.customerName;
        contractData1.status = StatusEnum.ACTIVE;
        contractData1.startDate = '2025-01-01';
        contractData1.endDate = '2025-12-31';
        contractData1.contractAmount = 10000;
        contractData1.amountPaid = 0;

        contractData1.deliveryStatus = DeliveryStatusEnum.PENDING;
        contractData1.paymentStatus = PaymentStatusEnum.PENDING;
        contractData1.deliveredAmount = 0;
        contractData1.activityLogs = [];
        contractData1.forApprovalVersion = {};
        contractData1.changeReason = '';
        contractData1.contractProductDeals = [
            {
                productId: productRecord1.productId,
                productName: productRecord1.productName,
                productDealId: productDealRecord1.productDealId,
                productDealName: productDealRecord1.productDealName,
                additionalQty: productDealRecord1.additionalQty,
                minQty: productDealRecord1.minQty,
            },
            {
                productId: productRecord2.productId,
                productName: productRecord2.productName,
                productDealId: productDealRecord2.productDealId,
                productDealName: productDealRecord2.productDealName,
                additionalQty: productDealRecord2.additionalQty,
                minQty: productDealRecord2.minQty,
            },
        ];
        await this.contractDatabaseService.createRecord(contractData1);

        const contractData2 = new ContractDto();
        contractData2.contractNo = '0987654321';
        contractData2.contractName = 'Contract 2';
        contractData2.customerId = customerRecord2.customerId;
        contractData2.customerName = customerRecord2.customerName;
        contractData2.status = StatusEnum.ACTIVE;
        contractData2.startDate = '2025-01-01';
        contractData2.endDate = '2025-12-31';
        contractData2.contractAmount = 10000;
        contractData2.amountPaid = 0;
        contractData2.contractProductDeals = [
            {
                productId: productRecord1.productId,
                productName: productRecord1.productName,
                productDealId: productDealRecord1.productDealId,
                productDealName: productDealRecord1.productDealName,
                additionalQty: productDealRecord1.additionalQty,
                minQty: productDealRecord1.minQty,
            },
            {
                productId: productRecord2.productId,
                productName: productRecord2.productName,
                productDealId: productDealRecord2.productDealId,
                productDealName: productDealRecord2.productDealName,
                additionalQty: productDealRecord2.additionalQty,
                minQty: productDealRecord2.minQty,
            },
        ];
        contractData2.deliveryStatus = DeliveryStatusEnum.PENDING;
        contractData2.paymentStatus = PaymentStatusEnum.PENDING;
        contractData2.deliveredAmount = 0;
        contractData2.activityLogs = [];
        contractData2.forApprovalVersion = {};
        contractData2.changeReason = '';
        await this.contractDatabaseService.createRecord(contractData2);

        //create 2 accounts
        const accountData1 = new AccountsDto();
        accountData1.accountName = 'Account 1 - Area';
        accountData1.accountType = AccountTypeEnum.AREA;
        accountData1.status = StatusEnum.ACTIVE;
        accountData1.subAccounts = ['Sub Account 1 - Area', 'Sub Account 2 - Area'];
        await this.accountsDatabaseService.createRecord(accountData1);

        const accountData2 = new AccountsDto();
        accountData2.accountName = 'Account 2 - Customer';
        accountData2.accountType = AccountTypeEnum.CUSTOMER;
        accountData2.status = StatusEnum.ACTIVE;
        accountData2.subAccounts = ['Sub Account 1 - Customer', 'Sub Account 2 - Customer'];
        await this.accountsDatabaseService.createRecord(accountData2);

        //create 2 supplier
        const supplierData1 = new SupplierDto();
        supplierData1.supplierName = 'Supplier 1';
        supplierData1.status = StatusEnum.ACTIVE;
        supplierData1.supplierAddress = 'Supplier Address 1';
        supplierData1.supplierPhone = 'Supplier Phone 1';
        supplierData1.supplierEmail = 'Supplier Email 1';
        supplierData1.supplierContactPerson = 'Supplier Contact Person 1';
        await this.supplierDatabaseService.createRecord(supplierData1);

        const supplierData2 = new SupplierDto();
        supplierData2.supplierName = 'Supplier 2';
        supplierData2.status = StatusEnum.ACTIVE;
        supplierData2.supplierAddress = 'Supplier Address 2';
        supplierData2.supplierPhone = 'Supplier Phone 2';
        supplierData2.supplierEmail = 'Supplier Email 2';
        supplierData2.supplierContactPerson = 'Supplier Contact Person 2';
        await this.supplierDatabaseService.createRecord(supplierData2);

        //create the raw material units
        const rawMaterialUnitData1 = new RawMaterialUnitDto();
        rawMaterialUnitData1.rawMaterialUnitName = 'Raw Material Unit 1';
        rawMaterialUnitData1.status = StatusEnum.ACTIVE;
        const rawMaterialUnitRecord1 = await this.rawMaterialUnitDatabaseService.createRecord(rawMaterialUnitData1);

        const rawMaterialUnitData2 = new RawMaterialUnitDto();
        rawMaterialUnitData2.rawMaterialUnitName = 'Raw Material Unit 2';
        rawMaterialUnitData2.status = StatusEnum.ACTIVE;
        const rawMaterialUnitRecord2 = await this.rawMaterialUnitDatabaseService.createRecord(rawMaterialUnitData2);

        // create raw material locations
        const rawMaterialLocationData1 = new RawMaterialsLocationDto();
        rawMaterialLocationData1.rawMaterialsLocationName = 'Raw Material Location 1';
        rawMaterialLocationData1.status = StatusEnum.ACTIVE;
        const rawMaterialLocationRecord1 = await this.rawMaterialsLocationDatabaseService.createRecord(
            rawMaterialLocationData1
        );

        //create raw material suppliers
        const rawMaterialSupplierData1 = new RawMaterialSupplierDto();
        rawMaterialSupplierData1.rawMaterialSupplierName = 'Raw Material Supplier 1';
        rawMaterialSupplierData1.status = StatusEnum.ACTIVE;
        const rawMaterialSupplierRecord1 = await this.rawMaterialSupplierDatabaseService.createRecord(
            rawMaterialSupplierData1
        );

        //create 2 raw materials
        const rawMaterialData1 = new RawMaterialDto();
        rawMaterialData1.rawMaterialName = 'Raw Material 1';
        rawMaterialData1.rawMaterialUnitId = rawMaterialUnitRecord1.rawMaterialUnitId;
        rawMaterialData1.rawMaterialUnitName = rawMaterialUnitRecord1.rawMaterialUnitName;
        rawMaterialData1.status = StatusEnum.ACTIVE;
        const rawMaterialRecord1 = await this.rawMaterialDatabaseService.createRecord(rawMaterialData1);

        const rawMaterialData2 = new RawMaterialDto();
        rawMaterialData2.rawMaterialName = 'Raw Material 2';
        rawMaterialData2.rawMaterialUnitId = rawMaterialUnitRecord2.rawMaterialUnitId;
        rawMaterialData2.rawMaterialUnitName = rawMaterialUnitRecord2.rawMaterialUnitName;
        rawMaterialData2.status = StatusEnum.ACTIVE;
        const rawMaterialRecord2 = await this.rawMaterialDatabaseService.createRecord(rawMaterialData2);

        //create the raw material stock records
        const rawMaterialsStockData1 = new RawMaterialsStockDto();
        rawMaterialsStockData1.rawMaterialName = rawMaterialRecord1.rawMaterialName;
        rawMaterialsStockData1.lotNo = 'RM123456';
        rawMaterialsStockData1.rawMaterialId = rawMaterialRecord1.rawMaterialId;
        rawMaterialsStockData1.rawMaterialUnitId = rawMaterialUnitRecord1.rawMaterialUnitId;
        rawMaterialsStockData1.rawMaterialUnitName = rawMaterialUnitRecord1.rawMaterialUnitName;
        rawMaterialsStockData1.rawMaterialsLocationName = rawMaterialLocationRecord1.rawMaterialsLocationName;
        rawMaterialsStockData1.rawMaterialsLocationId = rawMaterialLocationRecord1.rawMaterialsLocationId;
        rawMaterialsStockData1.rawMaterialSupplierName = rawMaterialSupplierRecord1.rawMaterialSupplierName;
        rawMaterialsStockData1.rawMaterialSupplierId = rawMaterialSupplierRecord1.rawMaterialSupplierId;
        rawMaterialsStockData1.qty = 10;
        rawMaterialsStockData1.status = StatusEnum.ACTIVE;
        await this.rawMaterialsStockDatabaseService.createRecord(rawMaterialsStockData1);
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
        await this.termsDatabaseService.deleteAllRecords();
        await this.stockTypeDatabaseService.deleteAllRecords();
        await this.stockDatabaseService.deleteAllRecords();
        await this.customerDatabaseService.deleteAllRecords();
        await this.productDatabaseService.deleteAllRecords();
        await this.salesTypeDatabaseService.deleteAllRecords();
        await this.territoryManagerDatabaseService.deleteAllRecords();
        await this.invoiceDatabaseService.deleteAllRecords();
        await this.contractDatabaseService.deleteAllRecords();
        await this.accountsDatabaseService.deleteAllRecords();
        await this.supplierDatabaseService.deleteAllRecords();
        await this.rawMaterialDatabaseService.deleteAllRecords();
        await this.rawMaterialUnitDatabaseService.deleteAllRecords();
    }
}
