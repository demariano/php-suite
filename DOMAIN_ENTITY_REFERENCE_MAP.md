# Domain Entity Reference Map

This document maps all entities across the five domains (Accounting, Customer, Inventory, Invoicing, Product) and their reference relationships. Each entity's fields that reference other entities are categorized as either **Intra-Domain** (same domain) or **Cross-Domain** (different domain) references.

---

## 1. ACCOUNTING DOMAIN

**Schema File:** `libs/backend/dynamo-db-lib/src/lib/schema/AccountingSchema.ts`

**Full Path:** `d:\other_coding_projects\php\libs\backend\dynamo-db-lib\src\lib\schema\AccountingSchema.ts`

**SQS Event Queue:** `ACCOUNTING_EVENT_SQS`

**LocalStack Queue:** `http://localhost:4566/000000000000/ACCOUNTING_EVENT_SQS`

**API Service:** `apps/accounting/accounting-api-service`

**Event Handler Service:** `apps/accounting/accounting-event-handler-service`

### Entities

1. **Accounts**
2. **Voucher**

---

### 1.1 Accounts

**Primary Key:** accountingId

**Database Service:** `AccountsDatabaseService`

**Service Path:** `libs/backend/database-services/accounting-database-service/src/lib/accounts-database-service.ts`

**Abstract Class:** `libs/backend/database-services/accounting-database-service/src/lib/accounts-database-service-abstract-class.ts`

#### Own Fields:

-   accountingId (ULID)
-   accountName
-   accountType (AREA | CUSTOMER | OTHERS)
-   status
-   activityLogs
-   forApprovalVersion
-   subAccounts
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:**

-   Implicitly referenced by accountType which can be AREA or CUSTOMER, but stores no direct IDs

---

### 1.2 Voucher

**Primary Key:** voucherId

**Database Service:** `VoucherDatabaseService`

**Service Path:** `libs/backend/database-services/accounting-database-service/src/lib/voucher-database-service.ts`

**Abstract Class:** `libs/backend/database-services/accounting-database-service/src/lib/voucher-database-service-abstract-class.ts`

#### Own Fields:

-   voucherId (ULID)
-   voucherNo
-   voucherDate
-   voucherAmount
-   approverMessage
-   activityLogs
-   forApprovalVersion
-   changeReason
-   status
-   remarks
-   voucherDetails
-   paymentType (CASH | CHEQUE | BANK_TRANSFER | OTHER)
-   bankName
-   chequeNo
-   chequeDate
-   totalAmount

#### References:

**Intra-Domain:**

