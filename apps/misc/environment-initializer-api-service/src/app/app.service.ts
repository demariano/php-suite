import { AccountsDatabaseServiceAbstract, VoucherDatabaseServiceAbstract } from '@accounting-database-service';
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
    ChequeClearStatusEnum,
    ConfigurationDto,
    ContractDto,
    ContractPaymentDto,
    CreateCollectionReceiptRangeDto,
    CreateInvoiceDto,
    CreatePaymentDto,
    CreatePaymentInvoiceDetailsDto,
    CreateReturnGoodSoldDto,
    CreateVoucherDto,
    CustomerClassificationDto,
    CustomerDto,
    CustomerProductDealDto,
    CustomerTypeDto,
    DeliveryStatusEnum,
    InitializeEnvironmentDto,
    InvoiceDetailsDto,
    InvoiceDetailTypeEnum,
    InvoicePaymentDto,
    PaymentDetailsDto,
    PaymentStatusEnum,
    PaymentTypeEnum,
    PrintStatusEnum,
    ProductCategoryDto,
    ProductClassDto,
    ProductDealDetailsDto,
    ProductDealDto,
    ProductDto,
    ProductPriceTypeDto,
    ProductUnitDto,
    ProductUnitPriceDto,
    RangeStatusEnum,
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
    VoucherDetailDto,
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
    CollectionReceiptRangeDatabaseServiceAbstract,
    ContractDatabaseServiceAbstract,
    InvoiceDatabaseServiceAbstract,
    OverPaymentDatabaseServiceAbstract,
    PaymentDatabaseServiceAbstractClass,
    PaymentInvoiceDatabaseServiceAbstractClass,
    ReturnGoodSoldDatabaseServiceAbstractClass,
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
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract,

        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract,

        @Inject('VoucherDatabaseService')
        private readonly voucherDatabaseService: VoucherDatabaseServiceAbstract,

        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass,

        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,

        @Inject('OverPaymentDatabaseService')
        private readonly overPaymentDatabaseService: OverPaymentDatabaseServiceAbstract,

        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
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
        areaData.idPrefix = 'AR1';
        areaData.towns = ['Town 1'];
        const areaRecord1 = await this.areaDatabaseService.createRecord(areaData);

        const areaData2 = new AreaDto();
        areaData2.areaName = 'Area 2';
        areaData2.status = StatusEnum.ACTIVE;
        areaData2.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        areaData2.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        areaData2.towns = ['Town 2'];
        areaData2.idPrefix = 'AR2';
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
        customerData.creditLimit = 5000;
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
        customerData2.creditLimit = 5000;
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
        stockData.totalQuantity = 100;

        stockData.expirationDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
        stockData2.totalQuantity = 100;
        stockData2.expirationDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
        stockData3.totalQuantity = 100;
        stockData3.expirationDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        stockData3.status = StatusEnum.ACTIVE;
        await this.stockDatabaseService.createRecord(stockData3);

        //add contract record for each customer
        const contractData1 = new ContractDto();
        contractData1.contractNo = '1234567890';
        contractData1.contractName = 'Contract 1';
        contractData1.customerId = customerRecord1.customerId;
        contractData1.customerName = customerRecord1.customerName;
        contractData1.status = StatusEnum.ACTIVE;
        contractData1.startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        contractData1.endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        contractData1.contractAmount = 10000;
        contractData1.totalAmountPaid = 0;

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
        const contractRecord1 = await this.contractDatabaseService.createRecord(contractData1);

        const contractData2 = new ContractDto();
        contractData2.contractNo = '0987654321';
        contractData2.contractName = 'Contract 2';
        contractData2.customerId = customerRecord2.customerId;
        contractData2.customerName = customerRecord2.customerName;
        contractData2.status = StatusEnum.ACTIVE;
        contractData2.startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        contractData2.endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        contractData2.contractAmount = 10000;
        contractData2.totalAmountPaid = 0;
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
        const contractRecord2 = await this.contractDatabaseService.createRecord(contractData2);

        //create 2 accounts
        const accountData1 = new AccountsDto();
        accountData1.accountName = 'Account 1 - Area';
        accountData1.accountType = AccountTypeEnum.AREA;
        accountData1.status = StatusEnum.ACTIVE;
        accountData1.subAccounts = ['Sub Account 1 - Area', 'Sub Account 2 - Area'];
        const accountRecord1 = await this.accountsDatabaseService.createRecord(accountData1);

        const accountData2 = new AccountsDto();
        accountData2.accountName = 'Account 2 - Customer';
        accountData2.accountType = AccountTypeEnum.CUSTOMER;
        accountData2.status = StatusEnum.ACTIVE;
        accountData2.subAccounts = ['Sub Account 1 - Customer', 'Sub Account 2 - Customer'];
        const accountRecord2 = await this.accountsDatabaseService.createRecord(accountData2);

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
        rawMaterialData1.status = StatusEnum.ACTIVE;
        const rawMaterialRecord1 = await this.rawMaterialDatabaseService.createRecord(rawMaterialData1);

        const rawMaterialData2 = new RawMaterialDto();
        rawMaterialData2.rawMaterialName = 'Raw Material 2';
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

        const collectionData: CreateCollectionReceiptRangeDto = new CreateCollectionReceiptRangeDto();
        collectionData.areaId = areaRecord1.areaId;
        collectionData.areaName = areaRecord1.areaName;
        collectionData.startNumber = 1;
        collectionData.endNumber = 1000;
        collectionData.rangeStatus = RangeStatusEnum.AVAILABLE;
        await this.collectionReceiptRangeDatabaseService.createRecord(collectionData);

        const collectionData2: CreateCollectionReceiptRangeDto = new CreateCollectionReceiptRangeDto();
        collectionData2.areaId = areaRecord1.areaId;
        collectionData2.areaName = areaRecord1.areaName;
        collectionData2.startNumber = 1;
        collectionData2.endNumber = 1000;
        collectionData2.rangeStatus = RangeStatusEnum.AVAILABLE;
        await this.collectionReceiptRangeDatabaseService.createRecord(collectionData);

        // =====================================================
        // SEED INVOICES, PAYMENTS, VOUCHERS
        // =====================================================

        // Date helpers
        const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        // ----- INVOICES -----

        // INV-1: Customer 1, Contract Sales, 5 days ago — will be PAID
        const invoiceData1 = new CreateInvoiceDto();
        invoiceData1.docno = '1';
        invoiceData1.invoiceDate = daysAgo(5);
        invoiceData1.customerId = customerRecord1.customerId;
        invoiceData1.customerName = customerRecord1.customerName;
        invoiceData1.areaId = areaRecord1.areaId;
        invoiceData1.areaName = areaRecord1.areaName;
        invoiceData1.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        invoiceData1.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        invoiceData1.salesTypeId = salesTypeRecord1.salesTypeId;
        invoiceData1.salesTypeName = salesTypeRecord1.salesTypeName;
        invoiceData1.contractSales = true;
        invoiceData1.contractId = contractRecord1.contractId;
        invoiceData1.contractName = contractRecord1.contractName;
        invoiceData1.termsId = termsRecord1.termsId;
        invoiceData1.termsName = termsRecord1.termsName;
        invoiceData1.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        invoiceData1.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        invoiceData1.taxable = false;
        invoiceData1.taxRate = 0;
        invoiceData1.taxAmount = 0;
        const inv1Qty = 10;
        const inv1Price = 160.99;
        const inv1Amount = inv1Qty * inv1Price; // 1609.90
        invoiceData1.invoiceAmount = inv1Amount;
        invoiceData1.finalAmount = inv1Amount;
        invoiceData1.totalAmountPaid = 0;
        invoiceData1.overPaymentAmount = 0;
        invoiceData1.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData1.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData1.status = StatusEnum.ACTIVE;
        invoiceData1.payments = [];

        const invoiceDetail1 = new InvoiceDetailsDto();
        invoiceDetail1.invoiceDetailId = 'inv-detail-1';
        invoiceDetail1.productId = productRecord1.productId;
        invoiceDetail1.productName = productRecord1.productName;
        invoiceDetail1.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail1.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail1.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail1.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail1.lotNo = '1234567890';
        invoiceDetail1.qty = inv1Qty;
        invoiceDetail1.price = inv1Price;
        invoiceDetail1.cost = 111.0;
        invoiceDetail1.amount = inv1Amount;
        invoiceDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData1.invoiceDetails = [invoiceDetail1];

        const invoiceRecord1 = await this.invoiceDatabaseService.createRecord(invoiceData1);

        // INV-2: Customer 1, Non-Contract Sales, 4 days ago — will be PARTIAL
        const invoiceData2 = new CreateInvoiceDto();
        invoiceData2.docno = '2';
        invoiceData2.invoiceDate = daysAgo(4);
        invoiceData2.customerId = customerRecord1.customerId;
        invoiceData2.customerName = customerRecord1.customerName;
        invoiceData2.areaId = areaRecord1.areaId;
        invoiceData2.areaName = areaRecord1.areaName;
        invoiceData2.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        invoiceData2.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        invoiceData2.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData2.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData2.contractSales = false;
        invoiceData2.termsId = termsRecord1.termsId;
        invoiceData2.termsName = termsRecord1.termsName;
        invoiceData2.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        invoiceData2.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        invoiceData2.taxable = false;
        invoiceData2.taxRate = 0;
        invoiceData2.taxAmount = 0;
        const inv2Qty = 10;
        const inv2Price = 260.99;
        const inv2Amount = inv2Qty * inv2Price; // 2609.90
        invoiceData2.invoiceAmount = inv2Amount;
        invoiceData2.finalAmount = inv2Amount;
        invoiceData2.totalAmountPaid = 0;
        invoiceData2.overPaymentAmount = 0;
        invoiceData2.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData2.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData2.status = StatusEnum.ACTIVE;
        invoiceData2.payments = [];

        const invoiceDetail2 = new InvoiceDetailsDto();
        invoiceDetail2.invoiceDetailId = 'inv-detail-2';
        invoiceDetail2.productId = productRecord2.productId;
        invoiceDetail2.productName = productRecord2.productName;
        invoiceDetail2.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail2.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail2.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail2.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail2.lotNo = '0987654321';
        invoiceDetail2.qty = inv2Qty;
        invoiceDetail2.price = inv2Price;
        invoiceDetail2.cost = 222.0;
        invoiceDetail2.amount = inv2Amount;
        invoiceDetail2.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData2.invoiceDetails = [invoiceDetail2];

        const invoiceRecord2 = await this.invoiceDatabaseService.createRecord(invoiceData2);

        // INV-3: Customer 2, Contract Sales, 3 days ago — will remain PENDING (no payment)
        const invoiceData3 = new CreateInvoiceDto();
        invoiceData3.docno = '3';
        invoiceData3.invoiceDate = daysAgo(3);
        invoiceData3.customerId = customerRecord2.customerId;
        invoiceData3.customerName = customerRecord2.customerName;
        invoiceData3.areaId = areaRecord2.areaId;
        invoiceData3.areaName = areaRecord2.areaName;
        invoiceData3.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        invoiceData3.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        invoiceData3.salesTypeId = salesTypeRecord1.salesTypeId;
        invoiceData3.salesTypeName = salesTypeRecord1.salesTypeName;
        invoiceData3.contractSales = true;
        invoiceData3.contractId = contractRecord2.contractId;
        invoiceData3.contractName = contractRecord2.contractName;
        invoiceData3.termsId = termsRecord2.termsId;
        invoiceData3.termsName = termsRecord2.termsName;
        invoiceData3.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        invoiceData3.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        invoiceData3.taxable = false;
        invoiceData3.taxRate = 0;
        invoiceData3.taxAmount = 0;
        const inv3Qty = 10;
        const inv3Price = 360.99;
        const inv3Amount = inv3Qty * inv3Price; // 3609.90
        invoiceData3.invoiceAmount = inv3Amount;
        invoiceData3.finalAmount = inv3Amount;
        invoiceData3.totalAmountPaid = 0;
        invoiceData3.overPaymentAmount = 0;
        invoiceData3.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData3.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData3.status = StatusEnum.ACTIVE;
        invoiceData3.payments = [];

        const invoiceDetail3 = new InvoiceDetailsDto();
        invoiceDetail3.invoiceDetailId = 'inv-detail-3';
        invoiceDetail3.productId = productRecord1.productId;
        invoiceDetail3.productName = productRecord1.productName;
        invoiceDetail3.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail3.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail3.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail3.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail3.lotNo = '1234567890';
        invoiceDetail3.qty = inv3Qty;
        invoiceDetail3.price = inv3Price;
        invoiceDetail3.cost = 333.0;
        invoiceDetail3.amount = inv3Amount;
        invoiceDetail3.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData3.invoiceDetails = [invoiceDetail3];

        const invoiceRecord3 = await this.invoiceDatabaseService.createRecord(invoiceData3);
        void invoiceRecord3; // No payment for this contract invoice - stays PENDING

        // INV-4: Customer 1, Non-Contract, today — will be PAID
        const invoiceData4 = new CreateInvoiceDto();
        invoiceData4.docno = '4';
        invoiceData4.invoiceDate = today;
        invoiceData4.customerId = customerRecord1.customerId;
        invoiceData4.customerName = customerRecord1.customerName;
        invoiceData4.areaId = areaRecord1.areaId;
        invoiceData4.areaName = areaRecord1.areaName;
        invoiceData4.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        invoiceData4.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        invoiceData4.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData4.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData4.contractSales = false;
        invoiceData4.termsId = termsRecord1.termsId;
        invoiceData4.termsName = termsRecord1.termsName;
        invoiceData4.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        invoiceData4.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        invoiceData4.taxable = false;
        invoiceData4.taxRate = 0;
        invoiceData4.taxAmount = 0;
        const inv4Qty = 10;
        const inv4Price = 160.99;
        const inv4Amount = inv4Qty * inv4Price; // 1609.90
        invoiceData4.invoiceAmount = inv4Amount;
        invoiceData4.finalAmount = inv4Amount;
        invoiceData4.totalAmountPaid = 0;
        invoiceData4.overPaymentAmount = 0;
        invoiceData4.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData4.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData4.status = StatusEnum.ACTIVE;
        invoiceData4.payments = [];

        const invoiceDetail4 = new InvoiceDetailsDto();
        invoiceDetail4.invoiceDetailId = 'inv-detail-4';
        invoiceDetail4.productId = productRecord1.productId;
        invoiceDetail4.productName = productRecord1.productName;
        invoiceDetail4.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail4.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail4.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail4.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail4.lotNo = '111111';
        invoiceDetail4.qty = inv4Qty;
        invoiceDetail4.price = inv4Price;
        invoiceDetail4.cost = 111.0;
        invoiceDetail4.amount = inv4Amount;
        invoiceDetail4.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData4.invoiceDetails = [invoiceDetail4];

        const invoiceRecord4 = await this.invoiceDatabaseService.createRecord(invoiceData4);

        // INV-5: Customer 2, Non-Contract, today — will be PARTIAL
        const invoiceData5 = new CreateInvoiceDto();
        invoiceData5.docno = '5';
        invoiceData5.invoiceDate = today;
        invoiceData5.customerId = customerRecord2.customerId;
        invoiceData5.customerName = customerRecord2.customerName;
        invoiceData5.areaId = areaRecord2.areaId;
        invoiceData5.areaName = areaRecord2.areaName;
        invoiceData5.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        invoiceData5.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        invoiceData5.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData5.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData5.contractSales = false;
        invoiceData5.termsId = termsRecord2.termsId;
        invoiceData5.termsName = termsRecord2.termsName;
        invoiceData5.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        invoiceData5.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        invoiceData5.taxable = false;
        invoiceData5.taxRate = 0;
        invoiceData5.taxAmount = 0;
        const inv5Qty = 10;
        const inv5Price = 260.99;
        const inv5Amount = inv5Qty * inv5Price; // 2609.90
        invoiceData5.invoiceAmount = inv5Amount;
        invoiceData5.finalAmount = inv5Amount;
        invoiceData5.totalAmountPaid = 0;
        invoiceData5.overPaymentAmount = 0;
        invoiceData5.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData5.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData5.status = StatusEnum.ACTIVE;
        invoiceData5.payments = [];

        const invoiceDetail5 = new InvoiceDetailsDto();
        invoiceDetail5.invoiceDetailId = 'inv-detail-5';
        invoiceDetail5.productId = productRecord2.productId;
        invoiceDetail5.productName = productRecord2.productName;
        invoiceDetail5.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail5.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail5.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail5.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail5.lotNo = '0987654321';
        invoiceDetail5.qty = inv5Qty;
        invoiceDetail5.price = inv5Price;
        invoiceDetail5.cost = 444.0;
        invoiceDetail5.amount = inv5Amount;
        invoiceDetail5.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData5.invoiceDetails = [invoiceDetail5];

        const invoiceRecord5 = await this.invoiceDatabaseService.createRecord(invoiceData5);

        // INV-6: Customer 2, Contract Sales, today — will remain PENDING
        const invoiceData6 = new CreateInvoiceDto();
        invoiceData6.docno = '6';
        invoiceData6.invoiceDate = today;
        invoiceData6.customerId = customerRecord2.customerId;
        invoiceData6.customerName = customerRecord2.customerName;
        invoiceData6.areaId = areaRecord2.areaId;
        invoiceData6.areaName = areaRecord2.areaName;
        invoiceData6.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        invoiceData6.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        invoiceData6.salesTypeId = salesTypeRecord1.salesTypeId;
        invoiceData6.salesTypeName = salesTypeRecord1.salesTypeName;
        invoiceData6.contractSales = true;
        invoiceData6.contractId = contractRecord2.contractId;
        invoiceData6.contractName = contractRecord2.contractName;
        invoiceData6.termsId = termsRecord2.termsId;
        invoiceData6.termsName = termsRecord2.termsName;
        invoiceData6.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        invoiceData6.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        invoiceData6.taxable = false;
        invoiceData6.taxRate = 0;
        invoiceData6.taxAmount = 0;
        const inv6Qty = 10;
        const inv6Price = 460.99;
        const inv6Amount = inv6Qty * inv6Price; // 4609.90
        invoiceData6.invoiceAmount = inv6Amount;
        invoiceData6.finalAmount = inv6Amount;
        invoiceData6.totalAmountPaid = 0;
        invoiceData6.overPaymentAmount = 0;
        invoiceData6.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData6.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData6.status = StatusEnum.ACTIVE;
        invoiceData6.payments = [];

        const invoiceDetail6 = new InvoiceDetailsDto();
        invoiceDetail6.invoiceDetailId = 'inv-detail-6';
        invoiceDetail6.productId = productRecord2.productId;
        invoiceDetail6.productName = productRecord2.productName;
        invoiceDetail6.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail6.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail6.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail6.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail6.lotNo = '0987654321';
        invoiceDetail6.qty = inv6Qty;
        invoiceDetail6.price = inv6Price;
        invoiceDetail6.cost = 444.0;
        invoiceDetail6.amount = inv6Amount;
        invoiceDetail6.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData6.invoiceDetails = [invoiceDetail6];

        const invoiceRecord6 = await this.invoiceDatabaseService.createRecord(invoiceData6);
        void invoiceRecord6; // No payment for this contract invoice - stays PENDING

        // INV-7: Customer 1, Non-Contract, 7 days ago — ACTIVE, multi-product, will remain PENDING
        const invoiceData7 = new CreateInvoiceDto();
        invoiceData7.docno = '7';
        invoiceData7.invoiceDate = daysAgo(7);
        invoiceData7.customerId = customerRecord1.customerId;
        invoiceData7.customerName = customerRecord1.customerName;
        invoiceData7.areaId = areaRecord1.areaId;
        invoiceData7.areaName = areaRecord1.areaName;
        invoiceData7.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        invoiceData7.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        invoiceData7.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData7.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData7.contractSales = false;
        invoiceData7.termsId = termsRecord1.termsId;
        invoiceData7.termsName = termsRecord1.termsName;
        invoiceData7.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        invoiceData7.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        invoiceData7.taxable = true;
        invoiceData7.taxRate = 12;
        const inv7Detail1Qty = 5;
        const inv7Detail1Price = 160.99;
        const inv7Detail1Amount = inv7Detail1Qty * inv7Detail1Price; // 804.95
        const inv7Detail2Qty = 3;
        const inv7Detail2Price = 260.99;
        const inv7Detail2Amount = inv7Detail2Qty * inv7Detail2Price; // 782.97
        const inv7InvoiceAmount = Math.round((inv7Detail1Amount + inv7Detail2Amount) * 100) / 100; // 1587.92
        const inv7TaxAmount = Math.round(inv7InvoiceAmount * 0.12 * 100) / 100; // 190.55
        const inv7FinalAmount = Math.round((inv7InvoiceAmount + inv7TaxAmount) * 100) / 100; // 1778.47
        invoiceData7.invoiceAmount = inv7InvoiceAmount;
        invoiceData7.taxAmount = inv7TaxAmount;
        invoiceData7.finalAmount = inv7FinalAmount;
        invoiceData7.totalAmountPaid = 0;
        invoiceData7.overPaymentAmount = 0;
        invoiceData7.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData7.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData7.status = StatusEnum.ACTIVE;
        invoiceData7.payments = [];

        const invoiceDetail7a = new InvoiceDetailsDto();
        invoiceDetail7a.invoiceDetailId = 'inv-detail-7a';
        invoiceDetail7a.productId = productRecord1.productId;
        invoiceDetail7a.productName = productRecord1.productName;
        invoiceDetail7a.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail7a.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail7a.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail7a.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail7a.lotNo = '7777701';
        invoiceDetail7a.qty = inv7Detail1Qty;
        invoiceDetail7a.price = inv7Detail1Price;
        invoiceDetail7a.cost = 111.0;
        invoiceDetail7a.amount = inv7Detail1Amount;
        invoiceDetail7a.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const invoiceDetail7b = new InvoiceDetailsDto();
        invoiceDetail7b.invoiceDetailId = 'inv-detail-7b';
        invoiceDetail7b.productId = productRecord2.productId;
        invoiceDetail7b.productName = productRecord2.productName;
        invoiceDetail7b.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail7b.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail7b.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail7b.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail7b.lotNo = '7777702';
        invoiceDetail7b.qty = inv7Detail2Qty;
        invoiceDetail7b.price = inv7Detail2Price;
        invoiceDetail7b.cost = 222.0;
        invoiceDetail7b.amount = inv7Detail2Amount;
        invoiceDetail7b.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        invoiceData7.invoiceDetails = [invoiceDetail7a, invoiceDetail7b];

        const invoiceRecord7 = await this.invoiceDatabaseService.createRecord(invoiceData7);

        // INV-8: Customer 2, Non-Contract, 6 days ago — ACTIVE, will remain PENDING (used for RGS)
        const invoiceData8 = new CreateInvoiceDto();
        invoiceData8.docno = '8';
        invoiceData8.invoiceDate = daysAgo(6);
        invoiceData8.customerId = customerRecord2.customerId;
        invoiceData8.customerName = customerRecord2.customerName;
        invoiceData8.areaId = areaRecord2.areaId;
        invoiceData8.areaName = areaRecord2.areaName;
        invoiceData8.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        invoiceData8.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        invoiceData8.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData8.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData8.contractSales = false;
        invoiceData8.termsId = termsRecord2.termsId;
        invoiceData8.termsName = termsRecord2.termsName;
        invoiceData8.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        invoiceData8.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        invoiceData8.taxable = false;
        invoiceData8.taxRate = 0;
        invoiceData8.taxAmount = 0;
        const inv8Detail1Qty = 8;
        const inv8Detail1Price = 260.99;
        const inv8Detail1Amount = inv8Detail1Qty * inv8Detail1Price; // 2087.92
        const inv8Detail2Qty = 4;
        const inv8Detail2Price = 160.99;
        const inv8Detail2Amount = inv8Detail2Qty * inv8Detail2Price; // 643.96
        const inv8InvoiceAmount = Math.round((inv8Detail1Amount + inv8Detail2Amount) * 100) / 100; // 2731.88
        invoiceData8.invoiceAmount = inv8InvoiceAmount;
        invoiceData8.finalAmount = inv8InvoiceAmount;
        invoiceData8.totalAmountPaid = 0;
        invoiceData8.overPaymentAmount = 0;
        invoiceData8.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData8.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData8.status = StatusEnum.ACTIVE;
        invoiceData8.payments = [];

        const invoiceDetail8a = new InvoiceDetailsDto();
        invoiceDetail8a.invoiceDetailId = 'inv-detail-8a';
        invoiceDetail8a.productId = productRecord2.productId;
        invoiceDetail8a.productName = productRecord2.productName;
        invoiceDetail8a.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail8a.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail8a.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail8a.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail8a.lotNo = '8888801';
        invoiceDetail8a.qty = inv8Detail1Qty;
        invoiceDetail8a.price = inv8Detail1Price;
        invoiceDetail8a.cost = 222.0;
        invoiceDetail8a.amount = inv8Detail1Amount;
        invoiceDetail8a.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const invoiceDetail8b = new InvoiceDetailsDto();
        invoiceDetail8b.invoiceDetailId = 'inv-detail-8b';
        invoiceDetail8b.productId = productRecord1.productId;
        invoiceDetail8b.productName = productRecord1.productName;
        invoiceDetail8b.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail8b.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail8b.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail8b.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail8b.lotNo = '8888802';
        invoiceDetail8b.qty = inv8Detail2Qty;
        invoiceDetail8b.price = inv8Detail2Price;
        invoiceDetail8b.cost = 111.0;
        invoiceDetail8b.amount = inv8Detail2Amount;
        invoiceDetail8b.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        invoiceData8.invoiceDetails = [invoiceDetail8a, invoiceDetail8b];

        const invoiceRecord8 = await this.invoiceDatabaseService.createRecord(invoiceData8);

        // INV-9: Customer 1, Contract Sales, 2 days ago — ACTIVE, will remain PENDING
        const invoiceData9 = new CreateInvoiceDto();
        invoiceData9.docno = '9';
        invoiceData9.invoiceDate = daysAgo(2);
        invoiceData9.customerId = customerRecord1.customerId;
        invoiceData9.customerName = customerRecord1.customerName;
        invoiceData9.areaId = areaRecord1.areaId;
        invoiceData9.areaName = areaRecord1.areaName;
        invoiceData9.territoryManagerId = territoryManagerRecord1.territoryManagerId;
        invoiceData9.territoryManagerName = territoryManagerRecord1.territoryManagerName;
        invoiceData9.salesTypeId = salesTypeRecord1.salesTypeId;
        invoiceData9.salesTypeName = salesTypeRecord1.salesTypeName;
        invoiceData9.contractSales = true;
        invoiceData9.contractId = contractRecord1.contractId;
        invoiceData9.contractName = contractRecord1.contractName;
        invoiceData9.termsId = termsRecord1.termsId;
        invoiceData9.termsName = termsRecord1.termsName;
        invoiceData9.productPriceTypeId = productPriceTypeRecord1.productPriceTypeId;
        invoiceData9.productPriceTypeName = productPriceTypeRecord1.productPriceTypeName;
        invoiceData9.taxable = false;
        invoiceData9.taxRate = 0;
        invoiceData9.taxAmount = 0;
        const inv9Qty = 6;
        const inv9Price = 160.99;
        const inv9Amount = inv9Qty * inv9Price; // 965.94
        invoiceData9.invoiceAmount = inv9Amount;
        invoiceData9.finalAmount = inv9Amount;
        invoiceData9.totalAmountPaid = 0;
        invoiceData9.overPaymentAmount = 0;
        invoiceData9.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData9.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData9.status = StatusEnum.ACTIVE;
        invoiceData9.payments = [];

        const invoiceDetail9 = new InvoiceDetailsDto();
        invoiceDetail9.invoiceDetailId = 'inv-detail-9';
        invoiceDetail9.productId = productRecord1.productId;
        invoiceDetail9.productName = productRecord1.productName;
        invoiceDetail9.productUnitId = productUnitRecord1.productUnitId;
        invoiceDetail9.productUnitName = productUnitRecord1.productUnitName;
        invoiceDetail9.stockTypeId = stockTypeRecord1.stockTypeId;
        invoiceDetail9.stockTypeName = stockTypeRecord1.stockTypeName;
        invoiceDetail9.lotNo = '9999901';
        invoiceDetail9.qty = inv9Qty;
        invoiceDetail9.price = inv9Price;
        invoiceDetail9.cost = 111.0;
        invoiceDetail9.amount = inv9Amount;
        invoiceDetail9.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData9.invoiceDetails = [invoiceDetail9];

        const invoiceRecord9 = await this.invoiceDatabaseService.createRecord(invoiceData9);
        void invoiceRecord9; // No payment — stays PENDING

        // INV-10: Customer 2, Non-Contract, 1 day ago — ACTIVE, taxable, will remain PENDING (used for RGS)
        const invoiceData10 = new CreateInvoiceDto();
        invoiceData10.docno = '10';
        invoiceData10.invoiceDate = daysAgo(1);
        invoiceData10.customerId = customerRecord2.customerId;
        invoiceData10.customerName = customerRecord2.customerName;
        invoiceData10.areaId = areaRecord2.areaId;
        invoiceData10.areaName = areaRecord2.areaName;
        invoiceData10.territoryManagerId = territoryManagerRecord2.territoryManagerId;
        invoiceData10.territoryManagerName = territoryManagerRecord2.territoryManagerName;
        invoiceData10.salesTypeId = salesTypeRecord2.salesTypeId;
        invoiceData10.salesTypeName = salesTypeRecord2.salesTypeName;
        invoiceData10.contractSales = false;
        invoiceData10.termsId = termsRecord2.termsId;
        invoiceData10.termsName = termsRecord2.termsName;
        invoiceData10.productPriceTypeId = productPriceTypeRecord2.productPriceTypeId;
        invoiceData10.productPriceTypeName = productPriceTypeRecord2.productPriceTypeName;
        invoiceData10.taxable = true;
        invoiceData10.taxRate = 12;
        const inv10Qty = 10;
        const inv10Price = 260.99;
        const inv10InvoiceAmount = inv10Qty * inv10Price; // 2609.90
        const inv10TaxAmount = Math.round(inv10InvoiceAmount * 0.12 * 100) / 100; // 313.19
        const inv10FinalAmount = Math.round((inv10InvoiceAmount + inv10TaxAmount) * 100) / 100; // 2923.09
        invoiceData10.invoiceAmount = inv10InvoiceAmount;
        invoiceData10.taxAmount = inv10TaxAmount;
        invoiceData10.finalAmount = inv10FinalAmount;
        invoiceData10.totalAmountPaid = 0;
        invoiceData10.overPaymentAmount = 0;
        invoiceData10.paymentStatus = PaymentStatusEnum.PENDING;
        invoiceData10.printStatus = PrintStatusEnum.COMPLETED;
        invoiceData10.status = StatusEnum.ACTIVE;
        invoiceData10.payments = [];

        const invoiceDetail10 = new InvoiceDetailsDto();
        invoiceDetail10.invoiceDetailId = 'inv-detail-10';
        invoiceDetail10.productId = productRecord2.productId;
        invoiceDetail10.productName = productRecord2.productName;
        invoiceDetail10.productUnitId = productUnitRecord2.productUnitId;
        invoiceDetail10.productUnitName = productUnitRecord2.productUnitName;
        invoiceDetail10.stockTypeId = stockTypeRecord2.stockTypeId;
        invoiceDetail10.stockTypeName = stockTypeRecord2.stockTypeName;
        invoiceDetail10.lotNo = '1010101';
        invoiceDetail10.qty = inv10Qty;
        invoiceDetail10.price = inv10Price;
        invoiceDetail10.cost = 222.0;
        invoiceDetail10.amount = inv10InvoiceAmount;
        invoiceDetail10.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;
        invoiceData10.invoiceDetails = [invoiceDetail10];

        const invoiceRecord10 = await this.invoiceDatabaseService.createRecord(invoiceData10);

        // ----- PAYMENTS -----

        // PAY-1: Customer 1, 4 days ago, fully pays INV-1 (contract, 1609.90) — CASH
        const paymentData1 = new CreatePaymentDto();
        paymentData1.paymentDate = daysAgo(4);
        paymentData1.paymentAmount = inv1Amount;
        paymentData1.customerId = customerRecord1.customerId;
        paymentData1.customerName = customerRecord1.customerName;
        paymentData1.receiptNo = '1';
        paymentData1.contractPayment = true;
        paymentData1.contractId = contractRecord1.contractId;
        paymentData1.contractName = contractRecord1.contractName;
        paymentData1.contractNo = contractRecord1.contractNo;
        paymentData1.customerCreditPayment = false;
        paymentData1.status = StatusEnum.ACTIVE;
        paymentData1.chequeClearStatus = ChequeClearStatusEnum.CLEARED;
        paymentData1.activityLogs = [];
        paymentData1.forApprovalVersion = {};
        paymentData1.changeReason = '';
        paymentData1.areaId = customerRecord1.areaId;
        paymentData1.areaName = customerRecord1.areaName;

        const paymentDetail1 = new PaymentDetailsDto();
        paymentDetail1.paymentType = PaymentTypeEnum.CASH;
        paymentDetail1.amount = inv1Amount;
        paymentDetail1.paymentCreditDate = daysAgo(4);
        paymentDetail1.chequeNo = '';
        paymentDetail1.chequeDate = '';
        paymentDetail1.bankName = '';
        paymentDetail1.bankAccountNo = '';
        paymentDetail1.customerCreditPayment = false;
        paymentData1.paymentDetails = [paymentDetail1];
        paymentData1.paymentInvoiceDetails = [];

        const paymentRecord1 = await this.paymentDatabaseService.createRecord(paymentData1);

        // PAY-2: Customer 1, 3 days ago, partially pays INV-2 (non-contract, 1000 of 2609.90) — CASH
        const paymentData2 = new CreatePaymentDto();
        paymentData2.paymentDate = daysAgo(3);
        paymentData2.paymentAmount = 1000;
        paymentData2.customerId = customerRecord1.customerId;
        paymentData2.customerName = customerRecord1.customerName;
        paymentData2.receiptNo = '2';
        paymentData2.contractPayment = false;
        paymentData2.contractId = '';
        paymentData2.contractName = '';
        paymentData2.contractNo = '';
        paymentData2.customerCreditPayment = false;
        paymentData2.status = StatusEnum.ACTIVE;
        paymentData2.chequeClearStatus = ChequeClearStatusEnum.CLEARED;
        paymentData2.activityLogs = [];
        paymentData2.forApprovalVersion = {};
        paymentData2.changeReason = '';
        paymentData2.areaId = customerRecord1.areaId;
        paymentData2.areaName = customerRecord1.areaName;

        const paymentDetail2 = new PaymentDetailsDto();
        paymentDetail2.paymentType = PaymentTypeEnum.CASH;
        paymentDetail2.amount = 1000;
        paymentDetail2.paymentCreditDate = daysAgo(3);
        paymentDetail2.chequeNo = '';
        paymentDetail2.chequeDate = '';
        paymentDetail2.bankName = '';
        paymentDetail2.bankAccountNo = '';
        paymentDetail2.customerCreditPayment = false;
        paymentData2.paymentDetails = [paymentDetail2];
        paymentData2.paymentInvoiceDetails = [];

        const paymentRecord2 = await this.paymentDatabaseService.createRecord(paymentData2);

        // PAY-3: Customer 1, today, fully pays INV-4 (non-contract, 1609.90) — CASH
        const paymentData3 = new CreatePaymentDto();
        paymentData3.paymentDate = today;
        paymentData3.paymentAmount = inv4Amount;
        paymentData3.customerId = customerRecord1.customerId;
        paymentData3.customerName = customerRecord1.customerName;
        paymentData3.receiptNo = '3';
        paymentData3.contractPayment = false;
        paymentData3.contractId = '';
        paymentData3.contractName = '';
        paymentData3.contractNo = '';
        paymentData3.customerCreditPayment = false;
        paymentData3.status = StatusEnum.ACTIVE;
        paymentData3.chequeClearStatus = ChequeClearStatusEnum.CLEARED;
        paymentData3.activityLogs = [];
        paymentData3.forApprovalVersion = {};
        paymentData3.changeReason = '';
        paymentData3.areaId = customerRecord1.areaId;
        paymentData3.areaName = customerRecord1.areaName;

        const paymentDetail3 = new PaymentDetailsDto();
        paymentDetail3.paymentType = PaymentTypeEnum.CASH;
        paymentDetail3.amount = inv4Amount;
        paymentDetail3.paymentCreditDate = today;
        paymentDetail3.chequeNo = '';
        paymentDetail3.chequeDate = '';
        paymentDetail3.bankName = '';
        paymentDetail3.bankAccountNo = '';
        paymentDetail3.customerCreditPayment = false;
        paymentData3.paymentDetails = [paymentDetail3];
        paymentData3.paymentInvoiceDetails = [];

        const paymentRecord3 = await this.paymentDatabaseService.createRecord(paymentData3);

        // PAY-4: Customer 2, today, partially pays INV-5 (non-contract, 1500 of 2609.90) — CHEQUE
        const paymentData4 = new CreatePaymentDto();
        paymentData4.paymentDate = today;
        paymentData4.paymentAmount = 1500;
        paymentData4.customerId = customerRecord2.customerId;
        paymentData4.customerName = customerRecord2.customerName;
        paymentData4.receiptNo = '4';
        paymentData4.contractPayment = false;
        paymentData4.contractId = '';
        paymentData4.contractName = '';
        paymentData4.contractNo = '';
        paymentData4.customerCreditPayment = false;
        paymentData4.status = StatusEnum.ACTIVE;
        paymentData4.chequeClearStatus = ChequeClearStatusEnum.PENDING;
        paymentData4.activityLogs = [];
        paymentData4.forApprovalVersion = {};
        paymentData4.changeReason = '';
        paymentData4.areaId = customerRecord2.areaId;
        paymentData4.areaName = customerRecord2.areaName;

        const paymentDetail4 = new PaymentDetailsDto();
        paymentDetail4.paymentType = PaymentTypeEnum.CHEQUE;
        paymentDetail4.amount = 1500;
        paymentDetail4.paymentCreditDate = today;
        paymentDetail4.chequeNo = 'CHQ-001';
        paymentDetail4.chequeDate = today;
        paymentDetail4.bankName = 'Sample Bank';
        paymentDetail4.bankAccountNo = '123456789';
        paymentDetail4.customerCreditPayment = false;
        paymentData4.paymentDetails = [paymentDetail4];
        paymentData4.paymentInvoiceDetails = [];

        const paymentRecord4 = await this.paymentDatabaseService.createRecord(paymentData4);

        // ----- PAYMENT INVOICE JUNCTION RECORDS -----

        // Link PAY-1 to INV-1 (full payment: 1609.90)
        const paymentInvoice1 = new CreatePaymentInvoiceDetailsDto();
        paymentInvoice1.invoiceId = invoiceRecord1.invoiceId;
        paymentInvoice1.docno = invoiceRecord1.docno;
        paymentInvoice1.amountApplied = inv1Amount;
        paymentInvoice1.paymentId = paymentRecord1.paymentId;
        paymentInvoice1.dateCreated = daysAgo(4);
        paymentInvoice1.receiptNo = '1';
        paymentInvoice1.paymentDate = daysAgo(4);
        paymentInvoice1.customerCreditPayment = false;
        await this.paymentInvoiceDatabaseService.createRecord(paymentInvoice1);

        // Link PAY-2 to INV-2 (partial payment: 1000)
        const paymentInvoice2 = new CreatePaymentInvoiceDetailsDto();
        paymentInvoice2.invoiceId = invoiceRecord2.invoiceId;
        paymentInvoice2.docno = invoiceRecord2.docno;
        paymentInvoice2.amountApplied = 1000;
        paymentInvoice2.paymentId = paymentRecord2.paymentId;
        paymentInvoice2.dateCreated = daysAgo(3);
        paymentInvoice2.receiptNo = '2';
        paymentInvoice2.paymentDate = daysAgo(3);
        paymentInvoice2.customerCreditPayment = false;
        await this.paymentInvoiceDatabaseService.createRecord(paymentInvoice2);

        // Link PAY-3 to INV-4 (full payment: 1609.90)
        const paymentInvoice3 = new CreatePaymentInvoiceDetailsDto();
        paymentInvoice3.invoiceId = invoiceRecord4.invoiceId;
        paymentInvoice3.docno = invoiceRecord4.docno;
        paymentInvoice3.amountApplied = inv4Amount;
        paymentInvoice3.paymentId = paymentRecord3.paymentId;
        paymentInvoice3.dateCreated = today;
        paymentInvoice3.receiptNo = '3';
        paymentInvoice3.paymentDate = today;
        paymentInvoice3.customerCreditPayment = false;
        await this.paymentInvoiceDatabaseService.createRecord(paymentInvoice3);

        // Link PAY-4 to INV-5 (partial payment: 1500)
        const paymentInvoice4 = new CreatePaymentInvoiceDetailsDto();
        paymentInvoice4.invoiceId = invoiceRecord5.invoiceId;
        paymentInvoice4.docno = invoiceRecord5.docno;
        paymentInvoice4.amountApplied = 1500;
        paymentInvoice4.paymentId = paymentRecord4.paymentId;
        paymentInvoice4.dateCreated = today;
        paymentInvoice4.receiptNo = '4';
        paymentInvoice4.paymentDate = today;
        paymentInvoice4.customerCreditPayment = false;
        await this.paymentInvoiceDatabaseService.createRecord(paymentInvoice4);

        // ----- UPDATE INVOICE PAYMENT STATUS (mimicking invoice event handler logic) -----

        // INV-1: fully paid (contract) — totalAmountPaid=1609.90, paymentStatus=PAID
        const invPayment1 = new InvoicePaymentDto();
        invPayment1.invoiceId = invoiceRecord1.invoiceId;
        invPayment1.receiptNo = '1';
        invPayment1.paymentDate = daysAgo(4);
        invPayment1.paymentAmount = inv1Amount;
        invPayment1.contractPayment = true;
        invPayment1.paymentId = paymentRecord1.paymentId;
        invPayment1.customerId = customerRecord1.customerId;
        await this.invoiceDatabaseService.addPaymentToInvoice(invoiceRecord1.invoiceId, invPayment1);
        invoiceRecord1.totalAmountPaid = inv1Amount;
        invoiceRecord1.paymentStatus = PaymentStatusEnum.PAID;
        await this.invoiceDatabaseService.updateRecord(invoiceRecord1);

        // INV-2: partially paid (non-contract) — totalAmountPaid=1000, paymentStatus=PARTIAL
        const invPayment2 = new InvoicePaymentDto();
        invPayment2.invoiceId = invoiceRecord2.invoiceId;
        invPayment2.receiptNo = '2';
        invPayment2.paymentDate = daysAgo(3);
        invPayment2.paymentAmount = 1000;
        invPayment2.contractPayment = false;
        invPayment2.paymentId = paymentRecord2.paymentId;
        invPayment2.customerId = customerRecord1.customerId;
        await this.invoiceDatabaseService.addPaymentToInvoice(invoiceRecord2.invoiceId, invPayment2);
        invoiceRecord2.totalAmountPaid = 1000;
        invoiceRecord2.paymentStatus = PaymentStatusEnum.PARTIAL;
        await this.invoiceDatabaseService.updateRecord(invoiceRecord2);

        // INV-3: no payment — stays PENDING (contract invoice, no update needed)

        // INV-4: fully paid (non-contract) — totalAmountPaid=1609.90, paymentStatus=PAID
        const invPayment4 = new InvoicePaymentDto();
        invPayment4.invoiceId = invoiceRecord4.invoiceId;
        invPayment4.receiptNo = '3';
        invPayment4.paymentDate = today;
        invPayment4.paymentAmount = inv4Amount;
        invPayment4.contractPayment = false;
        invPayment4.paymentId = paymentRecord3.paymentId;
        invPayment4.customerId = customerRecord1.customerId;
        await this.invoiceDatabaseService.addPaymentToInvoice(invoiceRecord4.invoiceId, invPayment4);
        invoiceRecord4.totalAmountPaid = inv4Amount;
        invoiceRecord4.paymentStatus = PaymentStatusEnum.PAID;
        await this.invoiceDatabaseService.updateRecord(invoiceRecord4);

        // INV-5: partially paid (non-contract) — totalAmountPaid=1500, paymentStatus=PARTIAL
        const invPayment5 = new InvoicePaymentDto();
        invPayment5.invoiceId = invoiceRecord5.invoiceId;
        invPayment5.receiptNo = '4';
        invPayment5.paymentDate = today;
        invPayment5.paymentAmount = 1500;
        invPayment5.contractPayment = false;
        invPayment5.paymentId = paymentRecord4.paymentId;
        invPayment5.customerId = customerRecord2.customerId;
        await this.invoiceDatabaseService.addPaymentToInvoice(invoiceRecord5.invoiceId, invPayment5);
        invoiceRecord5.totalAmountPaid = 1500;
        invoiceRecord5.paymentStatus = PaymentStatusEnum.PARTIAL;
        await this.invoiceDatabaseService.updateRecord(invoiceRecord5);

        // INV-6: no payment — stays PENDING (contract invoice)

        // ----- UPDATE CONTRACT INVOICED AMOUNTS (mimicking contract invoice handler) -----

        // Contract 1: INV-1 + INV-9 → invoicedAmount = inv1Amount + inv9Amount
        await this.contractDatabaseService.updateInvoicedAmount(contractRecord1.contractId, inv1Amount + inv9Amount);

        // Contract 2: INV-3 + INV-6 → invoicedAmount = inv3Amount + inv6Amount
        await this.contractDatabaseService.updateInvoicedAmount(contractRecord2.contractId, inv3Amount + inv6Amount);

        // ----- UPDATE CONTRACT PAYMENTS (mimicking contract payment handler) -----

        // PAY-1 is a contract payment for Contract 1
        const contractPayment1 = new ContractPaymentDto();
        contractPayment1.contractId = contractRecord1.contractId;
        contractPayment1.receiptNo = '1';
        contractPayment1.paymentDate = daysAgo(4);
        contractPayment1.paymentAmount = inv1Amount;
        contractPayment1.contractPayment = true;
        contractPayment1.paymentId = paymentRecord1.paymentId;
        await this.contractDatabaseService.addPaymentToContract(contractRecord1.contractId, contractPayment1);

        // ----- UPDATE CUSTOMER BALANCE & CREDIT (mimicking invoice payment handler logic) -----
        // Only non-contract invoices affect customer balance
        // Contract invoices are tracked on the contract, not the customer

        // Customer 1 non-contract invoices:
        //   INV-2: finalAmount=2609.90, paid=1000 → outstanding=1609.90
        //   INV-4: finalAmount=1609.90, paid=1609.90 → outstanding=0
        //   INV-7: finalAmount=1778.47, paid=0 → outstanding=1778.47
        //   Total balance = 1609.90 + 1778.47 = 3388.37
        const customer1Balance = inv2Amount - 1000 + inv7FinalAmount; // 1609.90 + 1778.47 = 3388.37
        await this.customerDatabaseService.updateBalance(customerRecord1.customerId, customer1Balance);

        // Customer 2 non-contract invoices:
        //   INV-5: finalAmount=2609.90, paid=1500 → outstanding=1109.90
        //   INV-8: finalAmount=2731.88, paid=0 → outstanding=2731.88
        //   INV-10: finalAmount=2923.09, paid=0 → outstanding=2923.09
        //   Total balance = 1109.90 + 2731.88 + 2923.09 = 6764.87
        const customer2Balance = inv5Amount - 1500 + inv8InvoiceAmount + inv10FinalAmount; // 1109.90 + 2731.88 + 2923.09 = 6764.87
        await this.customerDatabaseService.updateBalance(customerRecord2.customerId, customer2Balance);

        // ----- VOUCHERS -----

        // Voucher 1: Area account, 5 days ago, CASH, 500.00
        const voucherData1 = new CreateVoucherDto();
        voucherData1.voucherNo = 'V-001';
        voucherData1.voucherDate = daysAgo(5);
        voucherData1.voucherAmount = 500;
        voucherData1.totalAmount = 500;
        voucherData1.accountId = accountRecord1.accountingId;
        voucherData1.accountName = accountRecord1.accountName;
        voucherData1.accountType = AccountTypeEnum.AREA;
        voucherData1.areaId = areaRecord1.areaId;
        voucherData1.areaName = areaRecord1.areaName;
        voucherData1.paymentType = PaymentTypeEnum.CASH;
        voucherData1.status = StatusEnum.ACTIVE;
        voucherData1.remarks = 'Area expense voucher - seed data';
        voucherData1.bankName = '';
        voucherData1.chequeNo = '';
        voucherData1.chequeDate = '';
        voucherData1.activityLogs = [];
        voucherData1.forApprovalVersion = {};
        voucherData1.changeReason = '';
        const voucherDetail1a = new VoucherDetailDto();
        voucherDetail1a.subAccount = 'Sub Account 1 - Area';
        voucherDetail1a.amount = 300;
        const voucherDetail1b = new VoucherDetailDto();
        voucherDetail1b.subAccount = 'Sub Account 2 - Area';
        voucherDetail1b.amount = 200;
        voucherData1.voucherDetails = [voucherDetail1a, voucherDetail1b];
        await this.voucherDatabaseService.createRecord(voucherData1);

        // Voucher 2: Customer account, 4 days ago, CHEQUE, 750.00
        const voucherData2 = new CreateVoucherDto();
        voucherData2.voucherNo = 'V-002';
        voucherData2.voucherDate = daysAgo(4);
        voucherData2.voucherAmount = 750;
        voucherData2.totalAmount = 750;
        voucherData2.accountId = accountRecord2.accountingId;
        voucherData2.accountName = accountRecord2.accountName;
        voucherData2.accountType = AccountTypeEnum.CUSTOMER;
        voucherData2.customerId = customerRecord1.customerId;
        voucherData2.customerName = customerRecord1.customerName;
        voucherData2.paymentType = PaymentTypeEnum.CHEQUE;
        voucherData2.status = StatusEnum.ACTIVE;
        voucherData2.remarks = 'Customer expense voucher - seed data';
        voucherData2.bankName = 'Sample Bank';
        voucherData2.chequeNo = 'VCH-001';
        voucherData2.chequeDate = daysAgo(4);
        voucherData2.activityLogs = [];
        voucherData2.forApprovalVersion = {};
        voucherData2.changeReason = '';
        const voucherDetail2a = new VoucherDetailDto();
        voucherDetail2a.subAccount = 'Sub Account 1 - Customer';
        voucherDetail2a.amount = 450;
        const voucherDetail2b = new VoucherDetailDto();
        voucherDetail2b.subAccount = 'Sub Account 2 - Customer';
        voucherDetail2b.amount = 300;
        voucherData2.voucherDetails = [voucherDetail2a, voucherDetail2b];
        await this.voucherDatabaseService.createRecord(voucherData2);

        // Voucher 3: Area account, today, BANK_TRANSFER, 300.00
        const voucherData3 = new CreateVoucherDto();
        voucherData3.voucherNo = 'V-003';
        voucherData3.voucherDate = today;
        voucherData3.voucherAmount = 300;
        voucherData3.totalAmount = 300;
        voucherData3.accountId = accountRecord1.accountingId;
        voucherData3.accountName = accountRecord1.accountName;
        voucherData3.accountType = AccountTypeEnum.AREA;
        voucherData3.areaId = areaRecord2.areaId;
        voucherData3.areaName = areaRecord2.areaName;
        voucherData3.paymentType = PaymentTypeEnum.BANK_TRANSFER;
        voucherData3.status = StatusEnum.ACTIVE;
        voucherData3.remarks = 'Area bank transfer voucher - seed data';
        voucherData3.bankName = 'Transfer Bank';
        voucherData3.chequeNo = '';
        voucherData3.chequeDate = '';
        voucherData3.activityLogs = [];
        voucherData3.forApprovalVersion = {};
        voucherData3.changeReason = '';
        const voucherDetail3a = new VoucherDetailDto();
        voucherDetail3a.subAccount = 'Sub Account 1 - Area';
        voucherDetail3a.amount = 300;
        voucherData3.voucherDetails = [voucherDetail3a];
        await this.voucherDatabaseService.createRecord(voucherData3);

        // Voucher 4: Customer account, today, CASH, 1000.00
        const voucherData4 = new CreateVoucherDto();
        voucherData4.voucherNo = 'V-004';
        voucherData4.voucherDate = today;
        voucherData4.voucherAmount = 1000;
        voucherData4.totalAmount = 1000;
        voucherData4.accountId = accountRecord2.accountingId;
        voucherData4.accountName = accountRecord2.accountName;
        voucherData4.accountType = AccountTypeEnum.CUSTOMER;
        voucherData4.customerId = customerRecord2.customerId;
        voucherData4.customerName = customerRecord2.customerName;
        voucherData4.paymentType = PaymentTypeEnum.CASH;
        voucherData4.status = StatusEnum.ACTIVE;
        voucherData4.remarks = 'Customer cash voucher - seed data';
        voucherData4.bankName = '';
        voucherData4.chequeNo = '';
        voucherData4.chequeDate = '';
        voucherData4.activityLogs = [];
        voucherData4.forApprovalVersion = {};
        voucherData4.changeReason = '';
        const voucherDetail4a = new VoucherDetailDto();
        voucherDetail4a.subAccount = 'Sub Account 1 - Customer';
        voucherDetail4a.amount = 600;
        const voucherDetail4b = new VoucherDetailDto();
        voucherDetail4b.subAccount = 'Sub Account 2 - Customer';
        voucherDetail4b.amount = 400;
        voucherData4.voucherDetails = [voucherDetail4a, voucherDetail4b];
        await this.voucherDatabaseService.createRecord(voucherData4);

        // ----- RETURN GOODS SOLD (RGS) -----

        // RGS-1: Return on INV-7 (Customer 1, Area 1), 5 days ago — ACTIVE
        // Customer returned 2 of Product 1 (originally 5 → now 3). Product 2 unchanged.
        const rgsData1 = new CreateReturnGoodSoldDto();
        rgsData1.invoiceId = invoiceRecord7.invoiceId;
        rgsData1.customerId = customerRecord1.customerId;
        rgsData1.customerName = customerRecord1.customerName;
        rgsData1.areaId = areaRecord1.areaId;
        rgsData1.areaName = areaRecord1.areaName;
        rgsData1.areaPrefixId = areaRecord1.idPrefix;
        rgsData1.invoiceDocno = invoiceRecord7.docno;
        rgsData1.rgsDocno = `${areaRecord1.idPrefix}-RGS-1`;
        rgsData1.dateReturned = daysAgo(5);
        rgsData1.status = StatusEnum.ACTIVE;
        rgsData1.activityLogs = [
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, RGS created - seed data, status set to ACTIVE`,
        ];
        rgsData1.forApprovalVersion = {};
        rgsData1.changeReason = '';

        // Original details: Prod1 qty=5, Prod2 qty=3
        const rgs1OrigDetail1 = new InvoiceDetailsDto();
        rgs1OrigDetail1.invoiceDetailId = 'inv-detail-7a';
        rgs1OrigDetail1.productId = productRecord1.productId;
        rgs1OrigDetail1.productName = productRecord1.productName;
        rgs1OrigDetail1.productUnitId = productUnitRecord1.productUnitId;
        rgs1OrigDetail1.productUnitName = productUnitRecord1.productUnitName;
        rgs1OrigDetail1.stockTypeId = stockTypeRecord1.stockTypeId;
        rgs1OrigDetail1.stockTypeName = stockTypeRecord1.stockTypeName;
        rgs1OrigDetail1.lotNo = '7777701';
        rgs1OrigDetail1.qty = 5;
        rgs1OrigDetail1.price = inv7Detail1Price;
        rgs1OrigDetail1.cost = 111.0;
        rgs1OrigDetail1.amount = inv7Detail1Amount;
        rgs1OrigDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const rgs1OrigDetail2 = new InvoiceDetailsDto();
        rgs1OrigDetail2.invoiceDetailId = 'inv-detail-7b';
        rgs1OrigDetail2.productId = productRecord2.productId;
        rgs1OrigDetail2.productName = productRecord2.productName;
        rgs1OrigDetail2.productUnitId = productUnitRecord2.productUnitId;
        rgs1OrigDetail2.productUnitName = productUnitRecord2.productUnitName;
        rgs1OrigDetail2.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs1OrigDetail2.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs1OrigDetail2.lotNo = '7777702';
        rgs1OrigDetail2.qty = 3;
        rgs1OrigDetail2.price = inv7Detail2Price;
        rgs1OrigDetail2.cost = 222.0;
        rgs1OrigDetail2.amount = inv7Detail2Amount;
        rgs1OrigDetail2.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData1.originalInvoiceDetails = [rgs1OrigDetail1, rgs1OrigDetail2];

        // Modified details: Prod1 qty reduced from 5→3, Prod2 unchanged
        const rgs1ModDetail1 = new InvoiceDetailsDto();
        rgs1ModDetail1.invoiceDetailId = 'inv-detail-7a';
        rgs1ModDetail1.productId = productRecord1.productId;
        rgs1ModDetail1.productName = productRecord1.productName;
        rgs1ModDetail1.productUnitId = productUnitRecord1.productUnitId;
        rgs1ModDetail1.productUnitName = productUnitRecord1.productUnitName;
        rgs1ModDetail1.stockTypeId = stockTypeRecord1.stockTypeId;
        rgs1ModDetail1.stockTypeName = stockTypeRecord1.stockTypeName;
        rgs1ModDetail1.lotNo = '7777701';
        rgs1ModDetail1.qty = 3; // Reduced from 5 to 3
        rgs1ModDetail1.price = inv7Detail1Price;
        rgs1ModDetail1.cost = 111.0;
        rgs1ModDetail1.amount = Math.round(3 * inv7Detail1Price * 100) / 100; // 482.97
        rgs1ModDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const rgs1ModDetail2 = new InvoiceDetailsDto();
        rgs1ModDetail2.invoiceDetailId = 'inv-detail-7b';
        rgs1ModDetail2.productId = productRecord2.productId;
        rgs1ModDetail2.productName = productRecord2.productName;
        rgs1ModDetail2.productUnitId = productUnitRecord2.productUnitId;
        rgs1ModDetail2.productUnitName = productUnitRecord2.productUnitName;
        rgs1ModDetail2.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs1ModDetail2.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs1ModDetail2.lotNo = '7777702';
        rgs1ModDetail2.qty = 3; // Unchanged
        rgs1ModDetail2.price = inv7Detail2Price;
        rgs1ModDetail2.cost = 222.0;
        rgs1ModDetail2.amount = inv7Detail2Amount; // Unchanged
        rgs1ModDetail2.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData1.modifiedInvoiceDetails = [rgs1ModDetail1, rgs1ModDetail2];
        await this.returnGoodSoldDatabaseService.createRecord(rgsData1);

        // RGS-2: Return on INV-8 (Customer 2, Area 2), 3 days ago — ACTIVE
        // Customer returned 3 of Product 2 (originally 8 → now 5). Product 1 unchanged.
        const rgsData2 = new CreateReturnGoodSoldDto();
        rgsData2.invoiceId = invoiceRecord8.invoiceId;
        rgsData2.customerId = customerRecord2.customerId;
        rgsData2.customerName = customerRecord2.customerName;
        rgsData2.areaId = areaRecord2.areaId;
        rgsData2.areaName = areaRecord2.areaName;
        rgsData2.areaPrefixId = areaRecord2.idPrefix;
        rgsData2.invoiceDocno = invoiceRecord8.docno;
        rgsData2.rgsDocno = `${areaRecord2.idPrefix}-RGS-1`;
        rgsData2.dateReturned = daysAgo(3);
        rgsData2.status = StatusEnum.ACTIVE;
        rgsData2.activityLogs = [
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, RGS created - seed data, status set to ACTIVE`,
        ];
        rgsData2.forApprovalVersion = {};
        rgsData2.changeReason = '';

        // Original details: Prod2 qty=8, Prod1 qty=4
        const rgs2OrigDetail1 = new InvoiceDetailsDto();
        rgs2OrigDetail1.invoiceDetailId = 'inv-detail-8a';
        rgs2OrigDetail1.productId = productRecord2.productId;
        rgs2OrigDetail1.productName = productRecord2.productName;
        rgs2OrigDetail1.productUnitId = productUnitRecord2.productUnitId;
        rgs2OrigDetail1.productUnitName = productUnitRecord2.productUnitName;
        rgs2OrigDetail1.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs2OrigDetail1.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs2OrigDetail1.lotNo = '8888801';
        rgs2OrigDetail1.qty = 8;
        rgs2OrigDetail1.price = inv8Detail1Price;
        rgs2OrigDetail1.cost = 222.0;
        rgs2OrigDetail1.amount = inv8Detail1Amount;
        rgs2OrigDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const rgs2OrigDetail2 = new InvoiceDetailsDto();
        rgs2OrigDetail2.invoiceDetailId = 'inv-detail-8b';
        rgs2OrigDetail2.productId = productRecord1.productId;
        rgs2OrigDetail2.productName = productRecord1.productName;
        rgs2OrigDetail2.productUnitId = productUnitRecord1.productUnitId;
        rgs2OrigDetail2.productUnitName = productUnitRecord1.productUnitName;
        rgs2OrigDetail2.stockTypeId = stockTypeRecord1.stockTypeId;
        rgs2OrigDetail2.stockTypeName = stockTypeRecord1.stockTypeName;
        rgs2OrigDetail2.lotNo = '8888802';
        rgs2OrigDetail2.qty = 4;
        rgs2OrigDetail2.price = inv8Detail2Price;
        rgs2OrigDetail2.cost = 111.0;
        rgs2OrigDetail2.amount = inv8Detail2Amount;
        rgs2OrigDetail2.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData2.originalInvoiceDetails = [rgs2OrigDetail1, rgs2OrigDetail2];

        // Modified details: Prod2 qty reduced from 8→5, Prod1 unchanged
        const rgs2ModDetail1 = new InvoiceDetailsDto();
        rgs2ModDetail1.invoiceDetailId = 'inv-detail-8a';
        rgs2ModDetail1.productId = productRecord2.productId;
        rgs2ModDetail1.productName = productRecord2.productName;
        rgs2ModDetail1.productUnitId = productUnitRecord2.productUnitId;
        rgs2ModDetail1.productUnitName = productUnitRecord2.productUnitName;
        rgs2ModDetail1.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs2ModDetail1.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs2ModDetail1.lotNo = '8888801';
        rgs2ModDetail1.qty = 5; // Reduced from 8 to 5
        rgs2ModDetail1.price = inv8Detail1Price;
        rgs2ModDetail1.cost = 222.0;
        rgs2ModDetail1.amount = Math.round(5 * inv8Detail1Price * 100) / 100; // 1304.95
        rgs2ModDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        const rgs2ModDetail2 = new InvoiceDetailsDto();
        rgs2ModDetail2.invoiceDetailId = 'inv-detail-8b';
        rgs2ModDetail2.productId = productRecord1.productId;
        rgs2ModDetail2.productName = productRecord1.productName;
        rgs2ModDetail2.productUnitId = productUnitRecord1.productUnitId;
        rgs2ModDetail2.productUnitName = productUnitRecord1.productUnitName;
        rgs2ModDetail2.stockTypeId = stockTypeRecord1.stockTypeId;
        rgs2ModDetail2.stockTypeName = stockTypeRecord1.stockTypeName;
        rgs2ModDetail2.lotNo = '8888802';
        rgs2ModDetail2.qty = 4; // Unchanged
        rgs2ModDetail2.price = inv8Detail2Price;
        rgs2ModDetail2.cost = 111.0;
        rgs2ModDetail2.amount = inv8Detail2Amount; // Unchanged
        rgs2ModDetail2.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData2.modifiedInvoiceDetails = [rgs2ModDetail1, rgs2ModDetail2];
        await this.returnGoodSoldDatabaseService.createRecord(rgsData2);

        // RGS-3: Return on INV-10 (Customer 2, Area 2), today — NEW_RECORD (pending approval)
        // Customer wants to return 4 of Product 2 (originally 10 → 6).
        const rgsData3 = new CreateReturnGoodSoldDto();
        rgsData3.invoiceId = invoiceRecord10.invoiceId;
        rgsData3.customerId = customerRecord2.customerId;
        rgsData3.customerName = customerRecord2.customerName;
        rgsData3.areaId = areaRecord2.areaId;
        rgsData3.areaName = areaRecord2.areaName;
        rgsData3.areaPrefixId = areaRecord2.idPrefix;
        rgsData3.invoiceDocno = invoiceRecord10.docno;
        rgsData3.rgsDocno = `${areaRecord2.idPrefix}-RGS-2`;
        rgsData3.dateReturned = today;
        rgsData3.status = StatusEnum.NEW_RECORD;
        rgsData3.activityLogs = [
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, RGS created - seed data, pending approval`,
        ];
        rgsData3.changeReason = 'Customer received wrong quantity';

        // Original details: Prod2 qty=10
        const rgs3OrigDetail1 = new InvoiceDetailsDto();
        rgs3OrigDetail1.invoiceDetailId = 'inv-detail-10';
        rgs3OrigDetail1.productId = productRecord2.productId;
        rgs3OrigDetail1.productName = productRecord2.productName;
        rgs3OrigDetail1.productUnitId = productUnitRecord2.productUnitId;
        rgs3OrigDetail1.productUnitName = productUnitRecord2.productUnitName;
        rgs3OrigDetail1.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs3OrigDetail1.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs3OrigDetail1.lotNo = '1010101';
        rgs3OrigDetail1.qty = 10;
        rgs3OrigDetail1.price = inv10Price;
        rgs3OrigDetail1.cost = 222.0;
        rgs3OrigDetail1.amount = inv10InvoiceAmount;
        rgs3OrigDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData3.originalInvoiceDetails = [rgs3OrigDetail1];

        // Modified details: Prod2 qty reduced from 10→6
        const rgs3ModDetail1 = new InvoiceDetailsDto();
        rgs3ModDetail1.invoiceDetailId = 'inv-detail-10';
        rgs3ModDetail1.productId = productRecord2.productId;
        rgs3ModDetail1.productName = productRecord2.productName;
        rgs3ModDetail1.productUnitId = productUnitRecord2.productUnitId;
        rgs3ModDetail1.productUnitName = productUnitRecord2.productUnitName;
        rgs3ModDetail1.stockTypeId = stockTypeRecord2.stockTypeId;
        rgs3ModDetail1.stockTypeName = stockTypeRecord2.stockTypeName;
        rgs3ModDetail1.lotNo = '1010101';
        rgs3ModDetail1.qty = 6; // Reduced from 10 to 6
        rgs3ModDetail1.price = inv10Price;
        rgs3ModDetail1.cost = 222.0;
        rgs3ModDetail1.amount = Math.round(6 * inv10Price * 100) / 100; // 1565.94
        rgs3ModDetail1.invoiceDetailType = InvoiceDetailTypeEnum.REGULAR_ITEM;

        rgsData3.modifiedInvoiceDetails = [rgs3ModDetail1];

        // Store forApprovalVersion for NEW_RECORD
        rgsData3.forApprovalVersion = {
            invoiceId: rgsData3.invoiceId,
            customerId: rgsData3.customerId,
            customerName: rgsData3.customerName,
            areaId: rgsData3.areaId,
            areaName: rgsData3.areaName,
            areaPrefixId: rgsData3.areaPrefixId,
            invoiceDocno: rgsData3.invoiceDocno,
            rgsDocno: rgsData3.rgsDocno,
            dateReturned: rgsData3.dateReturned,
            changeReason: rgsData3.changeReason,
            originalInvoiceDetails: rgsData3.originalInvoiceDetails,
            modifiedInvoiceDetails: rgsData3.modifiedInvoiceDetails,
        };
        await this.returnGoodSoldDatabaseService.createRecord(rgsData3);
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
        await this.rawMaterialsLocationDatabaseService.deleteAllRecords();
        await this.rawMaterialSupplierDatabaseService.deleteAllRecords();
        await this.rawMaterialsStockDatabaseService.deleteAllRecords();
        await this.configurationDatabaseService.deleteAllRecords();
        await this.collectionReceiptRangeDatabaseService.deleteAllRecords();
        await this.voucherDatabaseService.deleteAllRecords();
        await this.paymentDatabaseService.deleteAllRecords();
        await this.paymentInvoiceDatabaseService.deleteAllRecords();
        await this.overPaymentDatabaseService.deleteAllRecords();
        await this.returnGoodSoldDatabaseService.deleteAllRecords();
    }
}
