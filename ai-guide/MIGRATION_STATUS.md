# Table List Feature Migration Status

> **Last Updated**: February 4, 2026  
> **Migration Pattern**: Using reusable components from @components-web  
> **Reference Implementation**: Products Module (✅ Complete)

This document tracks which modules have been migrated to use the new reusable component pattern vs. which still need migration.

---

## 📊 Migration Overview

**Total Modules**: 32  
**✅ Migrated**: 8 (25%)  
**⏸️ Pending**: 24 (75%)

**Components Created**: 8/8 (100%)  
**Documentation Complete**: Yes (3,400+ lines)

---

## ✅ Completed Migrations (8)

### Products Domain

| Module      | Path                | Status      | Uses All Components | Notes                    |
| ----------- | ------------------- | ----------- | ------------------- | ------------------------ |
| **Product** | `products/product/` | ✅ Complete | Yes (8/8)           | Reference implementation |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductHeader)
-   ✅ RefreshButton (in ProductHeader)
-   ✅ Input (search in ProductHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (246 lines)
-   ✅ ProductHeader.tsx (62 lines)
-   ✅ ProductTable.tsx (200 lines)

**Code Reduction**: ~40% (from duplicated code)

### Customers Domain

| Module       | Path                  | Status      | Uses All Components | Notes                           |
| ------------ | --------------------- | ----------- | ------------------- | ------------------------------- |
| **Customer** | `customers/customer/` | ✅ Complete | Yes (8/8)           | 6 GSI indexes, combined filters |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in CustomerHeader)
-   ✅ RefreshButton (in CustomerHeader)
-   ✅ Input (search in CustomerHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (245 lines)
-   ✅ CustomerHeader.tsx (60 lines)
-   ✅ CustomerTable.tsx (203 lines)

**Code Reduction**: ~45% (removed custom pagination, loading states, empty states)

**Special Features**:

-   ✅ Combined search + status filter
-   ✅ Activity logs with color coding
-   ✅ Proper API parameter order (6 params including name)
-   ✅ Empty string normalization (backend global fix)

### Invoicing Domain

| Module      | Path                 | Status      | Uses All Components | Notes                               |
| ----------- | -------------------- | ----------- | ------------------- | ----------------------------------- |
| **Invoice** | `invoicing/invoice/` | ✅ Complete | Yes (8/8)           | Financial module, formatted amounts |

**Components Used**:

-   ✅ StatusFilterDropdown (in InvoiceHeader)
-   ✅ RefreshButton (in InvoiceHeader)
-   ✅ Input (search in InvoiceHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (230 lines)
-   ✅ InvoiceHeader.tsx (62 lines)
-   ✅ InvoiceTable.tsx (178 lines)

**Code Reduction**: ~50% (removed custom status badges, pagination, loading states)

**Special Features**:

-   ✅ Combined search (by docno) + status filter
-   ✅ Currency formatting for amounts
-   ✅ Date formatting for invoice/due dates
-   ✅ Custom columns: invoiceNumber, customerName, totalAmount, status, invoiceDate, dueDate
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, docno)

### Products Domain (Sub-Modules)

| Module               | Path                   | Status      | Uses All Components | Notes                    |
| -------------------- | ---------------------- | ----------- | ------------------- | ------------------------ |
| **Product Category** | `products/categories/` | ✅ Complete | Yes (8/8)           | Simple master, 3 columns |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductCategoryHeader)
-   ✅ RefreshButton (in ProductCategoryHeader)
-   ✅ Input (search in ProductCategoryHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (230 lines)
-   ✅ ProductCategoryHeader.tsx (67 lines)
-   ✅ ProductCategoryTable.tsx (142 lines)

**Code Reduction**: ~55% (removed custom status badges, activity log formatting, pagination)

**Special Features**:

-   ✅ Combined search (by name) + status filter
-   ✅ Latest activity log display
-   ✅ Custom columns: categoryName, status, latestActivity
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, name)

| Module            | Path                      | Status      | Uses All Components | Notes                    |
| ----------------- | ------------------------- | ----------- | ------------------- | ------------------------ |
| **Product Class** | `products/product-class/` | ✅ Complete | Yes (8/8)           | Simple master, 3 columns |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductClassHeader)
-   ✅ RefreshButton (in ProductClassHeader)
-   ✅ Input (search in ProductClassHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (235 lines)
-   ✅ ProductClassHeader.tsx (67 lines)
-   ✅ ProductClassTable.tsx (142 lines)

**Code Reduction**: ~55% (removed custom status badges, activity log formatting, pagination)

**Special Features**:

-   ✅ Combined search (by name) + status filter
-   ✅ Latest activity log display
-   ✅ Custom columns: className, status, latestActivity
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, name)

