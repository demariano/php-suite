# AI Codebase Reference — Full-Stack ERP Monorepo

> **Purpose**: This document is the single source of truth for any AI model working in this codebase. It documents every domain, service, entity, data model, event flow, shared library, frontend module, code pattern, and step-by-step procedure for adding features or fixing bugs. Reference this before making any change.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Domain Catalog](#2-domain-catalog)
3. [Data Model Reference](#3-data-model-reference)
4. [Event-Driven Architecture](#4-event-driven-architecture)
5. [Shared Libraries Reference](#5-shared-libraries-reference)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Code Patterns & Conventions](#7-code-patterns--conventions)
8. [Step-by-Step: Adding a New Feature](#8-step-by-step-adding-a-new-feature)
9. [Step-by-Step: Debugging & Fixing Issues](#9-step-by-step-debugging--fixing-issues)
10. [File Path Quick Reference](#10-file-path-quick-reference)

---

## 1. Architecture Overview

### 1.1 Monorepo Structure

This is an **Nx monorepo** containing a full-stack ERP system built with:

| Layer                  | Technology                                | Deployment            |
| ---------------------- | ----------------------------------------- | --------------------- |
| Frontend               | Next.js 13+ (App Router)                  | AWS ECS (Docker)      |
| Backend API Services   | NestJS                                    | AWS Lambda (Docker)   |
| Backend Event Handlers | NestJS (SQS consumers)                    | AWS Lambda (Docker)   |
| Database               | DynamoDB (single-table design per domain) | AWS DynamoDB          |
| Authentication         | AWS Cognito                               | AWS Cognito User Pool |
| Message Queue          | AWS SQS                                   | AWS SQS               |
| File Storage           | AWS S3                                    | AWS S3                |
| Email                  | AWS SES                                   | AWS SES               |
| Secrets                | AWS Secrets Manager                       | AWS Secrets Manager   |
| Infrastructure         | Terraform                                 | `terraform/dev/`      |

### 1.2 Top-Level Directory Map

```
/
├── apps/                          # All deployable applications
│   ├── web-app/                   # Next.js frontend (ECS)
│   ├── accounting/                # Accounting domain services
│   ├── authentication/            # Auth service (Cognito wrapper)
│   ├── configuration/             # Configuration service
│   ├── customer/                  # Customer domain services
│   ├── inventory/                 # Inventory domain services
│   ├── invoicing/                 # Invoicing domain services
│   ├── product/                   # Product domain services
│   ├── reports/                   # Report generation service
│   ├── user/                      # User management services
│   ├── websocket/                 # WebSocket services (4 sub-services)
│   ├── misc/                      # Infrastructure services (email, file, env-init, cognito-msg)
│   ├── local-test/                # Local testing service
│   └── mobile-app/                # Mobile app (separate)
├── libs/                          # Shared libraries
│   ├── backend/                   # Backend-only shared code
│   │   ├── auth-guard-lib/        # JWT/API-key guards
│   │   ├── aws-services/          # AWS SDK wrappers (Cognito, S3, SES, SNS, SQS, Secrets)
│   │   ├── configuration-lib/     # Config loader (env + secrets)
│   │   ├── database/              # DynamoDB client abstraction
│   │   ├── database-services/     # 10 domain-specific DB service libs
│   │   ├── dynamo-db-lib/         # DynamoDB schemas + OneTable + pagination
│   │   ├── excel-generator-service/ # Excel report generation
│   │   ├── field-change-utils-lib/  # Field change detection (approval workflows)
│   │   └── message-queue-lib/     # SQS abstraction
│   ├── dto/                       # Shared DTOs + enums (used by FE + BE)
│   ├── frontend/                  # Frontend-only shared code
│   │   ├── components-web/        # Shared React UI component library
│   │   ├── data-access/           # API clients, hooks, state management
│   │   └── ui-config/             # Colors, fonts, theme config
│   └── utils/                     # Shared utilities (date, string, number, token)
├── script-files/                  # Templates for code generation
├── local-stack-scripts/           # LocalStack setup scripts
├── terraform/                     # Infrastructure as Code
├── generate-service.sh            # Service scaffolding script
├── generate-dto.sh                # DTO generation from schemas
├── generate-dynamodb-localstack.js # LocalStack DynamoDB table generator
├── generate-dynamodb-tf.js        # Terraform DynamoDB table generator
└── deployment.config.json         # CI/CD deployment configuration
```

### 1.3 Service Inventory (24 Deployable Services)

| #   | Service                             | Type                      | Domain     | Path                                                |
| --- | ----------------------------------- | ------------------------- | ---------- | --------------------------------------------------- |
| 1   | web-app                             | Next.js (ECS)             | Frontend   | `apps/web-app/`                                     |
| 2   | accounting-api-service              | NestJS API (Lambda)       | Accounting | `apps/accounting/accounting-api-service/`           |
| 3   | accounting-event-handler-service    | NestJS SQS (Lambda)       | Accounting | `apps/accounting/accounting-event-handler-service/` |
| 4   | authentication-api-service          | NestJS API (Lambda)       | Auth       | `apps/authentication/authentication-api-service/`   |
| 5   | configuration-api-service           | NestJS API (Lambda)       | Config     | `apps/configuration/configuration-api-service/`     |
| 6   | customer-api-service                | NestJS API (Lambda)       | Customer   | `apps/customer/customer-api-service/`               |
| 7   | customer-event-handler-service      | NestJS SQS (Lambda)       | Customer   | `apps/customer/customer-event-handler-service/`     |
| 8   | inventory-api-service               | NestJS API (Lambda)       | Inventory  | `apps/inventory/inventory-api-service/`             |
| 9   | inventory-event-handler-service     | NestJS SQS (Lambda)       | Inventory  | `apps/inventory/inventory-event-handler-service/`   |
| 10  | invoicing-api-service               | NestJS API (Lambda)       | Invoicing  | `apps/invoicing/invoicing-api-service/`             |
| 11  | invoicing-event-handler-service     | NestJS SQS (Lambda)       | Invoicing  | `apps/invoicing/invoicing-event-handler-service/`   |
| 12  | product-api-service                 | NestJS API (Lambda)       | Product    | `apps/product/product-api-service/`                 |
| 13  | product-event-handler-service       | NestJS SQS (Lambda)       | Product    | `apps/product/product-event-handler-service/`       |
| 14  | report-api-service                  | NestJS API (Lambda)       | Reports    | `apps/reports/report-api-service/`                  |
| 15  | user-api-service                    | NestJS API (Lambda)       | User       | `apps/user/user-api-service/`                       |
| 16  | user-event-handler-service          | NestJS SQS (Lambda)       | User       | `apps/user/user-event-handler-service/`             |
| 17  | email-api-service                   | NestJS API (Lambda)       | Misc       | `apps/misc/email-api-service/`                      |
| 18  | email-template-api-service          | NestJS API (Lambda)       | Misc       | `apps/misc/email-template-api-service/`             |
| 19  | environment-initializer-api-service | NestJS API (Lambda)       | Misc       | `apps/misc/environment-initializer-api-service/`    |
| 20  | file-api-service                    | NestJS API (Lambda)       | Misc       | `apps/misc/file-api-service/`                       |
| 21  | cognito-custom-message-service      | NestJS (Lambda trigger)   | Misc       | `apps/misc/cognito-custom-message-service/`         |
| 22  | connect-service                     | NestJS WebSocket (Lambda) | WebSocket  | `apps/websocket/connect-service/`                   |
| 23  | disconnect-service                  | NestJS (Lambda)           | WebSocket  | `apps/websocket/disconnect-service/`                |
| 24  | broadcast-message-service           | NestJS SQS (Lambda)       | WebSocket  | `apps/websocket/broadcast-message-service/`         |
| 25  | client-message-processor-service    | NestJS SQS (Lambda)       | WebSocket  | `apps/websocket/client-message-processor-service/`  |

### 1.4 Dual-Mode Bootstrap

Every backend service supports two execution modes via `main.ts`:

-   **Local mode** (`SERVICE_TRIGGER=LOCALHOST`): Starts an Express server on an assigned port with Swagger docs at `/api/swagger`. SQS services additionally start long-polling from LocalStack.
-   **Lambda mode** (default): Exports a handler function wrapping NestJS via `@codegenie/serverless-express` for API services, or processes `event.Records` for SQS services.

### 1.5 Authentication Model

-   **JWT via AWS Cognito**: All domain API endpoints use `CognitoAuthGuard` (Passport JWT strategy validating against Cognito JWKS)
-   **API Key**: Service-to-service calls use `ApiKeyHeaderGuard` validating `X-API-KEY` header against `WEB_APP_API_KEY` from Secrets Manager
-   **Development bypass**: When `BYPASS_AUTH=ENABLED`, guards pass through without validation
-   **Frontend flow**: Login → Cognito → JWT tokens stored in cookies → Axios interceptor attaches `Bearer <token>` → `ProtectedRoute` component checks token expiry on every navigation

---

## 2. Domain Catalog

### 2.1 Accounting Domain

**Services**: `accounting-api-service`, `accounting-event-handler-service`
**DynamoDB Table**: `accounting`
**SQS Queue**: `ACCOUNTING_EVENT_SQS`

#### Entities

| Entity       | Description                                                        | PK/SK                       |
| ------------ | ------------------------------------------------------------------ | --------------------------- |
| **Accounts** | Chart of accounts (AREA, CUSTOMER, OTHERS types) with sub-accounts | `ACCOUNTS / {accountingId}` |
| **Voucher**  | Journal entries with payment details (cash, cheque, bank transfer) | `VOUCHER / {voucherId}`     |

#### API Endpoints — Accounts (`/accounts`)

| Method | Path                     | Description                            |
| ------ | ------------------------ | -------------------------------------- |
| POST   | `/accounts`              | Create account                         |
| PUT    | `/accounts/:id`          | Update account                         |
| DELETE | `/accounts/:id`          | Delete (soft/hard by role)             |
| POST   | `/accounts/:id/approve`  | Approve pending account                |
| POST   | `/accounts/:id/deny`     | Deny pending account                   |
| GET    | `/accounts/name/:name`   | Search by name (paginated)             |
| GET    | `/accounts`              | List all (paginated)                   |
| GET    | `/accounts/status`       | List by status (paginated, filterable) |
| GET    | `/accounts/account-type` | List by account type                   |
| GET    | `/accounts/:id`          | Get by ID                              |

#### API Endpoints — Vouchers (`/vouchers`)

| Method | Path                              | Description                              |
| ------ | --------------------------------- | ---------------------------------------- |
| POST   | `/vouchers`                       | Create voucher                           |
| PUT    | `/vouchers/:id`                   | Update voucher                           |
| DELETE | `/vouchers/:id`                   | Delete voucher                           |
| POST   | `/vouchers/:id/approve`           | Approve voucher                          |
| POST   | `/vouchers/:id/deny`              | Deny voucher                             |
| GET    | `/vouchers/voucher-no/:voucherNo` | Get by voucher number                    |
| GET    | `/vouchers/containing-voucher-no` | Search containing voucher no (paginated) |
| GET    | `/vouchers`                       | List all (paginated)                     |
| GET    | `/vouchers/status`                | List by status (paginated)               |
| GET    | `/vouchers/voucher-date`          | List by date range (paginated)           |
| GET    | `/vouchers/:id`                   | Get by ID                                |

#### Event Handler — `ACCOUNTING_EVENT_SQS`

| Event              | Action                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `ACCOUNT_UPDATED`  | Batch-update `accountName` on all vouchers matching `accountingId` |
| `CUSTOMER_UPDATED` | Batch-update `customerName` on all vouchers matching `customerId`  |
| `AREA_UPDATED`     | Batch-update `areaName` on all vouchers matching `areaId`          |

#### Frontend Routes

| Route                            | Page                 |
| -------------------------------- | -------------------- |
| `/accounting/accounts`           | Accounts list        |
| `/accounting/accounts/create`    | Create account       |
| `/accounting/accounts/[id]/edit` | Edit/approve account |
| `/accounting/voucher`            | Vouchers list        |
| `/accounting/voucher/create`     | Create voucher       |
| `/accounting/voucher/[id]/edit`  | Edit/approve voucher |

---

### 2.2 Customer Domain

**Services**: `customer-api-service`, `customer-event-handler-service`
**DynamoDB Table**: `customer`
**SQS Queue**: `CUSTOMER_EVENT_SQS`

#### Entities

| Entity                     | Description                                         | PK/SK                            |
| -------------------------- | --------------------------------------------------- | -------------------------------- |
| **Customer**               | Customer master data with balance, credit, contacts | `CUSTOMER / {customerId}`        |
| **CustomerClassification** | Customer grouping (e.g., wholesale, retail)         | `CUSTOMER_CLASSIFICATION / {id}` |
| **CustomerType**           | Customer type categorization                        | `CUSTOMER_TYPE / {id}`           |
| **Terms**                  | Payment terms (name + days)                         | `TERMS / {termsId}`              |
| **Area**                   | Geographic area with towns + territory manager link | `AREA / {areaId}`                |

#### API Endpoints — Customer (`/customers`)

| Method | Path                     | Description                                    |
| ------ | ------------------------ | ---------------------------------------------- |
| POST   | `/customers`             | Create customer                                |
| PUT    | `/customers/:id`         | Update customer                                |
| DELETE | `/customers/:id`         | Delete customer                                |
| POST   | `/customers/:id/approve` | Approve customer                               |
| POST   | `/customers/:id/deny`    | Deny customer                                  |
| GET    | `/customers/name/:name`  | Search by name (paginated)                     |
| GET    | `/customers`             | List all (paginated)                           |
| GET    | `/customers/status`      | List by status (paginated, filterable by name) |
| GET    | `/customers/:id`         | Get by ID                                      |

#### API Endpoints — CustomerClassification (`/customer-classifications`)

Standard CRUD + approve/deny + search by name + list by status + get by ID.

#### API Endpoints — CustomerType (`/customer-type`)

Standard CRUD + approve/deny + search by name + list by status + get by ID.

#### API Endpoints — Terms (`/terms`)

Standard CRUD + approve/deny + search by name + list by status + get by ID.

#### API Endpoints — Area (`/area`)

Standard CRUD + approve/deny + search by name + list by status + get by ID + `GET /area/territory-manager/:territoryManagerId`.

#### Event Handler — `CUSTOMER_EVENT_SQS`

| Event                             | Action                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| `CUSTOMER_CLASSIFICATION_UPDATED` | Batch-update `customerClassificationName` on all customers |
| `CUSTOMER_TYPE_UPDATED`           | Batch-update `customerTypeName` on all customers           |
| `AREA_UPDATED`                    | Batch-update `areaName` on all customers                   |
| `TERRITORY_MANAGER_UPDATED`       | Batch-update `territoryManagerName` on all areas           |
| `TERRITORY_MANAGER_REACTIVATED`   | No-op (logged for audit)                                   |
| `UPDATE_CUSTOMER_BALANCE`         | Update `balance` and `customerCredit` on customer record   |

**Cross-domain input**: Receives `UPDATE_CUSTOMER_BALANCE` from the **Invoicing Event Handler** and `TERRITORY_MANAGER_UPDATED` from the **Invoicing** domain.

#### Frontend Routes

| Route                           | Page                                 |
| ------------------------------- | ------------------------------------ |
| `/customers/customer`           | Customer list                        |
| `/customers/customer/create`    | Create customer                      |
| `/customers/customer/[id]/edit` | Edit/approve customer                |
| `/customers/areas`              | Areas list (+ create/edit)           |
| `/customers/classifications`    | Classifications list (+ create/edit) |
| `/customers/types`              | Types list (+ create/edit)           |
| `/customers/terms`              | Terms list (+ create/edit)           |
| `/customers/towns`              | Towns (create + edit by ID)          |

---

### 2.3 Product Domain

**Services**: `product-api-service`, `product-event-handler-service`
**DynamoDB Table**: `product`
**SQS Queue**: `PRODUCT_EVENT_SQS`

#### Entities

| Entity                     | Description                                                      | PK/SK                              |
| -------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| **Product**                | Product with category, class, deals, unit prices, critical level | `PRODUCT / {productId}`            |
| **ProductCategory**        | Product groupings                                                | `PRODUCT_CATEGORY / {id}`          |
| **ProductClass**           | Product classification                                           | `PRODUCT_CLASS / {id}`             |
| **ProductUnit**            | Product unit of measure                                          | `PRODUCT_UNIT / {id}`              |
| **ProductPriceType**       | Pricing tier types                                               | `PRODUCT_PRICE_TYPE / {id}`        |
| **ProductDeal**            | Buy-X-get-Y deals (minQty, additionalQty)                        | `PRODUCT_DEAL / {id}`              |
| **ProductUnitRawMaterial** | Bill of materials (BOM) — raw materials per product unit         | `PRODUCT_UNIT_RAW_MATERIAL / {id}` |

#### API Endpoints — Product (`/products`)

Standard CRUD + approve/deny + **reactivate** (`POST /:id/reactivate`) + search by name + list by status + get by ID.

#### API Endpoints — Sub-entities

Each of `product-categories`, `product-classes`, `product-units`, `product-price-types`, `product-deals` follows the standard CRUD + approve/deny pattern.

`product-unit-raw-materials` adds: `GET /product/:productId`, `GET /product/:productId/pagination`, `GET /status/:status/product/:productId/pagination`.

#### Event Handler — `PRODUCT_EVENT_SQS`

| Event                      | Action                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `PRODUCT_CATEGORY_UPDATED` | Batch-update `productCategoryName` on all products               |
| `PRODUCT_CLASS_UPDATED`    | Batch-update `productClassName` on all products                  |
| `PRODUCT_UPDATED`          | Batch-update `productName` on all ProductUnitRawMaterial records |

#### Frontend Routes

| Route                                 | Page                             |
| ------------------------------------- | -------------------------------- |
| `/products/product`                   | Product list (+ create/edit)     |
| `/products/categories`                | Categories list (+ create/edit)  |
| `/products/product-class`             | Classes list (+ create/edit)     |
| `/products/product-unit`              | Units list (+ create/edit)       |
| `/products/product-price-type`        | Price types list (+ create/edit) |
| `/products/product-deal`              | Deals list (+ create/edit)       |
| `/products/product-unit-raw-material` | BOM list (+ create/edit)         |

---

### 2.4 Inventory Domain

**Services**: `inventory-api-service`, `inventory-event-handler-service`
**DynamoDB Table**: `inventory`
**SQS Queue**: `INVENTORY_EVENT_SQS`

#### Entities

| Entity                        | Description                                                 | PK/SK                                 |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| **Stock**                     | Finished goods stock (lot#, quantity, expiry, product link) | `STOCK / {stockId}`                   |
| **StockType**                 | Stock categorization                                        | `STOCK_TYPE / {id}`                   |
| **Supplier**                  | Supplier master data                                        | `SUPPLIER / {supplierId}`             |
| **RawMaterial**               | Raw material catalog                                        | `RAW_MATERIAL / {id}`                 |
| **RawMaterialSupplier**       | Raw material supplier                                       | `RAW_MATERIAL_SUPPLIER / {id}`        |
| **RawMaterialUnit**           | Unit of measure for raw materials                           | `RAW_MATERIAL_UNIT / {id}`            |
| **RawMaterialsLocation**      | Storage locations for raw materials                         | `RAW_MATERIAL_LOCATION / {id}`        |
| **RawMaterialsStock**         | Raw material inventory levels                               | `RAW_MATERIAL_STOCK / {id}`           |
| **RawMaterialsPurchaseOrder** | Purchase orders for raw materials                           | `RAW_MATERIALS_PURCHASE_ORDER / {id}` |
| **StockPurchaseOrder**        | Purchase orders for finished stock                          | `STOCK_PURCHASE_ORDER / {id}`         |
| **StockDelivery**             | Stock delivery receipts                                     | `STOCK_DELIVERY / {id}`               |

#### API Endpoints — Stock (`/stock`)

Standard CRUD + approve/deny + **convert** (`POST /:id/convert` for stock conversion) + search by name + list by status + filter pagination + get by ID.

#### API Endpoints — Purchase Orders (`/raw-materials-purchase-order`, `/stock-purchase-order`)

Extended lifecycle: `POST /:id/incoming` (mark partial delivery), `POST /:id/system-generated-to-pending`, `DELETE /:id/delivered`, list by approval-status, by status, by supplier.

#### API Endpoints — Stock Delivery (`/stock-delivery`)

Standard CRUD + approve/deny + search by docno + filter + `GET /supplier/:supplierId/status/:status`.

#### API Endpoints — Other Sub-entities

`raw-material`, `raw-material-unit`, `raw-material-supplier`, `raw-materials-location`, `raw-materials-stock`, `stock-type`, `supplier` all follow standard CRUD + approve/deny pattern.

#### Event Handler — `INVENTORY_EVENT_SQS`

| Event                            | Source               | Action                                                                                                 |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `STOCK_TYPE_UPDATED`             | Inventory API        | Batch-update `stockTypeName` on all stock records                                                      |
| `RAW_MATERIAL_UPDATED`           | Inventory API        | Batch-update `rawMaterialName` on raw materials stock                                                  |
| `RAW_MATERIAL_UNIT_UPDATED`      | Inventory API        | Batch-update raw material unit name                                                                    |
| `RAW_MATERIAL_SUPPLIER_UPDATED`  | Inventory API        | Sync supplier name to stock records                                                                    |
| `RAW_MATERIALS_LOCATION_UPDATED` | Inventory API        | Sync location name to stock records                                                                    |
| `SUPPLIER_UPDATED`               | Inventory API        | Batch-update `supplierName` on StockPurchaseOrders + StockDeliveries                                   |
| `PRODUCT_UPDATED`                | **Product domain**   | Batch-update `productName` on stock records                                                            |
| `PRODUCT_UNIT_UPDATED`           | **Product domain**   | Batch-update product unit name on stock records                                                        |
| `STOCK_PURCHASE_ORDER_CREATED`   | Inventory API        | **Auto raw material ordering**: checks BOM, creates RawMaterialsPurchaseOrder if stock below threshold |
| `STOCK_QTY_UPDATE`               | Inventory API        | Update `totalQuantity` on a stock record (add/deduct)                                                  |
| `INVOICE_APPROVED`               | **Invoicing domain** | **Deduct** stock quantities for all invoice stock items                                                |
| `INVOICE_DELETED`                | **Invoicing domain** | **Restore** stock quantities for deleted invoice                                                       |

#### Frontend Routes

| Route                                     | Page                                  |
| ----------------------------------------- | ------------------------------------- |
| `/inventory/stock`                        | Stock list (+ create/edit)            |
| `/inventory/stock-types`                  | Stock types (+ create/edit)           |
| `/inventory/suppliers`                    | Suppliers (+ create/edit)             |
| `/inventory/raw-materials`                | Raw materials (+ create/edit)         |
| `/inventory/raw-material-suppliers`       | RM suppliers (+ create/edit)          |
| `/inventory/raw-material-units`           | RM units (+ create/edit)              |
| `/inventory/raw-materials-locations`      | RM locations (+ create/edit)          |
| `/inventory/raw-materials-stock`          | RM stock levels (+ create/edit)       |
| `/inventory/raw-materials-purchase-order` | RM purchase orders (+ create/edit)    |
| `/inventory/stock-purchase-order`         | Stock purchase orders (+ create/edit) |

---

### 2.5 Invoicing Domain

**Services**: `invoicing-api-service`, `invoicing-event-handler-service`
**DynamoDB Table**: `invoicing`
**SQS Queue**: `INVOICE_EVENT_SQS`

#### Entities

| Entity                     | Description                                                       | PK/SK                             |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| **Invoice**                | Sales invoices with line items, payment tracking, print status    | `INVOICE / {invoiceId}`           |
| **SalesType**              | Sales type config (discount, tax, contract sales flags)           | `SALES_TYPE / {id}`               |
| **TerritoryManager**       | Territory manager with contact info                               | `TERRITORY_MANAGER / {id}`        |
| **Contract**               | Customer contracts with rebate computation                        | `CONTRACT / {contractId}`         |
| **Payment**                | Payment records (receipt#, cheque details, contract payment flag) | `PAYMENT / {paymentId}`           |
| **PaymentInvoice**         | Join entity linking payments to invoices                          | `PAYMENTINVOICE / {paymentId}`    |
| **OverPayment**            | Overpayment tracking per invoice/customer                         | `OVERPAYMENT / {id}`              |
| **ReturnGoodSold**         | Returned goods with before/after invoice snapshots                | `RETURN_GOOD_SOLD / {id}`         |
| **CollectionReceiptRange** | Receipt number ranges per area (with cancellation tracking)       | `COLLECTION_RECEIPT_RANGE / {id}` |

#### API Endpoints — Invoice (`/invoices`)

| Method | Path                                             | Description                           |
| ------ | ------------------------------------------------ | ------------------------------------- |
| POST   | `/invoices`                                      | Create invoice                        |
| PUT    | `/invoices/:id`                                  | Update invoice                        |
| DELETE | `/invoices/:id`                                  | Delete invoice                        |
| POST   | `/invoices/:id/approve`                          | Approve invoice                       |
| POST   | `/invoices/:id/submit-draft`                     | Submit draft invoice                  |
| POST   | `/invoices/validate`                             | Validate invoice data                 |
| POST   | `/invoices/validate-stock`                       | Validate stock availability           |
| POST   | `/invoices/:id/deny`                             | Deny invoice                          |
| GET    | `/invoices/docno/:docno`                         | Get by document number                |
| GET    | `/invoices`                                      | List all (paginated)                  |
| GET    | `/invoices/status`                               | List by status                        |
| GET    | `/invoices/customer/:customerId/pending-payment` | Pending payment invoices for customer |
| GET    | `/invoices/:id`                                  | Get by ID                             |
| GET    | `/invoices/contract/:contractId`                 | Get invoices by contract              |

#### API Endpoints — Contract (`/contracts`)

Standard CRUD + approve/deny + `POST /:id/rebate/compute` (rebate calculation) + search by contractNo + list by status + `GET /customer/:customerId` + `GET /customer/:customerId/pending-payment`.

#### API Endpoints — Payment (`/payment`)

Standard CRUD + approve/deny + search by receiptNo + list by status.

#### API Endpoints — ReturnGoodSold (`/return-good-sold`)

Standard CRUD + approve/deny + `GET /invoice/:invoiceId` + `GET /customer/:customerId`.

#### API Endpoints — CollectionReceiptRange (`/collection-receipt-range`)

CRUD + `POST /cancel-receipt` + `GET /next-receipt/:areaId` + `GET /area/:areaId` + `GET /status/:rangeStatus`.

#### API Endpoints — SalesType, TerritoryManager

Standard CRUD + approve/deny pattern.

#### Event Handler — `INVOICE_EVENT_SQS`

| Event                                                   | Action                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `CONTRACT_UPDATED`                                      | Batch-update `contractName` on Invoices + Payments                                                                  |
| `TERMS_UPDATED`                                         | Batch-update `termsName` on Invoices                                                                                |
| `PRODUCT_PRICE_TYPE_UPDATED`                            | Batch-update `productPriceTypeName` on Invoices                                                                     |
| `SALES_TYPE_UPDATED`                                    | Batch-update `salesTypeName` on Invoices                                                                            |
| `TERRITORY_MANAGER_UPDATED`                             | Batch-update `territoryManagerName` on Invoices                                                                     |
| `AREA_UPDATED`                                          | Batch-update `areaName` on Invoices, Contracts, ReturnGoodSold, CollectionReceiptRanges                             |
| `CUSTOMER_UPDATED`                                      | Batch-update `customerName` on Invoices, Contracts, Payments, ReturnGoodSold                                        |
| `RECALCULATE_INVOICED_AMOUNT`                           | Recalculate total `invoicedAmount` on Contract from active invoices                                                 |
| `PAYMENT_ADDED/DELETED/UPDATED` (ContractPaymentEvent)  | Update contract payments array, recalculate `totalAmountPaid` + `paymentStatus`                                     |
| `INVOICE_CREATED/UPDATED/DELETED` (InvoicePaymentEvent) | Recompute invoice payment status + overpayments, **then publish** `UPDATE_CUSTOMER_BALANCE` to `CUSTOMER_EVENT_SQS` |
| `PAYMENT_ADDED/UPDATED/DELETED` (InvoicePaymentEvent)   | Recompute invoice payment status + overpayments, **then publish** `UPDATE_CUSTOMER_BALANCE` to `CUSTOMER_EVENT_SQS` |

**Cross-domain output**: After invoice payment recalculation, publishes `CustomerBalanceEventDto` to `CUSTOMER_EVENT_SQS`. Also triggers `INVOICE_APPROVED`/`INVOICE_DELETED` events consumed by **Inventory Event Handler** for stock deduction/restoration.

#### Frontend Routes

| Route                                           | Page                               |
| ----------------------------------------------- | ---------------------------------- |
| `/invoicing/invoice`                            | Invoice list (+ create/edit)       |
| `/invoicing/payment`                            | Payment list (+ create/edit)       |
| `/invoicing/return-good-sold`                   | Returns list (+ create/edit)       |
| `/invoicing/contract` or `/invoicing/contracts` | Contracts (+ create/edit)          |
| `/invoicing/sales-type`                         | Sales types (+ create/edit)        |
| `/invoicing/territory-manager`                  | Territory managers (+ create/edit) |
| `/invoicing/collection-receipt-range`           | Receipt ranges (+ create/edit)     |

---

### 2.6 User Domain

**Services**: `user-api-service`, `user-event-handler-service`
**DynamoDB Table**: `user`
**SQS Queue**: `USER_EVENT_SQS`

#### Entity — User

| Field                   | Type   | Notes                                      |
| ----------------------- | ------ | ------------------------------------------ |
| `userId`                | ULID   | Auto-generated                             |
| `email`                 | String | Unique                                     |
| `firstName`, `lastName` | String |                                            |
| `userRole`              | Enum   | `USER`, `ADMIN`, `SUPER_ADMIN`             |
| `userStatus`            | Enum   | `PENDING`, `ACTIVE`, `INACTIVE`, `DELETED` |
| `data`                  | Object | `{ country }`                              |

#### API Endpoints — Users (`/users`)

| Method | Path                             | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| POST   | `/users`                         | Create user                      |
| PUT    | `/users/:id`                     | Update user                      |
| DELETE | `/users/soft/:id`                | Soft delete                      |
| DELETE | `/users/:id`                     | Hard delete                      |
| GET    | `/users/email/:email`            | Get by email (JWT auth)          |
| GET    | `/users/email-by-api-key/:email` | Get by email (API Key auth, S2S) |
| GET    | `/users`                         | List all (paginated)             |
| GET    | `/users/filter`                  | Filter by criteria               |
| GET    | `/users/:id`                     | Get by ID                        |

#### Event Handler — `USER_EVENT_SQS`

**Status**: Stub — currently just logs messages. No event handling implemented.

#### Frontend Routes

| Route    | Page                 |
| -------- | -------------------- |
| `/users` | User management list |

---

### 2.7 Authentication Domain

**Service**: `authentication-api-service`
**Database**: None (uses AWS Cognito directly)

#### API Endpoints — Authentication (`/authentication`)

| Method | Path                                       | Description                     |
| ------ | ------------------------------------------ | ------------------------------- |
| POST   | `/authentication/admin-create-user`        | Admin creates user via Cognito  |
| POST   | `/authentication/login`                    | User login                      |
| POST   | `/authentication/complete-new-password`    | Complete new password challenge |
| POST   | `/authentication/forgot-password`          | Initiate password reset         |
| POST   | `/authentication/confirm-password-code`    | Confirm password reset code     |
| POST   | `/authentication/resend-confirmation-code` | Resend email confirmation       |
| POST   | `/authentication/change-password`          | Change password                 |
| POST   | `/authentication/confirm-user`             | Confirm registration            |
| POST   | `/authentication/resend-invitation`        | Resend admin invitation         |
| POST   | `/authentication/sign-up-user`             | Self-registration               |
| DELETE | `/authentication/email/:email`             | Delete Cognito user             |
| POST   | `/authentication/verify-mfa`               | Verify MFA code                 |
| POST   | `/authentication/refresh-token`            | Refresh JWT tokens              |

#### Frontend Routes

| Route                     | Page                        |
| ------------------------- | --------------------------- |
| `/auth/login`             | Login form                  |
| `/auth/registration`      | Registration form           |
| `/auth/verify-login`      | MFA verification            |
| `/auth/set-new-password`  | New password challenge      |
| `/forgot-password`        | Password reset request      |
| `/forgot-password/verify` | Password reset verification |

---

### 2.8 Configuration Domain

**Service**: `configuration-api-service`
**DynamoDB Table**: `configuration`

#### API Endpoints — Configuration (`/configuration`)

| Method | Path                         | Auth    | Description         |
| ------ | ---------------------------- | ------- | ------------------- |
| GET    | `/configuration/:configName` | JWT     | Get config by name  |
| PUT    | `/configuration`             | JWT     | Update config       |
| PUT    | `/configuration/x-api-key`   | API Key | Update config (S2S) |

---

### 2.9 Reports Domain

**Service**: `report-api-service`
**DynamoDB Table**: `report`
**Dependencies**: `excel-generator-service` lib, AWS S3

#### API Endpoints — Reports (`/reports`)

| Method | Path           | Description              |
| ------ | -------------- | ------------------------ |
| POST   | `/reports`     | Create/generate report   |
| DELETE | `/reports/:id` | Delete report            |
| GET    | `/reports/:id` | Get report by ID         |
| GET    | `/reports`     | List reports (paginated) |

#### Frontend Route: `/reports`

---

### 2.10 Misc Infrastructure Services

#### Email API Service (`/email`)

Sends emails via AWS SES with HTML/text body and file attachments (max 1MB). Single endpoint: `POST /email`.

#### Email Template API Service (`/email-template`)

Manages email templates by type and language. Endpoints: `POST /email-template`, `GET /email-template?emailTemplateType=X&language=Y`.

#### Environment Initializer (`/initialize-environment`)

Seeds ALL database tables with initial data for new environments. Has access to all domain database services. Endpoints: `POST /initialize-environment`, `POST /delete-all-records`. Protected by API Key.

#### File API Service

Generates pre-signed S3 URLs for direct client upload/download. Endpoints: `GET /upload-url`, `GET /download-url`.

#### Cognito Custom Message Service

AWS Cognito Lambda trigger that replaces default emails with custom templates (sign-up, forgot password, invitation).

---

### 2.11 WebSocket Services

Four services implement real-time messaging:

| Service                              | Role                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| **connect-service**                  | Handles `$connect` — validates JWT, persists connection, queues welcome message              |
| **disconnect-service**               | Handles `$disconnect` — removes connection from DB                                           |
| **broadcast-message-service**        | Consumes `WEBSOCKET_MESSAGE_SQS` — sends messages to specific or all clients via API Gateway |
| **client-message-processor-service** | Consumes `CLIENT_MESSAGE_QUEUE` — **stub**, not yet implemented                              |

**Local mode**: connect-service runs a Socket.IO `WebSocketGateway` server. broadcast-message-service forwards via HTTP POST.

---

## 3. Data Model Reference

### 3.1 DynamoDB Design Principles

-   **Single-table design per domain**: Each domain (customer, product, invoicing, etc.) uses one DynamoDB table storing multiple entity types
-   **PK/SK pattern**: Primary key = entity type string (e.g., `"CUSTOMER"`), Sort key = entity ID (ULID)
-   **GSIs**: Up to 13 GSIs per table for different access patterns (by status, by name, by foreign key, composite filters)
-   **OneTable library**: `dynamodb-onetable` manages schema, type generation, and query building
-   **Cursor-based pagination**: All list queries use `pageRecordHandler` utility with cursor serialization
-   **Denormalized names**: Foreign key names are stored alongside IDs (e.g., `customerId` + `customerName`) for query efficiency. Updated via SQS events when source entity changes.
-   **Approval snapshots**: `forApprovalVersion` field stores the pending changes as a full object snapshot

### 3.2 Global Approval Workflow Fields

Present on nearly every business entity:

| Field                | Type         | Purpose                                                             |
| -------------------- | ------------ | ------------------------------------------------------------------- |
| `status`             | `StatusEnum` | Current lifecycle state                                             |
| `forApprovalVersion` | Object       | Snapshot of pending changes (populated when status is FOR_APPROVAL) |
| `changeReason`       | String       | User's reason for the change                                        |
| `approverMessage`    | String       | Admin's response on approve/deny                                    |
| `activityLogs`       | String[]     | Audit trail entries (timestamped)                                   |
| `dateCreated`        | ISO String   | Creation timestamp                                                  |
| `dateUpdated`        | ISO String   | Last update timestamp                                               |
| `createdBy`          | String       | Creator email                                                       |
| `updatedBy`          | String       | Last updater email                                                  |

### 3.3 StatusEnum Values

| Value              | Meaning                                | Who sets it                     |
| ------------------ | -------------------------------------- | ------------------------------- |
| `ACTIVE`           | Live approved record                   | Admin (on approve) or system    |
| `INACTIVE`         | Deactivated record                     | Admin (on approve deactivation) |
| `FOR_APPROVAL`     | Pending update approval                | User (on update)                |
| `FOR_DELETION`     | Pending deletion approval              | User (on delete request)        |
| `FOR_DEACTIVATION` | Pending deactivation approval          | User (on deactivate request)    |
| `NEW_RECORD`       | Newly created, awaiting first approval | User (on create)                |
| `DRAFT`            | Saved but not submitted                | User (on save draft)            |

### 3.4 Entity Schemas by Domain

#### Customer Table Schemas

**Customer**: `customerId`, `customerName`, `email`, `address1`, `address2`, `balance`, `contactNo`, `contactPerson`, `townName`, `creditLimit`, `customerCredit`, `tinNumber`, `areaId`/`areaName`, `customerClassificationId`/`customerClassificationName`, `customerTypeId`/`customerTypeName`, `customerTerms[]` (embedded TermsDto), `customerProductDeals[]` (embedded CustomerProductDealDto)

**CustomerClassification**: `customerClassificationId`, `customerClassificationName`

**CustomerType**: `customerTypeId`, `customerTypeName`

**Terms**: `termsId`, `termsName`, `days`

**Area**: `areaId`, `areaName`, `towns[]`, `territoryManagerId`/`territoryManagerName`, `idPrefix`

#### Product Table Schemas

**Product**: `productId`, `productName`, `criticalLevel`, `productCategoryId`/`productCategoryName`, `productClassId`/`productClassName`, `productDeals[]`, `productUnitPrice[]`

**ProductCategory**: `productCategoryId`, `productCategoryName`

**ProductClass**: `productClassId`, `productClassName`

**ProductUnit**: `productUnitId`, `productUnitName`

**ProductPriceType**: `productPriceTypeId`, `productPriceTypeName`

**ProductDeal**: `productDealId`, `productDealName`, `additionalQty`, `minQty`

**ProductUnitRawMaterial**: `productUnitRawMaterialId`, `productId`/`productName`, `rawMaterialsPerUnit[]`

#### Inventory Table Schemas

**Stock**: `stockId`, `lotNo`, `productId`/`productName`, `totalQuantity`, `productUnitId`/`productUnitName`, `expirationDate`, `stockTypeId`/`stockTypeName`

**RawMaterialsStock**: `rawMaterialsStockId`, `rawMaterialId`/`rawMaterialName`, `rawMaterialUnitId`/`rawMaterialUnitName`, `rawMaterialSupplierId`/`rawMaterialSupplierName`, `rawMaterialsLocationId`/`rawMaterialsLocationName`, `qty`, `lotNo`

**RawMaterialsPurchaseOrder**: `rawMaterialsPurchaseOrderId`, `rawMaterialSupplierId`/`rawMaterialSupplierName`, `poDate`, `docNo`, `poStatus` (SYSTEM_GENERATED / PENDING / PARTIAL / COMPLETED), `purchaseOrderDetails[]`, `deliveredPurchaseOrderDetails[]`

**StockPurchaseOrder**: Same structure as RawMaterialsPurchaseOrder with `stockPurchaseOrderId`, `supplierId`/`supplierName`

**StockDelivery**: `stockDeliveryId`, `supplierId`/`supplierName`, `dateReceived`, `docno`, `deliveryDetails[]`

**Supplier**: `supplierId`, `supplierName`, `supplierAddress`, `supplierPhone`, `supplierEmail`, `supplierContactPerson`

**Simple entities**: StockType (`stockTypeName`), RawMaterial (`rawMaterialName`, `description`), RawMaterialSupplier (`rawMaterialSupplierName`), RawMaterialsLocation (`rawMaterialsLocationName`), RawMaterialUnit (`rawMaterialUnitName`)

#### Invoicing Table Schemas

**Invoice**: `invoiceId`, `docno`, `invoiceDate`, `customerId`/`customerName`, `areaId`/`areaName`, `territoryManagerId`/`territoryManagerName`, `salesTypeId`/`salesTypeName`, `contractId`/`contractName`, `termsId`/`termsName`, `productPriceTypeId`/`productPriceTypeName`, `finalAmount`, `invoiceAmount`, `taxAmount`, `totalAmountPaid`, `overPaymentAmount`, `contractSales`, `printStatus` (PENDING/COMPLETED/FOR_REPRINT), `paymentStatus` (PENDING/PARTIAL/PAID/OVERPAID), `invoiceDetails[]`, `payments[]`

**InvoiceDetail (embedded)**: `invoiceDetailId`, `productId`/`productName`, `productUnitId`/`productUnitName`, `stockTypeId`/`stockTypeName`, `productDealId`/`productDealName`, `stockId`, `lotNo`, `qty`, `cost`, `price`, `amount`, `expiryDate`, `invoiceDetailType` (REGULAR_ITEM/FREE_ITEM)

**Contract**: `contractId`, `contractNo`, `contractName`, `customerId`/`customerName`, `areaId`/`areaName`, `startDate`, `endDate`, `contractType` (REGULAR/CONTRACT_PER_INVOICE), `contractAmount`, `totalAmountPaid`, `invoicedAmount`, `deliveredAmount`, `deliveryStatus`, `paymentStatus`, `rebateType` (PERCENTAGE/AMOUNT/NONE), `rebatePercentage`, `rebateAmount`, `rebateClaimedAmount`, `rebateClaimedStatus`, `contractProductDeals[]`, `payments[]`

**Payment**: `paymentId`, `paymentDate`, `paymentAmount`, `customerId`/`customerName`, `receiptNo`, `contractPayment`, `customerCreditPayment`, `contractId`/`contractName`/`contractNo`, `chequeClearStatus` (PENDING/CLEARED), `paymentDetails[]`

**PaymentInvoice**: `paymentDetailsId`, `paymentId`, `invoiceId`, `amountApplied`, `docno`, `customerCreditPayment`

**OverPayment**: `overPaymentId`, `paymentId`, `overPaymentAmount`, `invoiceId`, `customerId`

**ReturnGoodSold**: `returnGoodSoldId`, `invoiceId`, `customerId`/`customerName`, `areaId`/`areaName`, `invoiceDocno`, `rgsDocno`, `dateReturned`, `originalInvoiceDetails[]`, `modifiedInvoiceDetails[]`

**CollectionReceiptRange**: `collectionReceiptRangeId`, `areaId`/`areaName`, `startNumber`, `endNumber`, `lastUsedNumber`, `rangeStatus` (AVAILABLE/ALL_USED_UP/CANCELLED), `cancelledReceiptNumbers[]`

**SalesType**: `salesTypeId`, `salesTypeName`, `allowDiscount`, `contractSales`, `defaultDiscount`, `defaultTax`, `incomeGenerating`, `taxable`

**TerritoryManager**: `territoryManagerId`, `territoryManagerName`, `contactNo`

#### Accounting Table Schemas

**Accounts**: `accountingId`, `accountName`, `accountType` (AREA/CUSTOMER/OTHERS), `subAccounts[]`

**Voucher**: `voucherId`, `voucherNo`, `voucherDate`, `voucherAmount`, `totalAmount`, `accountId`/`accountName`, `accountType`, `customerId`/`customerName`, `areaId`/`areaName`, `paymentType` (CASH/CHEQUE/BANK_TRANSFER/OTHER), `bankName`, `chequeNo`, `chequeDate`, `remarks`, `voucherDetails[]` (`{ subAccount, amount }`)

### 3.5 Entity Relationship Map

```
CUSTOMER DOMAIN                           INVOICING DOMAIN
┌──────────────────┐                     ┌─────────────────────────────────┐
│ Customer         │◄────────────────────│ Invoice                         │
│  ├─ Classification│                    │  ├─ invoiceDetails[] ──────────►│ Product, ProductUnit,
│  ├─ Type         │                     │  │   (productId, stockId, etc.) │ StockType, ProductDeal
│  ├─ Terms[]      │                     │  ├─ payments[]                  │
│  └─ ProductDeals[]│                    │  ├─ SalesType                   │
├──────────────────┤                     │  ├─ TerritoryManager            │
│ Area             │◄────────────────────│  ├─ Contract                    │
│  └─ TerritoryMgr │                     │  ├─ Terms                       │
└──────────────────┘                     │  └─ ProductPriceType            │
                                         ├─────────────────────────────────┤
PRODUCT DOMAIN                           │ Contract ──► Customer, Area     │
┌──────────────────┐                     │ Payment ──► Customer, Contract  │
│ Product          │                     │ PaymentInvoice ──► Payment,     │
│  ├─ Category     │                     │                    Invoice      │
│  ├─ Class        │                     │ OverPayment ──► Payment,        │
│  ├─ Deals[]      │                     │                 Invoice,Customer│
│  └─ UnitPrices[] │                     │ ReturnGoodSold ──► Invoice,     │
├──────────────────┤                     │                    Customer,Area│
│ ProductUnitRM    │                     │ CollReceiptRange ──► Area       │
│  └─ BOM data     │                     └─────────────────────────────────┘
└──────────────────┘
                                         ACCOUNTING DOMAIN
INVENTORY DOMAIN                         ┌──────────────────┐
┌──────────────────┐                     │ Accounts         │
│ Stock ──► Product│                     │  └─ subAccounts[] │
│  └─ StockType    │                     │ Voucher ──► Account│
│ Supplier         │                     │  ├─ Customer (opt) │
│ StockDelivery    │                     │  └─ Area (opt)     │
│  └─ Supplier     │                     └──────────────────┘
│ StockPurchaseOrder│
│  └─ Supplier     │
│ RawMaterial      │
│  ├─ RM Supplier  │
│  ├─ RM Unit      │
│  └─ RM Location  │
│ RawMaterialsStock│
│ RM PurchaseOrder │
│  └─ RM Supplier  │
└──────────────────┘
```

---

## 4. Event-Driven Architecture

### 4.1 SQS Queues

| Queue                   | Producer(s)                                       | Consumer                          |
| ----------------------- | ------------------------------------------------- | --------------------------------- |
| `CUSTOMER_EVENT_SQS`    | customer-api-service, **invoicing-event-handler** | customer-event-handler-service    |
| `PRODUCT_EVENT_SQS`     | product-api-service                               | product-event-handler-service     |
| `INVENTORY_EVENT_SQS`   | inventory-api-service, **invoicing-api-service**  | inventory-event-handler-service   |
| `INVOICE_EVENT_SQS`     | invoicing-api-service                             | invoicing-event-handler-service   |
| `ACCOUNTING_EVENT_SQS`  | accounting-api-service                            | accounting-event-handler-service  |
| `USER_EVENT_SQS`        | user-api-service                                  | user-event-handler-service (stub) |
| `WEBSOCKET_MESSAGE_SQS` | connect-service                                   | broadcast-message-service         |

### 4.2 Cross-Domain Event Flows

```
┌─────────────────────┐   INVOICE_APPROVED/DELETED    ┌──────────────────────────┐
│ Invoicing API       │ ──────────────────────────►   │ Inventory Event Handler   │
│ (invoice approved)  │   via INVENTORY_EVENT_SQS     │ (deducts/restores stock)  │
└─────────────────────┘                               └──────────────────────────┘

┌─────────────────────┐   UPDATE_CUSTOMER_BALANCE     ┌──────────────────────────┐
│ Invoicing Event     │ ──────────────────────────►   │ Customer Event Handler    │
│ Handler             │   via CUSTOMER_EVENT_SQS      │ (updates customer balance)│
│ (payment processed) │                               └──────────────────────────┘
└─────────────────────┘

┌─────────────────────┐   PRODUCT_UPDATED/UNIT_UPDATED┌──────────────────────────┐
│ Product API         │ ──────────────────────────►   │ Inventory Event Handler   │
│ (product renamed)   │   via INVENTORY_EVENT_SQS     │ (syncs name to stock)     │
└─────────────────────┘                               └──────────────────────────┘

┌─────────────────────┐   TERRITORY_MANAGER_UPDATED   ┌──────────────────────────┐
│ Invoicing API       │ ──────────────────────────►   │ Customer Event Handler    │
│ (TM renamed)        │   via CUSTOMER_EVENT_SQS      │ (syncs name to areas)     │
└─────────────────────┘                               └──────────────────────────┘
```

### 4.3 Denormalized Name Propagation Pattern

When a referenced entity's name changes (e.g., `customerName`), the API service:

1. Updates the entity in DynamoDB
2. Publishes an event (e.g., `CUSTOMER_UPDATED`) to the domain's SQS queue
3. The event handler receives the message
4. Paginates through all records referencing that entity (100 records/page, 50ms delay between pages)
5. Batch-updates the denormalized name field on each record

This pattern is implemented identically across all event handlers and ensures eventual consistency without DynamoDB joins.

### 4.4 Invoice Lifecycle Event Chain

The most complex event flow spans three domains:

1. **Invoice created** → Invoicing API publishes to `INVOICE_EVENT_SQS`
2. **Invoice approved** → Invoicing API publishes `INVOICE_APPROVED` to `INVENTORY_EVENT_SQS`
3. Inventory Event Handler **deducts stock** for all invoice line items
4. If stock purchase orders are created → triggers `STOCK_PURCHASE_ORDER_CREATED` → auto raw material ordering
5. **Payment applied** → Invoicing API publishes to `INVOICE_EVENT_SQS`
6. Invoicing Event Handler recalculates invoice payment status + overpayments
7. Invoicing Event Handler calculates customer total balance
8. Invoicing Event Handler publishes `UPDATE_CUSTOMER_BALANCE` to `CUSTOMER_EVENT_SQS`
9. Customer Event Handler updates `balance` and `customerCredit` on customer record

---

## 5. Shared Libraries Reference

### 5.1 Backend Libraries

#### auth-guard-lib (`libs/backend/auth-guard-lib/`)

| Export                 | Type          | Purpose                              |
| ---------------------- | ------------- | ------------------------------------ |
| `AuthGuardLibModule`   | NestJS Module | Registers JWT strategy and guards    |
| `CognitoAuthGuard`     | Guard         | JWT auth with `BYPASS_AUTH` override |
| `ApiKeyHeaderGuard`    | Guard         | Validates `X-API-KEY` header         |
| `JwtValidationService` | Service       | Validates JWT via Cognito JWKS       |
| `CurrentUser`          | Decorator     | Extracts current user from request   |
| `UserCognito`          | Class         | `{ username, roles }` data object    |

#### aws-services (`libs/backend/aws-services/`)

Six sub-libraries wrapping AWS SDK:

| Sub-library              | Service                      | Purpose                                    |
| ------------------------ | ---------------------------- | ------------------------------------------ |
| `aws-cognito-lib`        | `AwsCognitoLibService`       | User management, login, MFA, token refresh |
| `aws-s3-lib`             | `AwsS3LibService`            | S3 get/upload/signed-URLs                  |
| `aws-secret-manager-lib` | `AwsSecretManagerLibService` | Secrets retrieval                          |
| `aws-ses-lib`            | `AwsSesLibService`           | Email sending via nodemailer+SES           |
| `aws-sns-lib`            | `AwsSnsLibService`           | SNS FIFO publish                           |
| `aws-sqs-lib`            | `AwsSqsLibService`           | SQS message sending                        |

All support **LocalStack** (`LOCALSTACK_STATUS=ENABLED`) for local development.

#### configuration-lib (`libs/backend/configuration-lib/`)

-   `ConfigurationLibModule` — `ConfigModule.forRoot()` with async `configuration()` loader
-   Loads from env vars + AWS Secrets Manager
-   Key values: `DYNAMO_DB_*_TABLE`, `*_EVENT_SQS`, `AWS_COGNITO_*`, `WEB_APP_API_KEY`, `REPORT_S3_BUCKET`

#### dynamo-db-lib (`libs/backend/dynamo-db-lib/`)

-   `DynamoDbLibService` — Creates DynamoDB client and OneTable `Table` instances
-   All entity schemas (User, Customer, Product, Invoicing, Inventory, Accounting, Configuration, Report, EmailTemplate, WebSocketConnection)
-   `pageRecordHandler` — Cursor-based pagination utility
-   `createDynamoDbOptionWithPKSKIndex` — Query option builder
-   Date utilities: `setTimeToMidnightISOString`, `setTimeToLastMillisecondISOString`

#### database-services (`libs/backend/database-services/`)

10 domain-specific database service libraries following **abstract class + implementation** pattern:

| Service                                 | Entities Managed                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user-database-service`                 | User                                                                                                                                                                                 |
| `customer-database-service`             | Customer, CustomerClassification, CustomerType, Terms, Area                                                                                                                          |
| `product-database-service`              | Product, ProductCategory, ProductClass, ProductUnit, ProductPriceType, ProductDeal, ProductUnitRawMaterial                                                                           |
| `invoicing-database-service`            | Invoice, SalesType, TerritoryManager, Contract, Payment, PaymentInvoice, OverPayment, ReturnGoodSold, CollectionReceiptRange                                                         |
| `inventory-database-service`            | Stock, StockType, RawMaterial, RawMaterialSupplier, RawMaterialUnit, RawMaterialsLocation, RawMaterialsStock, RawMaterialsPurchaseOrder, Supplier, StockDelivery, StockPurchaseOrder |
| `accounting-database-service`           | Accounts, Voucher                                                                                                                                                                    |
| `configuration-database-service`        | Configuration                                                                                                                                                                        |
| `report-database-service`               | Reports                                                                                                                                                                              |
| `email-template-database-service`       | EmailTemplate                                                                                                                                                                        |
| `websocket-connection-database-service` | WebSocketConnection                                                                                                                                                                  |

Each service has:

-   An **abstract class** defining the interface (e.g., `CustomerDatabaseServiceAbstract`)
-   An **implementation class** using `DynamoDbLibService` + domain schema
-   Full CRUD + query operations with cursor-based pagination

#### message-queue-lib (`libs/backend/message-queue-lib/`)

-   `MessageQueueServiceAbstract` — Abstract class: `sendMessageToSQS(destination, message)`
-   `MessageQueueAwsLibService` — SQS implementation wrapping `AwsSqsLibService`

#### excel-generator-service (`libs/backend/excel-generator-service/`)

-   `ExcelGeneratorService` — Takes `ReportDto` (headers + rows), creates Excel workbooks (ExcelJS), uploads to S3

#### field-change-utils-lib (`libs/backend/field-change-utils-lib/`)

-   `detectFieldChanges()` — Compares two objects, returns added/removed/modified fields + array changes
-   `formatFieldChanges()` — Human-readable bullet points: `• Field: "Old" → "New"`

### 5.2 Frontend Libraries

#### data-access (`libs/frontend/data-access/`)

| Module                    | Contents                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `api/`                    | 37 API classes extending `AxiosConfig` (one per entity)                              |
| `hooks/`                  | `useAuth`, `useWebSocket`, `useCountdown`, `useEnv`, `useIsProcessing`, `useSecrets` |
| `state-management/`       | Zustand session store (flash notifications, event refs, temp login)                  |
| `local-state-management/` | Zustand local store (authed user, websocket connection)                              |
| `types/`                  | 45 TypeScript type definition files mirroring DTOs                                   |
| `config/`                 | `env.ts`, `constants.ts`                                                             |

**AxiosConfig base class** (`axiosConfig.ts`):

-   Constructor: `(baseURLEnvVar, withAuthorization, shouldRedirectUnauthorized)`
-   Request interceptor: Adds `Bearer <token>` from cookies + session ID
-   Response interceptor: Normalizes response shapes, handles 401 redirects
-   150-second timeout

#### components-web (`libs/frontend/components-web/`)

| Category              | Components                                                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data Display**      | Accordion, Avatar, Badge, Card, VisualCard, BarChart, LineChart, PieChart, Loader, Tab, Table, Toast, Typography, Tooltip                                                                                               |
| **Form Controls**     | Button, DateRangePicker, Checkbox, DropdownMenu, DropdownOptions, Form, Input, RadioButton, Switch                                                                                                                      |
| **Navigation**        | Header, Sidebar, Breadcrumbs                                                                                                                                                                                            |
| **Shared Module**     | ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog, EmptyTableState, ListHeader, PageSizeSelector, Pagination, PaginationButtons, RefreshButton, StatusBadge, StatusFilterDropdown, StatusTabs, TableSkeleton |
| **Approval Workflow** | ApprovalActionButtons, ArrayDiffTable, ChangeReasonReadOnly, ChangeSummaryCard, DeactivationApprovalCard, DeletionApprovalCard, FieldDiffRow, computeArrayDiff                                                          |
| **Form Components**   | EditFormTabs, FormActionButtons, FormSectionCard, InnerRecordTable, ValidationErrors                                                                                                                                    |

#### ui-config (`libs/frontend/ui-config/`)

-   `colors/colors.json` — Color palette definitions
-   `fonts/HelveticaNeue/` — Font files

### 5.3 Shared DTO Library (`libs/dto/`)

~228 exports organized by domain. Every DTO uses `@ApiProperty()` decorators (Swagger).

| Domain     | Key DTOs                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users      | `CreateUserDto`, `UsersDto`, `UserFilterDto`, `UserRole`, `UserStatus`                                                                                                                                                        |
| cognito    | `CognitoDto`, `CognitoEmailDto`, `CognitoTokenDto`, `CognitoRefreshTokenDto` + 5 more                                                                                                                                         |
| customer   | `CustomerDto`, `CreateCustomerDto`, `CustomerClassificationDto`, `CustomerTypeDto`, `TermsDto`, `AreaDto`, `CustomerProductDealDto` + event DTOs                                                                              |
| product    | `ProductDto`, `CreateProductDto`, `ProductCategoryDto`, `ProductClassDto`, `ProductUnitDto`, `ProductPriceTypeDto`, `ProductDealDto`, `ProductUnitRawMaterialDto` + event DTOs                                                |
| invoicing  | `InvoiceDto`, `CreateInvoiceDto`, `InvoiceDetailsDto`, `PaymentDto`, `ContractDto`, `SalesTypeDto`, `TerritoryManagerDto`, `CollectionReceiptRangeDto`, `ReturnGoodSoldDto`, `OverPaymentDto` + event DTOs                    |
| inventory  | `StockDto`, `RawMaterialDto`, `RawMaterialSupplierDto`, `RawMaterialUnitDto`, `RawMaterialsStockDto`, `RawMaterialsPurchaseOrderDto`, `StockTypeDto`, `StockDeliveryDto`, `SupplierDto`, `StockPurchaseOrderDto` + event DTOs |
| accounting | `AccountDto`, `CreateAccountDto`, `VoucherDto`, `CreateVoucherDto`, `VoucherDetailDto` + event DTOs                                                                                                                           |
| common     | `PageDto`, `ResponseDto`, `ErrorResponseDto`, `BroadcastMessageDto`, `EmailNotificationDto`, `ConfigurationDto`, `StatusEnum`                                                                                                 |
| enums      | ~40 event/status enums                                                                                                                                                                                                        |

### 5.4 Shared Utils (`libs/utils/`)

| File        | Functions                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `date.ts`   | `formatDate(date)` → `M/D/YY`                                                                     |
| `number.ts` | `roundNumber()`, `convertToPercentage()`, `chartInterval()`, `isNegative()`, `numberWithCommas()` |
| `string.ts` | `capitalize()`, `maskedEmail()`, `initials()`, `serializeQueryParams()`, `numberWithCommas()`     |
| `token.ts`  | `isTokenInvalid(token)` → checks JWT expiration                                                   |

---

## 6. Frontend Architecture

### 6.1 Next.js App Router Structure

The web-app uses Next.js 13+ App Router with route groups:

```
src/app/
├── layout.tsx                     # Root layout (HTML, body, fonts)
├── page.tsx                       # Root page (empty div)
├── global.scss                    # Global styles
├── auth/[action]/page.tsx         # Public: login, registration, verify-login, set-new-password
├── forgot-password/               # Public: password reset flow
├── api/                           # Server-side API routes (env, health, secrets)
└── (authenticated-routes)/        # Protected route group
    ├── layout.tsx                 # ClientProvider → ProtectedRoute → WithSidebar
    ├── dashboard/                 # Dashboard
    ├── products/                  # Product module (7 sub-entity routes)
    ├── customers/                 # Customer module (5 sub-entity routes)
    ├── inventory/                 # Inventory module (10 sub-entity routes)
    ├── invoicing/                 # Invoicing module (7 sub-entity routes)
    ├── accounting/                # Accounting module (2 sub-entity routes)
    ├── users/                     # User management
    ├── reports/                   # Reports
    ├── settings/                  # Settings
    ├── profile/                   # User profile
    ├── search-modals/             # 30 generic searchable selection modals
    ├── components/                # Shared authenticated-route components
    └── utils/                     # Shared utilities (fieldChangeDetection)
```

### 6.2 Authentication Flow

1. `/auth/login` → `LoginForm` → `useHandleLogin` → `AuthApi.login()` → Cognito
2. If MFA challenge → redirect to `/auth/verify-login`
3. If new password required → redirect to `/auth/set-new-password`
4. On success → store tokens (Access, Refresh, ID) in cookies via `js-cookie`
5. `ProtectedRoute` on every authenticated page: checks `ACCESS_TOKEN` cookie, decodes JWT, validates `exp`
6. 401 from any API → redirect to `/auth/login`
7. Dev bypass: `BYPASS_AUTH=ENABLED` skips token validation

### 6.3 State Management

**Zustand dual-store pattern:**

| Store             | Persistence    | Slices                                                                                            |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `useLocalStore`   | localStorage   | `authedUserSlice` (userId, email, userRole), `websocketConnectionSlice`                           |
| `useSessionStore` | sessionStorage | `flashNotificationSlice` (title, message, alertType), `eventReferenceSlice`, `tempLoginInfoSlice` |

**React Query** (TanStack): `QueryClientProvider` with 5-minute stale time + DevTools.

### 6.4 Navigation Structure

```
Overview          → /dashboard
Products          → /products/product, categories, product-class, product-unit,
                    product-price-type, product-deal, product-unit-raw-material
Customers         → /customers/customer, areas, classifications, types, terms
Inventory         → /inventory/stock, stock-types, suppliers, raw-materials,
                    raw-material-suppliers, raw-material-units, raw-materials-locations,
                    raw-materials-stock, raw-materials-purchase-order, stock-purchase-order
Business          → /invoicing/invoice, payment, return-good-sold, contract,
                    sales-type, territory-manager, collection-receipt-range
Accounting        → /accounting/accounts, voucher
Reports           → /reports
System            → /users, /settings
```

### 6.5 CRUD Page Pattern

Every business entity follows an identical three-page pattern:

#### List Page (`page.tsx`)

**State**: `isLoading`, `searchQuery`, `statusFilter`, `items[]`, `nextCursor`, `prevCursor`, `pageSize`

**Data fetching**: Branches based on active filters:

-   Status + search → `api.getByStatus(limit, status, dir, cursor, name)`
-   Search only → `api.getByName(name, limit, dir, cursor)`
-   Status only → `api.getByStatus(limit, status, dir, cursor)`
-   No filter → `api.getAll(limit, dir, cursor)`

**Debounced search**: 500ms setTimeout on search input changes.

**Components**:

-   `<EntityHeader>` — search input, status filter dropdown, refresh button, create button (role-gated)
-   `<EntityTable>` — responsive desktop table + mobile cards + `TableSkeleton` + `EmptyTableState`
-   `<PageSizeSelector>` — 10/20/50/100
-   `<PaginationButtons>` — cursor-based prev/next

**Row click**: `router.push('/module/entity/${id}/edit')`

#### Create Page (`create/page.tsx`)

-   Renders breadcrumbs
-   Wraps `<EntityForm isCreateMode={true} selectedEntity={null} />` in a card
-   On save: calls `api.create(dto, userRole)` → flash notification → navigate to list

#### Edit Page (`[id]/edit/page.tsx`)

-   Loads entity by ID on mount: `api.getById(params.id)`
-   Two tabs (color-coded by status):
    -   **Information tab** → `<EntityForm>` with edit/approval logic
    -   **Activity Logs tab** → timestamped audit trail
-   Actions: Save, Delete, Reactivate, Approve (admin), Deny (admin)

### 6.6 Form Component Pattern

Each entity has a shared `<EntityForm>` (~500-2000 lines) serving create, edit, and approval review modes:

**State management**:

-   `formData` — controlled inputs (strings)
-   `selected*` — relational entity selections (objects)
-   Array state for sub-tables (e.g., `customerTerms[]`, `invoiceDetails[]`)
-   `useNumberFormatting()` hook for monetary/numeric fields

**Edit rules by status**:
| Status | Behavior |
|--------|----------|
| Create mode | All fields editable |
| ACTIVE | All fields editable |
| INACTIVE | Read-only (reactivate only) |
| FOR_APPROVAL / NEW_RECORD | Read-only approval view with inline diffs |
| FOR_DELETION / FOR_DEACTIVATION | Read-only with red deletion card |

**Approval diff view** (admin only):

-   `renderFieldWithInlineDiff(label, field, current, pending)` — shows ~~old~~ → **new** with highlighting
-   Sub-table diffs — rows marked as added (green), modified (blue), removed (red/strikethrough), unchanged
-   Uses `createFieldChangeDetector()` from `fieldChangeDetection.ts`

**Selection modals**:

-   `<SelectionField>` — read-only input triggering a `*SearchableSelectionModal` on click
-   30 specialized modals wrapping `GenericSearchableSelectionModal<T>`
-   Each modal: full-screen overlay → search input → filtered table → select row → close

**Validation** (inline, on submit):

-   Required field checks
-   Change reason required for non-admin edits
-   Duplicate detection on array sub-tables
-   Error list displayed as red bordered box at top

**Action buttons**:

-   Create: "Create [Entity]" + Cancel
-   Edit (ACTIVE): "Save Changes" + Delete + Cancel
-   Approval (admin): Approve (green) + Deny (red → `DenyReasonDialog`) + Cancel
-   Inactive: Reactivate + Cancel

### 6.7 API Client Pattern

Each API class extends `AxiosConfig` and exports a singleton:

```
class CustomerMainApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false)
        //     ^env var key      ^auth  ^no 401 redirect
    }
    getCustomers(limit, direction?, cursorPointer?, userRole?) { ... }
    createCustomer(dto, userRole?) { ... }
    approveCustomer(id, userRole?) { ... }
    denyCustomer(id, approverMessage, userRole?) { ... }
    // ...
}
export default new CustomerMainApi()
```

**Environment resolution**: `API_*_URL` env vars resolved at runtime from `/api/env` server route → cached in sessionStorage.

### 6.8 Searchable Selection Modals

30 modals under `(authenticated-routes)/search-modals/` for relational field picking:

`AccountSearchableSelectionModal`, `AreaSearchableSelectionModal`, `ContractSearchableSelectionModal`, `CustomerClassificationSearchableSelectionModal`, `CustomerSearchableSelectionModal`, `CustomerTermsSelectionModal`, `CustomerTypeSearchableSelectionModal`, `InvoiceSearchableSelectionModal`, `ProductCategorySearchableSelectionModal`, `ProductClassSearchableSelectionModal`, `ProductDealSearchableSelectionModal`, `ProductPriceTypeSearchableSelectionModal`, `ProductSearchableSelectionModal`, `ProductUnitPriceSelectionModal`, `ProductUnitSearchableSelectionModal`, `RawMaterialSearchableSelectionModal`, `RawMaterialsLocationSearchableSelectionModal`, `RawMaterialSupplierSearchableSelectionModal`, `RawMaterialUnitSearchableSelectionModal`, `SalesTypeSearchableSelectionModal`, `StockLocationSearchableSelectionModal`, `StockSearchableSelectionModal`, `StockTypeSearchableSelectionModal`, `SupplierSearchableSelectionModal`, `TermsSearchableSelectionModal`, `TerritoryManagerSearchableSelectionModal`, `TownSelectionModal`, `VoucherSearchableSelectionModal`

Pattern: `GenericSearchableSelectionModal<T>` → full-screen overlay → search input → column table → row click returns selection.

---

## 7. Code Patterns & Conventions

### 7.1 Backend CQRS Pattern

Every feature module follows this directory structure:

```
src/app/{feature}/
├── {feature}.module.ts              # NestJS module (CqrsModule, DB service, handlers)
├── {feature}.controller.ts          # Routes → CommandBus/QueryBus dispatch
├── command/
│   ├── create/
│   │   ├── create.command.ts        # Command class (DTO + UserCognito)
│   │   └── create.handler.ts        # @CommandHandler — business logic
│   ├── update/
│   │   ├── update.command.ts
│   │   └── update.handler.ts
│   ├── delete/
│   ├── approve-record/
│   └── deny-record/
└── queries/
    ├── get.by.id/
    │   ├── get.{entity}.by.id.query.ts
    │   └── get.{entity}.by.id.handler.ts
    ├── get.by.name/
    ├── get.records.pagination/
    └── get.records.by.status.pagination/
```

**Command pattern:**

```typescript
// Command class holds the input DTO + authenticated user
export class CreateEntityCommand {
    constructor(public dto: CreateEntityDto, public user: UserCognito) {}
}

// Handler implements business logic and calls database service
@CommandHandler(CreateEntityCommand)
export class CreateEntityHandler implements ICommandHandler<CreateEntityCommand> {
    constructor(@Inject('EntityDatabaseService') private readonly db: EntityDatabaseServiceAbstract) {}
    async execute(command: CreateEntityCommand): Promise<ResponseDto<EntityDto | ErrorResponseDto>> {
        // 1. Validate
        // 2. Set status based on role (ADMIN → ACTIVE, USER → NEW_RECORD)
        // 3. Save via database service
        // 4. Optionally publish SQS event
        // 5. Return ResponseDto
    }
}
```

**Controller dispatches:**

```typescript
@Controller('entities')
@UseGuards(CognitoAuthGuard)
export class EntityController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    create(@Body() dto: CreateEntityDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new CreateEntityCommand(dto, user));
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetEntityByIdQuery(id));
    }
}
```

### 7.2 Database Service Abstract Pattern

```typescript
// Abstract class defines the contract
export abstract class EntityDatabaseServiceAbstract {
    abstract create(dto: CreateEntityDto): Promise<EntityDto>;
    abstract update(id: string, dto: Partial<EntityDto>): Promise<EntityDto>;
    abstract delete(id: string): Promise<void>;
    abstract findById(id: string): Promise<EntityDto>;
    abstract findAll(limit: number, direction?: string, cursor?: string): Promise<PageDto<EntityDto>>;
    abstract findByStatus(status: string, limit: number, ...): Promise<PageDto<EntityDto>>;
}

// Implementation uses DynamoDbLibService + schema
export class EntityDatabaseService extends EntityDatabaseServiceAbstract {
    constructor(private readonly dynamoDbLibService: DynamoDbLibService) {
        this.model = dynamoDbLibService.getTable('tableName').getModel('EntityModel');
    }
    // Implementation using OneTable model.create(), model.get(), model.find(), model.update(), model.remove()
}
```

**Injection token pattern**: Database services are provided with string tokens (e.g., `'CustomerDatabaseService'`) and injected via `@Inject('CustomerDatabaseService')`.

### 7.3 Approval Workflow Pattern

**Two-role model:**

-   **USER**: Changes create pending records (FOR_APPROVAL / NEW_RECORD / FOR_DEACTIVATION / FOR_DELETION)
-   **ADMIN / SUPER_ADMIN**: Can approve (→ ACTIVE) or deny (→ reverts to previous state)

**Create flow:**

1. USER creates → status = `NEW_RECORD`
2. ADMIN approves → status = `ACTIVE`
3. ADMIN denies → record deleted or reverted

**Update flow:**

1. USER updates ACTIVE record → status = `FOR_APPROVAL`, `forApprovalVersion` = snapshot of changes
2. ADMIN approves → applies `forApprovalVersion` fields to record, status = `ACTIVE`, clears `forApprovalVersion`
3. ADMIN denies → status = `ACTIVE`, `forApprovalVersion` cleared, `approverMessage` set

**Delete flow:**

1. USER deletes → status = `FOR_DELETION` (soft delete)
2. ADMIN approves deletion → status = `INACTIVE`
3. ADMIN denies → status = `ACTIVE`
4. ADMIN/SUPER_ADMIN deletes → hard delete (permanent)

**Activity logging**: Every action appends a timestamped entry to `activityLogs[]` array: `"Date: {ISO}, {action} by {email}. {reason/message}"`

### 7.4 Cursor-Based Pagination Pattern

**Backend:**

```typescript
// Uses pageRecordHandler from dynamo-db-lib
const result = await pageRecordHandler(
    this.model, // OneTable model
    queryOptions, // { pk, sk, index, limit }
    direction, // 'next' | 'prev' | undefined
    cursorPointer // serialized cursor string | undefined
);
// Returns: { data: EntityDto[], nextCursorPointer?: string, prevCursorPointer?: string }
```

**Frontend:**

```typescript
const [nextCursor, setNextCursor] = useState<string | null>(null);
const [prevCursor, setPrevCursor] = useState<string | null>(null);

// Fetch: direction + cursor must both be present or both absent
const response = await api.getAll(pageSize, direction, cursor);
setNextCursor(response.nextCursorPointer ?? null);
setPrevCursor(response.prevCursorPointer ?? null);

// Filter/search change resets cursors
setNextCursor(null);
setPrevCursor(null);
```

### 7.5 Event Publishing Pattern

In API services, events are published after successful database operations:

```typescript
// In command handler
await this.messageQueueService.sendMessageToSQS(
    configService.get('CUSTOMER_EVENT_SQS'),
    JSON.stringify({
        eventType: CustomerEventEnum.CUSTOMER_UPDATED,
        customerId: customer.customerId,
        customerName: customer.customerName,
    })
);
```

In event handlers, messages are consumed and routed:

```typescript
// In MessageHandlerService.handleMessage(message)
const { eventType, ...payload } = JSON.parse(message.Body);
switch (eventType) {
    case CustomerEventEnum.CUSTOMER_UPDATED:
        await this.handleCustomerUpdated(payload);
        break;
    // ...
}
```

### 7.6 ResponseDto Convention

All API responses are wrapped in `ResponseDto`:

```typescript
interface ResponseDto<T> {
    statusCode: number;
    data: T;
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}
```

Error responses use `ErrorResponseDto`:

```typescript
interface ErrorResponseDto {
    message: string;
    statusCode: number;
}
```

### 7.7 Frontend File Naming Conventions

| Type          | Convention                   | Example                                 |
| ------------- | ---------------------------- | --------------------------------------- |
| Page          | `page.tsx`                   | `customers/customer/page.tsx`           |
| Component     | PascalCase                   | `CustomerForm.tsx`, `CustomerTable.tsx` |
| API class     | kebab-case                   | `customer-main.api.ts`                  |
| Hook          | camelCase with `use` prefix  | `useHandleLogin.ts`                     |
| Utility       | camelCase                    | `fieldChangeDetection.ts`               |
| DTO type      | PascalCase with `Dto` suffix | `CustomerDto.ts`                        |
| Barrel export | `index.ts`                   | `components/index.ts`                   |

---

## 8. Step-by-Step: Adding a New Feature

### 8.1 Add a New Entity to an Existing Domain

Example: Adding "Warehouse" to the Inventory domain.

**Step 1 — Schema** (`libs/backend/dynamo-db-lib/src/lib/schema/InventorySchema.ts`):

-   Add `Warehouse` model to the existing schema
-   Define fields: `warehouseId` (ULID), `warehouseName`, standard approval fields
-   Add GSIs for common access patterns (all by name, by status)

**Step 2 — Generate DTOs** (`bash generate-dto.sh InventorySchema`):

-   Auto-generates `WarehouseDto`, `CreateWarehouseDto`, and any enums
-   Updates barrel exports in `libs/dto/src/index.ts`

**Step 3 — Database Service** (`libs/backend/database-services/inventory-database-service/`):

-   Add `WarehouseDatabaseServiceAbstract` abstract class with CRUD + query methods
-   Add `WarehouseDatabaseService` implementation using DynamoDbLibService
-   Export from the module and register the provider with string token `'WarehouseDatabaseService'`

**Step 4 — CQRS Module** (`apps/inventory/inventory-api-service/src/app/warehouse/`):

-   Create `warehouse.module.ts` importing CqrsModule, DB module, auth guard
-   Create `warehouse.controller.ts` with standard CRUD + approve/deny routes
-   Create `command/` folder with create, update, delete, approve-record, deny-record handlers
-   Create `queries/` folder with get-by-id, get-by-name, get-pagination, get-by-status handlers

**Step 5 — Register Module** (`apps/inventory/inventory-api-service/src/app/app.module.ts`):

-   Add `WarehouseModule` to module imports

**Step 6 — Event Handler** (if name propagation needed):

-   Add event enum (e.g., `WarehouseEventEnum.WAREHOUSE_UPDATED`) to `libs/dto/`
-   Add event DTO (e.g., `WarehouseEventDto`)
-   Add handler in `apps/inventory/inventory-event-handler-service/` → `MessageHandlerService.handleMessage()`

**Step 7 — Frontend API Client** (`libs/frontend/data-access/src/api/warehouse.api.ts`):

-   Create API class extending `AxiosConfig` targeting `API_INVENTORY_URL`
-   Implement methods: `getWarehouses()`, `getWarehouseById()`, `createWarehouse()`, `updateWarehouse()`, `deleteWarehouse()`, `approveWarehouse()`, `denyWarehouse()`, `getWarehousesByStatus()`, `getWarehousesByName()`

**Step 8 — Frontend Pages** (`apps/web-app/src/app/(authenticated-routes)/inventory/warehouse/`):

```
warehouse/
├── page.tsx                    # List page
├── create/page.tsx             # Create page
├── [id]/edit/page.tsx          # Edit page
└── components/
    ├── WarehouseForm.tsx       # Shared create/edit form
    ├── WarehouseTable.tsx      # Desktop table + mobile cards
    ├── WarehouseHeader.tsx     # Search + filter + create button
    └── index.ts                # Barrel export
```

**Step 9 — Selection Modal** (if other entities reference this):

-   Create `WarehouseSearchableSelectionModal` in `search-modals/`

**Step 10 — Navigation** (`apps/web-app/src/components/navigation/sidebar-navigation.tsx`):

-   Add route entry under Inventory section

**Step 11 — LocalStack/Terraform**:

-   Run `node generate-dynamodb-localstack.js` to update local table scripts
-   Run `node generate-dynamodb-tf.js dev` to update Terraform

### 8.2 Add a New Microservice

**API Service:**

```bash
bash generate-service.sh <parent-folder> <service-name> API
# Example: bash generate-service.sh warehouse warehouse-api-service API
```

This auto-generates:

-   Nx project under `apps/<parent>/<service>/`
-   `main.ts` with dual-mode bootstrap (Express + Lambda)
-   `app.controller.ts` with health check + version endpoints
-   VS Code task, deployment config, Terraform file
-   Auto-assigned port

**SQS Event Handler Service:**

```bash
bash generate-service.sh <parent-folder> <service-name> SQS <QUEUE_NAME>
# Example: bash generate-service.sh warehouse warehouse-event-handler-service SQS WAREHOUSE_EVENT_SQS
```

Additional auto-generation:

-   SQS-specific `app.module.ts` with `SqsLocalService` and `MessageHandlerService`
-   LocalStack queue creation script
-   Configuration lib updated with queue name
-   Terraform for SQS queue

### 8.3 Add a New Frontend CRUD Module

1. **Create route folders** under `(authenticated-routes)/{module}/{entity}/`:

    ```
    {entity}/page.tsx, create/page.tsx, [id]/edit/page.tsx, components/
    ```

2. **List page** (`page.tsx`):

    - State: isLoading, searchQuery, statusFilter, items, cursors, pageSize
    - API fetch function with 4-branch filter logic
    - Debounced search (500ms)
    - Compose `<Header>` + `<Table>` + pagination components

3. **Create page** (`create/page.tsx`):

    - Breadcrumbs + `<Form isCreateMode={true} />`
    - On save: API call → flash notification → navigate to list

4. **Edit page** (`[id]/edit/page.tsx`):

    - Load by ID on mount
    - Two tabs: Information + Activity Logs
    - Tab colors by status
    - Actions: Save, Delete, Approve, Deny

5. **Form component** (`components/{Entity}Form.tsx`):

    - Controlled state for each field
    - Selection modals for relational fields
    - Inline validation
    - Approval diff view for admin
    - ChangeReason field for non-admin edits

6. **Table component** (`components/{Entity}Table.tsx`):

    - Desktop: `<table>` with blue headers
    - Mobile: card layout
    - StatusBadge, activity log display
    - TableSkeleton + EmptyTableState

7. **Header component** (`components/{Entity}Header.tsx`):

    - Search Input + StatusFilterDropdown + RefreshButton + Create button

8. **Navigation entry** in sidebar-navigation.tsx

### 8.4 Add a New Event Handler in an Existing Service

1. **Define event enum** in `libs/dto/src/lib/{domain}/enums/`
2. **Define event DTO** in `libs/dto/src/lib/{domain}/`
3. **Add case** in the event handler's `MessageHandlerService.handleMessage()` switch
4. **Implement handler logic** (typically: paginated batch-update of denormalized names)
5. **Publish event** from the API service after the triggering database operation

---

## 9. Step-by-Step: Debugging & Fixing Issues

### 9.1 Local Development Setup

1. **Start LocalStack**: `docker-compose up` (creates DynamoDB, SQS, S3 locally)
2. **Create tables/queues**: `bash run-local-stack-scripts.sh` (runs all `local-stack-scripts/*.sh`)
3. **Start services**: Use VS Code tasks or `npx nx serve <service-name> --skip-nx-cache`
4. **Start frontend**: `npx nx serve web-app --skip-nx-cache`
5. **Swagger docs**: Available at `http://localhost:<port>/api/swagger` for each API service

### 9.2 Common Backend Issues

**"Cannot find module" errors:**

-   Check `tsconfig.base.json` path aliases (`@auth-guard-lib`, `@dynamo-db-lib`, `@dto`, etc.)
-   Ensure the library is built or referenced correctly in the Nx project graph

**DynamoDB query returns empty:**

-   Verify GSI PK/SK construction matches schema definition
-   Check that GSI names match between schema, database service, and Terraform
-   Use LocalStack AWS CLI: `aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name <table>`

**SQS event not processed:**

-   Check service is running and polling (local: `SqsLocalService.pollQueue()`)
-   Verify queue name matches between config, LocalStack script, and service
-   Check `MessageHandlerService.handleMessage()` switch has a case for the event type

**Authentication failures:**

-   Verify `BYPASS_AUTH=ENABLED` in `.env` for local development
-   Check Cognito User Pool ID and Client ID match between services
-   Verify JWKS URL is accessible

### 9.3 Common Frontend Issues

**Blank page / infinite redirect:**

-   Check `BYPASS_AUTH=ENABLED` in environment if Cognito is not configured
-   Verify `/api/env` returns correct API URLs
-   Check browser cookies for `ACCESS_TOKEN`

**API call returns 401:**

-   Token may be expired — check `isTokenInvalid()` utility
-   Verify AxiosConfig interceptor is adding the Bearer token
-   Check that the service's `CognitoAuthGuard` is not bypassed when it should be (or vice versa)

**Data not refreshing after create/update:**

-   Cursor-based pagination: ensure cursors are reset after data mutation
-   Check that `fetchItems()` is called after successful API response
-   Flash notifications use session store — ensure navigation timing is correct

**Form validation not working:**

-   Check controlled input state binding
-   Verify validation runs in the submit handler before API call
-   Check that `changeReason` is required for non-admin users

### 9.4 Data Consistency Issues

**Denormalized name out of sync:**

-   The event handler may have failed or the SQS message was lost
-   Manually trigger a re-sync by updating the source entity (republishes the event)
-   Check event handler logs for errors during batch update

**Customer balance incorrect:**

-   Traces back to Invoicing Event Handler → `UPDATE_CUSTOMER_BALANCE` event
-   Recalculation iterates all customer invoices — check for missing/orphaned PaymentInvoice records
-   Verify overpayment records are correctly created/deleted

### 9.5 Running Tests

```bash
# Single service
npx nx test <service-name> --watch=false

# All affected
npx nx affected -t test

# With coverage
npx nx test <service-name> --coverage --watch=false

# Lint
npx nx lint <project-name>

# Build
npx nx build <project-name>
```

---

## 10. File Path Quick Reference

### 10.1 Backend Services — Entry Points

| Service            | Controller Path                                           |
| ------------------ | --------------------------------------------------------- |
| Accounting API     | `apps/accounting/accounting-api-service/src/app/`         |
| Authentication API | `apps/authentication/authentication-api-service/src/app/` |
| Configuration API  | `apps/configuration/configuration-api-service/src/app/`   |
| Customer API       | `apps/customer/customer-api-service/src/app/`             |
| Inventory API      | `apps/inventory/inventory-api-service/src/app/`           |
| Invoicing API      | `apps/invoicing/invoicing-api-service/src/app/`           |
| Product API        | `apps/product/product-api-service/src/app/`               |
| Report API         | `apps/reports/report-api-service/src/app/`                |
| User API           | `apps/user/user-api-service/src/app/`                     |
| Email API          | `apps/misc/email-api-service/src/app/`                    |
| Email Template API | `apps/misc/email-template-api-service/src/app/`           |
| Env Initializer    | `apps/misc/environment-initializer-api-service/src/app/`  |
| File API           | `apps/misc/file-api-service/src/app/`                     |
| Cognito Custom Msg | `apps/misc/cognito-custom-message-service/src/app/`       |

### 10.2 Event Handlers — Message Handlers

| Service           | Handler Path                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| Accounting Events | `apps/accounting/accounting-event-handler-service/src/app/message.handler.service.ts` |
| Customer Events   | `apps/customer/customer-event-handler-service/src/app/message.handler.service.ts`     |
| Inventory Events  | `apps/inventory/inventory-event-handler-service/src/app/message.handler.service.ts`   |
| Invoicing Events  | `apps/invoicing/invoicing-event-handler-service/src/app/message.handler.service.ts`   |
| Product Events    | `apps/product/product-event-handler-service/src/app/message.handler.service.ts`       |
| User Events       | `apps/user/user-event-handler-service/src/app/message.handler.service.ts`             |
| WS Broadcast      | `apps/websocket/broadcast-message-service/src/app/`                                   |
| WS Connect        | `apps/websocket/connect-service/src/app/`                                             |
| WS Disconnect     | `apps/websocket/disconnect-service/src/app/`                                          |

### 10.3 Shared Libraries

| Library            | Path                                                        |
| ------------------ | ----------------------------------------------------------- |
| Auth Guard         | `libs/backend/auth-guard-lib/src/lib/`                      |
| AWS Cognito        | `libs/backend/aws-services/aws-cognito-lib/src/lib/`        |
| AWS S3             | `libs/backend/aws-services/aws-s3-lib/src/lib/`             |
| AWS SES            | `libs/backend/aws-services/aws-ses-lib/src/lib/`            |
| AWS SQS            | `libs/backend/aws-services/aws-sqs-lib/src/lib/`            |
| AWS SNS            | `libs/backend/aws-services/aws-sns-lib/src/lib/`            |
| AWS Secrets        | `libs/backend/aws-services/aws-secret-manager-lib/src/lib/` |
| Config Lib         | `libs/backend/configuration-lib/src/lib/`                   |
| DynamoDB Lib       | `libs/backend/dynamo-db-lib/src/lib/`                       |
| DynamoDB Schemas   | `libs/backend/dynamo-db-lib/src/lib/schema/`                |
| DB Services        | `libs/backend/database-services/`                           |
| Message Queue      | `libs/backend/message-queue-lib/src/lib/`                   |
| Excel Generator    | `libs/backend/excel-generator-service/src/lib/`             |
| Field Change Utils | `libs/backend/field-change-utils-lib/src/lib/`              |
| DTOs               | `libs/dto/src/lib/`                                         |
| Utils              | `libs/utils/src/lib/`                                       |

### 10.4 Frontend

| Component          | Path                                                            |
| ------------------ | --------------------------------------------------------------- |
| App Layout         | `apps/web-app/src/app/layout.tsx`                               |
| Auth Layout        | `apps/web-app/src/app/(authenticated-routes)/layout.tsx`        |
| Client Provider    | `apps/web-app/src/components/global/client-provider/`           |
| Protected Route    | `apps/web-app/src/components/global/protected-route/`           |
| Sidebar Navigation | `apps/web-app/src/components/navigation/sidebar-navigation.tsx` |
| Module Pages       | `apps/web-app/src/app/(authenticated-routes)/{module}/`         |
| Search Modals      | `apps/web-app/src/app/(authenticated-routes)/search-modals/`    |
| Shared Components  | `apps/web-app/src/app/(authenticated-routes)/components/`       |
| API Clients        | `libs/frontend/data-access/src/api/`                            |
| Axios Base         | `libs/frontend/data-access/src/api/axiosConfig.ts`              |
| Hooks              | `libs/frontend/data-access/src/hooks/`                          |
| Session Store      | `libs/frontend/data-access/src/state-management/`               |
| Local Store        | `libs/frontend/data-access/src/local-state-management/`         |
| FE Types           | `libs/frontend/data-access/src/types/`                          |
| UI Components      | `libs/frontend/components-web/src/`                             |
| UI Config          | `libs/frontend/ui-config/src/`                                  |
| Formatters         | `apps/web-app/src/utils/formatters.ts`                          |
| Activity Log Utils | `apps/web-app/src/utils/activityLogUtils.tsx`                   |
| Event Emitter      | `apps/web-app/src/utils/eventEmitter.ts`                        |
| Constants          | `apps/web-app/src/config/constants.ts`                          |

### 10.5 Code Generation & Infrastructure

| Item                          | Path                                                     |
| ----------------------------- | -------------------------------------------------------- |
| Service Generator             | `generate-service.sh`                                    |
| DTO Generator                 | `generate-dto.sh`                                        |
| DynamoDB LocalStack Generator | `generate-dynamodb-localstack.js`                        |
| DynamoDB Terraform Generator  | `generate-dynamodb-tf.js`                                |
| Service Templates             | `script-files/`                                          |
| API main.ts Template          | `script-files/api_main.ts`                               |
| SQS main.ts Template          | `script-files/sqs_main.ts`                               |
| Controller Template           | `script-files/app.controller.ts`                         |
| SQS Module Template           | `script-files/app.module.sqs.ts`                         |
| Message Handler Template      | `script-files/message.handler.service.ts`                |
| DB Service Abstract Template  | `script-files/schema-database-service-abstract-class.ts` |
| DB Service Impl Template      | `script-files/schema-database-service.ts`                |
| API Terraform Template        | `script-files/default-api.tf`                            |
| SQS Terraform Template        | `script-files/default-sqs.tf`                            |
| LocalStack Scripts            | `local-stack-scripts/`                                   |
| Terraform Dev                 | `terraform/dev/`                                         |
| Deployment Config             | `deployment.config.json`                                 |
| Docker (Lambda)               | `NestJS_AWSLambda_Dockerfile`                            |
| Docker (ECS)                  | `NextJS_ECS_Dockerfile`                                  |
| VS Code Tasks                 | `.vscode/tasks.json`                                     |
| Nx Config                     | `nx.json`                                                |
| TS Config                     | `tsconfig.base.json`                                     |

---

## Appendix: Quick Checklists

### Checklist: New Entity (Full Stack)

-   [ ] Add schema to `libs/backend/dynamo-db-lib/src/lib/schema/`
-   [ ] Run `bash generate-dto.sh <SchemaName>`
-   [ ] Add/update database service abstract + implementation in `libs/backend/database-services/`
-   [ ] Create CQRS feature module (module, controller, commands, queries)
-   [ ] Register module in API service's `app.module.ts`
-   [ ] Add event enum + DTO if events needed
-   [ ] Add event handler case in `message.handler.service.ts`
-   [ ] Publish events from command handlers where needed
-   [ ] Create frontend API client class
-   [ ] Create list page (page.tsx + Header + Table components)
-   [ ] Create create page (page.tsx + Form component)
-   [ ] Create edit page ([id]/edit/page.tsx)
-   [ ] Add selection modal if entity is referenced by others
-   [ ] Add navigation entry in sidebar
-   [ ] Run `node generate-dynamodb-localstack.js` and `node generate-dynamodb-tf.js dev`
-   [ ] Test locally with LocalStack

### Checklist: Bug Fix

-   [ ] Identify the domain and layer (FE/BE API/BE Event Handler/DB Service/Schema)
-   [ ] Read the relevant controller → command/query handler → database service chain
-   [ ] Check DTOs match between FE and BE
-   [ ] Check event propagation if data inconsistency
-   [ ] Write/run tests: `npx nx test <service-name> --watch=false`
-   [ ] Verify with Swagger (`/api/swagger`) if API-related
-   [ ] Check frontend state management (cursors, flash notifications, form state)

### Checklist: New Microservice

-   [ ] Run `bash generate-service.sh <parent> <name> API|SQS [QUEUE_NAME]`
-   [ ] Customize generated `app.module.ts` imports
-   [ ] Implement controllers/handlers
-   [ ] Add deployment entry in `deployment.config.json`
-   [ ] Add VS Code task for local development
-   [ ] Test locally
-   [ ] Add Terraform resources

---

_Document generated from codebase analysis. Last updated: February 2026._