-   accountId → Accounts.accountingId (GSI4: `VOUCHER#${accountId}`) | Query: `findRecordsByAccountIdPagination`
-   accountName → Accounts.accountName (denormalized)
-   accountType → Accounts.accountType (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:**

-   **Customer Domain:**
    -   customerId → Customer.customerId
    -   customerName → Customer.customerName (denormalized)
    -   areaId → Area.areaId
    -   areaName → Area.areaName (denormalized)

---

## 2. CUSTOMER DOMAIN

**Schema File:** `libs/backend/dynamo-db-lib/src/lib/schema/CustomerSchema.ts`

**Full Path:** `d:\other_coding_projects\php\libs\backend\dynamo-db-lib\src\lib\schema\CustomerSchema.ts`

**SQS Event Queue:** `CUSTOMER_EVENT_SQS`

**LocalStack Queue:** `http://localhost:4566/000000000000/CUSTOMER_EVENT_SQS`

**API Service:** `apps/customer/customer-api-service`

**Event Handler Service:** `apps/customer/customer-event-handler-service`

### Entities

1. **Customer**
2. **CustomerClassification**
3. **CustomerType**
4. **Terms**
5. **Area**

---

### 2.1 Customer

**Primary Key:** customerId

**Database Service:** `CustomerDatabaseService`

**Service Path:** `libs/backend/database-services/customer-database-service/src/lib/customer-database-service.ts`

**Abstract Class:** `libs/backend/database-services/customer-database-service/src/lib/customer-database-service-abstract-class.ts`

#### Own Fields:

-   customerId (ULID)
-   customerName
-   email
-   address1
-   address2
-   balance
-   contactNo
-   contactPerson
-   townName
-   creditLimit
-   customerCredit
-   tinNumber
-   status
-   forApprovalVersion
-   changeReason
-   approverMessage
-   activityLogs
-   customerTerms
-   customerProductDeals

#### References:

**Intra-Domain:**

-   areaId → Area.areaId (GSI5: `CUSTOMER#${areaId}`) | Query: `findRecordsByAreaIdPagination`
-   areaName → Area.areaName (denormalized)
-   customerClassificationId → CustomerClassification.customerClassificationId (GSI3: `CUSTOMER#${customerClassificationId}`) | Query: `findRecordsByCustomerClassificationIdPagination`
-   customerClassificationName → CustomerClassification.customerClassificationName (denormalized)
-   customerTypeId → CustomerType.customerTypeId (GSI4: `CUSTOMER#${customerTypeId}`) | Query: `findRecordsByCustomerTypeIdPagination`
-   customerTypeName → CustomerType.customerTypeName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

### 2.2 CustomerClassification

**Primary Key:** customerClassificationId

**Database Service:** `CustomerClassificationDatabaseService`

**Service Path:** `libs/backend/database-services/customer-database-service/src/lib/customer-classification-database-service.ts`

**Abstract Class:** `libs/backend/database-services/customer-database-service/src/lib/customer-classification-database-service-abstract-class.ts`

#### Own Fields:

-   customerClassificationId (ULID)
-   customerClassificationName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 2.3 CustomerType

**Primary Key:** customerTypeId

**Database Service:** `CustomerTypeDatabaseService`

**Service Path:** `libs/backend/database-services/customer-database-service/src/lib/customer-type-database-service.ts`

**Abstract Class:** `libs/backend/database-services/customer-database-service/src/lib/customer-type-database-service-abstract-class.ts`

#### Own Fields:

-   customerTypeId (ULID)
-   customerTypeName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 2.4 Terms

**Primary Key:** termsId

**Database Service:** `TermsDatabaseService`

**Service Path:** `libs/backend/database-services/customer-database-service/src/lib/terms-database-service.ts`

**Abstract Class:** `libs/backend/database-services/customer-database-service/src/lib/terms-database-service-abstract-class.ts`

#### Own Fields:

-   termsId (ULID)
-   termsName
-   days
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 2.5 Area

**Primary Key:** areaId

**Database Service:** `AreaDatabaseService`

**Service Path:** `libs/backend/database-services/customer-database-service/src/lib/area-database-service.ts`

**Abstract Class:** `libs/backend/database-services/customer-database-service/src/lib/area-database-service-abstract-class.ts`

#### Own Fields:

-   areaId (ULID)
-   areaName
-   towns
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage
-   idPrefix

#### References:

**Intra-Domain:** None

**Cross-Domain:**

-   **Invoicing Domain:**
    -   territoryManagerId → TerritoryManager.territoryManagerId (GSI3: `AREA#${territoryManagerId}`) | Query: `findRecordsByTerritoryManagerIdPagination`
    -   territoryManagerName → TerritoryManager.territoryManagerName (denormalized)

**Batch Update Function:** `batchUpdate`

---

## 3. INVENTORY DOMAIN

**Schema File:** `libs/backend/dynamo-db-lib/src/lib/schema/InventorySchema.ts`

**Full Path:** `d:\other_coding_projects\php\libs\backend\dynamo-db-lib\src\lib\schema\InventorySchema.ts`

**SQS Event Queue:** `INVENTORY_EVENT_SQS`

**LocalStack Queue:** `http://localhost:4566/000000000000/INVENTORY_EVENT_SQS`

**API Service:** `apps/inventory/inventory-api-service`

**Event Handler Service:** `apps/inventory/inventory-event-handler-service`

### Entities

1. **Stock**
2. **StockType**
3. **RawMaterials**
4. **RawMaterialSupplier**
5. **RawMaterialsLocation**
6. **RawMaterialsStock**
7. **RawMaterialsPurchaseOrder**
8. **RawMaterialUnits**
9. **Supplier**
10. **StockDelivery**
11. **StockPurchaseOrder**

---

### 3.1 Stock

**Primary Key:** stockId

**Database Service:** `StockDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/stock-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/stock-database-service-abstract-class.ts`

#### Own Fields:

-   stockId (ULID)
-   lotNo
-   totalQuantity
-   expirationDate
-   status
-   forApprovalVersion
-   approverMessage
-   activityLogs
-   changeReason

#### References:

**Intra-Domain:**

-   stockTypeId → StockType.stockTypeId (GSI6: `STOCK#${stockTypeId}`) | Query: `findRecordsByStockTypeIdPagination`
-   stockTypeName → StockType.stockTypeName (denormalized)

**Cross-Domain:**

-   **Product Domain:**
    -   productId → Product.productId (GSI3: `STOCK#${status}`, GSI4/GSI5: `STOCK#${status}#${productUnitId}#${productId}`) | Query: `findRecordsByProductIdPagination`
    -   productName → Product.productName (denormalized)
    -   productUnitId → ProductUnit.productUnitId (GSI7: `STOCK#${productUnitId}`, GSI4/GSI5: `STOCK#${status}#${productUnitId}#${productId}`) | Query: `findRecordsByProductUnitIdPagination`
    -   productUnitName → ProductUnit.productUnitName (denormalized)

**Batch Update Function:** `batchUpdate`

---

### 3.2 StockType

**Primary Key:** stockTypeId

**Database Service:** `StockTypeDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/stock-type-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/stock-type-database-service-abstract-class.ts`

#### Own Fields:

-   stockTypeId (ULID)
-   stockTypeName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.3 RawMaterials

**Primary Key:** rawMaterialId

**Database Service:** `RawMaterialDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialId (ULID)
-   rawMaterialName
-   description
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.4 RawMaterialSupplier

**Primary Key:** rawMaterialSupplierId

**Database Service:** `RawMaterialSupplierDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-supplier-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-supplier-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialSupplierId (ULID)
-   rawMaterialSupplierName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.5 RawMaterialsLocation

**Primary Key:** rawMaterialsLocationId

**Database Service:** `RawMaterialsLocationDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-location-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-location-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialsLocationId (ULID)
-   rawMaterialsLocationName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.6 RawMaterialsStock

**Primary Key:** rawMaterialsStockId

**Database Service:** `RawMaterialsStockDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-stock-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-stock-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialsStockId (ULID)
-   rawMaterialNamePoNo
-   qty
-   lotNo
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:**

-   rawMaterialId → RawMaterials.rawMaterialId (GSI3: `RAW_MATERIAL_STOCK#${rawMaterialId}`) | Query: `findRecordsByRawMaterialIdPagination`
-   rawMaterialName → RawMaterials.rawMaterialName (denormalized)
-   rawMaterialUnitId → RawMaterialUnits.rawMaterialUnitId (GSI4: `RAW_MATERIAL_STOCK#${rawMaterialUnitId}`) | Query: `findRecordsByRawMaterialUnitIdPagination`
-   rawMaterialUnitName → RawMaterialUnits.rawMaterialUnitName (denormalized)
-   rawMaterialSupplierId → RawMaterialSupplier.rawMaterialSupplierId (GSI5: `RAW_MATERIAL_STOCK#${rawMaterialSupplierId}`) | Query: `findRecordsByRawMaterialSupplierIdPagination`
-   rawMaterialSupplierName → RawMaterialSupplier.rawMaterialSupplierName (denormalized)
-   rawMaterialsLocationId → RawMaterialsLocation.rawMaterialsLocationId (GSI6: `RAW_MATERIAL_STOCK#${rawMaterialsLocationId}`) | Query: `findRecordsByRawMaterialsLocationIdPagination`
-   rawMaterialsLocationName → RawMaterialsLocation.rawMaterialsLocationName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

### 3.7 RawMaterialsPurchaseOrder

**Primary Key:** rawMaterialsPurchaseOrderId

**Database Service:** `RawMaterialsPurchaseOrderDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-purchase-order-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-materials-purchase-order-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialsPurchaseOrderId (ULID)
-   poDate
-   docNo
-   status
-   poStatus (SYSTEM_GENERATED | PENDING | PARTIAL | COMPLETED)
-   purchaseOrderDetails
-   deliveredPurchaseOrderDetails
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:**

-   rawMaterialSupplierId → RawMaterialSupplier.rawMaterialSupplierId (GSI6: `RAW_MATERIALS_PURCHASE_ORDER#${rawMaterialSupplierId}`) | Query: `findRecordsByRawMaterialSupplierIdPagination`
-   rawMaterialSupplierName → RawMaterialSupplier.rawMaterialSupplierName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

### 3.8 RawMaterialUnits

**Primary Key:** rawMaterialUnitId

**Database Service:** `RawMaterialUnitDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-unit-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/raw-material-unit-database-service-abstract-class.ts`

#### Own Fields:

-   rawMaterialUnitId (ULID)
-   rawMaterialUnitName
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.9 Supplier

**Primary Key:** supplierId

**Database Service:** `SupplierDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/supplier-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/supplier-database-service-abstract-class.ts`

#### Own Fields:

-   supplierId (ULID)
-   supplierName
-   supplierAddress
-   supplierPhone
-   supplierEmail
-   supplierContactPerson
-   status
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 3.10 StockDelivery

**Primary Key:** stockDeliveryId

**Database Service:** `StockDeliveryDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/stock-delivery-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/stock-delivery-database-service-abstract-class.ts`

#### Own Fields:

-   stockDeliveryId (ULID)
-   status
-   forApprovalVersion
-   changeReason
-   approverMessage
-   activityLogs
-   deliveryDetails
-   dateReceived
-   docno

#### References:

**Intra-Domain:**

-   supplierId → Supplier.supplierId (GSI3: `STOCK_DELIVERY#${supplierId}`, GSI5: `STOCK_DELIVERY#${supplierId}`) | Query: `findRecordsBySupplierIdPagination`
-   supplierName → Supplier.supplierName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

### 3.11 StockPurchaseOrder

**Primary Key:** stockPurchaseOrderId

**Database Service:** `StockPurchaseOrderDatabaseService`

**Service Path:** `libs/backend/database-services/inventory-database-service/src/lib/stock-purchase-order-database-service.ts`

**Abstract Class:** `libs/backend/database-services/inventory-database-service/src/lib/stock-purchase-order-database-service-abstract-class.ts`

#### Own Fields:

-   stockPurchaseOrderId (ULID)
-   status
-   poStatus (SYSTEM_GENERATED | PENDING | PARTIAL | COMPLETED)
-   poDate
-   docNo
-   purchaseOrderDetails
-   deliveredPurchaseOrderDetails
-   activityLogs
-   forApprovalVersion
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:**

-   supplierId → Supplier.supplierId (GSI6: `STOCK_PURCHASE_ORDER#${supplierId}`) | Query: `findRecordsBySupplierIdPagination`
-   supplierName → Supplier.supplierName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

## 4. INVOICING DOMAIN

**Schema File:** `libs/backend/dynamo-db-lib/src/lib/schema/InvoicingSchema.ts`

**Full Path:** `d:\other_coding_projects\php\libs\backend\dynamo-db-lib\src\lib\schema\InvoicingSchema.ts`

**SQS Event Queue:** `INVOICE_EVENT_SQS`

**LocalStack Queue:** `http://localhost:4566/000000000000/INVOICE_EVENT_SQS`

**API Service:** `apps/invoicing/invoicing-api-service`

**Event Handler Service:** `apps/invoicing/invoicing-event-handler-service`

### Entities

1. **Invoice**
2. **SalesType**
3. **TerritoryManager**
4. **Contract**
5. **Payment**
6. **ReturnGoodSold**
7. **CollectionReceiptRange**

---

### 4.1 Invoice

**Primary Key:** invoiceId

**Database Service:** `InvoiceDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/invoice-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/invoice-database-service-abstract-class.ts`

#### Own Fields:

-   invoiceId (ULID)
-   docno
-   invoiceDate
-   changeReason
-   finalAmount
-   invoiceAmount
-   taxAmount
-   totalAmountPaid
-   contractSales
-   status
-   printStatus (PENDING | COMPLETED | FOR_REPRINT)
-   paymentStatus (PENDING | PARTIAL | PAID)
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   invoiceDetails
-   payments

#### References:

**Intra-Domain:**

-   salesTypeId → SalesType.salesTypeId (GSI4: `INVOICE#${salesTypeId}`) | Query: `findRecordsBySalesTypeIdPagination`
-   salesTypeName → SalesType.salesTypeName (denormalized)
-   contractId → Contract.contractId (GSI5: `INVOICE#${contractId}`) | Query: `findRecordsByContractIdPagination`
-   contractName → Contract.contractName (denormalized)
-   territoryManagerId → TerritoryManager.territoryManagerId (GSI9: `INVOICE#${territoryManagerId}`) | Query: `findRecordsByTerritoryManagerIdPagination`
-   territoryManagerName → TerritoryManager.territoryManagerName (denormalized)

**Cross-Domain:**

-   **Customer Domain:**
    -   customerId → Customer.customerId (GSI3: `INVOICE#${customerId}`) | Query: `findRecordsByCustomerIdPagination`
    -   customerName → Customer.customerName (denormalized)
    -   areaId → Area.areaId (GSI8: `INVOICE#${areaId}`) | Query: `findRecordsByAreaIdPagination`
    -   areaName → Area.areaName (denormalized)
    -   termsId → Terms.termsId (GSI6: `INVOICE#${termsId}`) | Query: `findRecordsByTermsIdPagination`
    -   termsName → Terms.termsName (denormalized)
-   **Product Domain:**
    -   productPriceTypeId → ProductPriceType.productPriceTypeId (GSI7: `INVOICE#${productPriceTypeId}`) | Query: `findRecordsByProductPriceTypeIdPagination`
    -   productPriceTypeName → ProductPriceType.productPriceTypeName (denormalized)

**Batch Update Function:** `batchUpdateRecords`

---

### 4.2 SalesType

**Primary Key:** salesTypeId

**Database Service:** `SalesTypeDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/sales-type-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/sales-type-database-service-abstract-class.ts`

#### Own Fields:

-   salesTypeId (ULID)
-   salesTypeName
-   allowDiscount
-   contractSales
-   defaultDiscount
-   defaultTax
-   incomeGenerating
-   taxable
-   status
-   activityLogs
-   approverMessage
-   forApprovalVersion
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 4.3 TerritoryManager

**Primary Key:** territoryManagerId

**Database Service:** `TerritoryManagerDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/territory-manager-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/territory-manager-database-service-abstract-class.ts`

#### Own Fields:

-   territoryManagerId (ULID)
-   territoryManagerName
-   contactNo
-   status
-   activityLogs
-   approverMessage
-   forApprovalVersion
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 4.4 Contract

**Primary Key:** contractId

**Database Service:** `ContractDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/contract-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/contract-database-service-abstract-class.ts`

#### Own Fields:

-   contractId (ULID)
-   contractNo
-   contractName
-   startDate
-   endDate
-   contractType (REGULAR | CONTRACT_PER_INVOICE)
-   contractAmount
-   totalAmountPaid
-   contractProductDeals
-   payments
-   invoicedAmount
-   deliveryStatus (PENDING | DELIVERED)
-   paymentStatus (PENDING | PARTIAL | PAID)
-   deliveredAmount
-   changeReason
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   rebatePercentage
-   rebateType (PERCENTAGE | AMOUNT | NONE)
-   rebateAmount
-   rebateClaimedAmount
-   rebateClaimedStatus (PENDING | CLAIMED | NOT_CLAIMED)
-   status

#### References:

**Intra-Domain:** None

**Cross-Domain:**

-   **Customer Domain:**
    -   customerId → Customer.customerId (GSI3: `CONTRACT#${customerId}`, GSI4: `CONTRACT#${customerId}#${status}`, GSI5: `CONTRACT#${customerId}#${paymentStatus}`) | Query: `findRecordsByCustomerIdPagination`
    -   customerName → Customer.customerName (denormalized)
    -   areaId → Area.areaId (GSI6: `CONTRACT#${areaId}`) | Query: `findRecordsByAreaIdPagination`
    -   areaName → Area.areaName (denormalized)

**Batch Update Function:** `batchUpdateRecords`

---

### 4.5 Payment

**Primary Key:** paymentId

**Database Service:** `PaymentDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/payment-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/payment-database-service-abstract-class.ts`

#### Own Fields:

-   paymentId (ULID)
-   paymentDate
-   paymentAmount
-   receiptNo
-   activityLogs
-   forApprovalVersion
-   contractPayment
-   status
-   chequeClearStatus (PENDING | CLEARED)
-   paymentDetails
-   paymentInvoiceDetails
-   changeReason
-   approverMessage

#### References:

**Intra-Domain:**

-   contractId → Contract.contractId (GSI6: `PAYMENT#${contractId}`) | Query: `findRecordsByContractIdPagination`
-   contractName → Contract.contractName (denormalized)
-   contractNo → Contract.contractNo (denormalized)

**Cross-Domain:**

-   **Customer Domain:**
    -   customerId → Customer.customerId (GSI3: `PAYMENT#${customerId}`, GSI4: `PAYMENT#${customerId}#${status}`) | Query: `findRecordsByCustomerIdPagination`
    -   customerName → Customer.customerName (denormalized)

**Batch Update Function:** `batchUpdateRecords`

---

### 4.6 ReturnGoodSold

**Primary Key:** returnGoodSoldId

**Database Service:** `ReturnGoodSoldDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/return-good-sold-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/return-good-sold-database-service-abstract-class.ts`

#### Own Fields:

-   returnGoodSoldId (ULID)
-   rgsDocno
-   activityLogs
-   dateReturned
-   forApprovalVersion
-   approverMessage
-   status
-   changeReason
-   originalInvoiceDetails
-   modifiedInvoiceDetails

#### References:

**Intra-Domain:**

-   invoiceId → Invoice.invoiceId (GSI3: `RETURN_GOOD_SOLD#${invoiceId}`, GSI4: `RETURN_GOOD_SOLD#${invoiceId}#${status}`) | Query: `findRecordsByInvoiceId` (Note: Function exists but doesn't follow naming convention)
-   invoiceDocno → Invoice.docno (denormalized)

**Cross-Domain:**

-   **Customer Domain:**
    -   customerId → Customer.customerId (GSI5: `RETURN_GOOD_SOLD#${customerId}`) | Query: `findRecordsByCustomerIdPagination`
    -   customerName → Customer.customerName (denormalized)
    -   areaId → Area.areaId (GSI6: `RETURN_GOOD_SOLD#${areaId}`) | Query: `findRecordsByAreaIdPagination`
    -   areaName → Area.areaName (denormalized)

**Batch Update Function:** `batchUpdateRecords`

---

### 4.7 CollectionReceiptRange

**Primary Key:** collectionReceiptRangeId

**Database Service:** `CollectionReceiptRangeDatabaseService`

**Service Path:** `libs/backend/database-services/invoicing-database-service/src/lib/collection-receipt-range-database-service.ts`

**Abstract Class:** `libs/backend/database-services/invoicing-database-service/src/lib/collection-receipt-range-database-service-abstract-class.ts`

#### Own Fields:

-   collectionReceiptRangeId (ULID)
-   startNumber
-   endNumber
-   lastUsedNumber
-   rangeStatus (AVAILABLE | ALL_USED_UP | CANCELLED)
-   cancelledReceiptNumbers
-   activityLogs
-   status
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:**

-   **Customer Domain:**
    -   areaId → Area.areaId (GSI3: `COLLECTION_RECEIPT_RANGE#${areaId}`) | Query: `findRecordsByAreaIdPagination`
    -   areaName → Area.areaName (denormalized)

**Batch Update Function:** `batchUpdateRecords`

---

## 5. PRODUCT DOMAIN

**Schema File:** `libs/backend/dynamo-db-lib/src/lib/schema/ProductSchema.ts`

**Full Path:** `d:\other_coding_projects\php\libs\backend\dynamo-db-lib\src\lib\schema\ProductSchema.ts`

**SQS Event Queue:** `PRODUCT_EVENT_SQS`

**LocalStack Queue:** `http://localhost:4566/000000000000/PRODUCT_EVENT_SQS`

**API Service:** `apps/product/product-api-service`

**Event Handler Service:** `apps/product/product-event-handler-service`

### Entities

1. **Product**
2. **ProductCategory**
3. **ProductClass**
4. **ProductUnit**
5. **ProductPriceType**
6. **ProductDeal**
7. **ProductUnitRawMaterial**

---

### 5.1 Product

**Primary Key:** productId

**Database Service:** `ProductDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-database-service-abstract-class.ts`

#### Own Fields:

-   productId (ULID)
-   productName
-   criticalLevel
-   productDeals
-   productUnitPrice
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason
-   status

#### References:

**Intra-Domain:**

-   productCategoryId → ProductCategory.productCategoryId (GSI3: `PRODUCT#${productCategoryId}`) | Query: `findRecordsByProductCategoryIdPagination`
-   productCategoryName → ProductCategory.productCategoryName (denormalized)
-   productClassId → ProductClass.productClassId (GSI4: `PRODUCT#${productClassId}`) | Query: `findRecordsByProductClassIdPagination`
-   productClassName → ProductClass.productClassName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

### 5.2 ProductCategory

**Primary Key:** productCategoryId

**Database Service:** `ProductCategoryDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-category-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-category-database-service-abstract-class.ts`

#### Own Fields:

-   productCategoryId (ULID)
-   productCategoryName
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 5.3 ProductClass

**Primary Key:** productClassId

**Database Service:** `ProductClassDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-class-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-class-database-service-abstract-class.ts`

#### Own Fields:

-   productClassId (ULID)
-   productClassName
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 5.4 ProductUnit

**Primary Key:** productUnitId

**Database Service:** `ProductUnitDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-unit-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-unit-database-service-abstract-class.ts`

#### Own Fields:

-   productUnitId (ULID)
-   productUnitName
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 5.5 ProductPriceType

**Primary Key:** productPriceTypeId

**Database Service:** `ProductPriceTypeDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-price-type-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-price-type-database-service-abstract-class.ts`

#### Own Fields:

-   productPriceTypeId (ULID)
-   productPriceTypeName
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 5.6 ProductDeal

**Primary Key:** productDealId

**Database Service:** `ProductDealDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-deal-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-deal-database-service-abstract-class.ts`

#### Own Fields:

-   productDealId (ULID)
-   productDealName
-   additionalQty
-   minQty
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:** None

**Cross-Domain:** None

---

### 5.7 ProductUnitRawMaterial

**Primary Key:** productUnitRawMaterialId

**Database Service:** `ProductUnitRawMaterialDatabaseService`

**Service Path:** `libs/backend/database-services/product-database-service/src/lib/product-unit-raw-material-database-service.ts`

**Abstract Class:** `libs/backend/database-services/product-database-service/src/lib/product-unit-raw-material-database-service-abstract-class.ts`

#### Own Fields:

-   productUnitRawMaterialId (ULID)
-   rawMaterialsPerUnit
-   status
-   activityLogs
-   forApprovalVersion
-   approverMessage
-   changeReason

#### References:

**Intra-Domain:**

-   productId → Product.productId (GSI1: `PRODUCT_UNIT_RAW_MATERIAL#${productId}`, GSI2: `PRODUCT_UNIT_RAW_MATERIAL#${productId}#${status}`) | Query: `findRecordsByProductIdPagination`
-   productName → Product.productName (denormalized)

**Batch Update Function:** `batchUpdate`

**Cross-Domain:** None

---

## CROSS-DOMAIN REFERENCE SUMMARY

### References TO Each Domain

#### Customer Domain is Referenced By:

-   **Accounting.Voucher** → Customer, Area
-   **Invoicing.Invoice** → Customer, Area, Terms
-   **Invoicing.Contract** → Customer, Area
-   **Invoicing.Payment** → Customer
-   **Invoicing.ReturnGoodSold** → Customer, Area
-   **Invoicing.CollectionReceiptRange** → Area

#### Product Domain is Referenced By:

-   **Inventory.Stock** → Product, ProductUnit
-   **Invoicing.Invoice** → ProductPriceType

#### Inventory Domain is Referenced By:

-   No cross-domain references to Inventory entities

#### Invoicing Domain is Referenced By:

-   **Customer.Area** → TerritoryManager

#### Accounting Domain is Referenced By:

-   No cross-domain references to Accounting entities

---

## DENORMALIZED FIELD PATTERNS

All entities follow a consistent pattern for referencing other entities:

-   Store both the **ID** field (e.g., `customerId`) and the **Name** field (e.g., `customerName`)
-   The Name field is denormalized for query performance
-   When the source entity's name changes, event-driven sync updates all denormalized copies

### Event-Driven Sync Implemented For:

1. **Product Domain → Inventory Domain:**

    - Product.productName → Stock.productName
    - ProductUnit.productUnitName → Stock.productUnitName

2. **Inventory Domain (Internal):**
    - StockType.stockTypeName → Stock.stockTypeName
    - RawMaterial.rawMaterialName → RawMaterialsStock.rawMaterialName
    - RawMaterialUnit.rawMaterialUnitName → RawMaterialsStock.rawMaterialUnitName
    - RawMaterialSupplier.rawMaterialSupplierName → RawMaterialsStock.rawMaterialSupplierName, RawMaterialsPurchaseOrder.rawMaterialSupplierName
    - RawMaterialsLocation.rawMaterialsLocationName → RawMaterialsStock.rawMaterialsLocationName
    - Supplier.supplierName → StockPurchaseOrder.supplierName, StockDelivery.supplierName

---

## NOTES

1. **Approval Workflow:** All entities have `forApprovalVersion`, `changeReason`, `approverMessage` fields for approval workflows
2. **Activity Logging:** All entities maintain `activityLogs` arrays for audit trails
3. **Status Management:** Most entities use consistent status enums (ACTIVE, INACTIVE, FOR_APPROVAL, etc.)
4. **GSI Strategy:** Each entity leverages multiple GSIs for efficient querying by different access patterns
5. **Event-Driven Architecture:** Denormalized fields are kept in sync via event publishing and sync handlers