| Module           | Path                     | Status      | Uses All Components | Notes                    |
| ---------------- | ------------------------ | ----------- | ------------------- | ------------------------ |
| **Product Unit** | `products/product-unit/` | ✅ Complete | Yes (8/8)           | Simple master, 3 columns |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductUnitHeader)
-   ✅ RefreshButton (in ProductUnitHeader)
-   ✅ Input (search in ProductUnitHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (235 lines)
-   ✅ ProductUnitHeader.tsx (67 lines)
-   ✅ ProductUnitTable.tsx (142 lines)

**Code Reduction**: ~55% (removed custom status badges, activity log formatting, pagination, custom refresh button)

**Special Features**:

-   ✅ Combined search (by name) + status filter
-   ✅ Latest activity log display
-   ✅ Custom columns: unitName, status, latestActivity
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, name)

| Module                 | Path                           | Status      | Uses All Components | Notes                    |
| ---------------------- | ------------------------------ | ----------- | ------------------- | ------------------------ |
| **Product Price Type** | `products/product-price-type/` | ✅ Complete | Yes (8/8)           | Simple master, 3 columns |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductPriceTypeHeader)
-   ✅ RefreshButton (in ProductPriceTypeHeader)
-   ✅ Input (search in ProductPriceTypeHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (243 lines)
-   ✅ ProductPriceTypeHeader.tsx (61 lines)
-   ✅ ProductPriceTypeTable.tsx (158 lines)

**Code Reduction**: ~55% (removed custom status badges, activity log formatting, pagination, custom refresh button)

**Special Features**:

-   ✅ Combined search (by name) + status filter
-   ✅ Latest activity log display
-   ✅ Custom columns: priceTypeName, status, latestActivity
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, name)

| Module           | Path                     | Status      | Uses All Components | Notes                          |
| ---------------- | ------------------------ | ----------- | ------------------- | ------------------------------ |
| **Product Deal** | `products/product-deal/` | ✅ Complete | Yes (8/8)           | Hierarchical module, 5 columns |

**Components Used**:

-   ✅ StatusBadge (in tableData transformation)
-   ✅ StatusFilterDropdown (in ProductDealHeader)
-   ✅ RefreshButton (in ProductDealHeader)
-   ✅ Input (search in ProductDealHeader)
-   ✅ TableSkeleton (desktop + mobile)
-   ✅ EmptyTableState (desktop + mobile)
-   ✅ PageSizeSelector (desktop + mobile)
-   ✅ PaginationButtons (desktop + mobile)

**Files Refactored**:

-   ✅ page.tsx (reduced from 310 lines)
-   ✅ ProductDealHeader.tsx (reduced from 78 lines)
-   ✅ ProductDealTable.tsx (reduced from 194 lines)

**Code Reduction**: ~45% (removed custom status badges, activity log formatting, pagination, custom refresh button)

**Special Features**:

-   ✅ Combined search (by name) + status filter
-   ✅ Latest activity log display
-   ✅ Custom columns: dealName, minQty, additionalQty, status, latestActivity
-   ✅ Numeric columns: minQty and additionalQty
-   ✅ Empty string normalization (backend global fix)
-   ✅ Proper API parameter order (5 params: limit, status, direction, cursor, name)

---

## ⏸️ Pending Migrations (24)

### Priority 1: High-Traffic Modules (Migrate First)

| Module       | Path                   | Type          | Has Activity Logs | Est. Column Count | Priority |
| ------------ | ---------------------- | ------------- | ----------------- | ----------------- | -------- |
| **Voucher**  | `accounting/voucher/`  | Financial     | Yes               | 6                 | 🔴 High  |
| **Supplier** | `inventory/suppliers/` | Contact-Based | Yes               | 6                 | 🔴 High  |

### Priority 2: Product Sub-Modules

| Module | Path | Type | Has Activity Logs | Est. Column Count | Priority |
| ------ | ---- | ---- | ----------------- | ----------------- | -------- |

