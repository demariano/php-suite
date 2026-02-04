# Table List Implementation - Feature Guide

**Feature**: Table List Page for Master Data and Transactional Modules  
**Status**: ✅ Complete - Full Implementation Guide  
**Last Updated**: February 4, 2026  
**Reference Implementation**: Products Module

---

## 📖 Document Structure

This guide breaks down each feature of the Table List page into comprehensive sections covering:

-   ✅ **Reusable Components** - What components to use from @components-web
-   ✅ **Feature Description** - What the feature does
-   ✅ **Business Rules** - Who can access/use this feature
-   ✅ **Backend Integration** - API endpoints, request/response structures
-   ✅ **Backend Implementation** - Handlers, services, database calls, schemas
-   ✅ **UI/UX Details** - Component usage, styling, Tailwind classes

---

## 🎯 Table of Contents

### Quick Start Sections

1. [Naming Conventions & Patterns](#naming-conventions--patterns)
2. [Module Customization Guide](#module-customization-guide)
3. [Find & Replace Table](#find--replace-table)
4. [Optional Features Guide](#optional-features-guide)

### Feature Implementation

5. [Search/Filter Records](#1-search-filter-records)
6. [Status Filter](#2-status-filter)
7. [Refresh Button](#3-refresh-button)
8. [Create New Button](#4-create-new-button)
9. [Table Display](#5-table-display)
10. [Loading State](#6-loading-state)
11. [Empty State](#7-empty-state)
12. [Pagination](#8-pagination)
13. [Page Size Selector](#9-page-size-selector)
14. [Row Click/Edit](#10-row-click-edit)

### Templates

15. [Complete Code Templates](#complete-code-templates)
16. [Column Definition Patterns](#column-definition-patterns)

---

## Naming Conventions & Patterns

> **CRITICAL**: Follow these naming conventions exactly to maintain consistency across all modules. Do NOT deviate.

### 📁 File Naming

```
✅ CORRECT Pattern:
- page.tsx                          (always lowercase)
- [Module]Header.tsx                (PascalCase, singular)
- [Module]Table.tsx                 (PascalCase, singular)

❌ INCORRECT:
- [Module]List.tsx
- [Module]sHeader.tsx (plural)
- [module]Header.tsx (lowercase)

Examples:
- ProductHeader.tsx  ✅
- CustomerHeader.tsx ✅
- ProductsHeader.tsx ❌
- product-header.tsx ❌
```

### 🏷️ Component Naming

```typescript
✅ CORRECT Pattern:
export default function ProductHeader({ ... }) { }
export default function CustomerTable({ ... }) { }

❌ INCORRECT:
export default function ProductsHeader({ ... }) { }  // Plural
export default function productHeader({ ... }) { }   // Lowercase
export default function Product_Header({ ... }) { }  // Underscore
```

### 📦 State Variable Naming

```typescript
✅ CORRECT Pattern (plural for arrays):
const [products, setProducts] = useState<ProductDto[]>([]);
const [customers, setCustomers] = useState<CustomerDto[]>([]);
const [categories, setCategories] = useState<CategoryDto[]>([]);

❌ INCORRECT:
const [productList, setProductList] = ...  // Don't add "List"
const [product, setProduct] = ...          // Singular for array
const [productData, setProductData] = ...  // Don't add "Data"
```

### 🔤 Function Naming

```typescript
✅ CORRECT Pattern (use fetch prefix for API calls):
const fetchProducts = async () => { };
const fetchCustomers = async () => { };

// Handler functions use handle prefix:
const handleCreateClick = () => { };
const handleRowClick = (record) => { };
const handlePageSizeChange = (size) => { };
const handlePrevious = () => { };
const handleNext = () => { };

❌ INCORRECT:
const getProducts = ...      // Use "fetch" not "get"
const loadProducts = ...     // Use "fetch" not "load"
const retrieveProducts = ... // Use "fetch" not "retrieve"
const onCreate = ...         // Use "handleCreateClick" not "onCreate"
```

### 🎯 Props Interface Naming

```typescript
✅ CORRECT Pattern:
interface ProductHeaderProps { }
interface CustomerTableProps { }

// NOT generic:
interface ModuleHeaderProps { }  ❌
interface HeaderProps { }        ❌
```

### 🌐 API/DTO Naming

```typescript
✅ CORRECT Pattern:
import { ProductApi, ProductDto } from '@data-access/index';
import { CustomerApi, CustomerDto } from '@data-access/index';

// API calls:
await ProductApi.getProducts(...)
await ProductApi.searchByName(...)
await CustomerApi.getCustomers(...)

❌ INCORRECT:
import { ProductAPI } from ... // Use "Api" not "API"
import { Product } from ...    // Use "ProductDto" not "Product"
```

### 📊 Derived State Naming

```typescript
✅ CORRECT Pattern:
const tableData = useMemo(() => products.map(...), [products]);
const headers = useMemo(() => [...], []);

❌ INCORRECT:
const transformedProducts = ... // Use "tableData"
const productTableData = ...    // Too specific
const data = ...                // Too generic
```

### 🛣️ Route Naming

```typescript
✅ CORRECT Pattern:
// Structure: /[domain]/[module]/[action]
router.push('/products/product/create');
router.push('/products/product/${id}/edit');
router.push('/customer/customer/create');
router.push('/inventory/stock/${id}/edit');

// Domain: plural (products, customer, inventory)
// Module: singular (product, customer, stock)

❌ INCORRECT:
router.push('/product/create');        // Missing domain
router.push('/products/products/...');  // Double plural
router.push('/Product/create');         // Capital letter
```

### 📝 Component Import Order

```typescript
✅ CORRECT Order:
1. 'use client' directive (if client component)
2. React imports
3. Reusable components from @components-web
4. API/DTO imports from @data-access
5. Utility imports
6. Next.js imports (useRouter, etc.)
7. Local component imports

Example:
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge, Input, Search } from '@components-web';
import { ProductApi, ProductDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { ProductHeader, ProductTable } from './components';
```

---

## Module Customization Guide

> **What changes** and **what stays the same** when implementing a new module.

### 🔄 What Changes Per Module

| Element               | Pattern                           | Examples                                               |
| --------------------- | --------------------------------- | ------------------------------------------------------ |
| **Module Name**       | Singular, PascalCase              | `Product`, `Customer`, `Category`, `Invoice`           |
| **State Variable**    | Plural, camelCase                 | `products`, `customers`, `categories`, `invoices`      |
| **DTO Type**          | `[Module]Dto`                     | `ProductDto`, `CustomerDto`, `CategoryDto`             |
| **API Import**        | `[Module]Api`                     | `ProductApi`, `CustomerApi`, `CategoryApi`             |
| **Component Names**   | `[Module]Header`, `[Module]Table` | `ProductHeader`, `CustomerTable`                       |
| **Fetch Function**    | `fetch[Modules]`                  | `fetchProducts`, `fetchCustomers`                      |
| **API Methods**       | `get[Modules]`, `searchByName`    | `getProducts()`, `getCustomers()`                      |
| **Table Columns**     | Module-specific fields            | Product: `criticalLevel`<br>Customer: `email`, `phone` |
| **Route Domain**      | Plural, lowercase                 | `/products/...`, `/customer/...`                       |
| **Primary Key Field** | `[module]Id`                      | `productId`, `customerId`, `categoryId`                |
| **Name Field**        | `[module]Name`                    | `productName`, `customerName`, `categoryName`          |

### ✅ What Stays EXACTLY the Same

| Element                 | Value                      | Never Change                                                                                                                                           |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reusable Components** | All from `@components-web` | `StatusBadge`, `Input`, `Search`, `StatusFilterDropdown`, `RefreshButton`, `TableSkeleton`, `EmptyTableState`, `PageSizeSelector`, `PaginationButtons` |
| **State Names**         | Exact names                | `isLoading`, `searchQuery`, `statusFilter`, `pageSize`, `nextCursor`, `prevCursor`, `hasFetchedRef`                                                    |
| **Handler Names**       | Exact names                | `handleCreateClick`, `handleRowClick`, `handlePageSizeChange`, `handlePrevious`, `handleNext`                                                          |
| **Debounce Time**       | 500ms                      | Always `setTimeout(..., 500)`                                                                                                                          |
| **Default Page Size**   | 10                         | `const DEFAULT_PAGE_SIZE = 10;`                                                                                                                        |
| **Page Size Options**   | [10, 20, 50, 100]          | Never change                                                                                                                                           |
| **Tailwind Classes**    | All styling                | Copy exactly from reference                                                                                                                            |
| **Props Pattern**       | Interface structure        | Same props across all modules                                                                                                                          |
| **useRef Name**         | `hasFetchedRef`            | Prevents duplicate fetches                                                                                                                             |
| **Derived State**       | `tableData`, `headers`     | Always use these names                                                                                                                                 |
| **Empty Message**       | Pattern                    | `No [modules] found` or `No [modules] found matching "[query]"`                                                                                        |

---

## Find & Replace Table

> Use this table to convert the Product reference implementation to any new module.

### 🔍 Exact Substitutions

When creating a new module, perform these **case-sensitive** find & replace operations:

| Find                 | Replace With          | Example               | Notes                   |
| -------------------- | --------------------- | --------------------- | ----------------------- |
| `Product`            | `[YourModule]`        | `Customer`            | PascalCase, singular    |
| `product`            | `[yourModule]`        | `customer`            | camelCase, singular     |
| `products`           | `[yourModules]`       | `customers`           | camelCase, plural       |
| `PRODUCT`            | `[YOUR_MODULE]`       | `CUSTOMER`            | UPPERCASE, for DynamoDB |
| `ProductDto`         | `[Module]Dto`         | `CustomerDto`         | Type definition         |
| `ProductApi`         | `[Module]Api`         | `CustomerApi`         | API service             |
| `ProductHeader`      | `[Module]Header`      | `CustomerHeader`      | Component name          |
| `ProductTable`       | `[Module]Table`       | `CustomerTable`       | Component name          |
| `fetchProducts`      | `fetch[Modules]`      | `fetchCustomers`      | Function name           |
| `productId`          | `[module]Id`          | `customerId`          | Primary key             |
| `productName`        | `[module]Name`        | `customerName`        | Display name field      |
| `/products/product/` | `/[domain]/[module]/` | `/customer/customer/` | Route pattern           |

### 📋 Module-Specific Fields to Replace

These fields are specific to Product module and need module-appropriate replacements:

| Product Field         | Replace With            | Customer Example   | Invoice Example   |
| --------------------- | ----------------------- | ------------------ | ----------------- |
| `productCategoryName` | Module category field   | `customerType`     | `invoiceType`     |
| `productClassName`    | Module classification   | `customerSegment`  | `paymentStatus`   |
| `criticalLevel`       | Module-specific field   | `creditLimit`      | `totalAmount`     |
| `latestActivity`      | Optional activity field | `lastPurchaseDate` | `lastPaymentDate` |

### ⚙️ Backend File Paths

| Product Path                        | Pattern                               | Customer Example                      |
| ----------------------------------- | ------------------------------------- | ------------------------------------- |
| `apps/product/product-api-service/` | `apps/[module]/[module]-api-service/` | `apps/customer/customer-api-service/` |
| `search-products-by-name.query.ts`  | `search-[modules]-by-name.query.ts`   | `search-customers-by-name.query.ts`   |
| `get-products-by-status.query.ts`   | `get-[modules]-by-status.query.ts`    | `get-customers-by-status.query.ts`    |
| `product.service.ts`                | `[module].service.ts`                 | `customer.service.ts`                 |
| `product.database.service.ts`       | `[module].database.service.ts`        | `customer.database.service.ts`        |
| `[module]-database-service`         | Library name pattern                  | `customer-database-service`           |

---

## Optional Features Guide

> Not all modules have the same features. Here's what's optional and when to include it.

### 🎨 Always Required Features

These features **MUST** be implemented in every table list module:

-   ✅ Search functionality
-   ✅ Status filter
-   ✅ Refresh button
-   ✅ Create button (if user has permission)
-   ✅ Table display (desktop + mobile)
-   ✅ Loading state (skeleton)
-   ✅ Empty state
-   ✅ Pagination (prev/next)
-   ✅ Page size selector
-   ✅ Row click navigation

### 📊 Optional/Conditional Features

#### 1. **Activity Log / Latest Activity**

**When to Include**:

-   Modules that track user actions (Product, Customer, Invoice)
-   Modules with audit trail requirements
-   Master data with approval workflows

**When to Exclude**:

-   Simple lookup tables (Categories, Units of Measure)
-   Configuration tables
-   Static reference data

**Implementation**:

```typescript
// INCLUDE if module has activityLogs:
let latestActivity = null;
if (record.activityLogs && record.activityLogs.length > 0) {
    const lastLog = record.activityLogs[record.activityLogs.length - 1];
    const parsed = parseActivityLog(lastLog);
    const activityStyle = getActivityStyle(parsed.activity);
    latestActivity = {
        text: parsed.activity,
        style: activityStyle,
    };
}

// EXCLUDE if module doesn't have activityLogs:
// Simply don't add this field to tableData
```

#### 2. **Category/Classification Fields**

**When to Include**:

-   Modules with hierarchical structure (Product → Category → Class)
-   Modules with grouping needs

**When to Exclude**:

-   Flat data structures
-   Modules without categorization

**Examples**:

```typescript
// Product has both:
productCategoryName;
productClassName;

// Customer might have only one:
customerType;

// Simple modules might have none:
// (just name and status)
```

#### 3. **Additional Filter Dropdowns**

**When to Include**:

-   When users frequently filter by specific fields
-   When backend has GSI for efficient filtering

**When to Exclude**:

-   Keep it simple - only add if truly needed
-   Don't add filters for rarely-used fields

**Example**:

```tsx
// Only if needed:
<CategoryFilterDropdown value={categoryFilter} onChange={onCategoryFilterChange} />
```

#### 4. **Bulk Actions**

**When to Include**:

-   Transactional modules with batch operations
-   When users need to act on multiple records

**When to Exclude**:

-   Master data modules (usually single-record operations)
-   This guide focuses on single-record operations

**Note**: Bulk actions require additional state and UI (checkboxes, action bar) - not covered in this guide.

#### 5. **Export Functionality**

**When to Include**:

-   Reporting requirements
-   User needs to export data to Excel/CSV

**When to Exclude**:

-   Basic CRUD modules
-   When not explicitly required

**Note**: Export is a separate feature - not covered in this guide.

### 🗂️ Column Customization

Every module will have **different columns**. Here's the pattern:

#### Minimum Required Columns

```typescript
// Every module MUST have:
{ key: 'name', label: '[MODULE] NAME' }      // Display name
{ key: 'status', label: 'STATUS' }            // Status badge
```

#### Common Optional Columns

```typescript
// Add based on module needs:
{ key: 'category', label: 'CATEGORY' }
{ key: 'type', label: 'TYPE' }
{ key: 'date', label: 'DATE CREATED' }
{ key: 'amount', label: 'AMOUNT' }
{ key: 'latestActivity', label: 'LATEST ACTIVITY' }
```

#### Example Column Sets

**Product Module** (Complex):

```typescript
const headers = [
    { key: 'productName', label: 'PRODUCT NAME' },
    { key: 'productCategoryName', label: 'CATEGORY' },
    { key: 'productClassName', label: 'CLASS' },
    { key: 'criticalLevel', label: 'CRITICAL LEVEL' },
    { key: 'status', label: 'STATUS' },
    { key: 'latestActivity', label: 'LATEST ACTIVITY' },
];
```

**Customer Module** (Medium):

```typescript
const headers = [
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'phone', label: 'PHONE' },
    { key: 'customerType', label: 'TYPE' },
    { key: 'status', label: 'STATUS' },
];
```

**Category Module** (Simple):

```typescript
const headers = [
    { key: 'categoryName', label: 'CATEGORY NAME' },
    { key: 'description', label: 'DESCRIPTION' },
    { key: 'status', label: 'STATUS' },
];
```

---

---

## 1. Search/Filter Records

### 🧩 Reusable Components

-   **`Input`** from `@components-web`
-   **`Search`** icon from `@components-web`

### 📝 Feature Description

Allows users to search and filter records by name or other text fields. The search:

-   Triggers after 500ms debounce (prevents excessive API calls)
-   Searches in real-time as user types
-   Displays matching records only
-   Resets pagination to first page when search changes
-   Shows "No records found matching 'query'" when no results

### 🔒 Business Rules

-   **ALL USERS** can use the search functionality
-   Search queries are trimmed (leading/trailing spaces removed)
-   Empty search shows all records (respecting status filter)
-   Minimum search length: 0 characters (no restriction)

### 🔌 Backend Integration

#### API Endpoint

```typescript
GET /api/v1/products/search?name={searchQuery}&pageSize={size}&direction={next|prev}&cursor={cursor}&userRole={role}
```

#### Request Parameters

```typescript
{
  name: string;           // Search query
  pageSize: number;       // Number of records per page (10, 20, 50, 100)
  direction?: 'next' | 'prev';  // Pagination direction
  cursor?: string;        // Pagination cursor (JSON stringified)
  userRole?: string;      // User role for filtering (optional)
}
```

#### Response Structure

```typescript
{
  statusCode: 200,
  data: ProductDto[],     // Array of product records
  nextCursorPointer?: any,  // Cursor for next page
  prevCursorPointer?: any,  // Cursor for previous page
}
```

### ⚙️ Backend Implementation

#### Handler (CQRS Command/Query)

**File**: `apps/[module]/[module]-api-service/src/cqrs/queries/search-products-by-name.query.ts`

```typescript
export class SearchProductsByNameQuery implements IQuery {
    constructor(
        public readonly name: string,
        public readonly pageSize: number,
        public readonly direction?: 'next' | 'prev',
        public readonly cursor?: any,
        public readonly userRole?: string
    ) {}
}
```

#### Query Handler

**File**: `apps/[module]/[module]-api-service/src/cqrs/query-handlers/search-products-by-name.handler.ts`

```typescript
@QueryHandler(SearchProductsByNameQuery)
export class SearchProductsByNameHandler implements IQueryHandler<SearchProductsByNameQuery> {
    constructor(private readonly productService: ProductService) {}

    async execute(query: SearchProductsByNameQuery): Promise<any> {
        return await this.productService.searchByName(
            query.name,
            query.pageSize,
            query.direction,
            query.cursor,
            query.userRole
        );
    }
}
```

#### Service Method

**File**: `apps/[module]/[module]-api-service/src/services/product.service.ts`

```typescript
async searchByName(
    name: string,
    pageSize: number,
    direction?: 'next' | 'prev',
    cursor?: any,
    userRole?: string
): Promise<{ data: ProductDto[], nextCursorPointer?: any, prevCursorPointer?: any }> {
    // Call database service
    const result = await this.productDatabaseService.searchByName(
        name,
        pageSize,
        direction,
        cursor,
        userRole
    );

    // Transform to DTOs
    return {
        data: result.items.map(item => this.toDto(item)),
        nextCursorPointer: result.nextCursor,
        prevCursorPointer: result.prevCursor
    };
}
```

#### Database Service

**File**: `libs/backend/database-services/[module]-database-service/src/lib/product.database.service.ts`

```typescript
async searchByName(
    name: string,
    pageSize: number,
    direction?: 'next' | 'prev',
    cursor?: any,
    userRole?: string
): Promise<{ items: ProductEntity[], nextCursor?: any, prevCursor?: any }> {
    const params: QueryCommandInput = {
        TableName: this.tableName,
        IndexName: 'GSI3', // Global Secondary Index for name search
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :name)',
        ExpressionAttributeValues: {
            ':pk': 'PRODUCT',
            ':name': name.toUpperCase(),
        },
        Limit: pageSize,
        ScanIndexForward: direction === 'prev' ? false : true,
    };

    if (cursor) {
        params.ExclusiveStartKey = JSON.parse(cursor);
    }

    const result = await this.dynamoDbClient.send(new QueryCommand(params));

    return {
        items: result.Items?.map(item => this.toDomain(item)) || [],
        nextCursor: result.LastEvaluatedKey,
        prevCursor: cursor,
    };
}
```

#### Schema (DynamoDB)

**Table**: `[Environment]-[Module]-Table`  
**GSI3**: For name-based searches

```typescript
{
  PK: "PRODUCT",                    // Partition Key
  SK: "PRODUCT#NAME#{UPPERCASE_NAME}#ID#{PRODUCT_ID}",  // Sort Key
  GSI3PK: "PRODUCT",               // GSI3 Partition Key
  GSI3SK: "{UPPERCASE_NAME}",      // GSI3 Sort Key for searching
  productId: string,
  productName: string,
  status: StatusEnum,
  // ... other fields
}
```

### 🎨 UI/UX Implementation

#### Component Usage

```tsx
import { Input, Search } from '@components-web';

<Input
    placeholder="Filter products"
    value={searchQuery}
    onChange={(value) => setSearchQuery((value as string) ?? '')}
    leftIcon={Search}
/>;
```

#### Styling (Tailwind)

```tsx
<div className="flex-1">
    {' '}
    {/* Takes full width in flex container */}
    <Input placeholder="Filter products" value={searchQuery} onChange={onSearchChange} leftIcon={Search} />
</div>
```

#### Debounce Logic (page.tsx)

```typescript
useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length === 0) {
        fetchProducts();
        return;
    }

    const timer = setTimeout(() => {
        fetchProducts();
    }, 500);

    return () => clearTimeout(timer);
}, [searchQuery]);
```

---

## 2. Status Filter

### 🧩 Reusable Components

-   **`StatusFilterDropdown`** from `@components-web`

### 📝 Feature Description

Allows users to filter records by their status (ACTIVE, INACTIVE, FOR_APPROVAL, etc.):

-   Dropdown shows all available status options
-   "All" option shows records of any status
-   Admin-only statuses (FOR_DELETION, FOR_DEACTIVATION) are visible only to admin users
-   Changing filter resets pagination to first page
-   Backend filtering via GSI2 for efficiency

### 🔒 Business Rules

-   **ALL USERS** can filter by: ALL, ACTIVE, INACTIVE, FOR_APPROVAL, NEW_RECORD, DRAFT
-   **ADMIN USERS ONLY** can filter by: FOR_DELETION, FOR_DEACTIVATION
-   Default filter: "ALL" (shows all statuses user has access to)
-   Filter persists during search
-   Filter changes trigger immediate data refresh

### 🔌 Backend Integration

#### API Endpoint

```typescript
GET /api/v1/products/status/{status}?pageSize={size}&direction={next|prev}&cursor={cursor}&userRole={role}
```

#### Request Parameters

```typescript
{
  status: StatusEnum;     // Status to filter by
  pageSize: number;       // Number of records per page
  direction?: 'next' | 'prev';
  cursor?: string;
  userRole?: string;
}
```

#### Response Structure

```typescript
{
  statusCode: 200,
  data: ProductDto[],
  nextCursorPointer?: any,
  prevCursorPointer?: any,
}
```

### ⚙️ Backend Implementation

#### Query

**File**: `apps/[module]/[module]-api-service/src/cqrs/queries/get-products-by-status.query.ts`

```typescript
export class GetProductsByStatusQuery implements IQuery {
    constructor(
        public readonly status: StatusEnum,
        public readonly pageSize: number,
        public readonly direction?: 'next' | 'prev',
        public readonly cursor?: any,
        public readonly userRole?: string
    ) {}
}
```

#### Query Handler

```typescript
@QueryHandler(GetProductsByStatusQuery)
export class GetProductsByStatusHandler implements IQueryHandler<GetProductsByStatusQuery> {
    constructor(private readonly productService: ProductService) {}

    async execute(query: GetProductsByStatusQuery): Promise<any> {
        return await this.productService.getByStatus(
            query.status,
            query.pageSize,
            query.direction,
            query.cursor,
            query.userRole
        );
    }
}
```

#### Service Method

```typescript
async getByStatus(
    status: StatusEnum,
    pageSize: number,
    direction?: 'next' | 'prev',
    cursor?: any,
    userRole?: string
): Promise<{ data: ProductDto[], nextCursorPointer?: any, prevCursorPointer?: any }> {
    const result = await this.productDatabaseService.getByStatus(
        status,
        pageSize,
        direction,
        cursor,
        userRole
    );

    return {
        data: result.items.map(item => this.toDto(item)),
        nextCursorPointer: result.nextCursor,
        prevCursorPointer: result.prevCursor
    };
}
```

#### Database Service

```typescript
async getByStatus(
    status: StatusEnum,
    pageSize: number,
    direction?: 'next' | 'prev',
    cursor?: any,
    userRole?: string
): Promise<{ items: ProductEntity[], nextCursor?: any, prevCursor?: any }> {
    const params: QueryCommandInput = {
        TableName: this.tableName,
        IndexName: 'GSI2',  // Global Secondary Index for status filtering
        KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :status)',
        ExpressionAttributeValues: {
            ':pk': 'PRODUCT',
            ':status': `STATUS#${status}`,
        },
        Limit: pageSize,
        ScanIndexForward: direction === 'prev' ? false : true,
    };

    if (cursor) {
        params.ExclusiveStartKey = JSON.parse(cursor);
    }

    const result = await this.dynamoDbClient.send(new QueryCommand(params));

    return {
        items: result.Items?.map(item => this.toDomain(item)) || [],
        nextCursor: result.LastEvaluatedKey,
        prevCursor: cursor,
    };
}
```

#### Schema (DynamoDB GSI2)

```typescript
{
  PK: "PRODUCT#{PRODUCT_ID}",
  SK: "METADATA",
  GSI2PK: "PRODUCT",
  GSI2SK: "STATUS#{STATUS}#ID#{PRODUCT_ID}",
  productId: string,
  status: StatusEnum,
  // ... other fields
}
```

### 🎨 UI/UX Implementation

#### Component Usage

```tsx
import { StatusFilterDropdown } from '@components-web';

<StatusFilterDropdown
    value={statusFilter}
    onChange={onStatusFilterChange}
    showAdminOptions={true}
    isAdminUser={isAdminUser}
/>;
```

#### Styling (Tailwind)

-   Uses built-in component styling
-   Width: Auto-adjusts based on content
-   Consistent with other dropdowns in the system

---

## 3. Refresh Button

### 🧩 Reusable Components

-   **`RefreshButton`** from `@components-web`

### 📝 Feature Description

Allows users to manually refresh the table data:

-   Shows spinning animation during data fetch
-   Refetches current page with current filters
-   Does not reset search, status filter, or pagination
-   Provides visual feedback (loading state)

### 🔒 Business Rules

-   **ALL USERS** can click the refresh button
-   Button is disabled during loading (prevents multiple simultaneous requests)
-   Refreshes using current state (same page, same filters)
-   Does not change pagination cursor position

### 🔌 Backend Integration

-   Uses the same API endpoints as initial data load
-   Respects current search query and status filter
-   Maintains current pagination position

### 🎨 UI/UX Implementation

#### Component Usage

```tsx
import { RefreshButton } from '@components-web';

<RefreshButton onClick={onRefresh} isLoading={isLoading} />;
```

#### Features

-   Size: Medium (default)
-   Icon: Rotating arrow
-   Animation: Spins during `isLoading`
-   Disabled: When `isLoading === true`

---

## 4. Create New Button

### 🧩 Reusable Components

-   **`Add`** icon from `@components-web`
-   Custom button with consistent styling

### 📝 Feature Description

Allows users to navigate to the create form for new records:

-   Displayed in the header section
-   Navigates to `/[domain]/[module]/create` route
-   Visible only when user has CREATE permission
-   Consistent styling across all modules

### 🔒 Business Rules

-   **PERMISSION-BASED**: Only users with CREATE permission see this button
-   Button visibility controlled by `canCreate` prop
-   Admins typically have CREATE permission by default
-   Regular users may or may not have CREATE permission based on role configuration
-   Clicking navigates to create page (does not open modal)

### 🔌 Backend Integration

-   No direct API call
-   Navigation only: `router.push('/products/product/create')`

### 🎨 UI/UX Implementation

#### Component Usage

```tsx
import { Add } from '@components-web';

{
    canCreate && (
        <button
            type="button"
            onClick={onCreateClick}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
            <Add size={18} />
            New product
        </button>
    );
}
```

#### Styling Details

-   **Background**: `bg-blue-600`
-   **Hover**: `hover:bg-blue-700`
-   **Text**: `text-white`, `text-sm`, `font-semibold`
-   **Padding**: `px-4 py-2`
-   **Rounded**: `rounded-md`
-   **Icon**: `<Add size={18} />`
-   **Gap**: `gap-2` (between icon and text)
-   **Focus ring**: `focus:ring-2 focus:ring-blue-500`
-   **Responsive**: `w-full` on mobile, `sm:w-auto` on desktop
-   Handle loading and empty states
-   Display pagination controls

**Props Interface**:

```typescript
interface ModuleTableProps {
    records: Record[];
    loading: boolean;
    onEdit: (id: string) => void;
    onDelete: (record: Record) => void;
    isAdminUser: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}
```

**Required Features**:

-   Status badge with color coding
-   Edit button (visible for all records)
-   Delete button (visible based on status and user role)
-   Loading skeleton
-   Empty state message
-   Pagination controls

---

## 🔧 Implementation Details

### Page Component Implementation

**File**: `page.tsx`

````typescript
// TO BE DOCUMENTED:
// - Complete page component structure
---

## Complete Code Templates

> **Copy these templates exactly** and replace placeholders with your module-specific values.

### Template 1: page.tsx (Main Page Component)

```typescript
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '@components-web';
import { [MODULE]Api, [MODULE]Dto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils'; // OPTIONAL: Only if module has activity logs
import { useRouter } from 'next/navigation';
import { [MODULE]Header, [MODULE]Table } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function [MODULE]sMainPage() {
    // ============================================================================
    // STATE MANAGEMENT (Keep names exactly as shown)
    // ============================================================================
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [[modules], set[MODULES]] = useState<[MODULE]Dto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<any>();
    const [prevCursor, setPrevCursor] = useState<any>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    // ============================================================================
    // FETCH FUNCTION (Replace [MODULE] and [modules] placeholders)
    // ============================================================================
    const fetch[MODULES] = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const currentPageSize = customPageSize ?? pageSize;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;
            const trimmedQuery = searchQuery.trim();
            let response;

            // Search by name
            if (trimmedQuery.length > 0) {
                response = await [MODULE]Api.get[MODULES]ByName(
                    trimmedQuery,
                    currentPageSize,
                    direction,
                    serializedCursor,
                    userRole
                );
            } else {
                // Filter by status or get all
                if (statusFilter !== 'ALL') {
                    response = await [MODULE]Api.get[MODULES]ByStatus(
                        currentPageSize,
                        statusFilter,
                        direction,
                        serializedCursor,
                        userRole
                    );
                } else {
                    response = await [MODULE]Api.get[MODULES](
                        currentPageSize,
                        undefined,
                        direction,
                        serializedCursor,
                        userRole
                    );
                }
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                set[MODULES](response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                set[MODULES]([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load [modules]. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================================
    // EFFECTS (Keep as-is, just replace function name)
    // ============================================================================

    // Initial fetch (once)
    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;
        fetch[MODULES]();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    // Search debounce (500ms)
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetch[MODULES]();
            return;
        }

        const timer = setTimeout(() => {
            fetch[MODULES]();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetch[MODULES]();
    }, [statusFilter]);

    // ============================================================================
    // DERIVED STATE (Customize columns but keep 'headers' and 'tableData' names)
    // ============================================================================

    const headers = useMemo(
        () => [
            { key: '[module]Name', label: '[MODULE] NAME' },
            // ADD MODULE-SPECIFIC COLUMNS HERE
            // Examples:
            // { key: 'email', label: 'EMAIL' },
            // { key: 'phone', label: 'PHONE' },
            // { key: '[module]CategoryName', label: 'CATEGORY' },
            { key: 'status', label: 'STATUS' },
            // OPTIONAL: Only if module has activity logs
            // { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            [modules].map(([module]) => {
                // OPTIONAL: Only if module has activity logs
                // let latestActivity = null;
                // if ([module].activityLogs && [module].activityLogs.length > 0) {
                //     const lastLog = [module].activityLogs[[module].activityLogs.length - 1];
                //     const parsed = parseActivityLog(lastLog);
                //     const activityStyle = getActivityStyle(parsed.activity);
                //     latestActivity = {
                //         text: parsed.activity,
                //         style: activityStyle,
                //     };
                // }

                return {
                    ...[module],
                    status: <StatusBadge status={[module].status ?? StatusEnum.ACTIVE} />,
                    // OPTIONAL: Only if module has activity logs
                    // latestActivity,
                };
            }),
        [[modules]]
    );

    // ============================================================================
    // HANDLERS (Keep names exactly as shown, just replace routes)
    // ============================================================================

    const handleCreateClick = () => {
        router.push('/[domain]/[module]/create');
    };

    const handleRowClick = ([module]: [MODULE]Dto) => {
        router.push(`/[domain]/[module]/${[module].[module]Id}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetch[MODULES](undefined, undefined, size);
    };

    // ============================================================================
    // RENDER (Keep structure exactly as shown)
    // ============================================================================

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header Component */}
            <[MODULE]Header
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                onRefresh={() => fetch[MODULES]()}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}  // TODO: Replace with actual permission check
                isAdminUser={authedUser?.userRole === 'ADMIN'}
            />

            {/* Table Component */}
            <[MODULE]Table
                isLoading={isLoading}
                tableData={tableData}
                headers={headers}
                searchQuery={searchQuery}
                onRowClick={handleRowClick}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={() => fetch[MODULES]('prev', prevCursor)}
                onNext={() => fetch[MODULES]('next', nextCursor)}
            />
        </div>
    );
}
````

**Placeholders to Replace**:

-   `[MODULE]` → Your module name in PascalCase (e.g., `Customer`, `Invoice`)
-   `[MODULES]` → Your module name in PascalCase plural (e.g., `Customers`, `Invoices`)
-   `[modules]` → Your module name in camelCase plural (e.g., `customers`, `invoices`)
-   `[module]` → Your module name in camelCase (e.g., `customer`, `invoice`)
-   `[domain]` → Your domain/folder name (e.g., `customer`, `inventory`)
-   Uncomment activity log sections if your module has them
-   Replace column definitions in `headers`
-   Update route paths in handlers

---

### Template 2: [Module]Header.tsx

```typescript
'use client';

import { Add, Input, RefreshButton, Search, StatusFilterDropdown } from '@components-web';

interface [MODULE]HeaderProps {
    searchQuery: string;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    isLoading?: boolean;
    canCreate?: boolean;
    isAdminUser?: boolean;
}

export default function [MODULE]Header({
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    isLoading = false,
    canCreate = true,
    isAdminUser = false,
}: [MODULE]HeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    {/* Search Input */}
                    <div className="flex-1">
                        <Input
                            placeholder="Filter [modules]"
                            value={searchQuery}
                            onChange={(value) => onSearchChange((value as string) ?? '')}
                            leftIcon={Search}
                        />
                    </div>

                    {/* Status Filter */}
                    <StatusFilterDropdown
                        value={statusFilter}
                        onChange={onStatusFilterChange}
                        showAdminOptions={true}
                        isAdminUser={isAdminUser}
                    />

                    {/* Refresh Button */}
                    <RefreshButton onClick={onRefresh} isLoading={isLoading} />
                </div>

                {/* Create Button */}
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Add size={18} />
                        New [module]
                    </button>
                )}
            </div>
        </div>
    );
}
```

**Placeholders to Replace**:

-   `[MODULE]` → `Customer`, `Invoice`, etc.
-   `[modules]` → `customers`, `invoices`, etc.
-   `[module]` → `customer`, `invoice`, etc.

**DO NOT CHANGE**:

-   Component imports
-   Props interface structure
-   Tailwind classes
-   Component usage patterns

---

### Template 3: [Module]Table.tsx

```typescript
'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { [MODULE]Dto } from '@data-access/index';
import { ReactNode } from 'react';

type [MODULE]TableRow = [MODULE]Dto & { status: ReactNode };

interface [MODULE]TableProps {
    isLoading: boolean;
    tableData: [MODULE]TableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: ([module]: [MODULE]Dto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: any;
    nextCursor: any;
    onPrevious: () => void;
    onNext: () => void;
}

// ============================================================================
// HELPER FUNCTIONS (Add module-specific formatters here if needed)
// ============================================================================

// Example: Format numeric fields
// const formatCriticalLevel = (level?: number | null): string => {
//     if (level === undefined || level === null) return '-';
//     return level.toString();
// };

// Example: Format currency
// const formatAmount = (amount?: number | null): string => {
//     if (amount === undefined || amount === null) return '-';
//     return new Intl.NumberFormat('en-US', {
//         style: 'currency',
//         currency: 'USD',
//     }).format(amount);
// };

export default function [MODULE]Table({
    isLoading,
    tableData,
    headers,
    searchQuery,
    onRowClick,
    pageSize,
    onPageSizeChange,
    prevCursor,
    nextCursor,
    onPrevious,
    onNext,
}: [MODULE]TableProps) {
    return (
        <>
            {/* ================================================================ */}
            {/* DESKTOP TABLE */}
            {/* ================================================================ */}
            {isLoading ? (
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
            ) : (
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            {/* Table Header */}
                            <thead className="bg-blue-600 border-b border-blue-700">
                                <tr>
                                    {headers.map((header) => (
                                        <th
                                            key={header.key}
                                            className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider"
                                        >
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableData.length > 0 ? (
                                    tableData.map(([module]) => (
                                        <tr
                                            key={[module].[module]Id}
                                            onClick={() => onRowClick([module])}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            {/* Column: Name */}
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {[module].[module]Name || '-'}
                                            </td>

                                            {/* ADD MODULE-SPECIFIC COLUMNS HERE */}
                                            {/* Example for category:
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {[module].[module]CategoryName || '-'}
                                            </td>
                                            */}

                                            {/* Column: Status (Always included) */}
                                            <td className="px-6 py-5">{[module].status}</td>

                                            {/* Column: Latest Activity (OPTIONAL) */}
                                            {/* Uncomment if module has latestActivity:
                                            <td className="px-6 py-5 text-sm">
                                                {[module].latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${[module].latestActivity.style.bgColor} ${[module].latestActivity.style.textColor}`}
                                                        title={[module].latestActivity.text}
                                                    >
                                                        {[module].latestActivity.text.length > 50
                                                            ? `${[module].latestActivity.text.substring(0, 50)}...`
                                                            : [module].latestActivity.text}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={headers.length}>
                                            <EmptyTableState
                                                message={
                                                    searchQuery
                                                        ? `No [modules] found matching "${searchQuery}"`
                                                        : 'No [modules] found'
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* DESKTOP PAGINATION */}
            {/* ================================================================ */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                    variant="desktop"
                />
            </div>

            {/* ================================================================ */}
            {/* MOBILE CARDS */}
            {/* ================================================================ */}
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length > 0 ? (
                        tableData.map(([module]) => (
                            <button
                                key={[module].[module]Id}
                                onClick={() => onRowClick([module])}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 text-left"
                            >
                                {/* Card Header */}
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">
                                        {[module].[module]Name || '-'}
                                    </h3>
                                    {[module].status}
                                </div>

                                {/* Card Details */}
                                <div className="text-sm text-gray-600">
                                    {/* ADD MODULE-SPECIFIC FIELDS HERE */}
                                    {/* Example:
                                    <div>Email: {[module].email || '-'}</div>
                                    <div>Phone: {[module].phone || '-'}</div>
                                    <div>Type: {[module].[module]Type || '-'}</div>
                                    */}
                                </div>

                                {/* Card Activity (OPTIONAL) */}
                                {/* Uncomment if module has latestActivity:
                                {[module].latestActivity && (
                                    <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">
                                            Latest Activity:{' '}
                                        </span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${[module].latestActivity.style.bgColor} ${[module].latestActivity.style.textColor}`}
                                        >
                                            {[module].latestActivity.text.length > 60
                                                ? `${[module].latestActivity.text.substring(0, 60)}...`
                                                : [module].latestActivity.text}
                                        </span>
                                    </div>
                                )}
                                */}
                            </button>
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-8">
                            <EmptyTableState
                                message={
                                    searchQuery
                                        ? `No [modules] found matching "${searchQuery}"`
                                        : 'No [modules] found'
                                }
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================ */}
            {/* MOBILE PAGINATION */}
            {/* ================================================================ */}
            {!isLoading && (
                <div className="sm:hidden flex flex-col gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                    <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                    <PaginationButtons
                        onPrevious={onPrevious}
                        onNext={onNext}
                        hasPrevious={!!prevCursor}
                        hasNext={!!nextCursor}
                        variant="mobile"
                    />
                </div>
            )}
        </>
    );
}
```

**Placeholders to Replace**:

-   `[MODULE]` → `Customer`, `Invoice`, etc.
-   `[modules]` → `customers`, `invoices`, etc.
-   `[module]` → `customer`, `invoice`, etc.
-   Add module-specific columns in desktop table
-   Add module-specific fields in mobile cards
-   Uncomment activity log sections if needed
-   Add helper functions for formatting (currency, dates, etc.)

**DO NOT CHANGE**:

-   Component imports
-   Props interface structure
-   Section comments
-   Tailwind classes
-   Component usage patterns
-   Skeleton/empty state implementations

---

## Column Definition Patterns

> Customize table columns based on module type while maintaining consistency.

### 🎯 Column Definition Rules

1. **First Column**: Always the primary name/identifier field
2. **Last Column**: Always status badge
3. **Middle Columns**: Module-specific fields (category, email, amount, etc.)
4. **Optional Last**: Latest Activity (only if module tracks it)

### 📋 Column Examples by Module Type

#### Simple Master Data (Categories, Units, etc.)

```typescript
const headers = useMemo(
    () => [
        { key: 'categoryName', label: 'CATEGORY NAME' },
        { key: 'description', label: 'DESCRIPTION' },
        { key: 'status', label: 'STATUS' },
    ],
    []
);
```

**Table Cells**:

```tsx
<td className="px-6 py-5 text-sm font-medium text-gray-900">
    {category.categoryName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {category.description || '-'}
</td>
<td className="px-6 py-5">{category.status}</td>
```

---

#### Contact-Based Modules (Customers, Suppliers, etc.)

```typescript
const headers = useMemo(
    () => [
        { key: 'customerName', label: 'CUSTOMER NAME' },
        { key: 'email', label: 'EMAIL' },
        { key: 'phone', label: 'PHONE' },
        { key: 'customerType', label: 'TYPE' },
        { key: 'status', label: 'STATUS' },
    ],
    []
);
```

**Table Cells**:

```tsx
<td className="px-6 py-5 text-sm font-medium text-gray-900">
    {customer.customerName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {customer.email || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {customer.phone || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {customer.customerType || '-'}
</td>
<td className="px-6 py-5">{customer.status}</td>
```

---

#### Hierarchical Modules (Products with Category/Class)

```typescript
const headers = useMemo(
    () => [
        { key: 'productName', label: 'PRODUCT NAME' },
        { key: 'productCategoryName', label: 'CATEGORY' },
        { key: 'productClassName', label: 'CLASS' },
        { key: 'criticalLevel', label: 'CRITICAL LEVEL' },
        { key: 'status', label: 'STATUS' },
        { key: 'latestActivity', label: 'LATEST ACTIVITY' },
    ],
    []
);
```

**Table Cells**:

```tsx
<td className="px-6 py-5 text-sm font-medium text-gray-900">
    {product.productName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {product.productCategoryName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {product.productClassName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {formatCriticalLevel(product.criticalLevel)}
</td>
<td className="px-6 py-5">{product.status}</td>
<td className="px-6 py-5 text-sm">
    {/* Activity log cell - see Template 3 */}
</td>
```

---

#### Financial Modules (Invoices, Payments, etc.)

```typescript
const headers = useMemo(
    () => [
        { key: 'invoiceNumber', label: 'INVOICE #' },
        { key: 'customerName', label: 'CUSTOMER' },
        { key: 'invoiceDate', label: 'DATE' },
        { key: 'totalAmount', label: 'AMOUNT' },
        { key: 'paymentStatus', label: 'PAYMENT STATUS' },
        { key: 'status', label: 'STATUS' },
    ],
    []
);
```

**Table Cells** (with formatters):

```tsx
// Add helper function:
const formatCurrency = (amount?: number | null): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDate = (date?: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US');
};

// Table cells:
<td className="px-6 py-5 text-sm font-medium text-gray-900">
    {invoice.invoiceNumber || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {invoice.customerName || '-'}
</td>
<td className="px-6 py-5 text-sm text-gray-600">
    {formatDate(invoice.invoiceDate)}
</td>
<td className="px-6 py-5 text-sm font-semibold text-gray-900">
    {formatCurrency(invoice.totalAmount)}
</td>
<td className="px-6 py-5 text-sm">
    <span className={`px-2 py-1 rounded text-xs ${getPaymentStatusColor(invoice.paymentStatus)}`}>
        {invoice.paymentStatus}
    </span>
</td>
<td className="px-6 py-5">{invoice.status}</td>
```

---

### 🎨 Column Cell Styling Guide

**Text Styling by Column Type**:

```tsx
// Primary identifier (first column) - Bold, larger:
<td className="px-6 py-5 text-sm font-medium text-gray-900">

// Secondary text columns - Regular weight:
<td className="px-6 py-5 text-sm text-gray-600">

// Numeric columns (amounts, counts) - Bold:
<td className="px-6 py-5 text-sm font-semibold text-gray-900">

// Status badge column - No text styling (component handles it):
<td className="px-6 py-5">

// Activity/Notes column - Smaller text:
<td className="px-6 py-5 text-sm">
```

**Padding**: Always use `px-6 py-5` for consistency

**Text Color**:

-   `text-gray-900` - Primary/important text
-   `text-gray-600` - Secondary text
-   `text-gray-400` - Placeholder/empty state ("-")

---

// TO BE DOCUMENTED:

Typical columns include:

-   Document Number
-   Date
-   Customer/Supplier
-   Amount
-   Status (badge)
-   Actions (Edit, Delete buttons)

---

## 🎨 Styling Standards

### Search Input

```typescript
// TO BE DOCUMENTED:
// - Tailwind classes
// - Full width with flex-1
// - Border radius
// - Focus states
```

### Status Filter Dropdown

```typescript
// TO BE DOCUMENTED:
// - Width: w-48
// - Border radius: rounded-xl
// - Options list
// - Selected state styling
```

### Table Styling

```typescript
// TO BE DOCUMENTED:
// - Table borders
// - Row hover effects
// - Column widths
// - Responsive patterns
// - Mobile view considerations
```

---

## ✅ Verification Checklist

### Page Component

-   [ ] State initialized correctly?
-   [ ] useEffect fetches data on mount?
-   [ ] useEffect re-fetches on filter/search changes?
-   [ ] Loading state handled?
-   [ ] Error state handled?
-   [ ] Pagination state managed?

### Header Component

-   [ ] Search input full-width (no max-width)?
-   [ ] Status filter shows all options (ALL, ACTIVE, INACTIVE, FOR_APPROVAL, FOR_DEACTIVATION, NEW_RECORD)?
-   [ ] CREATE button visible when `canCreate === true`?
-   [ ] CREATE button hidden when `canCreate === false`?
-   [ ] All event handlers wired correctly?

### Table Component

-   [ ] All required columns displayed?
-   [ ] Status badge shows correct color?
-   [ ] Edit button visible for all records?
-   [ ] Delete button visible only for appropriate statuses?
-   [ ] Loading skeleton displays while loading?
-   [ ] Empty state shows when no records?
-   [ ] Pagination controls functional?

### Functionality

-   [ ] Search filters records?
-   [ ] Status filter works correctly?
-   [ ] Pagination changes page?
-   [ ] CREATE button navigates to create page?
-   [ ] Edit button navigates to edit page?
-   [ ] Delete shows confirmation modal?

---

## ❌ Common Mistakes

### Search Input

-   ❌ Adding max-width constraint (should be full-width with flex-1)
-   ❌ Not debouncing search input (causes too many API calls)
-   ❌ Not clearing search on component unmount

### Status Filter

-   ❌ Missing status options (must include all 6: ALL, ACTIVE, INACTIVE, FOR_APPROVAL, FOR_DEACTIVATION, NEW_RECORD)
-   ❌ Not defaulting to 'ALL'
-   ❌ Not handling 'ALL' in backend query

### Table

-   ❌ Not showing loading state (shows empty table while loading)
-   ❌ Not handling empty state (shows table headers with no data message)
-   ❌ Hardcoding pagination (should use API response)
-   ❌ Not disabling pagination buttons at boundaries

### Permissions

-   ❌ Restricting CREATE to admins only (should be `canCreate = true` for all users)
-   ❌ Showing DELETE for all statuses (should check status and role)

---

## 🔗 Related Features

-   [FEATURE_STATUS_FILTER.md](FEATURE_STATUS_FILTER.md) - Status filtering implementation (to be created)
-   [FEATURE_CREATE_PERMISSIONS.md](FEATURE_CREATE_PERMISSIONS.md) - Create button permissions (to be created)
-   [FEATURE_DELETE.md](FEATURE_DELETE.md) - Delete with confirmation modal (to be created)

---

## 📝 Implementation Notes

## 🚀 Quick Start Guide

### Step-by-Step Implementation

1. **Read Documentation**

    - Read this complete guide
    - Check [MODULE_IMPLEMENTATION_GUIDE.md](../MODULE_IMPLEMENTATION_GUIDE.md) for mandatory features
    - Review Products module as reference implementation

2. **Create Components** (in order)

    - Start with `page.tsx` (state management and data fetching)
    - Create `[Module]Header.tsx` (search, filter, create button)
    - Create `[Module]Table.tsx` (data display, pagination)

3. **Backend Setup**

    - Create CQRS queries (GetAll, SearchByName, GetByStatus)
    - Create query handlers
    - Implement service methods
    - Create database service methods
    - Define DynamoDB schema with GSIs

4. **Testing**
    - Test desktop and mobile views
    - Test all loading states
    - Test empty states
    - Verify search debounce (500ms)
    - Verify pagination
    - Test status filtering
    - Verify permissions

---

## 📚 Reference Implementation

**Complete working example**: [apps/web-app/src/app/(authenticated-routes)/products/product](<apps/web-app/src/app/(authenticated-routes)/products/product>)

Files to review:

-   [page.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/page.tsx>) - Main page component
-   [ProductHeader.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/components/ProductHeader.tsx>) - Header implementation
-   [ProductTable.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/components/ProductTable.tsx>) - Table implementation

---

## 🎓 Tips and Best Practices

### Performance

-   ✅ Always use debounce for search (500ms minimum)
-   ✅ Use backend filtering via GSI when possible
-   ✅ Implement cursor-based pagination (not offset-based)
-   ✅ Serialize cursors as JSON strings for API transport

### User Experience

-   ✅ Show skeleton loading states (don't show blank screens)
-   ✅ Differentiate empty vs. no search results messages
-   ✅ Disable buttons during loading to prevent double-clicks
-   ✅ Reset pagination when changing filters or search
-   ✅ Maintain state during refresh (don't reset filters)

### Code Quality

-   ✅ Use reusable components from @components-web (don't recreate)
-   ✅ Keep components focused (Header, Table, Page responsibilities clear)
-   ✅ Use useMemo for expensive transformations (status badges, etc.)
-   ✅ Use useRef to prevent duplicate initial fetches
-   ✅ Handle all error states gracefully

### Accessibility

-   ✅ Use semantic HTML (`<table>`, `<button>`, etc.)
-   ✅ Include proper ARIA labels where needed
-   ✅ Ensure keyboard navigation works
-   ✅ Maintain focus management during interactions

---

## 🔧 Troubleshooting

### Search not working

-   Check debounce timer (500ms)
-   Verify API endpoint includes search parameter
-   Check GSI3 configuration in DynamoDB
-   Verify uppercase conversion in search query

### Pagination issues

-   Ensure cursors are properly serialized/deserialized (JSON.stringify/parse)
-   Check ScanIndexForward direction for prev/next
-   Verify ExclusiveStartKey is set correctly
-   Reset cursors when changing filters

### Status filter not working

-   Check GSI2 configuration
-   Verify admin-only statuses are conditionally shown
-   Ensure status filter triggers data refetch
-   Check KeyConditionExpression syntax

### Mobile view issues

-   Verify responsive classes (`hidden sm:block`, `sm:hidden`)
-   Check mobile card structure matches desktop table data
-   Ensure mobile pagination is separate from desktop
-   Test TableSkeleton on mobile with `columns={1}`

---

## 📋 Complete Implementation Checklist

### Frontend Components

-   [ ] `page.tsx` created with all required state
-   [ ] `[Module]Header.tsx` created with search, filter, create button
-   [ ] `[Module]Table.tsx` created with desktop and mobile views
-   [ ] All reusable components imported from `@components-web`
-   [ ] StatusBadge used for status display (not custom badges)
-   [ ] TableSkeleton shown during loading (desktop and mobile)
-   [ ] EmptyTableState shown when no data
-   [ ] PaginationButtons used for prev/next navigation
-   [ ] PageSizeSelector allows changing rows per page
-   [ ] RefreshButton refetches current view
-   [ ] StatusFilterDropdown with admin options
-   [ ] Search Input with Search icon

### State Management

-   [ ] `isLoading` state for loading indicator
-   [ ] `searchQuery` state with debounce (500ms)
-   [ ] `statusFilter` state (default: 'ALL')
-   [ ] `records` state for table data
-   [ ] `nextCursor` and `prevCursor` for pagination
-   [ ] `pageSize` state (default: 10)
-   [ ] `hasFetchedRef` to prevent duplicate initial fetch

### API Integration

-   [ ] GetAll endpoint implemented
-   [ ] SearchByName endpoint implemented
-   [ ] GetByStatus endpoint implemented
-   [ ] Request includes pageSize, direction, cursor, userRole
-   [ ] Response includes data, nextCursorPointer, prevCursorPointer
-   [ ] Error handling for failed requests
-   [ ] Loading states before/after API calls

### Backend (CQRS)

-   [ ] GetProductsQuery created
-   [ ] GetProductsHandler created
-   [ ] SearchProductsByNameQuery created
-   [ ] SearchProductsByNameHandler created
-   [ ] GetProductsByStatusQuery created
-   [ ] GetProductsByStatusHandler created

### Service Layer

-   [ ] `getAll()` method implemented
-   [ ] `searchByName()` method implemented
-   [ ] `getByStatus()` method implemented
-   [ ] DTO transformation (toDto) implemented
-   [ ] Error handling in service methods

### Database Layer

-   [ ] Database service methods created
-   [ ] QueryCommand properly configured
-   [ ] GSI2 used for status filtering
-   [ ] GSI3 used for name searching
-   [ ] Cursor-based pagination implemented
-   [ ] ExclusiveStartKey handling
-   [ ] LastEvaluatedKey returned as cursor

### DynamoDB Schema

-   [ ] Main table structure defined
-   [ ] PK and SK patterns documented
-   [ ] GSI2 (status filter) configured
-   [ ] GSI2PK and GSI2SK patterns defined
-   [ ] GSI3 (name search) configured
-   [ ] GSI3PK and GSI3SK patterns defined

### Styling & UX

-   [ ] Desktop table with proper styling
-   [ ] Mobile card view implemented
-   [ ] Responsive breakpoints (sm:) used correctly
-   [ ] Hover states on clickable elements
-   [ ] Loading animations smooth
-   [ ] Empty states clear and helpful
-   [ ] Buttons have proper disabled states
-   [ ] Focus states for keyboard navigation

### Testing

-   [ ] Desktop view tested
-   [ ] Mobile view tested
-   [ ] Search functionality tested (with debounce)
-   [ ] Status filter tested (all options)
-   [ ] Pagination tested (prev/next)
-   [ ] Page size change tested
-   [ ] Loading states verified
-   [ ] Empty states verified
-   [ ] Row click navigation tested
-   [ ] Create button navigation tested
-   [ ] Admin-only features tested
-   [ ] Error states tested

### Permissions

-   [ ] Create button shown only when user has permission
-   [ ] Admin-only status filters conditionally shown
-   [ ] Backend filters by userRole
-   [ ] Navigation to edit page works
-   [ ] No unauthorized data displayed

---

## 🌟 Summary

This guide provides a comprehensive, AI-implementable breakdown of every feature in a Table List implementation.

### 📚 What's Included

✅ **Naming Conventions** - Exact rules to prevent naming deviations  
✅ **Module Customization Guide** - What changes vs. what stays the same  
✅ **Find & Replace Table** - Exact substitutions for new modules  
✅ **Optional Features Guide** - When to include/exclude features  
✅ **Complete Code Templates** - Copy-paste templates for all 3 components  
✅ **Column Definition Patterns** - Examples for different module types  
✅ **Reusable Components** - Pre-built components from @components-web  
✅ **Feature Documentation** - Complete breakdown of all 10 features  
✅ **Business Rules** - Permission and access control patterns  
✅ **Backend Integration** - Complete API contracts  
✅ **Backend Implementation** - Full stack from handler to database to schema  
✅ **UI/UX Implementation** - Exact code and Tailwind styling  
✅ **Implementation Checklist** - 80+ verification points

### 🎯 Step-by-Step Implementation for New Module

**Follow these steps in order to implement a new table list module without deviation:**

#### Step 1: Preparation

1. Read [Naming Conventions & Patterns](#naming-conventions--patterns)
2. Read [Module Customization Guide](#module-customization-guide)
3. Review [Find & Replace Table](#find--replace-table)
4. Check [Optional Features Guide](#optional-features-guide) to decide what to include

#### Step 2: Create Files

1. Copy [Template 1: page.tsx](#template-1-pagetsx-main-page-component)
2. Copy [Template 2: [Module]Header.tsx](#template-2-moduleheadertsx)
3. Copy [Template 3: [Module]Table.tsx](#template-3-moduletabletsx)

#### Step 3: Find & Replace

1. Use the [Find & Replace Table](#find--replace-table) to replace all placeholders:
    - `[MODULE]` → Your module (e.g., `Customer`)
    - `[MODULES]` → Plural PascalCase (e.g., `Customers`)
    - `[modules]` → Plural camelCase (e.g., `customers`)
    - `[module]` → Singular camelCase (e.g., `customer`)
    - `[domain]` → Domain folder (e.g., `customer`)

#### Step 4: Customize Columns

1. Review [Column Definition Patterns](#column-definition-patterns)
2. Update `headers` array in page.tsx
3. Add table cells in [Module]Table.tsx (desktop section)
4. Add card fields in [Module]Table.tsx (mobile section)

#### Step 5: Optional Features

1. If module has activity logs: Uncomment activity log sections
2. If module has formatters: Add helper functions to [Module]Table.tsx
3. Remove any features marked as optional that you don't need

#### Step 6: Backend Implementation

1. Follow backend patterns from feature sections:
    - Create CQRS queries (GetAll, SearchByName, GetByStatus)
    - Create query handlers
    - Implement service methods
    - Create database service methods
    - Define DynamoDB schema with GSI2 and GSI3

#### Step 7: Verification

1. Use [Complete Implementation Checklist](#complete-implementation-checklist)
2. Test desktop and mobile views
3. Test all 10 features
4. Verify styling matches reference implementation
5. Check permissions and business rules

### 🚀 For AI Implementers

**This document is designed to be AI-implementable**. Follow these guidelines:

1. **Read sections in order** - Don't skip to templates first
2. **Copy templates exactly** - Don't improvise or "improve"
3. **Use Find & Replace Table** - Don't make up your own naming
4. **Follow naming conventions strictly** - Every rule is there for consistency
5. **Check Optional Features** - Don't assume all modules are identical
6. **Use the checklist** - Verify every point before considering done
7. **Reference Products module** - When in doubt, check the reference implementation

### 🔗 Reference Implementation

**Complete working example**: Products Module

-   [page.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/page.tsx>)
-   [ProductHeader.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/components/ProductHeader.tsx>)
-   [ProductTable.tsx](<apps/web-app/src/app/(authenticated-routes)/products/product/components/ProductTable.tsx>)

### ⚠️ Common Pitfalls to Avoid

❌ **Don't**: Use `ProductsHeader` (plural)  
✅ **Do**: Use `ProductHeader` (singular)

❌ **Don't**: Create custom status badges  
✅ **Do**: Use `<StatusBadge>` component

❌ **Don't**: Use different state variable names  
✅ **Do**: Follow exact naming (isLoading, searchQuery, etc.)

❌ **Don't**: Change Tailwind classes "to make it better"  
✅ **Do**: Copy classes exactly for consistency

❌ **Don't**: Skip the debounce on search  
✅ **Do**: Always use 500ms debounce

❌ **Don't**: Create your own pagination buttons  
✅ **Do**: Use `<PaginationButtons>` component

❌ **Don't**: Assume all modules have activity logs  
✅ **Do**: Check Optional Features Guide

❌ **Don't**: Use `get[Modules]` for fetch functions  
✅ **Do**: Use `fetch[Modules]` naming convention

---

## 🚨 CRITICAL: Hallucination Prevention Rules

> **FOR AI IMPLEMENTERS**: These rules are designed to prevent you from hallucinating solutions. Follow them strictly.

### 🛑 Absolute "DO NOT" Rules

**These actions will cause IMMEDIATE FAILURE. If you do any of these, STOP and start over.**

#### 1. DO NOT Create New Components

```
❌ FORBIDDEN:
- Creating new status badge components
- Creating new pagination components
- Creating new search input components
- Creating new loading components
- Creating custom button components (except the module-specific Create button)

✅ REQUIRED:
- Use ONLY components from @components-web
- Import, don't create
```

#### 2. DO NOT Modify Reusable Component Code

```
❌ FORBIDDEN:
- Editing StatusBadge.tsx
- Editing PaginationButtons.tsx
- Editing TableSkeleton.tsx
- Editing EmptyTableState.tsx
- Editing Any component in @components-web

✅ REQUIRED:
- Use components as-is
- Only pass props, never modify internals
```

#### 3. DO NOT Change Tailwind Classes

```
❌ FORBIDDEN:
- "Improving" bg-blue-600 to bg-blue-700
- Changing px-6 py-5 to px-4 py-4
- Adding your own custom classes
- Modifying spacing, colors, or sizing

✅ REQUIRED:
- Copy Tailwind classes EXACTLY from templates
- Do not optimize, improve, or customize
```

#### 4. DO NOT Skip Steps

```
❌ FORBIDDEN:
- Jumping to templates without reading naming conventions
- Skipping the Find & Replace Table
- Ignoring Optional Features Guide
- Not checking the reference implementation

✅ REQUIRED:
- Read sections in documented order
- Complete each step before moving to next
- Verify at each checkpoint
```

#### 5. DO NOT Invent Naming

```
❌ FORBIDDEN:
- ProductsHeader (plural)
- product_header (underscore)
- getProducts (get prefix for fetch)
- productList (adding "List")
- productData (adding "Data")
- loadProducts (load prefix)
- retrieveProducts (retrieve prefix)

✅ REQUIRED:
- Use exact naming from Find & Replace Table
- Follow naming conventions exactly
- No creative variations
```

#### 6. DO NOT Add Unlisted Features

```
❌ FORBIDDEN:
- Adding bulk selection checkboxes
- Adding export to Excel button
- Adding advanced filtering
- Adding sorting by column
- Adding inline editing
- Adding delete confirmation modal

✅ REQUIRED:
- Implement ONLY the 10 documented features
- Check Optional Features Guide for conditional features
- Do not add "nice to have" features
```

#### 7. DO NOT Use Different State Names

```
❌ FORBIDDEN:
- loading instead of isLoading
- search instead of searchQuery
- filter instead of statusFilter
- size instead of pageSize
- data instead of [modules]

✅ REQUIRED:
- isLoading (exactly)
- searchQuery (exactly)
- statusFilter (exactly)
- pageSize (exactly)
- [modules] (plural of your module)
```

#### 8. DO NOT Create More Than 3 Files

```
❌ FORBIDDEN:
- Creating 4+ component files
- Creating separate files for helpers
- Creating separate files for constants
- Creating separate files for types

✅ REQUIRED:
- Exactly 3 files:
  1. page.tsx
  2. [Module]Header.tsx
  3. [Module]Table.tsx
- Put helper functions inside [Module]Table.tsx
```

---

## ✅ Auto-Fail Validation Checklist

**Run these checks on your implementation. ANY failure means START OVER.**

### Phase 1: File Structure Validation

```bash
# Check file count
[ ] EXACTLY 3 files created (page.tsx, [Module]Header.tsx, [Module]Table.tsx)
    ❌ If 4+ files: You hallucinated extra files - DELETE them

# Check file names
[ ] File name matches: ^[A-Z][a-zA-Z]+Header\.tsx$
    ❌ If plural (ProductsHeader): RENAME to singular
    ❌ If lowercase: RENAME to PascalCase
    ❌ If has underscore: REMOVE underscore

[ ] File name matches: ^[A-Z][a-zA-Z]+Table\.tsx$
    ❌ If [Module]List.tsx: RENAME to [Module]Table.tsx
```

### Phase 2: Placeholder Validation

```bash
# Search for unreplaced placeholders
[ ] Search code for literal string "[MODULE]"
    ❌ If found: You didn't complete Find & Replace - DO IT NOW

[ ] Search code for literal string "[MODULES]"
    ❌ If found: You didn't complete Find & Replace - DO IT NOW

[ ] Search code for literal string "[modules]"
    ❌ If found: You didn't complete Find & Replace - DO IT NOW

[ ] Search code for literal string "[module]"
    ❌ If found: You didn't complete Find & Replace - DO IT NOW

[ ] Search code for literal string "[domain]"
    ❌ If found: Replace with actual domain name
```

### Phase 3: Import Validation

```bash
# Required imports in page.tsx
[ ] Imports StatusBadge from '@components-web'
    ❌ If missing: ADD IT - you're using custom badges

[ ] Imports [MODULE]Api from '@data-access/index'
    ❌ If importing from different path: FIX IT

[ ] Imports [MODULE]Dto from '@data-access/index'
    ❌ If using different type name: FIX IT

# Required imports in [Module]Header.tsx
[ ] Imports: Input, Search, StatusFilterDropdown, RefreshButton, Add
    ❌ If missing any: ADD THEM

# Required imports in [Module]Table.tsx
[ ] Imports: EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton
    ❌ If missing any: ADD THEM
```

### Phase 4: State Variable Validation

```bash
# Check state variable names in page.tsx
[ ] Has: const [isLoading, setIsLoading] = useState(false);
    ❌ If named "loading": RENAME to isLoading

[ ] Has: const [searchQuery, setSearchQuery] = useState('');
    ❌ If named "searchTerm": RENAME to searchQuery

[ ] Has EXACTLY ONE: const hasFetchedRef = useRef(false);
    ❌ If duplicate declaration: DELETE the duplicate
```

### Phase 5: API Parameter Order Validation ⚠️ CRITICAL

```bash
# MUST verify API signatures before calling
[ ] Read the actual API file: libs/frontend/data-access/src/api/[module]-main.api.ts
    ❌ If skipped: You will have wrong parameter order

# For getByStatus calls
[ ] Check if API has 'name' parameter between cursor and userRole
    Customer: getCustomersByStatus(limit, status, dir, cursor, NAME, userRole) ← 6 params
    Product:  getProductsByStatus(limit, status, dir, cursor, userRole) ← 5 params
    ❌ If wrong count: Fix parameter positions

# Status filter API call MUST pass undefined for pagination params
[ ] getProductsByStatus called with: (pageSize, status, undefined, undefined, userRole)
    ❌ If passing direction/cursor: Wrong - will show stale page
    ❌ If passing name before userRole in Customer: Missing undefined

# Example - Customer API (6 parameters):
response = await CustomerApi.getCustomersByStatus(
    currentPageSize,  // ✅ limit
    statusFilter,     // ✅ status
    undefined,        // ✅ direction - reset when filtering
    undefined,        // ✅ cursorPointer - reset when filtering
    undefined,        // ✅ name - not searching by name
    userRole          // ✅ userRole
);

# Example - Product API (5 parameters):
response = await ProductApi.getProductsByStatus(
    currentPageSize,  // ✅ limit
    statusFilter,     // ✅ status
    undefined,        // ✅ direction - reset when filtering
    undefined,        // ✅ cursorPointer - reset when filtering
    userRole          // ✅ userRole
);
```

### Phase 6: UseEffect Dependencies Validation

```bash
# Status filter useEffect MUST reset everything
[ ] Status filter useEffect clears searchQuery
    ❌ If missing setSearchQuery(''): User will see confusing results

[ ] Status filter useEffect calls fetch with (undefined, undefined)
    ❌ If calling fetch(): Wrong - will use stale direction/cursor

# Correct pattern:
useEffect(() => {
    if (!hasFetchedRef.current) return;
    setSearchQuery('');           // ✅ Clear search
    setNextCursor(undefined);     // ✅ Reset next
    setPrevCursor(undefined);     // ✅ Reset prev
    fetchProducts(undefined, undefined);  // ✅ Explicit undefined
}, [statusFilter]);
```

### Phase 7: Original Phase 4 Continues

```bash
    ❌ If named "search": RENAME to searchQuery

[ ] Has: const [statusFilter, setStatusFilter] = useState('ALL');
    ❌ If named "filter": RENAME to statusFilter

[ ] Has: const [[modules], set[MODULES]] = useState<[MODULE]Dto[]>([]);
    ❌ If singular or has "List"/"Data": FIX IT

[ ] Has: const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    ❌ If named "size" or "perPage": RENAME to pageSize

[ ] Has: const [nextCursor, setNextCursor] = useState<any>();
[ ] Has: const [prevCursor, setPrevCursor] = useState<any>();
    ❌ If named differently: FIX IT

[ ] Has: const hasFetchedRef = useRef(false);
    ❌ If missing: ADD IT (prevents duplicate fetches)
```

### Phase 8: Function Naming Validation

```bash
# Check function names
[ ] Has: const fetch[MODULES] = async (...) => { }
    ❌ If named get[MODULES]: RENAME to fetch[MODULES]
    ❌ If named load[MODULES]: RENAME to fetch[MODULES]

[ ] Has: const handleCreateClick = () => { }
    ❌ If named onCreate: RENAME to handleCreateClick

[ ] Has: const handleRowClick = ([module]: [MODULE]Dto) => { }
    ❌ If named onRowClick: RENAME to handleRowClick

[ ] Has: const handlePageSizeChange = (size: number) => { }
    ❌ If named onPageSizeChange: RENAME to handlePageSizeChange
```

### Phase 6: Component Usage Validation

```bash
# Check component usage in [Module]Header.tsx
[ ] Uses <Input> component (not custom input)
[ ] Uses <StatusFilterDropdown> component
[ ] Uses <RefreshButton> component
[ ] Uses <Add> icon
    ❌ If any custom implementations: DELETE and use components

# Check component usage in [Module]Table.tsx
[ ] Uses <TableSkeleton> for loading (not custom spinner)
[ ] Uses <EmptyTableState> for empty state (not custom div)
[ ] Uses <PageSizeSelector> for page size (not custom select)
[ ] Uses <PaginationButtons> for prev/next (not custom buttons)
[ ] Uses <StatusBadge> in tableData transformation
    ❌ If any custom implementations: DELETE and use components
```

### Phase 7: Debounce Validation

```bash
# Check search debounce in page.tsx
[ ] Has setTimeout with 500ms delay in search useEffect
    ❌ If different timeout: CHANGE to 500
    ❌ If no debounce: ADD IT

[ ] Code: setTimeout(() => { fetch[MODULES](); }, 500);
    ❌ If exact code is missing: ADD IT
```

### Phase 8: Column Validation

```bash
# Check table headers in page.tsx
[ ] First column key is name field ([module]Name)
    ❌ If not: REORDER columns

[ ] Has status column
    ❌ If missing: ADD IT

[ ] Between 2 and 8 columns total
    ❌ If less than 2: ADD required columns
    ❌ If more than 8: REMOVE excess columns
```

### Phase 8: Route Validation

```bash
# Check routes in page.tsx
[ ] Create route: router.push('/[domain]/[module]/create')
    ❌ If missing domain: ADD IT
    ❌ If [module] is plural: MAKE SINGULAR

[ ] Edit route: router.push(`/[domain]/[module]/${[module].[module]Id}/edit`)
    ❌ If pattern is different: FIX IT
```

### Phase 10: Tailwind Class Validation

```bash
# Check table header classes
[ ] Table header has: "bg-blue-600 border-b border-blue-700"
    ❌ If different: COPY from template EXACTLY

[ ] Table header th has: "px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider"
    ❌ If different: COPY from template EXACTLY

# Check table body classes
[ ] Table row has: "cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
    ❌ If different: COPY from template EXACTLY

[ ] Table cell has: "px-6 py-5 text-sm font-medium text-gray-900" (first column)
    ❌ If different: COPY from template EXACTLY
```

---

## 🔀 Decision Trees for Conditional Logic

**Follow these decision trees EXACTLY. No interpretation needed.**

### Decision Tree 1: Activity Log Feature

```
START
  |
  ├─→ Does your module track user actions/changes?
       |
       ├─→ YES (Products, Customers, Invoices, etc.)
       |    |
       |    ├─→ 1. Import parseActivityLog and getActivityStyle
       |    ├─→ 2. Add latestActivity column to headers array
       |    ├─→ 3. Add latestActivity transformation in tableData useMemo
       |    ├─→ 4. Add latestActivity cell in desktop table
       |    ├─→ 5. Add latestActivity section in mobile cards
       |    └─→ END
       |
       └─→ NO (Categories, Units, simple lookups)
            |
            ├─→ 1. DO NOT import parseActivityLog
            ├─→ 2. DO NOT add latestActivity column
            ├─→ 3. DO NOT add latestActivity to tableData
            ├─→ 4. DO NOT add latestActivity cell
            └─→ END
```

### Decision Tree 2: Column Selection

```
START
  |
  ├─→ What type of module is this?
       |
       ├─→ Simple Master Data (Category, Unit, Type)
       |    |
       |    └─→ Columns: [name, description, status]
       |         └─→ END
       |
       ├─→ Contact-Based (Customer, Supplier, Employee)
       |    |
       |    └─→ Columns: [name, email, phone, type, status]
       |         └─→ END
       |
       ├─→ Hierarchical (Product with category/class)
       |    |
       |    └─→ Columns: [name, category, class, specificField, status, activity?]
       |         └─→ END
       |
       └─→ Financial (Invoice, Payment, Order)
            |
            └─→ Columns: [number, customer, date, amount, paymentStatus, status]
                 └─→ END
```

### Decision Tree 3: Helper Functions

```
START
  |
  ├─→ Do you have numeric fields to display?
       |
       ├─→ YES
       |    |
       |    ├─→ Add formatCriticalLevel or similar function
       |    ├─→ Place INSIDE [Module]Table.tsx BEFORE export
       |    └─→ Use in table cell rendering
       |
       └─→ NO → Skip to next check
  |
  ├─→ Do you have currency fields?
       |
       ├─→ YES
       |    |
       |    ├─→ Add formatCurrency function
       |    ├─→ Use Intl.NumberFormat
       |    └─→ Use in table cell rendering
       |
       └─→ NO → Skip to next check
  |
  └─→ Do you have date fields?
       |
       ├─→ YES
       |    |
       |    ├─→ Add formatDate function
       |    ├─→ Use toLocaleDateString
       |    └─→ Use in table cell rendering
       |
       └─→ NO → END
```

### Decision Tree 4: Admin-Only Features

```
START
  |
  ├─→ Does user have admin role?
       |
       ├─→ YES (authedUser?.userRole === 'ADMIN')
       |    |
       |    ├─→ Show all status filter options including:
       |    |    - FOR_DELETION
       |    |    - FOR_DEACTIVATION
       |    |
       |    └─→ Pass isAdminUser={true} to StatusFilterDropdown
       |
       └─→ NO (Regular user)
            |
            ├─→ Show only regular status options:
            |    - ALL, ACTIVE, INACTIVE, FOR_APPROVAL, NEW_RECORD, DRAFT
            |
            └─→ Pass isAdminUser={false} to StatusFilterDropdown
  |
  END
```

---

## ❌ Wrong Code Examples (Hallucinations to Avoid)

**Learn from these common AI hallucinations. If your code looks like the ❌ examples, FIX IT immediately.**

### Hallucination 1: Custom Status Badges

```typescript
// ❌ WRONG - AI hallucinated custom badge
const getStatusBadge = (status: StatusEnum) => {
    const colors = {
        ACTIVE: 'bg-green-100 text-green-800',
        INACTIVE: 'bg-gray-100 text-gray-800',
    };
    return <span className={colors[status]}>{status}</span>;
};

// ✅ CORRECT - Use component
import { StatusBadge } from '@components-web';
status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />;
```

### Hallucination 2: Custom Pagination Buttons

```typescript
// ❌ WRONG - AI created custom buttons
<button onClick={onPrevious} disabled={!prevCursor}>
    Previous
</button>
<button onClick={onNext} disabled={!nextCursor}>
    Next
</button>

// ✅ CORRECT - Use component
import { PaginationButtons } from '@components-web';
<PaginationButtons
    onPrevious={onPrevious}
    onNext={onNext}
    hasPrevious={!!prevCursor}
    hasNext={!!nextCursor}
    variant="desktop"
/>
```

### Hallucination 3: Wrong Naming Conventions

```typescript
// ❌ WRONG - AI used creative naming
const [productsList, setProductsList] = useState([]);
const getProducts = async () => {};
const onCreate = () => {};
export default function ProductsHeader() {}

// ✅ CORRECT - Follow exact naming
const [products, setProducts] = useState<ProductDto[]>([]);
const fetchProducts = async () => {};
const handleCreateClick = () => {};
export default function ProductHeader() {}
```

### Hallucination 4: Custom Loading Spinner

```typescript
// ❌ WRONG - AI created custom loading
{isLoading && <div className="spinner">Loading...</div>}

// ✅ CORRECT - Use TableSkeleton
import { TableSkeleton } from '@components-web';
{isLoading ? (
    <TableSkeleton rows={pageSize} columns={headers.length} />
) : (
    // table content
)}
```

### Hallucination 5: Forgetting Debounce

```typescript
// ❌ WRONG - AI forgot debounce, causes too many API calls
useEffect(() => {
    fetchProducts();
}, [searchQuery]);

// ✅ CORRECT - Always debounce search
useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length === 0) {
        fetchProducts();
        return;
    }
    const timer = setTimeout(() => {
        fetchProducts();
    }, 500);
    return () => clearTimeout(timer);
}, [searchQuery]);
```

### Hallucination 6: Wrong Import Paths

```typescript
// ❌ WRONG - AI hallucinated import paths
import { StatusBadge } from './components/StatusBadge';
import { ProductDto } from '../types/Product';
import ProductApi from '../api/ProductApi';

// ✅ CORRECT - Use exact import paths
import { StatusBadge } from '@components-web';
import { ProductDto, ProductApi } from '@data-access/index';
```

### Hallucination 7: Adding Extra Features

```typescript
// ❌ WRONG - AI added features not in the guide
<Checkbox onChange={onSelectAll} />  // Bulk selection
<ExportButton onClick={exportToExcel} />  // Export
<SortIcon onClick={sortByColumn} />  // Column sorting

// ✅ CORRECT - Only use documented features
// Only: Search, Status Filter, Refresh, Create, Table, Pagination
// Nothing else
```

### Hallucination 8: Plural Component Names

```typescript
// ❌ WRONG - AI used plural
export default function ProductsHeader() {}
export default function CustomersTable() {}

// ✅ CORRECT - Always singular
export default function ProductHeader() {}
export default function CustomerTable() {}
```

---

## 🧪 Self-Test Questions

**Answer these questions about YOUR implementation. Any "No" means you FAILED.**

### Basic Structure

1. Did you create EXACTLY 3 files? (Yes/No)
2. Are all file names singular (ProductHeader, not ProductsHeader)? (Yes/No)
3. Is your main file named `page.tsx`? (Yes/No)

### Naming Validation

4. Can you find the word `[MODULE]` in your code? (If Yes → FAIL)
5. Can you find the word `[modules]` in your code? (If Yes → FAIL)
6. Did you use `fetchProducts` not `getProducts`? (Yes/No)
7. Did you use `handleCreateClick` not `onCreate`? (Yes/No)
8. Are state variables named exactly: isLoading, searchQuery, statusFilter, pageSize? (Yes/No)

### Component Usage

9. Did you import StatusBadge from @components-web? (Yes/No)
10. Did you import PaginationButtons from @components-web? (Yes/No)
11. Did you import TableSkeleton from @components-web? (Yes/No)
12. Did you import EmptyTableState from @components-web? (Yes/No)
13. Did you create ANY custom badge/button/skeleton components? (If Yes → FAIL)

### Code Patterns

14. Do you have a 500ms setTimeout for search debounce? (Yes/No)
15. Do you have `hasFetchedRef` to prevent duplicate initial fetch? (Yes/No)
16. Are you using `useMemo` for headers and tableData? (Yes/No)
17. Do you have separate desktop and mobile views? (Yes/No)
18. Do you have both desktop and mobile pagination? (Yes/No)

### Imports

19. Did you import from '@data-access/index' not from '../api/'? (Yes/No)
20. Did you import from '@components-web' not from './components/'? (Yes/No)

### Routes

21. Does your create route include domain? (e.g., /products/product/create)? (Yes/No)
22. Does your edit route use the module ID? (Yes/No)

### Styling

23. Did you copy Tailwind classes EXACTLY from templates? (Yes/No)
24. Did you change ANY Tailwind classes? (If Yes → FAIL)
25. Are table headers bg-blue-600? (Yes/No)

### Optional Features

26. If your module doesn't have activity logs, did you remove activity code? (Yes/No)
27. Did you add features not in the guide (export, sorting, etc.)? (If Yes → FAIL)

### Verification

28. Does your code compile without errors? (Yes/No)
29. Have you tested on both desktop and mobile? (Yes/No)
30. Did you check the 80+ point checklist? (Yes/No)

**Scoring**:

-   All Yes (except reverse questions) = ✅ PASS
-   Any No = ❌ FAIL - Fix and retry
-   Any Yes on "FAIL" questions = ❌ FAIL - Fix and retry

---

## 📏 Boundary Constraints

**These are HARD LIMITS. Exceeding them means you're hallucinating.**

### File Constraints

-   ✅ **Exactly 3 files** (page.tsx, [Module]Header.tsx, [Module]Table.tsx)
-   ❌ If 4+ files → DELETE extras
-   ❌ If 2 or fewer files → You're missing files

### Column Constraints

-   ✅ **Minimum 2 columns** (name + status)
-   ✅ **Maximum 8 columns** (UX limit)
-   ❌ If 1 column → ADD status column minimum
-   ❌ If 9+ columns → REMOVE excess, too cluttered

### State Variable Constraints

-   ✅ **Exactly 7 core state variables**:
    1. isLoading
    2. searchQuery
    3. statusFilter
    4. [modules] (your data array)
    5. pageSize
    6. nextCursor
    7. prevCursor
-   ✅ **Plus 1 optional**: error (for error messages)
-   ✅ **Plus 1 ref**: hasFetchedRef
-   ❌ If more than 9 useState/useRef → You're hallucinating state

### Import Constraints

-   ✅ **Maximum 10 imports** from @components-web
-   ✅ **Exactly 3 imports** from @data-access (Api, Dto, StatusEnum minimum)
-   ❌ If importing from relative paths (./components/) → FIX to @components-web

### Function Constraints

-   ✅ **Exactly 1 fetch function** (fetch[MODULES])
-   ✅ **Exactly 3 handler functions** (handleCreateClick, handleRowClick, handlePageSizeChange)
-   ✅ **Maximum 3 helper functions** (formatters if needed)
-   ❌ If more functions → You're over-engineering

### Component Props Constraints

-   ✅ **[Module]Header**: Exactly 9 props (no more, no less)
-   ✅ **[Module]Table**: Exactly 11 props (no more, no less)
-   ❌ If different prop counts → Check template again

### useEffect Constraints

-   ✅ **Exactly 3 useEffect hooks**:
    1. Initial fetch (hasFetchedRef)
    2. Search debounce (500ms)
    3. Status filter change
-   ❌ If more than 3 → You're over-complicating
-   ❌ If fewer than 3 → You're missing required effects

### Debounce Timeout Constraint

-   ✅ **Exactly 500ms** for search debounce
-   ❌ If 300ms or 1000ms → CHANGE to 500ms
-   ❌ If no debounce → ADD it immediately

---

## 🔍 Regex Validation Patterns

**Use these regex patterns to validate your code. Any mismatch = FAIL.**

### File Names

```regex
# Header file
^[A-Z][a-zA-Z]+Header\.tsx$
✅ Match: ProductHeader.tsx, CustomerHeader.tsx
❌ Fail: ProductsHeader.tsx, product-header.tsx, ProductHeader.ts

# Table file
^[A-Z][a-zA-Z]+Table\.tsx$
✅ Match: ProductTable.tsx, CustomerTable.tsx
❌ Fail: ProductsList.tsx, ProductTable.ts, product_table.tsx
```

### Component Export Names

```regex
# Must be singular PascalCase
^export default function [A-Z][a-zA-Z]+(Header|Table)\(\{
✅ Match: export default function ProductHeader({
❌ Fail: export default function ProductsHeader({
❌ Fail: export default function productHeader({
```

### State Variable Names

```regex
# Module data array (must be plural)
^const \[[a-z][a-zA-Z]+s, set[A-Z][a-zA-Z]+s\] = useState<[A-Z][a-zA-Z]+Dto\[\]\>\(\[\]\);$
✅ Match: const [products, setProducts] = useState<ProductDto[]>([]);
❌ Fail: const [product, setProduct] = useState<ProductDto[]>([]);
❌ Fail: const [productList, setProductList] = useState<ProductDto[]>([]);

# Core state variables (exact names)
^const \[isLoading, setIsLoading\] = useState\(false\);$
^const \[searchQuery, setSearchQuery\] = useState\(''\);$
^const \[statusFilter, setStatusFilter\] = useState\('ALL'\);$
^const \[pageSize, setPageSize\] = useState<number>\(DEFAULT_PAGE_SIZE\);$
```

### Function Names

```regex
# Fetch function (must start with "fetch")
^const fetch[A-Z][a-zA-Z]+s = async \(
✅ Match: const fetchProducts = async (
❌ Fail: const getProducts = async (
❌ Fail: const loadProducts = async (

# Handler functions (must start with "handle")
^const handle[A-Z][a-zA-Z]+ = \(
✅ Match: const handleCreateClick = ()
✅ Match: const handleRowClick = (product
❌ Fail: const onCreate = ()
❌ Fail: const onRowClick = (
```

### Import Statements

```regex
# Must import from @components-web
^import \{.*\} from '@components-web';$
✅ Match: import { StatusBadge, Input } from '@components-web';
❌ Fail: import { StatusBadge } from './components/StatusBadge';

# Must import from @data-access/index
^import \{.*\} from '@data-access/index';$
✅ Match: import { ProductApi, ProductDto } from '@data-access/index';
❌ Fail: import { ProductDto } from '../types/Product';
```

### Route Patterns

```regex
# Create route must include domain and module
^router\.push\('/[a-z]+/[a-z]+/create'\);$
✅ Match: router.push('/products/product/create');
❌ Fail: router.push('/product/create');
❌ Fail: router.push('/products/create');

# Edit route must include domain, module, and ID
^router\.push\(`/[a-z]+/[a-z]+/\$\{[a-z]+\.[a-z]+Id\}/edit`\);$
✅ Match: router.push(`/products/product/${product.productId}/edit`);
❌ Fail: router.push(`/product/${id}/edit`);
```

---

## 🔄 Mandatory Step Order

**You MUST complete steps in this exact order. Skipping = FAILURE.**

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PREPARATION (Cannot skip)                     │
└─────────────────────────────────────────────────────────┘
  Step 1.1: Read "Naming Conventions & Patterns" section
  Step 1.2: Read "Module Customization Guide" section
  Step 1.3: Read "Find & Replace Table" section
  Step 1.4: Read "Optional Features Guide" section
  Step 1.5: Check Products module reference implementation

  ⚠️ CHECKPOINT: Can you explain what [MODULE] vs [modules] means?
     If NO → Re-read Step 1.1-1.3
     If YES → Proceed to Phase 2

┌─────────────────────────────────────────────────────────┐
│ PHASE 2: FILE CREATION (Must complete Phase 1 first)   │
└─────────────────────────────────────────────────────────┘
  Step 2.1: Copy Template 1 (page.tsx) to clipboard
  Step 2.2: Create file: page.tsx
  Step 2.3: Paste template content
  Step 2.4: Copy Template 2 ([Module]Header.tsx) to clipboard
  Step 2.5: Create file: [Module]Header.tsx
  Step 2.6: Paste template content
  Step 2.7: Copy Template 3 ([Module]Table.tsx) to clipboard
  Step 2.8: Create file: [Module]Table.tsx
  Step 2.9: Paste template content

  ⚠️ CHECKPOINT: Do you have EXACTLY 3 files?
     If NO → Delete extras or create missing files
     If YES → Proceed to Phase 3

┌─────────────────────────────────────────────────────────┐
│ PHASE 3: FIND & REPLACE (Must complete Phase 2 first)  │
└─────────────────────────────────────────────────────────┘
  Step 3.1: Replace ALL [MODULE] with YourModule (e.g., Customer)
  Step 3.2: Replace ALL [MODULES] with YourModules (e.g., Customers)
  Step 3.3: Replace ALL [modules] with yourModules (e.g., customers)
  Step 3.4: Replace ALL [module] with yourModule (e.g., customer)
  Step 3.5: Replace ALL [domain] with your domain (e.g., customer)

  ⚠️ CHECKPOINT: Search for "[MODULE]" in your code
     If FOUND → You didn't complete replacements - DO STEP 3 AGAIN
     If NOT FOUND → Proceed to Phase 4

┌─────────────────────────────────────────────────────────┐
│ PHASE 4: COLUMN CUSTOMIZATION (Must complete Phase 3)  │
└─────────────────────────────────────────────────────────┘
  Step 4.1: Review "Column Definition Patterns" section
  Step 4.2: Decide module type (Simple/Contact/Hierarchical/Financial)
  Step 4.3: Update headers array in page.tsx
  Step 4.4: Add table cells in [Module]Table.tsx (desktop)
  Step 4.5: Add card fields in [Module]Table.tsx (mobile)

  ⚠️ CHECKPOINT: Do you have between 2-8 columns?
     If NO → Adjust column count
     If YES → Proceed to Phase 5

┌─────────────────────────────────────────────────────────┐
│ PHASE 5: OPTIONAL FEATURES (Must complete Phase 4)     │
└─────────────────────────────────────────────────────────┘
  Step 5.1: Check if module has activity logs
  Step 5.2: If YES → Uncomment activity log code
  Step 5.3: If NO → Remove/keep commented activity log code
  Step 5.4: Add helper functions if needed (formatters)

  ⚠️ CHECKPOINT: Review "Optional Features Guide"
     Verified which features apply → Proceed to Phase 6

┌─────────────────────────────────────────────────────────┐
│ PHASE 6: VALIDATION (Must complete Phase 5)            │
└─────────────────────────────────────────────────────────┘
  Step 6.1: Run "Auto-Fail Validation Checklist" (Phase 1-10)
  Step 6.2: Answer all 30 "Self-Test Questions"
  Step 6.3: Verify all "Boundary Constraints"
  Step 6.4: Test regex patterns on your code
  Step 6.5: Review "Wrong Code Examples" - ensure no matches

  ⚠️ CHECKPOINT: Did you pass ALL validation checks?
     If NO → Fix failures and re-run Phase 6
     If YES → Proceed to Phase 7

┌─────────────────────────────────────────────────────────┐
│ PHASE 7: BACKEND IMPLEMENTATION (Must complete Phase 6)│
└─────────────────────────────────────────────────────────┘
  Step 7.1: Create CQRS queries (GetAll, SearchByName, GetByStatus)
  Step 7.2: Create query handlers
  Step 7.3: Implement service methods
  Step 7.4: Create database service methods
  Step 7.5: Define DynamoDB schema with GSI2 and GSI3

  (Backend steps follow patterns in feature sections)

┌─────────────────────────────────────────────────────────┐
│ PHASE 8: TESTING (Must complete Phase 7)               │
└─────────────────────────────────────────────────────────┘
  Step 8.1: Test desktop view
  Step 8.2: Test mobile view
  Step 8.3: Test all 10 features
  Step 8.4: Test loading states
  Step 8.5: Test empty states
  Step 8.6: Test pagination
  Step 8.7: Verify styling matches reference
  Step 8.8: Check permissions

  ⚠️ FINAL CHECKPOINT: Run complete 80+ point checklist
     If ANY failures → Fix and re-test
     If ALL PASS → ✅ IMPLEMENTATION COMPLETE
```

**🚨 CRITICAL RULE**: You cannot skip ahead. Each phase validates the previous one. Skipping creates compounding errors.

---

1. **Consistency Over Creativity** - Follow patterns exactly
2. **Reuse Over Rebuild** - Use all 6+ reusable components
3. **Documentation Over Assumptions** - Check the guide, don't guess
4. **Verification Over Confidence** - Use the checklist
5. **Reference Over Reinvention** - Copy from Products module when unsure

---

**Last Updated**: February 4, 2026  
**Maintainer**: Development Team  
**Status**: ✅ Complete & Production-Ready

This guide ensures **zero deviation** across all table list implementations in the application.