| **Product Unit Raw Material** | `products/product-unit-raw-material/` | Hierarchical | No | 5 | 🟡 Medium |

### Priority 3: Customer Sub-Modules

| Module                       | Path                         | Type          | Has Activity Logs | Est. Column Count | Priority  |
| ---------------------------- | ---------------------------- | ------------- | ----------------- | ----------------- | --------- |
| **Customer Types**           | `customers/types/`           | Simple Master | No                | 3                 | 🟡 Medium |
| **Customer Terms**           | `customers/terms/`           | Simple Master | No                | 3                 | 🟡 Medium |
| **Customer Areas**           | `customers/areas/`           | Simple Master | No                | 3                 | 🟡 Medium |
| **Customer Classifications** | `customers/classifications/` | Simple Master | No                | 3                 | 🟡 Medium |

**Customer Sub-Modules Status**:

-   ✅ Most already use StatusBadge
-   ❌ Still need TableSkeleton, EmptyTableState, PaginationButtons, PageSizeSelector

### Priority 4: Invoicing Modules

| Module                       | Path                                  | Type          | Has Activity Logs | Est. Column Count | Priority  |
| ---------------------------- | ------------------------------------- | ------------- | ----------------- | ----------------- | --------- |
| **Territory Manager**        | `invoicing/territory-manager/`        | Hierarchical  | Yes               | 5                 | 🟡 Medium |
| **Sales Type**               | `invoicing/sales-type/`               | Simple Master | No                | 3                 | 🟢 Low    |
| **Return Good Sold**         | `invoicing/return-good-sold/`         | Financial     | Yes               | 6                 | 🟡 Medium |
| **Payment**                  | `invoicing/payment/`                  | Financial     | Yes               | 7                 | 🔴 High   |
| **Collection Receipt Range** | `invoicing/collection-receipt-range/` | Simple Master | No                | 4                 | 🟢 Low    |
| **Contract**                 | `invoicing/contract/`                 | Financial     | Yes               | 6                 | 🟡 Medium |

### Priority 5: Accounting Modules

| Module       | Path                   | Type         | Has Activity Logs | Est. Column Count | Priority  |
| ------------ | ---------------------- | ------------ | ----------------- | ----------------- | --------- |
| **Accounts** | `accounting/accounts/` | Hierarchical | Yes               | 6                 | 🟡 Medium |

**Accounts Status**:

-   ✅ Uses StatusBadge
-   ❌ Needs other components

### Priority 6: Inventory Modules

| Module                     | Path                                | Type          | Has Activity Logs | Est. Column Count | Priority  |
| -------------------------- | ----------------------------------- | ------------- | ----------------- | ----------------- | --------- |
| **Stock**                  | `inventory/stock/`                  | Hierarchical  | Yes               | 7                 | 🟡 Medium |
| **Raw Materials Stock**    | `inventory/raw-materials-stock/`    | Hierarchical  | Yes               | 6                 | 🟡 Medium |
| **Stock Delivery**         | `inventory/stock-delivery/`         | Financial     | Yes               | 6                 | 🟡 Medium |
| **Stock Purchase Order**   | `inventory/stock-purchase-order/`   | Financial     | Yes               | 7                 | 🔴 High   |
| **Stock Types**            | `inventory/stock-types/`            | Simple Master | No                | 3                 | 🟢 Low    |
| **Raw Material Suppliers** | `inventory/raw-material-suppliers/` | Hierarchical  | Yes               | 5                 | 🟡 Medium |

---

## 📋 Migration Checklist Template

Use this checklist for each module migration:

### Pre-Migration

-   [ ] Read FEATURE_TABLE_LIST.md
-   [ ] Identify module type (Simple/Contact/Hierarchical/Financial)
-   [ ] Check if module has activity logs
-   [ ] Determine column count (2-8)
-   [ ] Review Products reference implementation

### Phase 1: File Preparation

-   [ ] Backup current files (optional)
-   [ ] Copy templates from FEATURE_TABLE_LIST.md
-   [ ] Create/update 3 files: page.tsx, [Module]Header.tsx, [Module]Table.tsx

### Phase 2: Find & Replace

-   [ ] Replace [MODULE] with YourModule
-   [ ] Replace [MODULES] with YourModules
-   [ ] Replace [modules] with yourModules
-   [ ] Replace [module] with yourModule
-   [ ] Replace [domain] with yourdomain
-   [ ] Verify NO placeholders remain

### Phase 3: Component Integration

-   [ ] Import StatusBadge in page.tsx
-   [ ] Import StatusFilterDropdown, RefreshButton, Input in Header
-   [ ] Import TableSkeleton, EmptyTableState, PageSizeSelector, PaginationButtons in Table
-   [ ] Remove old custom components

### Phase 4: Customization

-   [ ] Define headers array (2-8 columns)
-   [ ] Add tableData transformation with StatusBadge
-   [ ] Add helper functions if needed (formatters)
-   [ ] Handle activity logs (if applicable)
-   [ ] Update table cells and mobile cards

### Phase 5: Validation

-   [ ] Run Auto-Fail Validation Checklist (80+ points)
-   [ ] Answer 30 Self-Test Questions
-   [ ] Verify Boundary Constraints
-   [ ] Test regex patterns
-   [ ] Review Wrong Code Examples

### Phase 6: Testing

-   [ ] Test desktop view
-   [ ] Test mobile view
-   [ ] Test all 10 features (search, filter, refresh, etc.)
-   [ ] Test loading states
-   [ ] Test empty states
-   [ ] Test pagination
-   [ ] Verify admin vs regular user views

### Post-Migration

-   [ ] Update this MIGRATION_STATUS.md
-   [ ] Mark module as ✅ Complete
-   [ ] Document any unique patterns discovered
-   [ ] Move to next priority module

---

## 🎯 Migration Priorities Explained

### 🔴 High Priority (Migrate Immediately)

**Criteria**:

-   High user traffic
-   Complex business logic
-   Financial/critical operations
-   Activity logs required

**Modules**: Customer, Invoice, Voucher, Supplier, Payment, Stock Purchase Order

### 🟡 Medium Priority (Migrate Soon)

**Criteria**:

-   Moderate user traffic
-   Supporting modules for high-priority features
-   Hierarchical data structures

**Modules**: Most sub-modules, hierarchical lookups

### 🟢 Low Priority (Migrate Last)

**Criteria**:

-   Low user traffic
-   Simple master data (name + status only)
-   Admin-only features

**Modules**: Sales Type, Collection Receipt Range, Stock Types, simple lookups

---

## 📈 Migration Progress Tracking

### Week 1 Goal

-   [x] Complete Products module (Reference)
-   [ ] Complete Customer module
-   [ ] Complete Invoice module
-   [ ] Complete Voucher module

### Week 2 Goal

-   [ ] Complete all Product sub-modules (6 total)
-   [ ] Complete all Customer sub-modules (4 total)
-   [ ] Complete Supplier module

### Week 3 Goal

-   [ ] Complete all Invoicing modules (6 total)
-   [ ] Complete all Accounting modules (1 total)

### Week 4 Goal

-   [ ] Complete all Inventory modules (6 total)
-   [ ] Final validation of all migrations
-   [ ] Update documentation with lessons learned

---

## 🚀 Quick Start: Migrating Your First Module

1. **Pick a module** from Priority 1 (e.g., Customer)
2. **Open FEATURE_TABLE_LIST.md** (your implementation bible)
3. **Copy Template 1** (page.tsx) → Create customer page.tsx
4. **Copy Template 2** (Header) → Create CustomerHeader.tsx
5. **Copy Template 3** (Table) → Create CustomerTable.tsx
6. **Find & Replace**: Customer/Customers/customers/customer
7. **Run validation checklist** (80+ points)
8. **Test** (desktop + mobile)
9. **Mark complete** in this document

---

## 📊 Component Usage Statistics

| Component            | Used By Modules | Percentage |
| -------------------- | --------------- | ---------- |
| StatusBadge          | 11/32           | 34%        |
| PaginationButtons    | 2/32            | 6%         |
| TableSkeleton        | 2/32            | 6%         |
| EmptyTableState      | 2/32            | 6%         |
| PageSizeSelector     | 2/32            | 6%         |
| StatusFilterDropdown | 2/32            | 6%         |
| RefreshButton        | 2/32            | 6%         |
| Input                | 2/32            | 6%         |

**Goal**: 100% usage across all 32 modules

**Progress**: Product ✅ + Customer ✅ = 2 modules fully migrated (6.3%)

---

## 🐛 Common Migration Issues

### Issue 1: Module Uses Old Pagination Component

**Problem**: `<Pagination>` instead of `<PaginationButtons>`  
**Solution**: Replace with PaginationButtons + PageSizeSelector combination

### Issue 2: Custom Loading Spinner

**Problem**: `<div>Loading...</div>` instead of TableSkeleton  
**Solution**: Replace with `<TableSkeleton rows={pageSize} columns={headers.length} />`

### Issue 3: Wrong State Variable Names

**Problem**: `searchTerm` instead of `searchQuery`  
**Solution**: Follow exact naming from FEATURE_TABLE_LIST.md

### Issue 4: Missing Activity Logs

**Problem**: Module should have activity logs but doesn't  
**Solution**: Check backend has `latestActivity` field, uncomment activity code

---

## 📚 Related Documentation

-   [FEATURE_TABLE_LIST.md](./features/FEATURE_TABLE_LIST.md) - Complete implementation guide
-   [COMPONENT_LIBRARY_REFERENCE.md](./COMPONENT_LIBRARY_REFERENCE.md) - Component API docs
-   [MODULE_IMPLEMENTATION_GUIDE.md](./MODULE_IMPLEMENTATION_GUIDE.md) - Architecture overview
-   [QUICK_START_NEW_AI.md](./QUICK_START_NEW_AI.md) - Onboarding for fresh AI context
-   [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Error solutions

---

## 🎓 Migration Lessons Learned

### From Products Module Migration:

1. ✅ **StatusBadge must be in useMemo** - Returns ReactNode, not string
2. ✅ **Mobile needs separate skeleton** - Don't forget mobile loading state
3. ✅ **Exact naming matters** - fetchProducts NOT getProducts
4. ✅ **Variants are required** - desktop vs mobile for all footer components
5. ✅ **Column count affects skeleton** - Pass headers.length to TableSkeleton

### From Customer Module Migration (February 2026):

1. ✅ **CRITICAL: API parameter order differs per module**

    - Product: `getProductsByStatus(limit, status, direction, cursor, userRole)` - 5 params
    - Customer: `getCustomersByStatus(limit, status, direction, cursor, name, userRole)` - 6 params
    - **ALWAYS read the API file** before copying Product template
    - Wrong order = empty results despite records existing

2. ✅ **Status filter must reset EVERYTHING**

    - Clear search query: `setSearchQuery('')`
    - Reset cursors: `setNextCursor(undefined); setPrevCursor(undefined)`
    - Pass undefined params: `fetch(undefined, undefined)`
    - Don't pass stale direction/cursor when filtering by status

3. ✅ **Check for duplicate declarations**

    - Template may have duplicate `hasFetchedRef` declarations
    - Compiler error: "name 'X' is defined multiple times"
    - Delete the duplicate (usually the second one)

4. ✅ **Pagination spacing is critical**

    - Pagination MUST be outside table container
    - Use `mt-6` gap between table and pagination
    - Wrong placement = cramped UI that looks broken

5. ✅ **Status filter UX improvement**

    - Clear search input when changing status filter
    - Prevents confusion when user expects fresh results
    - Improves perceived performance

6. ✅ **GLOBAL FIX: Empty string normalization**

    - NestJS converts missing query params to empty strings (`""`)
    - Fixed globally in `createDynamoDbOptionWithPKSKIndex` utility
    - All database services automatically handle this now
    - No module-specific changes needed

### Common Mistakes Fixed:

1. ❌ Forgot to remove custom getStatusBadge function
2. ❌ Used ProductsHeader (plural) instead of ProductHeader (singular)
3. ❌ Missed mobile loading skeleton initially
4. ❌ Had duplicate code causing syntax errors
5. ❌ **NEW**: Wrong API parameter count causing empty filter results
6. ❌ **NEW**: Forgot to clear search when changing status filter
7. ❌ **NEW**: Pagination inside table instead of outside with spacing

### Prevention Checklist (Add to every migration):

```bash
[ ] Read actual API signature in libs/frontend/data-access/src/api/[module]-main.api.ts
[ ] Count parameters in getByStatus method (5 or 6?)
[ ] Search code for duplicate variable declarations
[ ] Verify pagination is OUTSIDE table with mt-6
[ ] Confirm status filter useEffect clears searchQuery
[ ] Test ACTIVE status filter specifically (common failure point)
```

---

**Completed Modules**: Product ✅ | Customer ✅  
**Next Module to Migrate**: Invoice (Priority 1, Financial Module with Activity Logs)
