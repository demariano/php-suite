# Module Implementation - Complete Reference Documentation

## Master Data (Accounts) & Transactional Data (Vouchers) Patterns

**Purpose**: This document serves as the **authoritative reference for AI models and developers** to analyze existing modules and implement new ones with consistent patterns. It covers **complete stack implementation** (Frontend → Backend → Database Schema) for both **Master Data** (soft delete) and **Transactional Data** (hard delete) patterns.

**Last Updated**: February 3, 2026  
**Status**: ✅ 100% Working - Accounts, Territory Manager (Master Data) & Vouchers (Transactional) verified  
**Validation**: All module types tested and production-ready with reusable components

**Reference Modules**:

-   **Master Data Example 1**: Accounts Module (Soft Delete Pattern)
-   **Master Data Example 2**: Territory Manager Module (Soft Delete Pattern + Reusable Components) ⭐ **LATEST**
-   **Transactional Example**: Vouchers Module (Hard Delete Pattern)

---

## 🎯 How to Use This Document (For AI Models)

**When analyzing an existing module:**

1. Identify if it's **Master Data** or **Transactional Data** (see [Decision Tree](#decision-tree-which-delete-strategy-should-i-use))
2. Compare against the appropriate pattern in this document
3. Use the [Implementation Checklists](#implementation-checklists) to verify completeness
4. Check each layer: DTO → Backend Handler → Frontend Component → Database Schema

**When implementing a new module:**

1. Determine module type first (Master vs Transactional)
2. Follow the complete implementation pattern for that type
3. Use code templates from this document
4. Verify against checklists before marking as complete

**Critical Sections**:

-   📋 [Delete Strategy](#critical-delete-strategy---soft-vs-hard-delete) - **READ THIS FIRST**
-   🏗️ [Complete Stack Requirements](#complete-stack-requirements) - DTO, Schema, Handlers
-   ✅ [Implementation Checklists](#implementation-checklists) - Verification matrix

---

## 🤖 AI Model Usage Guidelines

**This section explains how to effectively use this reference document for module analysis and implementation.**

### Step 1: Determine Module Type

When analyzing or implementing a module, FIRST determine whether it is:

-   **Master Data** (Customer, Product, Account, Supplier) → Use SOFT DELETE pattern
-   **Transactional** (Invoice, Voucher, Purchase Order) → Use HARD DELETE pattern

**Ask this question**: "Is this record referenced by other entities?"

-   YES → Master Data → Soft Delete
-   NO → Transactional → Hard Delete

---

### Step 2: Navigate to Appropriate Section

Based on module type, jump to:

-   **Master Data** → [Backend Implementation - Master Data (Accounts Pattern)](#backend-implementation---master-data-accounts-pattern)
-   **Transactional** → [Backend Implementation - Transactional Data (Vouchers Pattern)](#backend-implementation---transactional-vouchers-pattern)

---

### Step 3: Use the Feature Comparison Matrix

The [Feature Comparison Matrix](#-feature-comparison-matrix) provides a quick reference for:

-   ✅ Features that are **identical** across both patterns
-   ⚠️ Features that **differ** and require pattern-specific implementation
-   🔍 Implementation decisions for each layer (DTO, Schema, Backend, Frontend)

**When analyzing an existing module**:

1. Go through each row in the matrix
2. Verify the module implements the correct pattern
3. Identify missing or incorrectly implemented features
4. Flag discrepancies for correction

---

### Step 4: Verify Complete Stack

For comprehensive analysis, check ALL layers:

1. **DTO Layer** → [DTO Layer Requirements](#dto-layer)

    - Backend DTO properties
    - Frontend TypeScript interfaces
    - Required vs optional fields

2. **Database Schema** → [Database Schema Requirements](#database-schema)

    - Primary key structure (PK/SK)
    - GSI configuration (GSI1/GSI2)
    - Field types and validations
    - Index query patterns

3. **Backend Handlers** → Pattern-specific sections

    - Create, Update, Delete, Approve, Deny handlers
    - Status transition logic
    - Role-based authorization
    - Activity logging

4. **Frontend Components** → [Frontend Components](#frontend-components)

    - Page structure (list, create, edit)
    - Form validation
    - Modal integrations
    - Table/grid implementation

5. **API Layer** → [API Layer Requirements](#api-layer)
    - RESTful endpoints
    - Request/response types
    - Error handling

---

### Step 5: Use Implementation Checklists

After identifying missing features, use the checklists to implement:

**Master Data** → [Master Data Implementation Checklist](#master-data-implementation-checklist)  
**Transactional** → [Transactional Implementation Checklist](#transactional-implementation-checklist)

Each checklist provides:

-   ✅ Required features
-   ⏸️ Optional features
-   📝 Code examples
-   🔍 Validation steps

---

### Analysis Workflow Example

**Scenario**: Analyzing the "Products" module for compliance

```
STEP 1: Determine type
→ Products are master data (referenced by invoices, inventory)
→ Pattern: SOFT DELETE

STEP 2: Navigate to section
→ Go to "Backend Implementation - Master Data"

STEP 3: Check Feature Matrix
→ Verify DELETE handler uses INACTIVE/FOR_DEACTIVATION
→ Verify APPROVE handler sets INACTIVE (NOT deleteRecord)
→ Verify StatusEnum includes INACTIVE and FOR_DEACTIVATION

STEP 4: Verify Complete Stack
→ DTO: Check deletionReason property exists
→ Schema: Check GSI1 filters out INACTIVE
→ Backend: Check delete.handler.ts uses status assignment
→ Frontend: Check DeleteConfirmationModal integration
→ API: Check DELETE endpoint exists

STEP 5: Use checklist
→ Go through Master Data checklist line-by-line
→ Mark completed features ✅
→ Flag missing features ❌
→ Generate report of missing items
```

---

### Implementation Workflow Example

**Scenario**: Implementing a new "Purchase Orders" module

```
STEP 1: Determine type
→ Purchase orders are transactional (discrete business events)
→ Pattern: HARD DELETE

STEP 2: Navigate to section
→ Go to "Backend Implementation - Transactional Data"

STEP 3: Use Feature Matrix as template
→ Copy implementation patterns from Vouchers column
→ Note critical differences from Master Data

STEP 4: Implement Complete Stack (bottom-up)
→ Schema: Define DynamoDB table with GSI1/GSI2
→ DTO: Create backend DTO and frontend interfaces
→ Backend: Implement CQRS handlers (use Transactional pattern)
→ Frontend: Create components (list, create, edit)
→ API: Wire up RESTful endpoints

STEP 5: Validate against checklist
→ Go through Transactional checklist
→ Verify each item is implemented ✅
→ Test delete flow: USER→FOR_DELETION→APPROVE→deleteRecord()
→ Test approval workflow
```

---

### Common Pitfalls to Avoid

When analyzing or implementing, watch out for:

❌ **Mixing delete patterns**

-   Don't use INACTIVE for transactional data
-   Don't use FOR_DELETION for master data
-   Don't use deleteRecord() for master data

❌ **Missing modal integration**

-   DeleteConfirmationModal must be imported AND rendered
-   Modal must capture deletionReason
-   Reason must be passed to API

❌ **Incomplete DTO synchronization**

-   Backend DTO and frontend interface must match
-   Missing properties cause TypeScript errors
-   Optional properties must have `?` marker

❌ **GSI filtering errors**

-   Always use GSI1 for status-based queries
-   Filter out soft-deleted records (INACTIVE, FOR_DEACTIVATION)
-   Don't rely on primary key for list queries

❌ **Role authorization bypass**

-   Always check hasApprovalPermission()
-   USER cannot bypass approval workflow
-   ADMIN can perform direct operations

---

### Quick Reference Commands

**Find modules using wrong delete pattern**:

```bash
# Search for INACTIVE in transactional modules (should not exist)
grep -r "INACTIVE" apps/invoicing/ apps/inventory/

# Search for FOR_DELETION in master data modules (should not exist)
grep -r "FOR_DELETION" apps/customer/ apps/product/
```

**Find missing DeleteConfirmationModal integration**:

```bash
# Search for modal import
grep -r "DeleteConfirmationModal" apps/{module}/*/edit/page.tsx

# Search for modal rendering
grep -r "<DeleteConfirmationModal" apps/{module}/*/edit/page.tsx
```

**Find missing deletionReason in DTOs**:

```bash
# Backend DTOs
grep -r "deletionReason" libs/dto/src/lib/

# Frontend interfaces
grep -r "deletionReason" libs/frontend/data-access/src/types/
```

---

## Table of Contents

1. [🤖 AI Model Usage Guidelines](#-ai-model-usage-guidelines)
    - [Step 1: Determine Module Type](#step-1-determine-module-type)
    - [Step 2: Navigate to Appropriate Section](#step-2-navigate-to-appropriate-section)
    - [Step 3: Use the Feature Comparison Matrix](#step-3-use-the-feature-comparison-matrix)
    - [Step 4: Verify Complete Stack](#step-4-verify-complete-stack)
    - [Step 5: Use Implementation Checklists](#step-5-use-implementation-checklists)
    - [Analysis Workflow Example](#analysis-workflow-example)
    - [Implementation Workflow Example](#implementation-workflow-example)
    - [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
    - [Quick Reference Commands](#quick-reference-commands)
2. [Module Overview](#module-overview)
3. [⚠️ CRITICAL: Delete Strategy - Soft vs Hard Delete](#critical-delete-strategy---soft-vs-hard-delete)
4. [🏗️ Complete Stack Requirements](#-complete-stack-requirements)
    - [DTO Layer](#dto-layer)
    - [Database Schema](#database-schema)
    - [Backend Handlers](#backend-handlers)
    - [Frontend Components](#frontend-components)
    - [API Layer](#api-layer)
5. [Backend Implementation - Master Data (Accounts Pattern)](#backend-implementation---master-data-accounts-pattern)
    - [CREATE Operation](#create-operation)
    - [UPDATE Operation](#update-operation)
    - [DELETE Operation (Soft Delete)](#delete-operation-soft-delete)
    - [REACTIVATE Operation](#reactivate-operation)
    - [APPROVE Operation](#approve-operation)
    - [DENY Operation](#deny-operation)
6. [Backend Implementation - Transactional (Vouchers Pattern)](#backend-implementation---transactional-vouchers-pattern)
    - [CREATE Operation](#create-operation-transactional)
    - [UPDATE Operation](#update-operation-transactional)
    - [DELETE Operation (Hard Delete)](#delete-operation-hard-delete)
    - [APPROVE Operation](#approve-operation-transactional)
    - [DENY Operation](#deny-operation-transactional)
7. [Frontend Implementation](#frontend-implementation)
    - [List/Table View](#listtable-view)
    - [Create View](#create-view)
    - [Edit View](#edit-view)
    - [Form Component Patterns](#form-component-patterns)
    - [Modal Components](#modal-components)
8. [UI/UX Standards](#uiux-standards)
9. [Business Rules & Validation](#business-rules--validation)
10. [Status Lifecycle & Transitions](#status-lifecycle--transitions)
11. [Role-Based Authorization](#role-based-authorization)
12. [📊 Feature Comparison Matrix](#-feature-comparison-matrix)
13. [Code Templates](#code-templates)
14. [Anti-Patterns & Common Mistakes](#anti-patterns--common-mistakes)
15. [Implementation Checklists](#implementation-checklists)

---

## Module Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  Pages:                                                          │
│  - /accounting/accounts (List View - AccountTable)              │
│  - /accounting/accounts/create (Create Form)                    │
│  - /accounting/accounts/edit/[id] (Edit Form - Tabbed)          │
│                                                                  │
│  Components:                                                     │
│  - AccountForm (Shared form logic)                              │
│  - AccountFormWrapper (Tab interface for edit)                  │
│  - AccountTable (Data grid with pagination)                     │
│  - DeleteConfirmationModal (Soft delete dialog)                 │
│  - ReactivateConfirmationModal (Reactivation confirm)           │
│  - DenyReasonDialog (Denial reason input)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/API
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS + CQRS)                     │
├─────────────────────────────────────────────────────────────────┤
│  Controllers:                                                    │
│  - AccountsController (REST endpoints)                          │
│                                                                  │
│  Command Handlers:                                               │
│  - CreateAccountHandler (POST /accounts)                        │
│  - UpdateAccountHandler (PUT /accounts/:id)                     │
│  - DeleteAccountHandler (DELETE /accounts/:id)                  │
│  - ApproveAccountHandler (POST /accounts/:id/approve)           │
│  - DenyAccountHandler (POST /accounts/:id/deny)                 │
│                                                                  │
│  Query Handlers:                                                 │
│  - GetAccountsHandler (GET /accounts - paginated)               │
│  - GetAccountByIdHandler (GET /accounts/:id)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (DynamoDB)                           │
├─────────────────────────────────────────────────────────────────┤
│  Table: accounting_accounts                                      │
│  Primary Key: accountId (partition key)                          │
│  GSI: status-index (for filtering by status)                    │
│                                                                  │
│  Fields:                                                         │
│  - accountId, accountName, accountType, accountCode             │
│  - normalBalance, description, parentAccountId                  │
│  - status, createdBy, createdAt, updatedBy, updatedAt           │
│  - forApprovalVersion (stores pending changes)                  │
│  - activityLog[] (audit trail)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Status Enum

```typescript
export enum AccountStatus {
    ACTIVE = 'ACTIVE', // Live record, in use
    INACTIVE = 'INACTIVE', // Soft deleted (admin action)
    FOR_APPROVAL = 'FOR_APPROVAL', // Pending approval for update
    FOR_DELETION = 'FOR_DELETION', // Pending approval for soft delete
    FOR_DEACTIVATION = 'FOR_DEACTIVATION', // Pending approval for deactivation
    NEW_RECORD = 'NEW_RECORD', // Pending approval for creation
}
```

### User Roles & Capabilities

| Role        | Create       | Update         | Delete             | Reactivate        | Approve | Deny |
| ----------- | ------------ | -------------- | ------------------ | ----------------- | ------- | ---- |
| USER        | → NEW_RECORD | → FOR_APPROVAL | → FOR_DEACTIVATION | ❌                | ❌      | ❌   |
| ADMIN       | → ACTIVE     | Direct Update  | → INACTIVE         | INACTIVE → ACTIVE | ✅      | ✅   |
| SUPER_ADMIN | → ACTIVE     | Direct Update  | → INACTIVE         | INACTIVE → ACTIVE | ✅      | ✅   |

**Key Feature: Account Reactivation** (Added February 2, 2026)

ADMIN and SUPER_ADMIN users can reactivate INACTIVE accounts by changing their status back to ACTIVE. This feature:

-   Uses the UPDATE endpoint with special status handling
-   Only allows INACTIVE → ACTIVE transitions (validated)
-   No approval workflow required (immediate reactivation)
-   No change reason required
-   Publishes ACCOUNT_REACTIVATED event for downstream systems
-   Shows green REACTIVATE button in UI (replaces DELETE for INACTIVE records)
-   Displays confirmation modal with clear status change messaging

See [REACTIVATE Operation](#reactivate-operation) for complete implementation details.

---

## ⚠️ CRITICAL: Delete Strategy - Soft vs Hard Delete

**This section is CRITICAL for implementing the correct delete behavior across all modules.**

### At a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│                    DELETE STRATEGY DECISION                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MASTER DATA                          TRANSACTIONAL DATA            │
│  (Customers, Products, Accounts)      (Invoices, Vouchers)         │
│                                                                     │
│  ✅ SOFT DELETE                       ✅ HARD DELETE                │
│  Status: INACTIVE/FOR_DEACTIVATION    Status: FOR_DELETION only    │
│  Record stays in database (hidden)    Record removed from database │
│  Preserves referential integrity      Can be deleted if invalid    │
│                                                                     │
│  DON'T USE:                           DON'T USE:                   │
│  ❌ FOR_DELETION                       ❌ INACTIVE                   │
│  ❌ Hard delete from DB                ❌ FOR_DEACTIVATION           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Two Types of Records = Two Delete Strategies

#### 1. **Master Data / Lookup Entities** (Use SOFT DELETE)

**What are these?**

-   Customer records
-   Product records
-   Account records (chart of accounts)
-   Supplier records
-   Employee records
-   Any entity that is **referenced by transactions**

**Why soft delete?**

-   These records may be referenced in historical transactions
-   Deleting them would break referential integrity
-   You need to preserve them for audit trails and reports
-   Example: Can't delete a customer if they have old invoices

**Delete Behavior:**

```
USER deletes → Status: FOR_DEACTIVATION → Requires approval → Status: INACTIVE
ADMIN deletes → Status: INACTIVE (immediate soft delete)
```

**Status Used:**

-   `INACTIVE` - The record is soft deleted (hidden but preserved in database)
-   `FOR_DEACTIVATION` - Pending approval for soft delete (USER initiated)
-   `FOR_DELETION` - **NOT USED for master data** (reserved for special cases)

**Implementation:**

```typescript
// USER deletion
if (userRole === UserRole.USER) {
    record.status = AccountStatus.FOR_DEACTIVATION;
}

// ADMIN deletion
if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    record.status = AccountStatus.INACTIVE;
}
```

---

#### 2. **Transactional Records** (Use HARD DELETE)

**What are these?**

-   Invoices
-   Vouchers
-   Return Goods Sold
-   Journal Entries
-   Purchase Orders
-   Any entity that represents a **specific business event/transaction**

**Why hard delete?**

-   These are discrete events that can be removed if invalid
-   They don't serve as master reference data
-   Removing them doesn't break other references
-   Example: Can delete an erroneous invoice if not yet posted

**Delete Behavior:**

```
USER deletes → Status: FOR_DELETION → Requires approval → HARD DELETE from database
ADMIN deletes → HARD DELETE from database (immediate removal)
```

**Status Used:**

-   `FOR_DELETION` - Pending approval for hard delete (USER initiated)
-   `INACTIVE` - **NOT USED for transactional data**
-   `FOR_DEACTIVATION` - **NOT USED for transactional data**

**Implementation:**

```typescript
// USER deletion (needs approval)
if (userRole === UserRole.USER) {
    record.status = StatusEnum.FOR_DELETION; // Mark for deletion
    await databaseService.updateRecord(record); // Update, don't delete yet
}

// ADMIN deletion (immediate hard delete)
if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    await databaseService.deleteRecord(recordId); // Actually remove from DB
}

// Later, when admin APPROVES the deletion:
if (record.status === StatusEnum.FOR_DELETION) {
    await databaseService.deleteRecord(recordId); // Hard delete from DB
}
```

---

### Quick Reference Table

| Record Type       | Example Entities                     | USER Deletes       | ADMIN Deletes | Final Result                  | Statuses Used              |
| ----------------- | ------------------------------------ | ------------------ | ------------- | ----------------------------- | -------------------------- |
| **Master Data**   | Customer, Product, Account, Supplier | → FOR_DEACTIVATION | → INACTIVE    | Soft delete (hidden in DB)    | INACTIVE, FOR_DEACTIVATION |
| **Transactional** | Invoice, Voucher, Journal Entry      | → FOR_DELETION     | Hard delete   | Hard delete (removed from DB) | FOR_DELETION only          |

---

### Decision Tree: Which Delete Strategy Should I Use?

```
Is this record referenced by other transactions or entities?
│
├─ YES → Use SOFT DELETE (INACTIVE/FOR_DEACTIVATION)
│         Examples: Customer, Product, Account
│
└─ NO → Is this a discrete business event/transaction?
         │
         ├─ YES → Use HARD DELETE (FOR_DELETION)
         │         Examples: Invoice, Voucher, Purchase Order
         │
         └─ NO → Use SOFT DELETE (INACTIVE/FOR_DEACTIVATION)
                  Default to soft delete when unsure
```

---

### Important Notes

⚠️ **DO NOT use INACTIVE or FOR_DEACTIVATION for transactional records**  
⚠️ **DO NOT use FOR_DELETION for master data/lookup entities**  
⚠️ **Always maintain approval workflow regardless of delete type**  
⚠️ **Hard delete still requires admin approval if initiated by USER**

✅ **Master data** = Soft delete (preserve for history)  
✅ **Transactional data** = Hard delete (remove invalid events)  
✅ **When in doubt** = Use soft delete (safer for referential integrity)

---

## 📦 Territory Manager Module - Complete Implementation Reference

**Module Type**: Master Data (Soft Delete Pattern)  
**Status**: ✅ 100% Verified & Production-Ready  
**Updated**: February 3, 2026  
**Reusable Components**: ✅ Fully Integrated

This section documents the **complete Territory Manager implementation** as the authoritative reference for master data modules with reusable component integration. Every detail from Tailwind classes to database indexes is documented here.

### Why Territory Manager is the Definitive Reference

The Territory Manager module represents the **gold standard** for master data implementation because:

1. ✅ **Complete soft delete pattern** with FOR_DEACTIVATION status
2. ✅ **Full approval workflow** (NEW_RECORD → FOR_APPROVAL → FOR_DEACTIVATION)
3. ✅ **100% reusable component integration** from @components-web
4. ✅ **Proper status filtering** with GSI2 index
5. ✅ **Change reason with auto-detection** using @field-change-utils-lib
6. ✅ **Exact Tailwind CSS standards** documented
7. ✅ **Event publishing** for name changes and reactivation
8. ✅ **Role-based authorization** throughout all layers
9. ✅ **Comprehensive tabs** (Details, Pending Changes, Activity Logs)
10. ✅ **Field change highlighting** in approval tab

---

### 🎯 Territory Manager Frontend Implementation

#### List Page (page.tsx)

**File**: `apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/page.tsx`

**Complete State Management**:

```typescript
const [isLoading, setIsLoading] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('ALL');
const [territoryManagers, setTerritoryManagers] = useState<TerritoryManagerDto[]>([]);
const [error, setError] = useState<string | null>(null);
const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
const [pageSize, setPageSize] = useState<number>(10);
const hasFetchedRef = useRef(false); // React Strict Mode protection
```

**Business Rules**:

1. **Initial fetch prevention**: `hasFetchedRef` prevents duplicate calls in development
2. **Search debounce**: 500ms delay using `useEffect` with cleanup
3. **Conditional API selection**:
    ```typescript
    if (statusFilter !== 'ALL') {
        // Use GSI2 status query
        response = await TerritoryManagerApi.getTerritoryManagersByStatus(...)
    } else if (searchQuery && searchQuery.trim() !== '') {
        // Use GSI1 name query
        response = await TerritoryManagerApi.getTerritoryManagersByName(...)
    } else {
        // Use GSI1 pagination
        response = await TerritoryManagerApi.getTerritoryManagers(...)
    }
    ```
4. **Security**: Only passes `userRole` when `env.BYPASS_AUTH === 'ENABLED'`
5. **Pagination reset triggers**: Search change, status filter change, page size change

**Table Headers**:

```typescript
const headers = [
    { key: 'territoryManagerName', label: 'NAME' },
    { key: 'status', label: 'STATUS' },
    { key: 'latestActivity', label: 'LATEST ACTIVITY' },
];
```

**Data Transformation**:

```typescript
const tableData =
    territoryManagers?.map((territoryManager) => {
        let latestActivity = null;
        if (territoryManager.activityLogs && territoryManager.activityLogs.length > 0) {
            const lastLog = territoryManager.activityLogs[territoryManager.activityLogs.length - 1];
            const parsed = parseActivityLog(lastLog);
            const activityStyle = getActivityStyle(parsed.activity);
            latestActivity = { text: parsed.activity, style: activityStyle };
        }

        return {
            ...territoryManager,
            status: <StatusBadge status={territoryManager.status || StatusEnum.ACTIVE} />,
            latestActivity,
        };
    }) || [];
```

**Reusable Components Used**:

-   ✅ `StatusBadge` from @components-web
-   ✅ `Input` from @components-web (in header)
-   ✅ `Search` icon from @components-web
-   ✅ `Add` icon from @components-web
-   ✅ `Pagination` from @components-web (in table)

**Breadcrumbs Structure**:

```tsx
<a href="/dashboard">Home</a> / <a href="/invoicing">Invoicing</a> / <span>Territory Manager</span>;
```

**Error Display**:

```tsx
<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
    <span>{error}</span>
    <button onClick={() => setError(null)}>×</button>
</div>
```

---

#### Header Component (TerritoryManagerHeader.tsx)

**File**: `apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/components/TerritoryManagerHeader.tsx`

**Props Interface**:

```typescript
interface TerritoryManagerHeaderProps {
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
```

**CRITICAL LAYOUT PATTERN** - All Controls in Single Row (Common Mistake: Don't Place Status Dropdown in Separate Row!)

**✅ CORRECT LAYOUT** - Single row with inline status filter:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Search Input]  [Status Dropdown]  [Refresh]    [Create Button]   │
└─────────────────────────────────────────────────────────────────────┘
```

**❌ WRONG LAYOUT** - Status filter in separate row (DO NOT USE):

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Search Input]                      [Refresh]    [Create Button]   │
│  Filter by status: [Status Dropdown]                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Complete Component Structure** (✅ CORRECT):

```tsx
export function TerritoryManagerHeader({
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onRefresh,
    onCreateClick,
    isLoading = false,
    canCreate = true,
    isAdminUser = false,
}: TerritoryManagerHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* SINGLE ROW: Search + Status + Refresh (all inline) */}
                <div className="flex w-full items-center gap-3 sm:flex-1">
                    {/* Search Input - flex-1 to take available space */}
                    <div className="flex-1">
                        <Input
                            placeholder="Search by name"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            leftIcon={Search}
                            aria-label="Search territory managers"
                        />
                    </div>

                    {/* Status Dropdown - INLINE (no label, no wrapper) */}
                    {isAdminUser && (
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            aria-label="Filter by status"
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="FOR_APPROVAL">For Approval</option>
                            <option value="FOR_DEACTIVATION">For Deactivation</option>
                            <option value="NEW_RECORD">New Record</option>
                        </select>
                    )}

                    {/* Refresh Button - INLINE */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="rounded-md border border-gray-300 bg-white p-2 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Refresh"
                        aria-label="Refresh list"
                    >
                        <RefreshIcon className="text-gray-600" size={20} />
                    </button>
                </div>

                {/* Create Button - Adjacent to the inline group */}
                {canCreate && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Add size={18} />
                        Add Territory Manager
                    </button>
                )}
            </div>
        </div>
    );
}
```

**❌ COMMON MISTAKE - DO NOT USE THIS PATTERN**:

```tsx
// WRONG: Status dropdown in separate row with label
<div className="flex flex-col gap-3">
    {/* Row 1: Search, Refresh, Create */}
    <div className="flex items-center gap-3">
        <Input placeholder="Search..." value={searchQuery} onChange={...} />
        <button onClick={onRefresh}>Refresh</button>
        <button onClick={onCreateClick}>Create</button>
    </div>

    {/* Row 2: Status filter - THIS IS WRONG! */}
    {isAdminUser && (
        <div className="flex items-center gap-2">
            <label>Filter by status:</label>
            <select value={statusFilter} onChange={...}>...</select>
        </div>
    )}
</div>
```

**Key Rules for Header Layout**:

1. ✅ **Status dropdown MUST be inline** with search input and refresh button
2. ✅ **No separate row** for status filter
3. ✅ **No label** for status dropdown (use aria-label for accessibility)
4. ✅ **Conditional rendering** with `{isAdminUser && <select>}` - no wrapper div
5. ✅ **Gap-3 spacing** between all inline controls
6. ✅ **Search input uses flex-1** to take available space
7. ✅ **Create button** is outside the search group but adjacent (sm:w-auto)

**Layout Structure** (single row with all controls):

```tsx
<div className="flex w-full items-center gap-3 sm:flex-1">
    {/* Search Input */}
    <div className="flex-1">
        <Input placeholder="Search by name" value={searchQuery} onChange={...} leftIcon={Search} />
    </div>

    {/* Status Dropdown - INLINE, CONDITIONAL, NO LABEL */}
    {isAdminUser && <select className="...">...</select>}

    {/* Refresh Button */}
    <button className="...">...</button>
</div>

{/* Create Button (outside but adjacent) */}
{canCreate && <button className="...">...</button>}
```

**Status Dropdown - Complete Implementation**:

```tsx
<select
    value={statusFilter}
    onChange={(e) => onStatusFilterChange(e.target.value)}
    className="rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
>
    <option value="ALL">All Status</option>
    <option value="ACTIVE">Active</option>
    {isAdminUser && (
        <>
            <option value="INACTIVE">Inactive</option>
            <option value="FOR_APPROVAL">For Approval</option>
            <option value="FOR_DEACTIVATION">For Deactivation</option>
            <option value="NEW_RECORD">New Record</option>
        </>
    )}
</select>
```

**CRITICAL**: Non-admin users only see "All Status" and "Active". Admin-only statuses are conditionally rendered.

**Refresh Button** (exact classes):

```tsx
<button
    type="button"
    onClick={onRefresh}
    disabled={isLoading}
    className="rounded-md border border-gray-300 bg-white p-2 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
    title="Refresh"
>
    <svg className="text-gray-600" width="20" height="20">
        {/* Circular refresh arrows icon */}
    </svg>
</button>
```

**Add Button** (exact classes):

```tsx
<button
    type="button"
    onClick={onCreateClick}
    className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
>
    <Add size={18} />
    Add Territory Manager
</button>
```

---

#### Table Component (TerritoryManagerTable.tsx)

**File**: `apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/components/TerritoryManagerTable.tsx`

**Desktop Table - Exact Classes**:

```tsx
{
    /* Container */
}
<div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
    <table className="w-full border-collapse">
        {/* Header */}
        <thead className="border-b border-blue-700 bg-blue-600">
            <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white">NAME</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white">
                    STATUS
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white">
                    LATEST ACTIVITY
                </th>
            </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-200 bg-white">
            <tr className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50">
                <td className="px-6 py-5 text-sm font-medium text-gray-900">...</td>
                <td className="px-6 py-5">...</td>
                <td className="px-6 py-5 text-sm">...</td>
            </tr>
        </tbody>
    </table>
</div>;
```

**Mobile Cards - Exact Classes**:

```tsx
<div className="space-y-4 sm:hidden">
    <button
        type="button"
        onClick={() => onRowClick(territoryManager)}
        className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
        <div className="flex items-start justify-between gap-4">
            <div>
                <h3 className="text-base font-semibold text-gray-900">
                    {territoryManager.territoryManagerName || '-'}
                </h3>
            </div>
            <div>{renderStatus(territoryManager.status)}</div>
        </div>
        {territoryManager.latestActivity && (
            <div className="mt-2">
                <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                <dd>...</dd>
            </div>
        )}
    </button>
</div>
```

**Empty State**:

```tsx
<tr>
    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
        {searchQuery ? `No territory managers found matching "${searchQuery}"` : 'No territory managers found'}
    </td>
</tr>
```

**Pagination Integration**:

```tsx
<Pagination
    pageSize={pageSize}
    onPageSizeChange={onPageSizeChange}
    onPrevious={onPrevious}
    onNext={onNext}
    hasPrevious={!!prevCursor}
    hasNext={!!nextCursor}
/>
```

---

#### Edit Page (id]/edit/page.tsx)

**File**: `apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/[id]/edit/page.tsx`

**Complete State Management**:

```typescript
const [selectedTerritoryManager, setSelectedTerritoryManager] = useState<TerritoryManagerDto | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
const [showDenyDialog, setShowDenyDialog] = useState(false);
```

**Tab Auto-Selection Logic**:

```typescript
useEffect(() => {
    // ... fetch territory manager ...

    if (
        (territoryManager.status === StatusEnum.FOR_APPROVAL ||
            territoryManager.status === StatusEnum.NEW_RECORD ||
            territoryManager.status === StatusEnum.FOR_DELETION ||
            territoryManager.status === StatusEnum.FOR_DEACTIVATION) &&
        isAdminUser
    ) {
        setActiveTab('approval');
    } else {
        setActiveTab('details');
    }
}, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);
```

**Tab Color Coding Function**:

```typescript
const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
        return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }

    switch (status) {
        case StatusEnum.ACTIVE:
            return 'bg-green-600 text-white shadow-sm';
        case StatusEnum.FOR_APPROVAL:
            return 'bg-yellow-500 text-white shadow-sm';
        case StatusEnum.FOR_DELETION:
        case StatusEnum.FOR_DEACTIVATION:
            return 'bg-red-600 text-white shadow-sm';
        case StatusEnum.NEW_RECORD:
            return 'bg-blue-600 text-white shadow-sm';
        default:
            return 'bg-gray-500 text-white shadow-sm';
    }
};
```

**Tab Rendering**:

```tsx
<div className="flex flex-wrap gap-2 overflow-x-auto border-b-2 border-gray-200 px-4 pb-2 pt-6 sm:px-6">
    <button
        onClick={() => setActiveTab('details')}
        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
            status,
            activeTab === 'details'
        )}`}
    >
        <span className="flex items-center gap-2">
            <svg className="w-4 h-4">/* Document icon */</svg>
            Territory Manager Information
            {selectedTerritoryManager && (
                <>
                    <span className="mx-1">-</span>
                    <span>{getStatusText(selectedTerritoryManager.status)}</span>
                </>
            )}
        </span>
    </button>

    {selectedTerritoryManager.status !== StatusEnum.ACTIVE && (
        <button
            onClick={() => setActiveTab('approval')}
            className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'approval'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
        >
            <span className="flex items-center gap-2">
                <svg className="w-4 h-4">/* Check circle icon */</svg>
                Pending Changes
            </span>
        </button>
    )}

    <button
        onClick={() => setActiveTab('logs')}
        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
            activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
    >
        <span className="flex items-center gap-2">
            <svg className="w-4 h-4">/* Clock icon */</svg>
            Activity Logs
        </span>
    </button>
</div>
```

**Approval Tab - FOR_DEACTIVATION Status**:

```tsx
{selectedTerritoryManager?.status === StatusEnum.FOR_DELETION ||
 selectedTerritoryManager?.status === StatusEnum.FOR_DEACTIVATION ? (
    <>
        {/* Red deletion warning banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-700 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                ⚠
            </div>
            <span className="text-sm font-semibold">
                This record is pending deletion and will be soft deleted (status set to INACTIVE) if approved.
            </span>
        </div>

        {/* Display deletion reason */}
        <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-600 p-2 text-white shadow-sm">
                    <svg className="h-5 w-5">/* Trash icon */</svg>
                </div>
                <h4 className="m-0 text-base font-bold text-red-600">Deletion Reason</h4>
            </div>
            <div className="w-full rounded-xl border-2 border-red-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm whitespace-pre-wrap leading-relaxed">
                {selectedTerritoryManager.deletionReason || 'No reason provided'}
            </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row">
            <button onClick={handleDenyRecord} className="... bg-red-600 hover:bg-red-700">
                Deny Deletion
            </button>
            <button onClick={handleApproveRecord} className="... bg-green-600 hover:bg-green-700">
                Approve Deletion
            </button>
        </div>
    </>
) : (
    /* FOR_APPROVAL / NEW_RECORD display */
)}
```

**Approval Tab - Field Change Highlighting**:

```tsx
const renderReadOnlyField = (label: string, value: string, fieldName: string) => {
    const isFieldChanged = createFieldChangeDetector(
        selectedTerritoryManager,
        selectedTerritoryManager.forApprovalVersion
    );

    const isChanged = isFieldChanged(fieldName);

    return (
        <div className={`group ${isChanged ? 'border-2 border-blue-400 bg-blue-50 rounded-xl p-3' : ''}`}>
            <label className="block text-sm font-bold text-gray-700 mb-2">
                {label}
                {isChanged && <span className="ml-2 text-xs font-semibold text-blue-600">(Changed)</span>}
            </label>
            <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600">
                {value || '-'}
            </div>
        </div>
    );
};
```

**Change Reason Display** (in approval tab):

```tsx
{
    selectedTerritoryManager.changeReason && (
        <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                    <svg className="h-5 w-5">/* Edit icon */</svg>
                </div>
                <h4 className="m-0 text-base font-bold text-blue-600">Change Reason and Modification Made</h4>
            </div>
            <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm whitespace-pre-wrap leading-relaxed">
                {selectedTerritoryManager.changeReason}
            </div>
        </div>
    );
}
```

**Modal Integration (exact props)**:

```tsx
<DenyReasonDialog
    show={showDenyDialog}
    record={selectedTerritoryManager}
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    onConfirm={handleDenyConfirm}
    onCancel={handleDenyCancel}
/>

<DeleteConfirmationModal
    show={showDeleteConfirm}
    record={selectedTerritoryManager}
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    onConfirm={handleDeleteConfirm}
    onCancel={handleDeleteCancel}
/>

<ConfirmationModal
    show={showReactivateConfirm}
    record={selectedTerritoryManager}
    variant="reactivate"
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    customMessage="This will change the status from INACTIVE to ACTIVE."
    onConfirm={handleReactivateConfirm}
    onCancel={handleReactivateCancel}
/>
```

**CRITICAL**: All modals from @components-web require `record` prop (not `entityName` or individual fields).

---

#### Form Component (TerritoryManagerForm.tsx)

**File**: `apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/components/TerritoryManagerForm.tsx`

**ChangeReasonField Integration**:

```tsx
{
    /* Change Reason Field - FIRST component when displayed */
}
{
    !isCreateMode && !isAdminUser && (
        <ChangeReasonField
            value={formData.changeReason}
            onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
            disabled={selectedTerritoryManager?.status !== StatusEnum.ACTIVE}
        />
    );
}
```

**Visibility Rules**:

-   ✅ Shown: Edit mode + Non-admin user + ACTIVE record
-   ❌ Hidden: Create mode
-   ❌ Hidden: Admin user
-   ❌ Hidden: Non-ACTIVE record status

**Warning Banner** (shown for pending records):

```tsx
{
    !isCreateMode &&
        selectedTerritoryManager &&
        (selectedTerritoryManager.status === StatusEnum.FOR_APPROVAL ||
            selectedTerritoryManager.status === StatusEnum.NEW_RECORD ||
            selectedTerritoryManager.status === StatusEnum.FOR_DELETION) && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                    ⚠
                </div>
                <span className="text-sm font-semibold">
                    {selectedTerritoryManager.status === StatusEnum.FOR_DELETION
                        ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                        : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
                </span>
            </div>
        );
}
```

**Form Fields - Complete Classes**:

```tsx
{
    /* Label with blue dot indicator */
}
<label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
    Territory Manager Name
</label>;

{
    /* Input (enabled) */
}
<input
    type="text"
    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    disabled={isFormDisabled}
    required
/>;

{
    /* Input (disabled) */
}
<input
    type="text"
    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
    disabled={true}
/>;
```

**Button Logic & Classes**:

**Delete Button** (shown when NOT create mode AND status is ACTIVE):

```tsx
{
    !isCreateMode && selectedTerritoryManager?.status === StatusEnum.ACTIVE && (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
        >
            <svg className="h-5 w-5">/* Trash icon */</svg>
            Delete
        </button>
    );
}
```

**Reactivate Button** (shown when NOT create mode AND admin user AND status is INACTIVE AND onReactivate provided):

```tsx
{
    !isCreateMode && isAdminUser && selectedTerritoryManager?.status === StatusEnum.INACTIVE && onReactivate && (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReactivate();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
        >
            <svg className="h-5 w-5">/* Check icon */</svg>
            Reactivate
        </button>
    );
}
```

**Save/Create Button** (shown when create mode OR status is ACTIVE):

```tsx
{
    (isCreateMode || selectedTerritoryManager?.status === StatusEnum.ACTIVE) && (
        <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
            <svg className="h-5 w-5">/* Check icon */</svg>
            {isCreateMode ? 'Create Territory Manager' : 'Save Changes'}
        </button>
    );
}
```

**Cancel Button** (always shown):

```tsx
<button
    type="button"
    onClick={onCancel}
    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
    <svg className="h-5 w-5">/* X icon */</svg>
    Cancel
</button>
```

**Validation Logic**:

```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!formData.territoryManagerName.trim()) {
        errors.push('Territory Manager Name is required.');
    }

    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
        errors.push('Please provide a reason for the change.');
    }

    if (errors.length > 0) {
        setValidationErrors(errors);
        return;
    }

    // ... proceed with save
};
```

**Status Assignment on Save**:

```typescript
if (isCreateMode) {
    const newTerritoryManager = {
        territoryManagerName: formData.territoryManagerName,
        contactNo: formData.contactNo,
        status: StatusEnum.NEW_RECORD,
    } as TerritoryManagerDto;
    onSave(newTerritoryManager);
} else {
    const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;
    const updatedTerritoryManager = {
        ...selectedTerritoryManager,
        territoryManagerName: formData.territoryManagerName,
        contactNo: formData.contactNo,
        status: newStatus,
        changeReason: formData.changeReason.trim() || undefined,
    } as TerritoryManagerDto;
    onSave(updatedTerritoryManager);
}
```

---

### 🔧 Territory Manager Backend Implementation

#### API Controller (territory-manager.controller.ts)

**File**: `apps/invoicing/invoicing-api-service/src/app/territory-manager/territory-manager.controller.ts`

**Complete Endpoint Mapping**:

```typescript
@Controller('territory-manager')
export class TerritoryManagerController {
    // CREATE - POST /territory-manager
    @Post()
    async create(
        @Body() dto: CreateTerritoryManagerDto,
        @Query('userRole') userRole?: string,
        @Headers() user?: User
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return await this.commandBus.execute(new CreateTerritoryManagerCommand(dto, user));
    }

    // UPDATE - PUT /territory-manager/:id
    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: Partial<TerritoryManagerDto>,
        @Query('userRole') userRole?: string,
        @Headers() user?: User
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return await this.commandBus.execute(new UpdateTerritoryManagerCommand(id, dto, user));
    }

    // DELETE - DELETE /territory-manager/:id
    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Query('deletionReason') deletionReason?: string,
        @Query('userRole') userRole?: string,
        @Headers() user?: User
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return await this.commandBus.execute(new DeleteTerritoryManagerCommand(id, deletionReason, user));
    }

    // APPROVE - POST /territory-manager/:id/approve
    @Post(':id/approve')
    async approve(
        @Param('id') id: string,
        @Query('userRole') userRole?: string,
        @Headers() user?: User
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return await this.commandBus.execute(new ApproveTerritoryManagerCommand(id, user));
    }

    // DENY - POST /territory-manager/:id/deny
    @Post(':id/deny')
    async deny(
        @Param('id') id: string,
        @Body() dto: DenyTerritoryManagerDto,
        @Query('userRole') userRole?: string,
        @Headers() user?: User
    ): Promise<ResponseDto<TerritoryManagerDto>> {
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }
        return await this.commandBus.execute(new DenyTerritoryManagerCommand(id, dto.approverMessage, user));
    }

    // SEARCH BY NAME - GET /territory-manager/name/:name
    @Get('name/:name')
    async getByName(
        @Param('name') name: string,
        @Query('limit') limit?: string,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('userRole') userRole?: string
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto>>> {
        return await this.queryBus.execute(
            new GetTerritoryManagerByNameQuery(name, Number(limit) || 10, direction, cursorPointer)
        );
    }

    // FILTER BY STATUS - GET /territory-manager/status
    @Get('status')
    async getByStatus(
        @Query('status') status: string,
        @Query('limit') limit?: string,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('userRole') userRole?: string,
        @Query('name') name?: string
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto>>> {
        return await this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(
                Number(limit) || 10,
                status as StatusEnum,
                direction,
                cursorPointer,
                name
            )
        );
    }

    // LIST ALL (PAGINATED) - GET /territory-manager
    @Get()
    async getAll(
        @Query('limit') limit?: string,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('userRole') userRole?: string
    ): Promise<ResponseDto<PageDto<TerritoryManagerDto>>> {
        return await this.queryBus.execute(
            new GetRecordsPaginationQuery(
                Number(limit) || 10,
                undefined, // status
                direction,
                cursorPointer
            )
        );
    }

    // GET BY ID - GET /territory-manager/:id
    @Get(':id')
    async getById(@Param('id') id: string): Promise<ResponseDto<TerritoryManagerDto>> {
        return await this.queryBus.execute(new GetTerritoryManagerByIdQuery(id));
    }
}
```

**CRITICAL PATTERN**: `userRole` query parameter only works when `BYPASS_AUTH === 'ENABLED'` (dev only).

---

#### Command Handlers

**CREATE HANDLER** (`command/create-record/create.handler.ts`):

```typescript
async execute(command: CreateTerritoryManagerCommand): Promise<ResponseDto<TerritoryManagerDto>> {
    try {
        // 1. Validate name uniqueness
        const existing = await this.territoryManagerDatabaseService.findRecordByName(
            command.dto.territoryManagerName
        );
        if (existing) {
            throw new BadRequestException(
                `Territory Manager with name "${command.dto.territoryManagerName}" already exists`
            );
        }

        // 2. Check user authorization and set status
        const hasApprovalPermission =
            command.user.roles?.includes(UserRole.SUPER_ADMIN) ||
            command.user.roles?.includes(UserRole.ADMIN);

        const status = hasApprovalPermission ? StatusEnum.ACTIVE : StatusEnum.NEW_RECORD;

        // 3. Build DTO
        const newRecord: TerritoryManagerDto = {
            territoryManagerId: uuidv4(),
            territoryManagerName: command.dto.territoryManagerName,
            contactNo: command.dto.contactNo || '',
            status,
            activityLogs: [],
            forApprovalVersion: hasApprovalPermission ? undefined : {
                territoryManagerName: command.dto.territoryManagerName,
                contactNo: command.dto.contactNo || ''
            }
        };

        // 4. Add activity log
        const activityMessage = hasApprovalPermission
            ? `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            : `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager created by ${command.user.username} for approval`;

        newRecord.activityLogs.push(activityMessage);

        // 5. Save to database
        const createdRecord = await this.territoryManagerDatabaseService.createRecord(newRecord);

        this.logger.log(`Territory manager created: ${createdRecord.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(createdRecord, 201);

    } catch (error) {
        return this.handleError(error, command.dto.territoryManagerName);
    }
}
```

**UPDATE HANDLER** (`command/update-record/update.handler.ts`):

```typescript
async execute(command: UpdateTerritoryManagerCommand): Promise<ResponseDto<TerritoryManagerDto>> {
    try {
        // 1. Validate record exists
        const existingRecord = await this.territoryManagerDatabaseService.findRecordById(
            command.recordId
        );
        if (!existingRecord) {
            throw new NotFoundException(`Territory manager not found for id ${command.recordId}`);
        }

        // 2. Validate name uniqueness (if name changed)
        if (command.dto.territoryManagerName &&
            command.dto.territoryManagerName !== existingRecord.territoryManagerName) {
            const duplicate = await this.territoryManagerDatabaseService.findRecordByName(
                command.dto.territoryManagerName
            );
            if (duplicate && duplicate.territoryManagerId !== command.recordId) {
                throw new BadRequestException(
                    `Territory Manager with name "${command.dto.territoryManagerName}" already exists`
                );
            }
        }

        // 3. Check authorization
        const hasApprovalPermission =
            command.user.roles?.includes(UserRole.SUPER_ADMIN) ||
            command.user.roles?.includes(UserRole.ADMIN);

        // 4. Process update based on role
        if (hasApprovalPermission) {
            // ADMIN: Direct update to ACTIVE
            const oldName = existingRecord.territoryManagerName;

            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.territoryManagerName = command.dto.territoryManagerName || existingRecord.territoryManagerName;
            existingRecord.contactNo = command.dto.contactNo !== undefined ? command.dto.contactNo : existingRecord.contactNo;
            existingRecord.changeReason = undefined; // Clear changeReason for admin updates

            existingRecord.activityLogs = existingRecord.activityLogs || [];
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);

            const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

            // Publish name change event if name changed
            if (oldName !== updatedRecord.territoryManagerName) {
                await this.publishTerritoryManagerNameChangeEvent(
                    updatedRecord.territoryManagerId,
                    updatedRecord.territoryManagerName
                );
            }

            return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);

        } else {
            // USER: Store changes in forApprovalVersion, status = FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, {
                territoryManagerName: command.dto.territoryManagerName,
                contactNo: command.dto.contactNo
            });
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Combine user reason with auto-detected changes
            existingRecord.changeReason = command.dto.changeReason
                ? `${command.dto.changeReason}${formattedChanges}`
                : formattedChanges;

            existingRecord.forApprovalVersion = {
                territoryManagerName: command.dto.territoryManagerName || existingRecord.territoryManagerName,
                contactNo: command.dto.contactNo !== undefined ? command.dto.contactNo : existingRecord.contactNo
            };

            existingRecord.activityLogs = existingRecord.activityLogs || [];
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager updated by ${command.user.username} for approval - ${formattedChanges}`
            );

            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);

            const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

            return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);
        }

    } catch (error) {
        return this.handleError(error, command.recordId);
    }
}
```

**DELETE HANDLER** (`command/delete-record/delete.handler.ts`):

```typescript
async execute(command: DeleteTerritoryManagerCommand): Promise<ResponseDto<TerritoryManagerDto>> {
    try {
        // 1. Validate record exists
        const existingRecord = await this.territoryManagerDatabaseService.findRecordById(
            command.recordId
        );
        if (!existingRecord) {
            throw new NotFoundException(`Territory manager not found for id ${command.recordId}`);
        }

        // 2. Check authorization
        const hasApprovalPermission =
            command.user.roles?.includes(UserRole.SUPER_ADMIN) ||
            command.user.roles?.includes(UserRole.ADMIN);

        // 3. Soft delete based on role
        const dto: TerritoryManagerDto = {
            ...existingRecord,
            status: hasApprovalPermission ? StatusEnum.INACTIVE : StatusEnum.FOR_DEACTIVATION,
            deletionReason: command.deletionReason || 'No reason provided'
        };

        dto.activityLogs = dto.activityLogs || [];
        const activityMessage = hasApprovalPermission
            ? `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager soft deleted by ${command.user.username}`
            : `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager marked for deletion by ${command.user.username}`;

        dto.activityLogs.push(activityMessage);
        dto.activityLogs = reduceArrayContents(dto.activityLogs, 10);

        // 4. Update record (soft delete - never deleteRecord())
        const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(dto);

        this.logger.log(`Territory manager ${hasApprovalPermission ? 'soft deleted' : 'marked for deletion'}: ${dto.territoryManagerId}`);
        return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);

    } catch (error) {
        return this.handleError(error, command.recordId);
    }
}
```

**CRITICAL**: Territory Manager is **MASTER DATA** - always uses `updateRecord()`, never `deleteRecord()`. Maintains referential integrity with Area and Invoice entities.

**APPROVE HANDLER** (`command/approve-record/approve.handler.ts`):

```typescript
async execute(command: ApproveTerritoryManagerCommand): Promise<ResponseDto<TerritoryManagerDto>> {
    try {
        // 1. Validate record exists
        const existingRecord = await this.territoryManagerDatabaseService.findRecordById(
            command.recordId
        );
        if (!existingRecord) {
            throw new NotFoundException(`Territory manager not found for id ${command.recordId}`);
        }

        // 2. Check authorization
        const hasApprovalPermission =
            command.user.roles?.includes(UserRole.SUPER_ADMIN) ||
            command.user.roles?.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('User not authorized to approve territory manager');
        }

        // 3. Process approval based on current status
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveTerritoryManager(existingRecord, command);

            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord, command);

            default:
                throw new BadRequestException(
                    `Cannot approve territory manager with status: ${existingRecord.status}`
                );
        }

    } catch (error) {
        return this.handleError(error, command.recordId);
    }
}

private async approveTerritoryManager(
    existingRecord: TerritoryManagerDto,
    command: ApproveTerritoryManagerCommand
): Promise<ResponseDto<TerritoryManagerDto>> {
    const oldName = existingRecord.territoryManagerName;

    // Apply forApprovalVersion changes
    existingRecord.status = StatusEnum.ACTIVE;
    existingRecord.territoryManagerName = existingRecord.forApprovalVersion?.territoryManagerName || existingRecord.territoryManagerName;
    existingRecord.contactNo = existingRecord.forApprovalVersion?.contactNo !== undefined
        ? existingRecord.forApprovalVersion.contactNo
        : existingRecord.contactNo;

    // Clear approval-related fields
    existingRecord.forApprovalVersion = {};
    existingRecord.changeReason = null;

    existingRecord.activityLogs = existingRecord.activityLogs || [];
    existingRecord.activityLogs.push(
        `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager approved by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
    );

    existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);

    const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

    // Publish event if name changed
    if (oldName !== updatedRecord.territoryManagerName) {
        await this.publishTerritoryManagerNameChangeEvent(
            updatedRecord.territoryManagerId,
            updatedRecord.territoryManagerName
        );
    }

    return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);
}

private async approveDeactivation(
    existingRecord: TerritoryManagerDto,
    command: ApproveTerritoryManagerCommand
): Promise<ResponseDto<TerritoryManagerDto>> {
    // Set status to INACTIVE (soft delete)
    existingRecord.status = StatusEnum.INACTIVE;
    existingRecord.changeReason = null;

    existingRecord.activityLogs = existingRecord.activityLogs || [];
    existingRecord.activityLogs.push(
        `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager deactivation approved by ${command.user.username}, status set to ${StatusEnum.INACTIVE}`
    );

    existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);

    const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

    return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);
}
```

**DENY HANDLER** (`command/deny-record/deny.handler.ts`):

```typescript
private async processDenial(
    existingRecord: TerritoryManagerDto,
    command: DenyTerritoryManagerCommand
): Promise<ResponseDto<TerritoryManagerDto>> {
    switch (existingRecord.status) {
        case StatusEnum.FOR_APPROVAL:
            return await this.denyTerritoryManager(existingRecord, command);

        case StatusEnum.FOR_DELETION:
        case StatusEnum.FOR_DEACTIVATION:
            return await this.denyDeletion(existingRecord, command);

        case StatusEnum.NEW_RECORD:
            return await this.deleteRecord(existingRecord);

        default:
            throw new BadRequestException(
                `Cannot deny territory manager with status: ${existingRecord.status}`
            );
    }
}

private async denyTerritoryManager(
    existingRecord: TerritoryManagerDto,
    command: DenyTerritoryManagerCommand
): Promise<ResponseDto<TerritoryManagerDto>> {
    // Revert to ACTIVE, discard forApprovalVersion
    existingRecord.status = StatusEnum.ACTIVE;

    existingRecord.activityLogs = existingRecord.activityLogs || [];
    existingRecord.activityLogs.push(
        `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
    );
    existingRecord.activityLogs.push(
        `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager denied by ${command.user.username}, approver message: ${command.approverMessage}`
    );

    existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);

    existingRecord.forApprovalVersion = {};
    existingRecord.changeReason = null;
    existingRecord.approverMessage = null;

    const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

    return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);
}

private async denyDeletion(
    existingRecord: TerritoryManagerDto,
    command: DenyTerritoryManagerCommand
): Promise<ResponseDto<TerritoryManagerDto>> {
    // Cancel deletion request, revert to ACTIVE
    existingRecord.changeReason = null;
    existingRecord.status = StatusEnum.ACTIVE;

    existingRecord.activityLogs = existingRecord.activityLogs || [];
    existingRecord.activityLogs.push(
        `Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}, Territory manager deletion denied by ${command.user.username}, approver message: ${command.approverMessage}, status set to ${StatusEnum.ACTIVE}`
    );

    existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, 10);
    existingRecord.approverMessage = null;

    const updatedRecord = await this.territoryManagerDatabaseService.updateRecord(existingRecord);

    return new ResponseDto<TerritoryManagerDto>(updatedRecord, 200);
}

private async deleteRecord(
    existingRecord: TerritoryManagerDto
): Promise<ResponseDto<TerritoryManagerDto>> {
    // NEW_RECORD denial = hard delete (never reached ACTIVE state)
    existingRecord.changeReason = null;
    await this.territoryManagerDatabaseService.deleteRecord(existingRecord);

    return new ResponseDto<TerritoryManagerDto>(existingRecord, 200);
}
```

**CRITICAL**: `FOR_DEACTIVATION` denial reverts to `ACTIVE`, just like `FOR_DELETION`.

---

### 🗄️ Territory Manager Database Schema

#### DynamoDB Table Structure

**Table Name**: From environment configuration (e.g., `invoicing-dev`)

**Primary Keys**:

```typescript
PK: 'TERRITORY_MANAGER';
SK: '{territoryManagerId}'; // UUID v4
```

**GSI1 - Name Index**:

```typescript
GSI1PK: 'TERRITORY_MANAGER';
GSI1SK: '{territoryManagerName}';
```

**Purpose**: Search by name, list all territory managers, name-based pagination

**GSI2 - Status Index**:

```typescript
GSI2PK: 'TERRITORY_MANAGER#{status}';
GSI2SK: '{territoryManagerName}';
```

**Purpose**: Filter by status (ACTIVE, INACTIVE, FOR_APPROVAL, FOR_DEACTIVATION, NEW_RECORD)

**Complete Field List**:

```typescript
{
    // Primary identifiers
    territoryManagerId: string;          // UUID v4
    territoryManagerName: string;        // Required, unique
    contactNo: string;                   // Optional

    // Status and workflow
    status: StatusEnum;                  // ACTIVE | INACTIVE | FOR_APPROVAL | FOR_DEACTIVATION | NEW_RECORD

    // Approval workflow
    forApprovalVersion: {                // Pending changes from USER updates
        territoryManagerName?: string;
        contactNo?: string;
    };
    changeReason: string;                // User reason + auto-detected changes
    approverMessage: string;             // Admin denial reason
    deletionReason: string;              // Soft delete reason

    // Audit
    activityLogs: string[];             // Last 10 entries

    // Index keys
    GSI1PK: string;                     // 'TERRITORY_MANAGER'
    GSI1SK: string;                     // territoryManagerName
    GSI2PK: string;                     // 'TERRITORY_MANAGER#{status}'
    GSI2SK: string;                     // territoryManagerName
}
```

---

#### Database Service Methods

**File**: `libs/backend/invoicing-database-service/src/lib/territory-manager-database.service.ts`

**CREATE**:

```typescript
async createRecord(dto: TerritoryManagerDto): Promise<TerritoryManagerDto> {
    dto.GSI1PK = 'TERRITORY_MANAGER';
    dto.GSI1SK = dto.territoryManagerName;
    dto.GSI2PK = `TERRITORY_MANAGER#${dto.status}`;
    dto.GSI2SK = dto.territoryManagerName;

    await this.territoryManagerTable.put({
        PK: 'TERRITORY_MANAGER',
        SK: dto.territoryManagerId,
        ...dto
    });

    return dto;
}
```

**UPDATE**:

```typescript
async updateRecord(dto: TerritoryManagerDto): Promise<TerritoryManagerDto> {
    // Update GSI keys if name or status changed
    dto.GSI1PK = 'TERRITORY_MANAGER';
    dto.GSI1SK = dto.territoryManagerName;
    dto.GSI2PK = `TERRITORY_MANAGER#${dto.status}`;
    dto.GSI2SK = dto.territoryManagerName;

    await this.territoryManagerTable.put({
        PK: 'TERRITORY_MANAGER',
        SK: dto.territoryManagerId,
        ...dto
    });

    return dto;
}
```

**FIND BY ID**:

```typescript
async findRecordById(id: string): Promise<TerritoryManagerDto | null> {
    const record = await this.territoryManagerTable.get({
        PK: 'TERRITORY_MANAGER',
        SK: id
    });

    return record ? this.convertToDto(record) : null;
}
```

**FIND BY NAME**:

```typescript
async findRecordByName(name: string): Promise<TerritoryManagerDto | null> {
    const record = await this.territoryManagerTable.get(
        {
            GSI1PK: 'TERRITORY_MANAGER',
            GSI1SK: name
        },
        { index: 'GSI1' }
    );

    return record ? this.convertToDto(record) : null;
}
```

**FIND BY STATUS (with optional name filter)**:

```typescript
async findRecordsByStatusPagination(
    limit: number,
    status: StatusEnum,
    direction?: string,
    cursor?: string,
    name?: string
): Promise<PageDto<TerritoryManagerDto>> {
    const records = await this.territoryManagerTable.find(
        {
            GSI2PK: `TERRITORY_MANAGER#${status}`,
            ...(name ? { GSI2SK: { begins: name } } : {})
        },
        createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursor)
    );

    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI2PK',
        'GSI2SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );

    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

**FIND BY NAME (pagination)**:

```typescript
async findRecordsByNamePagination(
    limit: number,
    direction?: string,
    cursor?: string,
    name?: string
): Promise<PageDto<TerritoryManagerDto>> {
    const records = await this.territoryManagerTable.find(
        {
            GSI1PK: 'TERRITORY_MANAGER',
            ...(name ? { GSI1SK: { begins: name } } : {})
        },
        createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursor)
    );

    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI1PK',
        'GSI1SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );

    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

**PAGINATION (all records)**:

```typescript
async findRecordsByPagination(
    limit: number,
    direction?: string,
    cursor?: string
): Promise<PageDto<TerritoryManagerDto>> {
    const records = await this.territoryManagerTable.find(
        {
            GSI1PK: 'TERRITORY_MANAGER'
        },
        createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursor)
    );

    const pageRecordCursorPointers = pageRecordHandler(
        records,
        limit,
        direction,
        'GSI1PK',
        'GSI1SK',
        'PK',
        'SK',
        JSON.stringify(records.next),
        JSON.stringify(records.prev)
    );

    return new PageDto(
        await this.convertToDtoList(records),
        pageRecordCursorPointers.nextCursorPointer,
        pageRecordCursorPointers.prevCursorPointer
    );
}
```

**Cursor Format**: JSON-serialized DynamoDB pagination tokens

---

### 📋 Territory Manager Business Rules Summary

#### Status Transitions

```
CREATE:
  ADMIN/SUPER_ADMIN → ACTIVE (immediate)
  USER → NEW_RECORD (requires approval)

UPDATE (ACTIVE record):
  ADMIN/SUPER_ADMIN → ACTIVE (direct, immediate)
  USER → FOR_APPROVAL (changes in forApprovalVersion)

DELETE:
  ADMIN/SUPER_ADMIN → INACTIVE (immediate soft delete)
  USER → FOR_DEACTIVATION (requires approval for soft delete)

APPROVE:
  NEW_RECORD → ACTIVE (apply initial data)
  FOR_APPROVAL → ACTIVE (apply forApprovalVersion changes)
  FOR_DEACTIVATION → INACTIVE (approve soft delete)

DENY:
  NEW_RECORD → [HARD DELETE - never reached ACTIVE state]
  FOR_APPROVAL → ACTIVE (discard forApprovalVersion)
  FOR_DEACTIVATION → ACTIVE (cancel deletion request)

REACTIVATE (ADMIN only):
  INACTIVE → ACTIVE (restore record)
```

#### Validation Rules

1. **Territory Manager Name**:

    - Required on create and update
    - Must be unique across all records
    - Checked using `findRecordByName()` before create/update

2. **Change Reason** (non-admin updates):

    - Required for USER when editing ACTIVE records
    - Minimum 10 characters (enforced by ChangeReasonField component)
    - Auto-combined with field change detection:
        ```
        {userReason}
        \nterritoryManagerName: {oldValue} → {newValue}
        \ncontactNo: {oldValue} → {newValue}
        ```

3. **Deletion Reason**:

    - Optional but recommended
    - Default: "No reason provided"
    - Stored in `deletionReason` field
    - Displayed in approval tab for FOR_DEACTIVATION records

4. **Approver Message**:
    - Required when denying changes
    - Minimum 3 characters (enforced by DenyReasonDialog component)
    - Stored in activity logs
    - Cleared after processing

#### Role-based Permissions

**SUPER_ADMIN / ADMIN**:

-   ✅ Create → ACTIVE immediately (no approval)
-   ✅ Update → Direct changes, ACTIVE status maintained
-   ✅ Delete → INACTIVE immediately (soft delete)
-   ✅ Approve pending records (NEW_RECORD, FOR_APPROVAL, FOR_DEACTIVATION)
-   ✅ Deny pending records with approver message
-   ✅ Reactivate INACTIVE records
-   ✅ See all statuses in filter dropdown
-   ✅ ChangeReasonField hidden (no reason required)
-   ✅ Event publishing for name changes

**USER**:

-   ❌ Create → NEW_RECORD (requires approval)
-   ❌ Update → FOR_APPROVAL (changes in forApprovalVersion)
-   ❌ Delete → FOR_DEACTIVATION (requires approval)
-   ❌ Cannot approve/deny
-   ❌ Cannot reactivate INACTIVE records
-   ❌ Limited status filter options (ALL, ACTIVE only)
-   ✅ ChangeReasonField required and visible for edits
-   ❌ No event publishing

#### Activity Logs

-   Limited to last 10 entries via `reduceArrayContents()`
-   Format: `Date: {timestamp}, {action} by {username}, {details}`
-   Timestamps: `new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })`
-   Two entries for denial: one for denial action, one for approver message
-   Displayed in Activity Logs tab with styled badges from `getActivityStyle()`

#### Event Publishing

**TERRITORY_MANAGER_NAME_CHANGED** (SQS):

-   Triggered when:
    -   Admin updates name directly (update handler)
    -   Admin approves name change (approve handler)
-   Event data: `{ territoryManagerId, newTerritoryManagerName }`
-   Purpose: Update related Area and Invoice records
-   Queue: Configured in environment

**TERRITORY_MANAGER_REACTIVATED** (SQS):

-   Triggered when: Admin changes INACTIVE → ACTIVE
-   Event data: `{ territoryManagerId, status: 'ACTIVE' }`
-   Purpose: Notify dependent systems of reactivation

#### Pagination

-   **Type**: Cursor-based (DynamoDB native)
-   **Default Page Size**: 10 items
-   **Cursor Serialization**: JSON.stringify() on pagination tokens
-   **Direction**: 'next' | 'prev'
-   **Reset Triggers**: Search change, status filter change, page size change
-   **Cursor Storage**: `nextCursor`, `prevCursor`, `currentCursor` in state

#### Search & Filtering

-   **Search by Name**: Uses GSI1 with `{ GSI1SK: { begins: searchQuery } }`
-   **Filter by Status**: Uses GSI2 with `GSI2PK: 'TERRITORY_MANAGER#{status}'`
-   **Combined Filter**: Can filter by status AND search by name simultaneously
-   **Debounce**: 500ms on search input (frontend only)
-   **Case Sensitivity**: DynamoDB native (case-sensitive)

---

### ✅ Territory Manager Reusable Components Integration

#### From @components-web Library

**1. StatusBadge**:

```tsx
<StatusBadge status={territoryManager.status || StatusEnum.ACTIVE} />
```

-   **Usage**: Table status column
-   **Props**: `status` (required)
-   **Styling**: Auto color-coded by status
-   **Location**: List page table transformation

**2. Pagination**:

```tsx
<Pagination
    pageSize={pageSize}
    onPageSizeChange={onPageSizeChange}
    onPrevious={onPrevious}
    onNext={onNext}
    hasPrevious={!!prevCursor}
    hasNext={!!nextCursor}
/>
```

-   **Usage**: Bottom of table component
-   **Props**: All required except page size options (default: 10, 20, 50, 100)
-   **Styling**: Consistent with design system
-   **Location**: TerritoryManagerTable component

**3. DeleteConfirmationModal**:

```tsx
<DeleteConfirmationModal
    show={showDeleteConfirm}
    record={selectedTerritoryManager}
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    onConfirm={handleDeleteConfirm}
    onCancel={handleDeleteCancel}
/>
```

-   **Usage**: Soft delete confirmation with reason capture
-   **Props**: `record` (required), `recordDisplayName` (optional)
-   **Validation**: Minimum 3 characters for deletion reason
-   **Location**: Edit page modal section

**4. DenyReasonDialog**:

```tsx
<DenyReasonDialog
    show={showDenyDialog}
    record={selectedTerritoryManager}
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    onConfirm={handleDenyConfirm}
    onCancel={handleDenyCancel}
/>
```

-   **Usage**: Admin denial with approver message capture
-   **Props**: `record` (required), `recordDisplayName` (optional)
-   **Validation**: Minimum 3 characters for approver message
-   **Styling**: Yellow-themed warning modal
-   **Location**: Edit page modal section

**5. ConfirmationModal**:

```tsx
<ConfirmationModal
    show={showReactivateConfirm}
    record={selectedTerritoryManager}
    variant="reactivate"
    recordDisplayName={selectedTerritoryManager?.territoryManagerName}
    customMessage="This will change the status from INACTIVE to ACTIVE."
    onConfirm={handleReactivateConfirm}
    onCancel={handleReactivateCancel}
/>
```

-   **Usage**: Generic confirmation (reactivate, etc.)
-   **Variants**: 'delete' | 'reactivate' | 'warning' | 'info'
-   **Props**: `variant` determines colors and icon
-   **Location**: Edit page modal section

**6. Input**:

```tsx
<Input
    placeholder="Search by name"
    value={searchQuery}
    onChange={(val) => onSearchChange(val as string)}
    leftIcon={Search}
/>
```

-   **Usage**: Search input with icon
-   **Props**: Standard input props + `leftIcon`
-   **Location**: TerritoryManagerHeader component

**7. Search Icon**:

```tsx
<Search />
```

-   **Usage**: Left icon in search Input
-   **Location**: TerritoryManagerHeader

**8. Add Icon**:

```tsx
<Add size={18} />
```

-   **Usage**: Create button icon
-   **Location**: TerritoryManagerHeader

#### From authenticated-routes/components

**9. ChangeReasonField**:

```tsx
<ChangeReasonField
    value={formData.changeReason}
    onChange={(e) => setFormData((prev) => ({ ...prev, changeReason: e.target.value }))}
    disabled={selectedTerritoryManager?.status !== StatusEnum.ACTIVE}
/>
```

-   **Usage**: Change reason capture for non-admin updates
-   **Styling**: Yellow-themed with icon and character counter
-   **Validation**: Minimum 10 characters
-   **Character Counter**: `X/10 characters` (green when valid, yellow otherwise)
-   **Visibility**: Hidden for create, hidden for admin, hidden for non-ACTIVE status
-   **Position**: First component in form (before warning banners)
-   **Location**: TerritoryManagerForm component

---

### 🎨 Territory Manager Tailwind CSS Standards

#### Color Palette

**Primary Colors**:

-   Blue (primary actions): `bg-blue-600`, `hover:bg-blue-700`, `focus:ring-blue-500`
-   Red (danger/delete): `bg-red-600`, `hover:bg-red-700`, `focus:ring-red-500`
-   Green (success/approve): `bg-green-600`, `hover:bg-green-700`, `focus:ring-green-500`
-   Yellow (warning/pending): `bg-yellow-500`, `border-yellow-500`, `text-yellow-700`
-   Gray (neutral): `bg-gray-50`, `border-gray-200`, `text-gray-600`

**Status-based Tab Colors**:

-   ACTIVE: `bg-green-600 text-white`
-   FOR_APPROVAL: `bg-yellow-500 text-white`
-   FOR_DELETION/FOR_DEACTIVATION: `bg-red-600 text-white`
-   NEW_RECORD: `bg-blue-600 text-white`
-   Inactive tabs: `bg-white text-gray-600 hover:bg-gray-100`

#### Typography

**Font Weights**:

-   `font-bold`: Labels, headings
-   `font-semibold`: Buttons, important text
-   `font-medium`: Form inputs, table text
-   `text-sm`: Standard size
-   `text-xs`: Headers, small labels

#### Spacing

**Padding**:

-   Buttons: `px-6 py-3` (standard), `px-4 py-2` (compact)
-   Inputs: `px-4 py-3`
-   Cards: `p-4` (mobile), `p-6` (desktop)
-   Containers: `px-4 py-4` (mobile), `px-6 py-6` (desktop)

**Gaps**:

-   Button groups: `gap-2`
-   Form fields: `gap-3`
-   Sections: `gap-6`
-   Icons with text: `gap-2`

#### Borders

**Border Widths**:

-   Standard: `border` or `border-2`
-   Emphasis: `border-2`

**Border Radii**:

-   Standard: `rounded-md`
-   Large: `rounded-xl`
-   Full: `rounded-full` (badges, dots)

**Border Colors**:

-   Neutral: `border-gray-200`, `border-gray-300`
-   Focus: `border-blue-500`
-   Danger: `border-red-500`
-   Warning: `border-yellow-500`

#### Shadows

-   Standard: `shadow-sm`
-   Elevated: `shadow-lg`
-   Hover: `hover:shadow-md`

#### Transitions

-   Standard: `transition-colors duration-200`
-   Comprehensive: `transition-all duration-200`

#### Focus States

```tsx
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

#### Disabled States

```tsx
disabled:cursor-not-allowed disabled:opacity-50
```

#### Responsive Patterns

```tsx
// Mobile first, then desktop
<div className="w-full sm:w-auto">
<div className="flex-col sm:flex-row">
<div className="hidden sm:block">  // Desktop only
<div className="sm:hidden">        // Mobile only
```

---

### 🔑 Territory Manager Key Takeaways

**What Makes Territory Manager the Reference Implementation**:

1. **Complete Soft Delete Pattern**: Uses INACTIVE and FOR_DEACTIVATION statuses correctly
2. **Proper Modal Integration**: All modals use `record` prop pattern from @components-web
3. **Change Detection**: Auto-detects field changes and combines with user reason
4. **Status Filtering**: Efficient GSI2-based queries with admin-only options
5. **Tab Auto-Selection**: Automatically opens Pending Changes tab for admins
6. **Field Highlighting**: Visual indicators for changed fields in approval tab
7. **Event Publishing**: Publishes SQS events for name changes and reactivation
8. **Role-based UI**: Components conditionally rendered based on user role
9. **Comprehensive Validation**: Frontend and backend validation with clear error messages
10. **Activity Logging**: Proper timestamp formatting and log rotation
11. **Responsive Design**: Mobile and desktop layouts with consistent styling
12. **Cursor Pagination**: Efficient DynamoDB-native pagination with direction support

**Common Patterns to Replicate**:

-   Status dropdown in header: Admin sees all statuses, users see limited options
-   ChangeReasonField position: Always first component in form when visible
-   Modal props: Always use `record` and `recordDisplayName`, never `entityName`
-   Tab colors: Status-based color coding for visual consistency
-   Button classes: Exact Tailwind classes for hover, focus, disabled states
-   GSI structure: GSI1 for name/pagination, GSI2 for status filtering
-   Activity logs: Manila timezone, 10-entry limit, two entries for denial

---

## 🏗️ Complete Stack Requirements

**This section defines the COMPLETE implementation requirements across all layers of the application.**

### DTO Layer

**Purpose**: Data Transfer Objects define the shape of data moving between layers.

#### Required Properties for ALL Modules

```typescript
// Backend DTO (libs/dto/src/lib/{module}/{entity}.dto.ts)
export class EntityDto {
    @ApiProperty()
    entityId!: string; // ✅ Required - Primary key

    @ApiProperty()
    status!: StatusEnum; // ✅ Required - Lifecycle status

    @ApiProperty()
    activityLogs!: string[]; // ✅ Required - Audit trail

    @ApiProperty()
    forApprovalVersion!: Record<string, unknown>; // ✅ Required - Pending changes

    @ApiProperty()
    changeReason?: string; // ✅ Required for USER updates

    @ApiProperty()
    approverMessage?: string; // ✅ Optional - Denial reason

    // Master Data ONLY (soft delete):
    @ApiProperty()
    deletionReason?: string; // ❌ For FOR_DEACTIVATION status

    // Transactional Data ONLY (hard delete):
    @ApiProperty()
    deletionReason?: string; // ✅ For hard delete audit

    // ... entity-specific fields
}
```

#### Frontend TypeScript Interface

```typescript
// Frontend (libs/frontend/data-access/src/types/{entity}.types.ts)
export interface EntityDto {
    entityId: string;
    status: StatusEnum;
    activityLogs: string[];
    forApprovalVersion: Record<string, unknown>;
    changeReason?: string;
    deletionReason?: string;
    approverMessage?: string;
    // ... entity-specific fields
}

export interface CreateEntityDto {
    // All fields optional except business-required ones
    status?: StatusEnum;
    changeReason?: string;
    // ... entity-specific fields
}
```

---

### Database Schema

**Purpose**: DynamoDB table structure with proper indexes for querying.

#### Table Structure (DynamoDB OneTable)

```typescript
// Schema Definition (libs/backend/database/dynamo-db-lib/src/lib/schemas/{module}.schema.ts)
export const EntitySchema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' }, // Status-based queries
        GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' }, // Entity-specific index
    },
    models: {
        Entity: {
            PK: { type: String, value: 'ENTITY' },
            SK: { type: String, value: '${entityId}' },

            // Primary fields
            entityId: { type: String, required: true, generate: 'ulid' },
            status: { type: String, required: true, enum: Object.values(StatusEnum) },
            activityLogs: { type: Array, items: { type: String }, default: [] },
            forApprovalVersion: { type: Object },
            changeReason: { type: String },
            deletionReason: { type: String },
            approverMessage: { type: String },

            // Timestamps
            created: { type: String },
            updated: { type: String },

            // GSI1 - Status index (CRITICAL for filtering)
            GSI1PK: { type: String, value: 'ENTITY' },
            GSI1SK: { type: String, value: '${status}#${entityId}' },

            // GSI2 - Entity number search
            GSI2PK: { type: String, value: 'ENTITY#${status}' },
            GSI2SK: { type: String, value: '${entityNumber}' },

            // ... entity-specific fields with GSI mappings
        },
    },
};
```

#### Critical Index Patterns

| Index                    | Purpose           | Query Pattern                                         | Example                             |
| ------------------------ | ----------------- | ----------------------------------------------------- | ----------------------------------- |
| **Primary (PK/SK)**      | Get by ID         | `PK: 'ENTITY', SK: entityId`                          | Get single record                   |
| **GSI1 (Status Filter)** | List by status    | `GSI1PK: 'ENTITY', GSI1SK: begins_with('ACTIVE')`     | Show only active records            |
| **GSI2 (Search)**        | Search/pagination | `GSI2PK: 'ENTITY#ACTIVE', GSI2SK: begins_with('INV')` | Search invoices starting with "INV" |

**⚠️ CRITICAL**: Always include GSI1 for status filtering to exclude soft-deleted records!

---

### Backend Handlers

**Purpose**: CQRS command handlers that implement business logic.

#### Required Handler Files

**Master Data (Accounts Pattern)**:

```
commands/handlers/
├── create.handler.ts       # ✅ USER → NEW_RECORD, ADMIN → ACTIVE
├── update.handler.ts       # ✅ USER → FOR_APPROVAL, ADMIN → direct update
├── delete.handler.ts       # ✅ USER → FOR_DEACTIVATION, ADMIN → INACTIVE (soft delete)
├── approve.handler.ts      # ✅ Handles NEW_RECORD, FOR_APPROVAL, FOR_DEACTIVATION
└── deny.handler.ts         # ✅ Reverts to ACTIVE or hard deletes NEW_RECORD
```

**Transactional (Vouchers Pattern)**:

```
commands/handlers/
├── create.handler.ts       # ✅ USER → NEW_RECORD, ADMIN → ACTIVE
├── update.handler.ts       # ✅ USER → FOR_APPROVAL, ADMIN → direct update
├── delete.handler.ts       # ✅ USER → FOR_DELETION, ADMIN → deleteRecord() (hard delete)
├── approve.handler.ts      # ✅ Handles NEW_RECORD, FOR_APPROVAL, FOR_DELETION (deleteRecord)
└── deny.handler.ts         # ✅ Reverts to ACTIVE or hard deletes NEW_RECORD
```

#### Handler Method Requirements

Every handler MUST have:

1. ✅ `execute()` - Main entry point
2. ✅ `validateRecordExists()` - Check record existence
3. ✅ `validateUserAuthorization()` - Role-based permission check
4. ✅ `hasApprovalPermission()` - Check if user is ADMIN/SUPER_ADMIN
5. ✅ `updateRecordStatus()` - Status transition logic
6. ✅ `handleError()` - Centralized error handling
7. ✅ `extractErrorMessage()` - Error message extraction

---

### Frontend Components

**Purpose**: React components that provide user interface.

#### Required Component Files

**Page Structure**:

```
app/{module}/
├── page.tsx                           # ✅ List/Table view with search & pagination
├── create/page.tsx                    # ✅ Create new record
├── [id]/edit/page.tsx                 # ✅ Edit existing record
└── components/
    ├── {Entity}Form.tsx               # ✅ Shared form component (create/edit)
    ├── {Entity}FormWrapper.tsx        # ✅ Tab interface wrapper (edit mode)
    ├── {Entity}Table.tsx              # ✅ Data grid with pagination
    ├── {Entity}Header.tsx             # ✅ Search, filters, create button
    ├── DeleteConfirmationModal.tsx    # ✅ Delete confirmation dialog
    ├── DenyReasonDialog.tsx           # ✅ Denial reason input
    └── index.ts                       # ✅ Export barrel file
```

#### Component Requirements

**Form Component** (`{Entity}Form.tsx`):

-   ✅ Handles both create and edit modes (`isCreateMode` prop)
-   ✅ Tab navigation (Details/Approval/Logs) for edit mode
-   ✅ Status-based field editing (read-only for non-ACTIVE records)
-   ✅ Approval/Deny buttons for pending records (admin only)
-   ✅ Delete button (ACTIVE records only OR with confirmation modal)
-   ✅ Form validation (frontend + backend)
-   ✅ Change reason field (required for USER updates)

**Table Component** (`{Entity}Table.tsx`):

-   ✅ Desktop and mobile responsive views
-   ✅ Pagination with page size selector
-   ✅ Status badges with color coding
-   ✅ Latest activity display
-   ✅ Row click navigation to edit page
-   ✅ Loading and empty states

**List Page** (`page.tsx`):

-   ✅ Search functionality with debounce
-   ✅ Pagination state management
-   ✅ Filter by status (optional)
-   ✅ Create button navigation
-   ✅ Flash notification handling

---

### API Layer

**Purpose**: RESTful endpoints connecting frontend to backend.

#### Required API Methods

```typescript
// Frontend API (libs/frontend/data-access/src/api/{entity}.api.ts)
class EntityApi extends AxiosConfig {
    // ✅ CREATE
    createEntity(dto: CreateEntityDto, userRole?: string): Promise<EntityDto>

    // ✅ READ
    getEntityById(id: string, userRole?: string): Promise<EntityDto>
    getEntitiesPagination(limit: number, direction?: string, cursor?: string): Promise<PaginatedResponse<EntityDto>>
    getEntitiesContaining{Field}(limit: number, searchTerm: string, direction?: string, cursor?: string): Promise<PaginatedResponse<EntityDto>>

    // ✅ UPDATE
    updateEntity(id: string, dto: Partial<EntityDto>, userRole?: string): Promise<EntityDto>

    // ✅ DELETE
    deleteEntity(dto: EntityDto, userRole?: string): Promise<void>

    // ✅ APPROVE/DENY
    approveEntity(id: string, userRole?: string): Promise<EntityDto>
    denyEntity(id: string, approverMessage: string, userRole?: string): Promise<EntityDto>
}
```

#### Backend Controller

```typescript
// Backend Controller (apps/{module}/{entity}-api-service/src/{entity}.controller.ts)
@Controller('entities')
export class EntityController {
    @Post()                                    // ✅ CREATE
    @Put(':id')                                // ✅ UPDATE
    @Delete(':id')                             // ✅ DELETE
    @Post(':id/approve')                       // ✅ APPROVE
    @Post(':id/deny')                          // ✅ DENY
    @Get()                                     // ✅ LIST (paginated)
    @Get(':id')                                // ✅ GET BY ID
    @Get('search/:field/:value')               // ✅ SEARCH
}
```

---

## Backend Implementation - Master Data (Accounts Pattern)

**Module Type**: Master Data / Lookup Entities  
**Delete Strategy**: SOFT DELETE (INACTIVE status)  
**Example**: Accounts, Customers, Products, Suppliers  
**Statuses Used**: ACTIVE, NEW_RECORD, FOR_APPROVAL, INACTIVE, FOR_DEACTIVATION

---

### CREATE Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/create.handler.ts`

**Purpose**: Create new account record with role-based status assignment (NEW_RECORD for users, ACTIVE for admins)

**Flow**:

```
USER creates account → Status: NEW_RECORD → Requires approval
ADMIN creates account → Status: ACTIVE → Immediately available
```

**Complete Handler Code**:

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateAccountCommand } from '../impl/create-account.command';
import { AccountsDynamodbDatabaseService, AccountStatus, UserRole } from '@workspace/backend/database';
import { v4 as uuidv4 } from 'uuid';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
    constructor(private readonly accountsDatabaseService: AccountsDynamodbDatabaseService) {}

    async execute(command: CreateAccountCommand): Promise<any> {
        const {
            accountName,
            accountType,
            accountCode,
            normalBalance,
            description,
            parentAccountId,
            userEmail,
            userRole, // ← Role determines status assignment
        } = command;

        // Generate unique ID for new account
        const accountId = uuidv4();
        const now = new Date().toISOString();

        // ✅ CRITICAL PATTERN: Role-based status assignment
        // Users create NEW_RECORD (needs approval)
        // Admins create ACTIVE (immediate availability)
        const status = userRole === UserRole.USER ? AccountStatus.NEW_RECORD : AccountStatus.ACTIVE;

        // Build account record
        const newAccount = {
            accountId,
            accountName,
            accountType,
            accountCode,
            normalBalance,
            description: description || '',
            parentAccountId: parentAccountId || null,
            status,
            createdBy: userEmail,
            createdAt: now,
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                {
                    action: 'CREATED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: `Account created with status: ${status}`,
                },
            ],
        };

        // Save to DynamoDB
        await this.accountsDatabaseService.createAccount(newAccount);

        return {
            message:
                status === AccountStatus.NEW_RECORD
                    ? 'Account created successfully. Waiting for approval.'
                    : 'Account created successfully.',
            account: newAccount,
        };
    }
}
```

**Key Patterns**:

-   ✅ UUID generation for accountId
-   ✅ Role-based status assignment (ternary operator)
-   ✅ Activity log initialization with creation event
-   ✅ Timestamp standardization (ISO string)
-   ✅ Different success messages based on status

**Validation** (handled in DTO):

-   accountName: required, max 200 chars
-   accountType: required, must be valid AccountType enum
-   accountCode: required, unique, max 50 chars
-   normalBalance: required, must be 'DEBIT' or 'CREDIT'
-   parentAccountId: optional, must exist if provided

---

### UPDATE Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/update.handler.ts`

**Purpose**: Update existing account with role-based direct update vs. approval workflow

**Flow**:

```
ACTIVE record:
  USER updates → Status: FOR_APPROVAL → forApprovalVersion stores changes
  ADMIN updates → Direct update → Status remains ACTIVE

FOR_APPROVAL record:
  USER updates → Update forApprovalVersion → Still FOR_APPROVAL
  ADMIN updates → Direct update → Status remains FOR_APPROVAL
```

**Complete Handler Code**:

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateAccountCommand } from '../impl/update-account.command';
import { AccountsDynamodbDatabaseService, AccountStatus, UserRole } from '@workspace/backend/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
    constructor(private readonly accountsDatabaseService: AccountsDynamodbDatabaseService) {}

    async execute(command: UpdateAccountCommand): Promise<any> {
        const { accountId, updateData, userEmail, userRole } = command;

        // Fetch existing account
        const existingAccount = await this.accountsDatabaseService.findAccountById(accountId);

        if (!existingAccount) {
            throw new NotFoundException(`Account with ID ${accountId} not found`);
        }

        // ❌ VALIDATION: Cannot edit certain statuses
        if (
            [AccountStatus.INACTIVE, AccountStatus.FOR_DELETION, AccountStatus.FOR_DEACTIVATION].includes(
                existingAccount.status
            )
        ) {
            throw new BadRequestException(`Cannot update account with status: ${existingAccount.status}`);
        }

        const now = new Date().toISOString();

        // ✅ CRITICAL PATTERN: Field-level change detection
        const hasChanges = this.detectChanges(existingAccount, updateData);

        if (!hasChanges) {
            return {
                message: 'No changes detected',
                account: existingAccount,
            };
        }

        // ✅ PATTERN: Role-based update logic
        if (userRole === UserRole.USER) {
            // USER path: Store changes in forApprovalVersion, set status to FOR_APPROVAL
            const updatedAccount = {
                ...existingAccount,
                status: AccountStatus.FOR_APPROVAL,
                forApprovalVersion: {
                    ...existingAccount, // ← Keep original values
                    ...updateData, // ← Apply proposed changes
                    updatedBy: userEmail,
                    updatedAt: now,
                },
                updatedBy: userEmail,
                updatedAt: now,
                activityLog: [
                    ...(existingAccount.activityLog || []),
                    {
                        action: 'UPDATE_REQUESTED',
                        performedBy: userEmail,
                        performedAt: now,
                        details: `Update submitted for approval. Changes: ${this.formatChanges(
                            existingAccount,
                            updateData
                        )}`,
                    },
                ],
            };

            await this.accountsDatabaseService.updateAccount(accountId, updatedAccount);

            return {
                message: 'Update request submitted for approval.',
                account: updatedAccount,
            };
        } else {
            // ADMIN/SUPER_ADMIN path: Direct update
            const updatedAccount = {
                ...existingAccount,
                ...updateData,
                updatedBy: userEmail,
                updatedAt: now,
                activityLog: [
                    ...(existingAccount.activityLog || []),
                    {
                        action: 'UPDATED',
                        performedBy: userEmail,
                        performedAt: now,
                        details: `Account updated directly. Changes: ${this.formatChanges(
                            existingAccount,
                            updateData
                        )}`,
                    },
                ],
            };

            await this.accountsDatabaseService.updateAccount(accountId, updatedAccount);

            return {
                message: 'Account updated successfully.',
                account: updatedAccount,
            };
        }
    }

    // ✅ HELPER: Detect if any field actually changed
    private detectChanges(existing: any, updates: any): boolean {
        const fieldsToCheck = [
            'accountName',
            'accountType',
            'accountCode',
            'normalBalance',
            'description',
            'parentAccountId',
        ];

        return fieldsToCheck.some((field) => {
            if (updates[field] === undefined) return false;
            return existing[field] !== updates[field];
        });
    }

    // ✅ HELPER: Format changes for activity log
    private formatChanges(existing: any, updates: any): string {
        const changes: string[] = [];

        Object.keys(updates).forEach((key) => {
            if (existing[key] !== updates[key]) {
                changes.push(`${key}: "${existing[key]}" → "${updates[key]}"`);
            }
        });

        return changes.join(', ');
    }
}
```

**Key Patterns**:

-   ✅ Status validation before update (reject INACTIVE, FOR_DELETION, FOR_DEACTIVATION)
-   ✅ Field-level change detection (prevent no-op updates)
-   ✅ Role-based branching (USER vs ADMIN)
-   ✅ forApprovalVersion stores pending changes (spread existing + updates)
-   ✅ Activity log with detailed change description
-   ✅ Helper methods for change detection and formatting

**Critical Logic**:

-   `forApprovalVersion` = current record + proposed changes (not approved yet)
-   Change detection prevents unnecessary approval requests
-   Activity log captures exact field changes for audit trail

---

### DELETE Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/delete.handler.ts`

**Purpose**: Soft delete account (set status to INACTIVE or FOR_DEACTIVATION based on role)

**⚠️ IMPORTANT**: This handler implements SOFT DELETE because accounts are **master data/lookup entities**. For transactional records (invoices, vouchers), see the Hard Delete pattern below.

**Flow**:

```
ACTIVE/FOR_APPROVAL record:
  USER deletes → Status: FOR_DEACTIVATION → Requires approval → INACTIVE
  ADMIN deletes → Status: INACTIVE → Immediate soft delete

NEW_RECORD:
  Anyone can hard delete (not yet approved)
```

**Complete Handler Code (SOFT DELETE - For Master Data):**

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteAccountCommand } from '../impl/delete-account.command';
import { AccountsDynamodbDatabaseService, AccountStatus, UserRole } from '@workspace/backend/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand> {
    constructor(private readonly accountsDatabaseService: AccountsDynamodbDatabaseService) {}

    async execute(command: DeleteAccountCommand): Promise<any> {
        const { accountId, userEmail, userRole, reason } = command;

        // Fetch existing account
        const existingAccount = await this.accountsDatabaseService.findAccountById(accountId);

        if (!existingAccount) {
            throw new NotFoundException(`Account with ID ${accountId} not found`);
        }

        // ❌ VALIDATION: Already deleted/inactive
        if (existingAccount.status === AccountStatus.INACTIVE) {
            throw new BadRequestException('Account is already deleted');
        }

        const now = new Date().toISOString();

        // ✅ SPECIAL CASE: NEW_RECORD can be hard deleted by anyone
        if (existingAccount.status === AccountStatus.NEW_RECORD) {
            await this.accountsDatabaseService.deleteAccount(accountId);

            return {
                message: 'New record deleted successfully (hard delete).',
            };
        }

        // ✅ PATTERN: Role-based deletion
        if (userRole === UserRole.USER) {
      // USER path: Always set status to FOR_DEACTIVATION
      const deletionStatus = AccountStatus.FOR_DEACTIVATION;
                ...existingAccount,
                status: deletionStatus,
                deletionReason: reason || 'No reason provided',
                updatedBy: userEmail,
                updatedAt: now,
                activityLog: [
                    ...(existingAccount.activityLog || []),
                    {
                        action: 'DELETION_REQUESTED',
                        performedBy: userEmail,
                        performedAt: now,
                        details: `${
                            deletionStatus === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
                        } requested. Reason: ${reason || 'No reason provided'}`,
                    },
                ],
            };

            await this.accountsDatabaseService.updateAccount(accountId, updatedAccount);

            return {
                message: `${
                    deletionStatus === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
                } request submitted for approval.`,
                account: updatedAccount,
            };
        } else {
            // ADMIN/SUPER_ADMIN path: Direct soft delete (INACTIVE)
            const updatedAccount = {
                ...existingAccount,
                status: AccountStatus.INACTIVE,
                deletionReason: reason || 'Deleted by admin',
                updatedBy: userEmail,
                updatedAt: now,
                activityLog: [
                    ...(existingAccount.activityLog || []),
                    {
                        action: 'DELETED',
                        performedBy: userEmail,
                        performedAt: now,
                        details: `Account soft deleted. Reason: ${reason || 'Deleted by admin'}`,
                    },
                ],
            };

            await this.accountsDatabaseService.updateAccount(accountId, updatedAccount);

            return {
                message: 'Account deleted successfully (soft delete).',
                account: updatedAccount,
            };
        }
    }
}
```

**Key Patterns**:

-   ✅ Hard delete for NEW_RECORD (not yet in production)
-   ✅ Role-based deletion status (FOR_DEACTIVATION for users vs INACTIVE for admins)
-   ✅ Deletion reason stored for audit trail
-   ✅ Activity log with reason details

**Critical Logic**:

-   NEW_RECORD → hard delete (removes from DB)
-   USER + ACTIVE → FOR_DEACTIVATION (needs approval)
-   ADMIN + ACTIVE → INACTIVE (immediate soft delete)
-   deletionReason field captures why record was deleted

---

#### Alternative: DELETE Operation for Transactional Records (HARD DELETE)

**⚠️ Use this pattern for transactional records like invoices, vouchers, journal entries**

**Purpose**: Hard delete transactional record with approval workflow

**Flow**:

```
ACTIVE record:
  USER deletes → Status: FOR_DELETION → Requires approval → HARD DELETE from DB
  ADMIN deletes → HARD DELETE from DB (immediate removal)

NEW_RECORD:
  Anyone can hard delete (not yet approved)
```

**Complete Handler Code (HARD DELETE - For Transactional Data):**

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteInvoiceCommand } from '../impl/delete-invoice.command';
import { InvoiceDatabaseService, InvoiceStatus, UserRole } from '@workspace/backend/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@CommandHandler(DeleteInvoiceCommand)
export class DeleteInvoiceHandler implements ICommandHandler<DeleteInvoiceCommand> {
    constructor(private readonly invoiceDatabaseService: InvoiceDatabaseService) {}

    async execute(command: DeleteInvoiceCommand): Promise<any> {
        const { invoiceId, userEmail, userRole, reason } = command;

        // Fetch existing invoice
        const existingInvoice = await this.invoiceDatabaseService.findInvoiceById(invoiceId);

        if (!existingInvoice) {
            throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
        }

        const now = new Date().toISOString();

        // ✅ SPECIAL CASE: NEW_RECORD can be hard deleted by anyone
        if (existingInvoice.status === InvoiceStatus.NEW_RECORD) {
            await this.invoiceDatabaseService.deleteInvoice(invoiceId);
            return {
                message: 'New record deleted successfully (hard delete).',
            };
        }

        // ✅ PATTERN: Role-based HARD deletion
        if (userRole === UserRole.USER) {
            // USER path: Mark FOR_DELETION (pending approval for hard delete)
            const updatedInvoice = {
                ...existingInvoice,
                status: InvoiceStatus.FOR_DELETION,
                deletionReason: reason || 'No reason provided',
                updatedBy: userEmail,
                updatedAt: now,
                activityLog: [
                    ...(existingInvoice.activityLog || []),
                    {
                        action: 'DELETION_REQUESTED',
                        performedBy: userEmail,
                        performedAt: now,
                        details: `Deletion requested. Reason: ${reason || 'No reason provided'}`,
                    },
                ],
            };

            await this.invoiceDatabaseService.updateInvoice(invoiceId, updatedInvoice);

            return {
                message: 'Deletion request submitted for approval.',
                invoice: updatedInvoice,
            };
        } else {
            // ADMIN/SUPER_ADMIN path: Immediate HARD DELETE
            // Log the deletion before removing
            await this.logDeletion(existingInvoice, userEmail, reason);

            // Actually remove from database
            await this.invoiceDatabaseService.deleteInvoice(invoiceId);

            return {
                message: 'Invoice deleted successfully (hard delete).',
            };
        }
    }

    // ✅ HELPER: Log deletion to separate audit table before removing
    private async logDeletion(invoice: any, userEmail: string, reason: string): Promise<void> {
        // Store in separate deletions audit table for compliance
        await this.invoiceDatabaseService.createDeletionAudit({
            deletedRecordId: invoice.invoiceId,
            deletedRecordType: 'Invoice',
            deletedBy: userEmail,
            deletedAt: new Date().toISOString(),
            reason: reason || 'Deleted by admin',
            recordSnapshot: JSON.stringify(invoice), // Keep snapshot for audit
        });
    }
}
```

**Key Differences from Soft Delete:**

-   ✅ Uses `FOR_DELETION` status (not FOR_DEACTIVATION)
-   ✅ NO `INACTIVE` status - record is removed from main table
-   ✅ Admin deletion calls `deleteInvoice()` (hard delete) not `updateInvoice()`
-   ✅ Creates audit log in separate table before deletion (compliance requirement)
-   ✅ Record is completely removed from database, not just hidden

**When to Use Hard Delete:**

-   Invoices, Vouchers, Journal Entries
-   Purchase Orders, Sales Orders (before posting)
-   Return Goods Sold
-   Any transactional record that doesn't serve as master reference

**When NOT to Use Hard Delete:**

-   Customer, Product, Account, Supplier records
-   Any entity referenced by other transactions
-   Any master/lookup data

---

### REACTIVATE Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/update.handler.ts`

**Purpose**: Allow ADMIN/SUPER_ADMIN to reactivate INACTIVE accounts by changing status back to ACTIVE

**⚠️ IMPORTANT**: This uses the UPDATE endpoint with special status handling, not a separate endpoint.

**Flow**:

```
INACTIVE record (Admin only):
  ADMIN updates with status=ACTIVE → Status: ACTIVE (immediate reactivation)
  No approval workflow needed
  Only INACTIVE → ACTIVE transition allowed for reactivation
```

**Backend Implementation Pattern**:

**Key Changes in UpdateAccountHandler**:

1. **Allow status from DTO in admin updates**:

```typescript
private applyAdminUpdates(command: UpdateAccountsCommand, existingRecord: AccountsDto): AccountsDto {
    const updatedRecord: AccountsDto = {
        ...existingRecord,
        ...command.accountsDto,
    };

    // Allow admin to set status from DTO (for reactivation) or default to ACTIVE
    const newStatus = command.accountsDto.status || StatusEnum.ACTIVE;
    updatedRecord.status = newStatus;

    updatedRecord.activityLogs = updatedRecord.activityLogs || [];

    // Create specific log message for reactivation
    let activityMessage;
    if (existingRecord.status === StatusEnum.INACTIVE && newStatus === StatusEnum.ACTIVE) {
        activityMessage = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Account reactivated from INACTIVE to ACTIVE by ${command.user.username}`;
    } else {
        activityMessage = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Account updated by ${command.user.username}, status set to ${newStatus}`;
    }

    updatedRecord.activityLogs.push(activityMessage);
    // ... rest of update logic
}
```

2. **Add status transition validation**:

```typescript
private validateStatusTransition(existingStatus: StatusEnum, newStatus: StatusEnum | undefined): void {
    if (!newStatus || newStatus === existingStatus) {
        return;
    }

    // Only allow INACTIVE → ACTIVE transition for reactivation
    if (existingStatus === StatusEnum.INACTIVE && newStatus !== StatusEnum.ACTIVE) {
        this.logger.warn(`Invalid status transition from ${existingStatus} to ${newStatus}`);
        throw new BadRequestException(`Can only reactivate INACTIVE accounts to ACTIVE status`);
    }
}
```

3. **Publish reactivation event**:

```typescript
// In execute method, after update
if (hasApprovalPermission &&
    existingRecord.status === StatusEnum.INACTIVE &&
    updatedRecord.status === StatusEnum.ACTIVE) {
    await this.publishAccountReactivatedEvent(updatedRecord.accountingId);
}

private async publishAccountReactivatedEvent(accountingId: string): Promise<void> {
    try {
        const event: AccountEventDto = {
            eventType: AccountEventEnum.ACCOUNT_REACTIVATED,
            accountingId,
            timestamp: new Date().toISOString(),
        };
        await this.messageQueueService.sendMessageToSQS(accountEventSqsUrl, JSON.stringify(event));
    } catch (error) {
        this.logger.error(`Failed to publish account reactivated event: ${error.message}`);
    }
}
```

**Event DTO Update**:

```typescript
export enum AccountEventEnum {
    ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
    ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED', // ← New event type
}

export interface AccountEventDto {
    eventType: AccountEventEnum;
    accountingId: string;
    newAccountName?: string; // ← Made optional for reactivation events
    timestamp: string;
}
```

**Key Patterns**:

-   ✅ Uses existing UPDATE endpoint (no new route needed)
-   ✅ Admin-only operation (validated in handler)
-   ✅ Status transition validation (only INACTIVE → ACTIVE)
-   ✅ Specific activity log message for reactivation
-   ✅ Event publishing for downstream systems
-   ✅ No approval workflow (immediate reactivation)
-   ✅ No change reason required

**Frontend Implementation**:

See [ReactivateConfirmationModal](#reactivateconfirmationmodal) for UI component details.

**Critical Logic**:

-   Only ADMIN/SUPER_ADMIN can reactivate
-   Only INACTIVE records can be reactivated
-   Only INACTIVE → ACTIVE transition allowed (validated)
-   Reactivation is immediate (no approval needed)
-   Publishes ACCOUNT_REACTIVATED event for downstream processing
-   Form includes status selector visible only for admins viewing INACTIVE records

---

### APPROVE Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/approve.handler.ts`

**Purpose**: Approve pending changes based on account status (NEW_RECORD, FOR_APPROVAL, FOR_DELETION, FOR_DEACTIVATION)

**⚠️ IMPORTANT**: This handler shows SOFT DELETE approval (FOR_DEACTIVATION → INACTIVE). For transactional records using HARD DELETE, see the alternative pattern below.

**Flow (Soft Delete for Master Data)**:

```
NEW_RECORD → ACTIVE (activate new account)
FOR_APPROVAL → ACTIVE + apply forApprovalVersion (commit pending changes)
FOR_DELETION → NOT USED for master data (use FOR_DEACTIVATION instead)
FOR_DEACTIVATION → INACTIVE (execute soft delete/deactivation)
```

**Complete Handler Code (SOFT DELETE Approval):**

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveAccountCommand } from '../impl/approve-account.command';
import { AccountsDynamodbDatabaseService, AccountStatus, UserRole } from '@workspace/backend/database';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

@CommandHandler(ApproveAccountCommand)
export class ApproveAccountHandler implements ICommandHandler<ApproveAccountCommand> {
    constructor(private readonly accountsDatabaseService: AccountsDynamodbDatabaseService) {}

    async execute(command: ApproveAccountCommand): Promise<any> {
        const { accountId, userEmail, userRole } = command;

        // ✅ AUTHORIZATION: Only ADMIN and SUPER_ADMIN can approve
        if (userRole === UserRole.USER) {
            throw new ForbiddenException('Only admins can approve changes');
        }

        // Fetch existing account
        const existingAccount = await this.accountsDatabaseService.findAccountById(accountId);

        if (!existingAccount) {
            throw new NotFoundException(`Account with ID ${accountId} not found`);
        }

        const now = new Date().toISOString();

        // ✅ PATTERN: Status-based approval routing
        switch (existingAccount.status) {
            case AccountStatus.NEW_RECORD:
                return this.approveNewRecord(existingAccount, userEmail, now);

            case AccountStatus.FOR_APPROVAL:
                return this.approveUpdate(existingAccount, userEmail, now);

            case AccountStatus.FOR_DELETION:
            case AccountStatus.FOR_DEACTIVATION:
                return this.approveDeletion(existingAccount, userEmail, now);

            default:
                throw new BadRequestException(`Cannot approve account with status: ${existingAccount.status}`);
        }
    }

    // ✅ HELPER: Approve NEW_RECORD → ACTIVE
    private async approveNewRecord(account: any, userEmail: string, now: string): Promise<any> {
        const updatedAccount = {
            ...account,
            status: AccountStatus.ACTIVE,
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                ...(account.activityLog || []),
                {
                    action: 'APPROVED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: 'New record approved and activated',
                },
            ],
        };

        await this.accountsDatabaseService.updateAccount(account.accountId, updatedAccount);

        return {
            message: 'New account approved and activated successfully.',
            account: updatedAccount,
        };
    }

    // ✅ HELPER: Approve FOR_APPROVAL → ACTIVE + apply forApprovalVersion
    private async approveUpdate(account: any, userEmail: string, now: string): Promise<any> {
        if (!account.forApprovalVersion) {
            throw new BadRequestException('No pending changes found in forApprovalVersion');
        }

        // ✅ CRITICAL: Apply forApprovalVersion to main record
        const updatedAccount = {
            ...account,
            ...account.forApprovalVersion, // ← Merge pending changes
            status: AccountStatus.ACTIVE,
            forApprovalVersion: null, // ← Clear pending changes
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                ...(account.activityLog || []),
                {
                    action: 'APPROVED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: 'Update approved and applied',
                },
            ],
        };

        await this.accountsDatabaseService.updateAccount(account.accountId, updatedAccount);

        return {
            message: 'Update approved and applied successfully.',
            account: updatedAccount,
        };
    }

    // ✅ HELPER: Approve FOR_DELETION/FOR_DEACTIVATION → INACTIVE
    private async approveDeletion(account: any, userEmail: string, now: string): Promise<any> {
        const updatedAccount = {
            ...account,
            status: AccountStatus.INACTIVE,
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                ...(account.activityLog || []),
                {
                    action: 'APPROVED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: `${
                        account.status === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
                    } approved and executed`,
                },
            ],
        };

        await this.accountsDatabaseService.updateAccount(account.accountId, updatedAccount);

        return {
            message: `${
                account.status === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
            } approved successfully.`,
            account: updatedAccount,
        };
    }
}
```

**Key Patterns**:

-   ✅ Authorization check (only ADMIN/SUPER_ADMIN)
-   ✅ Switch statement routing based on status
-   ✅ Helper methods for each approval type (single responsibility)
-   ✅ forApprovalVersion merge for updates (spread operator)
-   ✅ Clear forApprovalVersion after approval
-   ✅ Status-specific success messages

**Critical Logic**:

-   NEW_RECORD → ACTIVE (no field changes, just status)
-   FOR_APPROVAL → ACTIVE + merge forApprovalVersion into main record
-   FOR_DEACTIVATION → INACTIVE (execute soft delete for master data)
-   Always clear forApprovalVersion after applying changes

---

#### Alternative: APPROVE Operation for Transactional Records (HARD DELETE)

**Purpose**: Approve hard deletion of transactional records

**Flow (Hard Delete for Transactional Data)**:

```
NEW_RECORD → ACTIVE (activate new record)
FOR_APPROVAL → ACTIVE + apply forApprovalVersion (commit pending changes)
FOR_DELETION → HARD DELETE from database (remove completely)
```

**Approval Helper for Hard Delete:**

```typescript
// ✅ HELPER: Approve FOR_DELETION → HARD DELETE (Transactional records only)
private async approveDeletion(invoice: any, userEmail: string, now: string): Promise<any> {
    // Log deletion for audit before removing
    await this.invoiceDatabaseService.createDeletionAudit({
        deletedRecordId: invoice.invoiceId,
        deletedRecordType: 'Invoice',
        deletedBy: userEmail,
        deletedAt: now,
        approvedBy: userEmail,
        reason: invoice.deletionReason || 'Deletion approved',
        recordSnapshot: JSON.stringify(invoice),
    });

    // Actually remove from database
    await this.invoiceDatabaseService.deleteInvoice(invoice.invoiceId);

    return {
        message: 'Deletion approved. Invoice removed successfully.',
    };
}
```

**Key Differences:**

-   ✅ Calls `deleteInvoice()` to hard delete (not update to INACTIVE)
-   ✅ Creates audit record before deletion
-   ✅ Returns confirmation without returning the deleted record
-   ✅ No status update - record is removed

---

### DENY Operation

**File**: `apps/accounting/accounts-api-service/src/accounts/commands/handlers/deny.handler.ts`

**Purpose**: Deny pending changes and revert to previous state or delete NEW_RECORD

**Flow**:

```
NEW_RECORD → Hard delete (reject creation)
FOR_APPROVAL → ACTIVE + clear forApprovalVersion (reject update)
FOR_DELETION → ACTIVE (reject deletion)
FOR_DEACTIVATION → ACTIVE (reject deactivation)
```

**Complete Handler Code**:

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyAccountCommand } from '../impl/deny-account.command';
import { AccountsDynamodbDatabaseService, AccountStatus, UserRole } from '@workspace/backend/database';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

@CommandHandler(DenyAccountCommand)
export class DenyAccountHandler implements ICommandHandler<DenyAccountCommand> {
    constructor(private readonly accountsDatabaseService: AccountsDynamodbDatabaseService) {}

    async execute(command: DenyAccountCommand): Promise<any> {
        const { accountId, userEmail, userRole, reason } = command;

        // ✅ AUTHORIZATION: Only ADMIN and SUPER_ADMIN can deny
        if (userRole === UserRole.USER) {
            throw new ForbiddenException('Only admins can deny changes');
        }

        // Fetch existing account
        const existingAccount = await this.accountsDatabaseService.findAccountById(accountId);

        if (!existingAccount) {
            throw new NotFoundException(`Account with ID ${accountId} not found`);
        }

        const now = new Date().toISOString();

        // ✅ PATTERN: Status-based denial routing
        switch (existingAccount.status) {
            case AccountStatus.NEW_RECORD:
                return this.denyNewRecord(accountId, userEmail, reason, now);

            case AccountStatus.FOR_APPROVAL:
                return this.denyUpdate(existingAccount, userEmail, reason, now);

            case AccountStatus.FOR_DELETION:
            case AccountStatus.FOR_DEACTIVATION:
                return this.denyDeletion(existingAccount, userEmail, reason, now);

            default:
                throw new BadRequestException(`Cannot deny account with status: ${existingAccount.status}`);
        }
    }

    // ✅ HELPER: Deny NEW_RECORD → Hard delete
    private async denyNewRecord(accountId: string, userEmail: string, reason: string, now: string): Promise<any> {
        // Hard delete the record (not approved, so remove completely)
        await this.accountsDatabaseService.deleteAccount(accountId);

        return {
            message: 'New record denied and removed successfully.',
        };
    }

    // ✅ HELPER: Deny FOR_APPROVAL → ACTIVE + clear forApprovalVersion
    private async denyUpdate(account: any, userEmail: string, reason: string, now: string): Promise<any> {
        const updatedAccount = {
            ...account,
            status: AccountStatus.ACTIVE,
            forApprovalVersion: null, // ← Discard pending changes
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                ...(account.activityLog || []),
                {
                    action: 'DENIED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: `Update denied. Reason: ${reason || 'No reason provided'}`,
                },
            ],
        };

        await this.accountsDatabaseService.updateAccount(account.accountId, updatedAccount);

        return {
            message: 'Update denied. Changes reverted to original state.',
            account: updatedAccount,
        };
    }

    // ✅ HELPER: Deny FOR_DELETION/FOR_DEACTIVATION → ACTIVE
    private async denyDeletion(account: any, userEmail: string, reason: string, now: string): Promise<any> {
        const updatedAccount = {
            ...account,
            status: AccountStatus.ACTIVE,
            deletionReason: null, // ← Clear deletion reason
            updatedBy: userEmail,
            updatedAt: now,
            activityLog: [
                ...(account.activityLog || []),
                {
                    action: 'DENIED',
                    performedBy: userEmail,
                    performedAt: now,
                    details: `${
                        account.status === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
                    } denied. Reason: ${reason || 'No reason provided'}`,
                },
            ],
        };

        await this.accountsDatabaseService.updateAccount(account.accountId, updatedAccount);

        return {
            message: `${
                account.status === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'
            } denied. Account restored to active state.`,
            account: updatedAccount,
        };
    }
}
```

**Key Patterns**:

-   ✅ Authorization check (only ADMIN/SUPER_ADMIN)
-   ✅ Switch statement routing based on status
-   ✅ Helper methods for each denial type
-   ✅ Hard delete for NEW_RECORD (reject creation entirely)
-   ✅ Clear forApprovalVersion for FOR_APPROVAL (discard pending changes)
-   ✅ Revert to ACTIVE for FOR_DELETION/FOR_DEACTIVATION
-   ✅ Store denial reason in activity log

**Critical Logic**:

-   NEW_RECORD → hard delete (not approved, so remove from DB)
-   FOR_APPROVAL → ACTIVE + clear forApprovalVersion (discard proposed changes)
-   FOR_DELETION/FOR_DEACTIVATION → ACTIVE (restore to live state)
-   Always include denial reason in activity log for audit trail

---

## Frontend Implementation

### List/Table View

**File**: `apps/web-app/src/app/accounting/accounts/page.tsx`

**Purpose**: Display paginated list of accounts with filters, search, and action buttons

**Key Features**:

-   Cursor-based pagination (DynamoDB)
-   Status filtering
-   Search by account name/code
-   Role-based action buttons (Edit/Delete/Approve/Deny)
-   Color-coded status badges

**Complete Page Code**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AccountTable from './AccountTable';
import { AccountStatus } from '@workspace/dto/accounting';

export default function AccountsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursors, setPrevCursors] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // ✅ PATTERN: Fetch accounts with pagination and filters
    const fetchAccounts = async (cursor: string | null = null) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await fetch(`/api/accounting/accounts?${params}`);
            const data = await response.json();

            setAccounts(data.accounts || []);
            setNextCursor(data.nextCursor || null);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [statusFilter, searchTerm]);

    // ✅ PATTERN: Cursor-based pagination handlers
    const handleNextPage = () => {
        if (nextCursor) {
            setPrevCursors([...prevCursors, nextCursor]);
            fetchAccounts(nextCursor);
        }
    };

    const handlePrevPage = () => {
        if (prevCursors.length > 0) {
            const newPrevCursors = [...prevCursors];
            const cursor = newPrevCursors.pop();
            setPrevCursors(newPrevCursors);
            fetchAccounts(cursor || null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Accounts</h1>
                <button
                    onClick={() => router.push('/accounting/accounts/create')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Create Account
                </button>
            </div>

            {/* ✅ PATTERN: Filters and search */}
            <div className="mb-4 flex gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-2"
                >
                    <option value="ALL">All Statuses</option>
                    <option value={AccountStatus.ACTIVE}>Active</option>
                    <option value={AccountStatus.INACTIVE}>Inactive</option>
                    <option value={AccountStatus.FOR_APPROVAL}>For Approval</option>
                    <option value={AccountStatus.FOR_DELETION}>For Deletion</option>
                    <option value={AccountStatus.FOR_DEACTIVATION}>For Deactivation</option>
                    <option value={AccountStatus.NEW_RECORD}>New Record</option>
                </select>

                <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border rounded px-3 py-2 flex-1"
                />
            </div>

            {/* ✅ COMPONENT: AccountTable handles data display and actions */}
            <AccountTable
                accounts={accounts}
                loading={loading}
                onRefresh={fetchAccounts}
                userRole={session?.user?.role}
            />

            {/* ✅ PATTERN: Pagination controls */}
            <div className="flex justify-between mt-4">
                <button
                    onClick={handlePrevPage}
                    disabled={prevCursors.length === 0}
                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={handleNextPage}
                    disabled={!nextCursor}
                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
```

**AccountTable Component** (Simplified):

```typescript
// ✅ PATTERN: Status badge color mapping
const getStatusBadgeClass = (status: AccountStatus): string => {
    switch (status) {
        case AccountStatus.ACTIVE:
            return 'bg-green-100 text-green-800';
        case AccountStatus.INACTIVE:
            return 'bg-gray-100 text-gray-800';
        case AccountStatus.FOR_APPROVAL:
            return 'bg-yellow-100 text-yellow-800';
        case AccountStatus.FOR_DELETION:
            return 'bg-red-100 text-red-800';
        case AccountStatus.FOR_DEACTIVATION:
            return 'bg-orange-100 text-orange-800';
        case AccountStatus.NEW_RECORD:
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// ✅ PATTERN: Role-based action buttons
const renderActionButtons = (account: Account, userRole: string) => {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    return (
        <div className="flex gap-2">
            {/* Edit button - available for ACTIVE or if admin viewing pending */}
            {(account.status === AccountStatus.ACTIVE || isAdmin) && (
                <button
                    onClick={() => router.push(`/accounting/accounts/edit/${account.accountId}`)}
                    className="text-blue-600 hover:underline"
                >
                    Edit
                </button>
            )}

            {/* Delete button - not for already deleted/pending deletion */}
            {![AccountStatus.INACTIVE, AccountStatus.FOR_DELETION, AccountStatus.FOR_DEACTIVATION].includes(
                account.status
            ) && (
                <button onClick={() => handleDelete(account.accountId)} className="text-red-600 hover:underline">
                    Delete
                </button>
            )}

            {/* Approve/Deny - only admins for pending records */}
            {isAdmin &&
                [
                    AccountStatus.NEW_RECORD,
                    AccountStatus.FOR_APPROVAL,
                    AccountStatus.FOR_DELETION,
                    AccountStatus.FOR_DEACTIVATION,
                ].includes(account.status) && (
                    <>
                        <button
                            onClick={() => handleApprove(account.accountId)}
                            className="text-green-600 hover:underline"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => handleDeny(account.accountId)}
                            className="text-orange-600 hover:underline"
                        >
                            Deny
                        </button>
                    </>
                )}
        </div>
    );
};
```

---

### Create View

**File**: `apps/web-app/src/app/accounting/accounts/create/page.tsx`

**Purpose**: Create new account using shared AccountForm component

**Complete Page Code**:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AccountForm from '../AccountForm';
import { AccountFormData } from '@workspace/dto/accounting';

export default function CreateAccountPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const handleSubmit = async (formData: AccountFormData) => {
        try {
            const response = await fetch('/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    userEmail: session?.user?.email,
                    userRole: session?.user?.role,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create account');
            }

            const result = await response.json();

            // ✅ PATTERN: Flash notification based on user role
            if (session?.user?.role === 'USER') {
                sessionStorage.setItem(
                    'flashMessage',
                    JSON.stringify({
                        type: 'success',
                        message: 'Account created successfully. Waiting for approval.',
                    })
                );
            } else {
                sessionStorage.setItem(
                    'flashMessage',
                    JSON.stringify({
                        type: 'success',
                        message: 'Account created successfully.',
                    })
                );
            }

            router.push('/accounting/accounts');
        } catch (error) {
            console.error('Error creating account:', error);
            alert(error.message || 'Failed to create account');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Create Account</h1>

            {/* ✅ COMPONENT: Shared form component in create mode */}
            <AccountForm
                onSubmit={handleSubmit}
                onCancel={() => router.push('/accounting/accounts')}
                isCreateMode={true}
            />
        </div>
    );
}
```

---

### Edit View

**File**: `apps/web-app/src/app/accounting/accounts/edit/[id]/page.tsx`

**Purpose**: Edit existing account with tab-based interface (Details/Approval/Logs)

**Complete Page Code**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AccountFormWrapper from '../../AccountFormWrapper';
import { AccountStatus } from '@workspace/dto/accounting';

export default function EditAccountPage() {
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    const accountId = params.id as string;

    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');

    // ✅ PATTERN: Fetch account data on mount
    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const response = await fetch(`/api/accounting/accounts/${accountId}`);
                if (!response.ok) throw new Error('Failed to fetch account');

                const data = await response.json();
                setAccount(data);

                // ✅ CRITICAL: Auto-select approval tab for admins viewing pending records
                const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '');
                const needsApproval = [
                    AccountStatus.FOR_APPROVAL,
                    AccountStatus.NEW_RECORD,
                    AccountStatus.FOR_DELETION,
                    AccountStatus.FOR_DEACTIVATION,
                ].includes(data.status);

                if (isAdmin && needsApproval) {
                    setActiveTab('approval');
                }
            } catch (error) {
                console.error('Error fetching account:', error);
                alert('Failed to load account');
                router.push('/accounting/accounts');
            } finally {
                setLoading(false);
            }
        };

        fetchAccount();
    }, [accountId, session]);

    if (loading) {
        return <div className="flex justify-center p-8">Loading...</div>;
    }

    if (!account) {
        return <div className="flex justify-center p-8">Account not found</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Edit Account</h1>

            {/* ✅ COMPONENT: Wrapper handles tabs and routing */}
            <AccountFormWrapper
                account={account}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSuccess={() => router.push('/accounting/accounts')}
                userRole={session?.user?.role}
                userEmail={session?.user?.email}
            />
        </div>
    );
}
```

**Key Patterns**:

-   ✅ Auto-select approval tab for admins viewing pending records
-   ✅ Tab state management (details/approval/logs)
-   ✅ Error handling with redirect to list view

---

### AccountForm Component

**File**: `apps/web-app/src/app/accounting/accounts/AccountForm.tsx`

**Purpose**: Reusable form component for both create and edit modes with field-level validation

**Complete Component Code**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AccountFormData, AccountType, NormalBalance, AccountStatus } from '@workspace/dto/accounting';

interface AccountFormProps {
    onSubmit: (data: AccountFormData) => Promise<void>;
    onCancel: () => void;
    initialData?: Partial<AccountFormData>;
    isCreateMode?: boolean;
    isReadOnly?: boolean;
    selectedAccount?: any; // ← Full account object for edit mode
}

export default function AccountForm({
    onSubmit,
    onCancel,
    initialData = {},
    isCreateMode = false,
    isReadOnly = false,
    selectedAccount,
}: AccountFormProps) {
    // ✅ PATTERN: Form state management
    const [formData, setFormData] = useState<AccountFormData>({
        accountName: initialData.accountName || '',
        accountType: initialData.accountType || AccountType.ASSET,
        accountCode: initialData.accountCode || '',
        normalBalance: initialData.normalBalance || NormalBalance.DEBIT,
        description: initialData.description || '',
        parentAccountId: initialData.parentAccountId || null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // ✅ CRITICAL FIX: Reset form when selectedAccount changes (edit mode)
    // DO NOT include userHasInteracted in dependency array - causes infinite loop
    useEffect(() => {
        if (!isCreateMode && selectedAccount) {
            setFormData({
                accountName: selectedAccount.accountName || '',
                accountType: selectedAccount.accountType || AccountType.ASSET,
                accountCode: selectedAccount.accountCode || '',
                normalBalance: selectedAccount.normalBalance || NormalBalance.DEBIT,
                description: selectedAccount.description || '',
                parentAccountId: selectedAccount.parentAccountId || null,
            });
        }
    }, [isCreateMode, selectedAccount]); // ← Only these dependencies

    // ✅ PATTERN: Determine if fields can be edited
    const canEditFields = !isReadOnly && (isCreateMode || selectedAccount?.status === AccountStatus.ACTIVE);

    // ✅ PATTERN: Field-level validation
    const validateField = (name: string, value: any): string | null => {
        switch (name) {
            case 'accountName':
                if (!value || value.trim() === '') return 'Account name is required';
                if (value.length > 200) return 'Account name cannot exceed 200 characters';
                return null;

            case 'accountCode':
                if (!value || value.trim() === '') return 'Account code is required';
                if (value.length > 50) return 'Account code cannot exceed 50 characters';
                return null;

            case 'accountType':
                if (!value) return 'Account type is required';
                return null;

            case 'normalBalance':
                if (!value) return 'Normal balance is required';
                return null;

            default:
                return null;
        }
    };

    // ✅ PATTERN: Handle field change with validation
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error for this field
        const error = validateField(name, value);
        setErrors((prev) => ({
            ...prev,
            [name]: error || '',
        }));
    };

    // ✅ PATTERN: Form submission with validation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach((key) => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            {/* Account Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    className={`w-full border rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${errors.accountName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter account name"
                />
                {errors.accountName && <p className="text-red-500 text-sm mt-1">{errors.accountName}</p>}
            </div>

            {/* Account Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                </label>
                <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    className={`w-full border rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${errors.accountType ? 'border-red-500' : 'border-gray-300'}`}
                >
                    {Object.values(AccountType).map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
                {errors.accountType && <p className="text-red-500 text-sm mt-1">{errors.accountType}</p>}
            </div>

            {/* Account Code */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="accountCode"
                    value={formData.accountCode}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    className={`w-full border rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${errors.accountCode ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="e.g., 1000"
                />
                {errors.accountCode && <p className="text-red-500 text-sm mt-1">{errors.accountCode}</p>}
            </div>

            {/* Normal Balance */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Normal Balance <span className="text-red-500">*</span>
                </label>
                <select
                    name="normalBalance"
                    value={formData.normalBalance}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    className={`w-full border rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${errors.normalBalance ? 'border-red-500' : 'border-gray-300'}`}
                >
                    <option value={NormalBalance.DEBIT}>DEBIT</option>
                    <option value={NormalBalance.CREDIT}>CREDIT</option>
                </select>
                {errors.normalBalance && <p className="text-red-500 text-sm mt-1">{errors.normalBalance}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    rows={3}
                    className={`w-full border border-gray-300 rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Optional description"
                />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={!canEditFields || submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Saving...' : isCreateMode ? 'Create Account' : 'Save Changes'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
```

**Critical Patterns**:

-   ✅ **useEffect dependency fix**: Only `[isCreateMode, selectedAccount]` - removing `userHasInteracted` fixes input lag
-   ✅ **canEditFields logic**: `!isReadOnly && (isCreateMode || status === ACTIVE)` - INACTIVE records cannot have fields edited (only reactivation allowed)
-   ✅ **canSave logic**: `isCreateMode || status === ACTIVE` - Save button disabled for INACTIVE records
-   ✅ **canReactivate logic**: `hasApprovalPermission && status === INACTIVE` - REACTIVATE button enabled for admins viewing INACTIVE records
-   ✅ **Field-level validation**: Validates on blur and submit
-   ✅ **Disabled field styling**: Gray background + cursor-not-allowed for read-only fields
-   ✅ **Error display**: Red border + error message below field
-   ✅ **Conditional button rendering**: REACTIVATE button (green) for INACTIVE records, DELETE button for others

**Button Rendering Logic**:

```typescript
{
    /* REACTIVATE Button - Shows for INACTIVE records (Admin only) */
}
{
    mode === 'edit' && hasApprovalPermission && accountData?.status === StatusEnum.INACTIVE && (
        <button
            type="button"
            onClick={onReactivate}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-base font-semibold text-white hover:bg-green-700"
        >
            <ArrowPathIcon className="mr-2 inline-block h-5 w-5" />
            REACTIVATE
        </button>
    );
}

{
    /* DELETE Button - Shows for non-INACTIVE records only */
}
{
    mode === 'edit' && accountData?.status !== StatusEnum.INACTIVE && (
        <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-base font-semibold text-white hover:bg-red-700"
        >
            <TrashIcon className="mr-2 inline-block h-5 w-5" />
            DELETE
        </button>
    );
}
```

---

### AccountFormWrapper Component

**File**: `apps/web-app/src/app/accounting/accounts/AccountFormWrapper.tsx`

**Purpose**: Tab-based wrapper for edit page (Details/Approval/Logs tabs)

**Complete Component Code**:

```typescript
'use client';

import { useState } from 'react';
import AccountForm from './AccountForm';
import { AccountStatus } from '@workspace/dto/accounting';

interface AccountFormWrapperProps {
    account: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onSuccess: () => void;
    userRole: string;
    userEmail: string;
}

export default function AccountFormWrapper({
    account,
    activeTab,
    onTabChange,
    onSuccess,
    userRole,
    userEmail,
}: AccountFormWrapperProps) {
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [denyReason, setDenyReason] = useState('');

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isPending = [
        AccountStatus.FOR_APPROVAL,
        AccountStatus.NEW_RECORD,
        AccountStatus.FOR_DELETION,
        AccountStatus.FOR_DEACTIVATION,
    ].includes(account.status);

    // ✅ PATTERN: Status-specific tab colors
    const getTabColorClasses = (status: AccountStatus) => {
        switch (status) {
            case AccountStatus.ACTIVE:
                return 'bg-green-100 text-green-800 border-green-300';
            case AccountStatus.INACTIVE:
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case AccountStatus.FOR_APPROVAL:
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case AccountStatus.FOR_DELETION:
                return 'bg-red-100 text-red-800 border-red-300';
            case AccountStatus.FOR_DEACTIVATION:
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case AccountStatus.NEW_RECORD:
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // ✅ PATTERN: Status-specific tab labels
    const getStatusText = (status: AccountStatus): string => {
        switch (status) {
            case AccountStatus.FOR_DELETION:
                return 'Deletion Request';
            case AccountStatus.FOR_DEACTIVATION:
                return 'Deactivation Request';
            case AccountStatus.FOR_APPROVAL:
                return 'Update Approval';
            case AccountStatus.NEW_RECORD:
                return 'New Record Approval';
            default:
                return status;
        }
    };

    // ✅ HANDLER: Update account
    const handleUpdate = async (formData: any) => {
        try {
            const response = await fetch(`/api/accounting/accounts/${account.accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    userEmail,
                    userRole,
                }),
            });

            if (!response.ok) throw new Error('Failed to update account');

            sessionStorage.setItem(
                'flashMessage',
                JSON.stringify({
                    type: 'success',
                    message: userRole === 'USER' ? 'Update submitted for approval.' : 'Account updated successfully.',
                })
            );

            onSuccess();
        } catch (error) {
            console.error('Error updating account:', error);
            alert('Failed to update account');
        }
    };

    // ✅ HANDLER: Approve pending changes
    const handleApprove = async () => {
        try {
            const response = await fetch(`/api/accounting/accounts/${account.accountId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail, userRole }),
            });

            if (!response.ok) throw new Error('Failed to approve');

            sessionStorage.setItem(
                'flashMessage',
                JSON.stringify({
                    type: 'success',
                    message: 'Changes approved successfully.',
                })
            );

            onSuccess();
        } catch (error) {
            console.error('Error approving:', error);
            alert('Failed to approve changes');
        }
    };

    // ✅ HANDLER: Deny pending changes
    const handleDeny = async () => {
        if (!denyReason.trim()) {
            alert('Please provide a reason for denial');
            return;
        }

        try {
            const response = await fetch(`/api/accounting/accounts/${account.accountId}/deny`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail, userRole, reason: denyReason }),
            });

            if (!response.ok) throw new Error('Failed to deny');

            sessionStorage.setItem(
                'flashMessage',
                JSON.stringify({
                    type: 'info',
                    message: 'Changes denied successfully.',
                })
            );

            onSuccess();
        } catch (error) {
            console.error('Error denying:', error);
            alert('Failed to deny changes');
        } finally {
            setShowDenyDialog(false);
            setDenyReason('');
        }
    };

    // ✅ RENDER: Approval tab content
    const renderApprovalContent = () => {
        if (account.status === AccountStatus.FOR_APPROVAL && account.forApprovalVersion) {
            return (
                <div className="bg-yellow-50 border border-yellow-300 rounded p-6">
                    <h3 className="text-xl font-semibold mb-4 text-yellow-800">Pending Update Approval</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <h4 className="font-medium mb-2">Current Version</h4>
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="font-medium">Account Name:</dt>
                                    <dd>{account.accountName}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Account Code:</dt>
                                    <dd>{account.accountCode}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Account Type:</dt>
                                    <dd>{account.accountType}</dd>
                                </div>
                            </dl>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Proposed Version</h4>
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="font-medium">Account Name:</dt>
                                    <dd className="font-semibold text-yellow-700">
                                        {account.forApprovalVersion.accountName}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Account Code:</dt>
                                    <dd className="font-semibold text-yellow-700">
                                        {account.forApprovalVersion.accountCode}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Account Type:</dt>
                                    <dd className="font-semibold text-yellow-700">
                                        {account.forApprovalVersion.accountType}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleApprove}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                        >
                            Approve Changes
                        </button>
                        <button
                            onClick={() => setShowDenyDialog(true)}
                            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                        >
                            Deny Changes
                        </button>
                    </div>
                </div>
            );
        }

        if (account.status === AccountStatus.NEW_RECORD) {
            return (
                <div className="bg-blue-50 border border-blue-300 rounded p-6">
                    <h3 className="text-xl font-semibold mb-4 text-blue-800">New Record Approval</h3>
                    <p className="mb-4 text-sm">This account is waiting for approval to be activated.</p>
                    <div className="flex gap-4">
                        <button
                            onClick={handleApprove}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                        >
                            Approve & Activate
                        </button>
                        <button
                            onClick={() => setShowDenyDialog(true)}
                            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                        >
                            Deny & Delete
                        </button>
                    </div>
                </div>
            );
        }

        if (account.status === AccountStatus.FOR_DELETION || account.status === AccountStatus.FOR_DEACTIVATION) {
            return (
                <div
                    className={`border rounded p-6 ${
                        account.status === AccountStatus.FOR_DEACTIVATION
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-red-50 border-red-300'
                    }`}
                >
                    <h3
                        className={`text-xl font-semibold mb-4 ${
                            account.status === AccountStatus.FOR_DEACTIVATION ? 'text-orange-800' : 'text-red-800'
                        }`}
                    >
                        {account.status === AccountStatus.FOR_DEACTIVATION
                            ? 'Deactivation Request'
                            : 'Deletion Request'}
                    </h3>
                    <p className="mb-2 text-sm">
                        <strong>Reason:</strong> {account.deletionReason || 'No reason provided'}
                    </p>
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={handleApprove}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                        >
                            Approve {account.status === AccountStatus.FOR_DEACTIVATION ? 'Deactivation' : 'Deletion'}
                        </button>
                        <button
                            onClick={() => setShowDenyDialog(true)}
                            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                        >
                            Deny & Restore
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    };

    // ✅ RENDER: Activity log tab
    const renderActivityLog = () => {
        if (!account.activityLog || account.activityLog.length === 0) {
            return <p className="text-gray-500">No activity recorded yet.</p>;
        }

        return (
            <div className="space-y-4">
                {account.activityLog.map((log: any, index: number) => (
                    <div key={index} className="border border-gray-300 rounded p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-blue-700">{log.action}</span>
                            <span className="text-sm text-gray-500">{new Date(log.performedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{log.details}</p>
                        <p className="text-xs text-gray-500">By: {log.performedBy}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div>
            {/* ✅ PATTERN: Status badge */}
            <div
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6 border-2 ${getTabColorClasses(
                    account.status
                )}`}
            >
                Status: {getStatusText(account.status)}
            </div>

            {/* ✅ PATTERN: Tab navigation */}
            <div className="border-b border-gray-300 mb-6">
                <nav className="flex space-x-4">
                    <button
                        onClick={() => onTabChange('details')}
                        className={`px-4 py-2 font-medium ${
                            activeTab === 'details'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-blue-600'
                        }`}
                    >
                        Details
                    </button>

                    {isAdmin && isPending && (
                        <button
                            onClick={() => onTabChange('approval')}
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'approval'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-blue-600'
                            }`}
                        >
                            {getStatusText(account.status)}
                        </button>
                    )}

                    <button
                        onClick={() => onTabChange('logs')}
                        className={`px-4 py-2 font-medium ${
                            activeTab === 'logs'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-blue-600'
                        }`}
                    >
                        Activity Log
                    </button>
                </nav>
            </div>

            {/* ✅ PATTERN: Tab content */}
            <div>
                {activeTab === 'details' && (
                    <AccountForm
                        onSubmit={handleUpdate}
                        onCancel={onSuccess}
                        initialData={account}
                        isCreateMode={false}
                        isReadOnly={account.status !== AccountStatus.ACTIVE}
                        selectedAccount={account}
                    />
                )}

                {activeTab === 'approval' && renderApprovalContent()}

                {activeTab === 'logs' && renderActivityLog()}
            </div>

            {/* ✅ MODAL: Deny reason dialog */}
            {showDenyDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-4">Deny Changes</h3>
                        <p className="text-sm text-gray-600 mb-4">Please provide a reason for denying these changes:</p>
                        <textarea
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                            placeholder="Enter reason..."
                        />
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => {
                                    setShowDenyDialog(false);
                                    setDenyReason('');
                                }}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeny}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Confirm Denial
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

**Key Patterns**:

-   ✅ **Status-specific colors**: Each status has unique color scheme (green/gray/yellow/red/orange/blue)
-   ✅ **Dynamic tab labels**: Tab text changes based on status (e.g., "Deletion Request" for FOR_DELETION)
-   ✅ **Comparison view**: FOR_APPROVAL shows current vs. proposed side-by-side
-   ✅ **Activity log**: Chronological audit trail with timestamps and user info
-   ✅ **Deny reason modal**: Required input for denial with validation

---

### Modal Components

**ReactivateConfirmationModal**: Confirm account reactivation

```typescript
interface ReactivateConfirmationModalProps {
    show: boolean;
    account: AccountsDto | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ReactivateConfirmationModal({
    show,
    account,
    onConfirm,
    onCancel,
}: ReactivateConfirmationModalProps) {
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onCancel();
            }
        };
        if (show) {
            document.addEventListener('keydown', handler);
        }
        return () => document.removeEventListener('keydown', handler);
    }, [show, onCancel]);

    if (!show || !account) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-xl text-green-600">
                        ✓
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-gray-900">Reactivate Account</p>
                        <p className="text-sm text-gray-500">Confirm account reactivation</p>
                    </div>
                </div>
                <p className="mb-6 text-sm text-gray-600 leading-relaxed">
                    Are you sure you want to reactivate <strong className="text-gray-900">{account.accountName}</strong>?
                    This will change the status from <span className="font-semibold text-gray-500">Inactive</span> to <span className="font-semibold text-green-600">
                        Active
                    </span>.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl border-2 border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        No
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-3 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
                    >
                        Yes, Reactivate
                    </button>
                </div>
            </div>
        </div>
    );
}
```

**Key Features**:

-   ✅ Green theme (vs red for delete) for positive action
-   ✅ Clear status change messaging (Inactive → Active)
-   ✅ Simple Yes/No buttons (not "Confirm/Cancel")
-   ✅ Keyboard support (Escape to close)
-   ✅ Consistent with modal patterns

---

**DeleteConfirmationModal**: Confirm soft delete action

```typescript
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    accountName: string;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, accountName }: DeleteConfirmationModalProps) {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
                <p className="mb-4">
                    Are you sure you want to delete <strong>{accountName}</strong>?
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for deletion (optional)"
                    className="w-full border rounded px-3 py-2 mb-4"
                />
                <div className="flex gap-4 justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(reason);
                            onClose();
                            setReason('');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
```

---

## UI/UX Standards

### Status Badge Colors

**CRITICAL**: Every status has a specific color scheme. Always implement all 6:

```typescript
const STATUS_COLORS = {
    ACTIVE: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
    },
    INACTIVE: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
    },
    FOR_APPROVAL: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
    },
    FOR_DELETION: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
    },
    FOR_DEACTIVATION: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
    },
    NEW_RECORD: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
    },
};
```

### Button Styles

```typescript
const BUTTON_STYLES = {
    primary: 'bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50',
    danger: 'bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700',
    success: 'bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700',
    secondary: 'bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400',
    text: 'text-blue-600 hover:underline',
};
```

### Responsive Breakpoints

```css
/* Mobile-first approach */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Desktops */
xl: 1280px  /* Large screens */
```

### Form Validation Styles

```typescript
// Input field with error
<input
    className={`
    w-full border rounded px-3 py-2
    ${errors.fieldName ? 'border-red-500' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
  `}
/>;

// Error message
{
    errors.fieldName && <p className="text-red-500 text-sm mt-1">{errors.fieldName}</p>;
}
```

---

## Business Rules & Validation

### Field Validation Rules

| Field           | Required | Max Length | Unique | Pattern                 |
| --------------- | -------- | ---------- | ------ | ----------------------- |
| accountName     | ✅       | 200        | ❌     | Alphanumeric + spaces   |
| accountCode     | ✅       | 50         | ✅     | Alphanumeric, no spaces |
| accountType     | ✅       | -          | ❌     | Must be valid enum      |
| normalBalance   | ✅       | -          | ❌     | DEBIT or CREDIT         |
| description     | ❌       | 1000       | ❌     | Any text                |
| parentAccountId | ❌       | -          | ❌     | Must exist if provided  |

### Status Transition Rules

```
CREATE:
  USER → NEW_RECORD
  ADMIN/SUPER_ADMIN → ACTIVE

UPDATE:
  ACTIVE (USER) → FOR_APPROVAL
  ACTIVE (ADMIN) → ACTIVE (direct)
  FOR_APPROVAL (USER) → FOR_APPROVAL (update pending)
  FOR_APPROVAL (ADMIN) → FOR_APPROVAL (direct)

DELETE:
  ACTIVE (USER) → FOR_DELETION or FOR_DEACTIVATION
  ACTIVE (ADMIN) → INACTIVE
  NEW_RECORD (ANY) → Hard delete

APPROVE:
  NEW_RECORD → ACTIVE
  FOR_APPROVAL → ACTIVE (apply forApprovalVersion)
  FOR_DELETION → INACTIVE
  FOR_DEACTIVATION → INACTIVE

DENY:
  NEW_RECORD → Hard delete
  FOR_APPROVAL → ACTIVE (clear forApprovalVersion)
  FOR_DELETION → ACTIVE
  FOR_DEACTIVATION → ACTIVE
```

### Edit Permission Matrix

| Status           | USER Can Edit       | ADMIN Can Edit | Notes                             |
| ---------------- | ------------------- | -------------- | --------------------------------- |
| ACTIVE           | ✅ (→ FOR_APPROVAL) | ✅ (Direct)    | Normal edit flow                  |
| INACTIVE         | ❌                  | ❌             | Soft deleted, cannot edit fields  |
| FOR_APPROVAL     | ✅ (Update pending) | ✅ (Direct)    | Can modify pending changes        |
| FOR_DELETION     | ❌                  | ❌             | Pending deletion, cannot edit     |
| FOR_DEACTIVATION | ❌                  | ❌             | Pending deactivation, cannot edit |
| NEW_RECORD       | ❌                  | ✅ (Direct)    | Pending approval, admin can edit  |

### Form Field State for INACTIVE Records

**CRITICAL GUIDELINE**: When a record has status INACTIVE (soft deleted), the form should have the following state:

-   ✅ **All form fields DISABLED** - No field editing allowed (prevents accidental modifications)
-   ✅ **REACTIVATE button ENABLED** - Only for ADMIN/SUPER_ADMIN (changes status to ACTIVE)
-   ❌ **Save Changes button DISABLED** - Cannot save changes to soft-deleted record
-   ✅ **Cancel button ENABLED** - User can navigate away

**Implementation Pattern**:

```typescript
// In form component
const canEditFields = !isReadOnly && (isCreateMode || status === StatusEnum.ACTIVE);
const canSave = isCreateMode || status === StatusEnum.ACTIVE;
const canReactivate = hasApprovalPermission && status === StatusEnum.INACTIVE;

// Field rendering
<input disabled={!canEditFields} />

// Button rendering
<button disabled={!canSave}>Save Changes</button>
{canReactivate && <button onClick={handleReactivate}>Reactivate</button>}
```

**Rationale**: INACTIVE records are soft-deleted and should be treated as read-only. The only allowed operation is reactivation (status change to ACTIVE), which restores the record to active use. Editing fields of a soft-deleted record would be inconsistent with the soft-delete pattern.

---

## Status Lifecycle & Transitions

### Visual Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CREATE FLOW                              │
└─────────────────────────────────────────────────────────────────┘

USER creates:
  [Create Form] → NEW_RECORD → (ADMIN approves) → ACTIVE
                             → (ADMIN denies) → [Hard Delete]

ADMIN creates:
  [Create Form] → ACTIVE


┌─────────────────────────────────────────────────────────────────┐
│                         UPDATE FLOW                              │
└─────────────────────────────────────────────────────────────────┘

USER updates ACTIVE:
  ACTIVE → FOR_APPROVAL (forApprovalVersion created)
         → (ADMIN approves) → ACTIVE (changes applied)
         → (ADMIN denies) → ACTIVE (changes discarded)

ADMIN updates ACTIVE:
  ACTIVE → ACTIVE (direct update, no approval needed)


┌─────────────────────────────────────────────────────────────────┐
│                         DELETE FLOW                              │
└─────────────────────────────────────────────────────────────────┘

USER deletes ACTIVE:
  ACTIVE → FOR_DEACTIVATION
         → (ADMIN approves) → INACTIVE
         → (ADMIN denies) → ACTIVE

ADMIN deletes ACTIVE:
  ACTIVE → INACTIVE (immediate soft delete)

Anyone deletes NEW_RECORD:
  NEW_RECORD → [Hard Delete]
```

---

## Role-Based Authorization

### Permission Summary

| Operation     | USER                      | ADMIN    | SUPER_ADMIN |
| ------------- | ------------------------- | -------- | ----------- |
| Create        | NEW_RECORD                | ACTIVE   | ACTIVE      |
| Update ACTIVE | FOR_APPROVAL              | Direct   | Direct      |
| Delete ACTIVE | FOR_DEACTIVATION          | INACTIVE | INACTIVE    |
| Approve       | ❌                        | ✅       | ✅          |
| Deny          | ❌                        | ✅       | ✅          |
| View All      | ✅                        | ✅       | ✅          |
| Edit Pending  | Update forApprovalVersion | Direct   | Direct      |

### Authorization Checks (Backend)

```typescript
// In handler
if (userRole === UserRole.USER) {
    throw new ForbiddenException('Only admins can approve changes');
}

// Alternative check
const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
if (!isAdmin) {
    // Reject action
}
```

### Authorization Checks (Frontend)

```typescript
// Component-level
const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '');

// Conditional rendering
{
    isAdmin && <button onClick={handleApprove}>Approve</button>;
}

// Conditional tab visibility
{
    isAdmin && isPending && <Tab>Approval</Tab>;
}
```

---

## Code Templates

### Backend Command Handler Template

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { YourCommand } from '../impl/your.command';
import {
  YourDatabaseService,
  YourStatus,
  UserRole,
} from '@workspace/backend/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@CommandHandler(YourCommand)
export class YourCommandHandler implements ICommandHandler<YourCommand> {
  constructor(
    private readonly databaseService: YourDatabaseService
  ) {}

  async execute(command: YourCommand): Promise<any> {
    const { id, data, userEmail, userRole } = command;

    // 1. Fetch existing record
    const existing = await this.databaseService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }

    // 2. Validate status/permissions
    if (/* invalid status */) {
      throw new BadRequestException('Cannot perform this action');
    }

    // 3. Perform operation with role-based logic
    const now = new Date().toISOString();

    if (userRole === UserRole.USER) {
      // User path: needs approval
      const updated = {
        ...existing,
        status: YourStatus.FOR_APPROVAL,
        forApprovalVersion: { ...existing, ...data },
        updatedBy: userEmail,
        updatedAt: now,
        activityLog: [
          ...(existing.activityLog || []),
          {
            action: 'ACTION_REQUESTED',
            performedBy: userEmail,
            performedAt: now,
            details: 'Description of what changed',
          },
        ],
      };
      await this.databaseService.update(id, updated);
      return { message: 'Request submitted for approval.', record: updated };
    } else {
      // Admin path: direct action
      const updated = {
        ...existing,
        ...data,
        updatedBy: userEmail,
        updatedAt: now,
        activityLog: [
          ...(existing.activityLog || []),
          {
            action: 'ACTION_PERFORMED',
            performedBy: userEmail,
            performedAt: now,
            details: 'Description of what changed',
          },
        ],
      };
      await this.databaseService.update(id, updated);
      return { message: 'Action completed successfully.', record: updated };
    }
  }
}
```

### Frontend Form Component Template

```typescript
'use client';

import { useState, useEffect } from 'react';

interface YourFormProps {
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    initialData?: any;
    isCreateMode?: boolean;
    isReadOnly?: boolean;
    selectedRecord?: any;
}

export default function YourForm({
    onSubmit,
    onCancel,
    initialData = {},
    isCreateMode = false,
    isReadOnly = false,
    selectedRecord,
}: YourFormProps) {
    const [formData, setFormData] = useState({
        field1: initialData.field1 || '',
        field2: initialData.field2 || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // ✅ CRITICAL: Only reset when selectedRecord changes
    useEffect(() => {
        if (!isCreateMode && selectedRecord) {
            setFormData({
                field1: selectedRecord.field1 || '',
                field2: selectedRecord.field2 || '',
            });
        }
    }, [isCreateMode, selectedRecord]);

    const canEditFields = !isReadOnly && (isCreateMode || selectedRecord?.status === 'ACTIVE');

    const validateField = (name: string, value: any): string | null => {
        if (!value || value.trim() === '') {
            return `${name} is required`;
        }
        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach((key) => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Submission error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div>
                <label className="block text-sm font-medium mb-1">
                    Field 1 <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="field1"
                    value={formData.field1}
                    onChange={handleChange}
                    disabled={!canEditFields}
                    className={`w-full border rounded px-3 py-2 ${
                        !canEditFields ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${errors.field1 ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.field1 && <p className="text-red-500 text-sm mt-1">{errors.field1}</p>}
            </div>

            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={!canEditFields || submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
                </button>
                <button type="button" onClick={onCancel} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">
                    Cancel
                </button>
            </div>
        </form>
    );
}
```

---

## Anti-Patterns & Common Mistakes

### ❌ Anti-Pattern 1: Including User Interaction State in useEffect Dependencies

**Problem**: Causes infinite loop when typing in form fields

```typescript
// ❌ BAD
useEffect(() => {
    if (!isCreateMode && selectedAccount) {
        setFormData({ ...selectedAccount });
    }
}, [isCreateMode, selectedAccount, userHasInteracted]); // ← userHasInteracted changes on every keystroke
```

**Solution**:

```typescript
// ✅ GOOD
useEffect(() => {
    if (!isCreateMode && selectedAccount) {
        setFormData({ ...selectedAccount });
    }
}, [isCreateMode, selectedAccount]); // ← Only reset when selectedAccount changes
```

---

### ❌ Anti-Pattern 2: Missing Status Cases in Switch Statements

**Problem**: Runtime errors when new status is added

```typescript
// ❌ BAD
switch (status) {
    case AccountStatus.ACTIVE:
        return 'green';
    case AccountStatus.INACTIVE:
        return 'gray';
    default:
        return 'gray'; // ← FOR_DEACTIVATION falls through to default
}
```

**Solution**:

```typescript
// ✅ GOOD
switch (status) {
    case AccountStatus.ACTIVE:
        return 'green';
    case AccountStatus.INACTIVE:
        return 'gray';
    case AccountStatus.FOR_APPROVAL:
        return 'yellow';
    case AccountStatus.FOR_DELETION:
        return 'red';
    case AccountStatus.FOR_DEACTIVATION:
        return 'orange';
    case AccountStatus.NEW_RECORD:
        return 'blue';
    default:
        throw new Error(`Unknown status: ${status}`);
}
```

---

### ❌ Anti-Pattern 3: Forgetting to Clear forApprovalVersion After Approval

**Problem**: Old pending changes persist after approval

```typescript
// ❌ BAD
const updatedAccount = {
    ...account,
    ...account.forApprovalVersion,
    status: AccountStatus.ACTIVE,
    // Missing: forApprovalVersion: null
};
```

**Solution**:

```typescript
// ✅ GOOD
const updatedAccount = {
    ...account,
    ...account.forApprovalVersion,
    status: AccountStatus.ACTIVE,
    forApprovalVersion: null, // ← Always clear after applying
};
```

---

### ❌ Anti-Pattern 4: Not Including All Approvable Statuses in Approval Tab Trigger

**Problem**: Admin doesn't see approval tab for certain pending records

```typescript
// ❌ BAD
const needsApproval = [AccountStatus.FOR_APPROVAL, AccountStatus.NEW_RECORD].includes(status); // ← Missing FOR_DELETION and FOR_DEACTIVATION
```

**Solution**:

```typescript
// ✅ GOOD
const needsApproval = [
    AccountStatus.FOR_APPROVAL,
    AccountStatus.NEW_RECORD,
    AccountStatus.FOR_DELETION,
    AccountStatus.FOR_DEACTIVATION,
].includes(status);
```

---

### ❌ Anti-Pattern 5: Allowing Edit on Non-ACTIVE Records

**Problem**: Users can modify records that are pending deletion or already deleted

```typescript
// ❌ BAD
const canEdit = !isReadOnly; // ← Doesn't check status
```

**Solution**:

```typescript
// ✅ GOOD
const canEdit = !isReadOnly && (isCreateMode || status === AccountStatus.ACTIVE);
```

---

## Implementation Checklists

### ✅ CREATE Operation Checklist

-   [ ] Generate unique ID (UUID)
-   [ ] Implement role-based status assignment (USER → NEW_RECORD, ADMIN → ACTIVE)
-   [ ] Initialize activityLog with creation event
-   [ ] Set createdBy, createdAt, updatedBy, updatedAt
-   [ ] Return different success messages based on status
-   [ ] Validate all required fields in DTO
-   [ ] Test with USER and ADMIN roles

### ✅ UPDATE Operation Checklist

-   [ ] Fetch existing record and validate existence
-   [ ] Reject updates for INACTIVE, FOR_DELETION, FOR_DEACTIVATION statuses (except INACTIVE → ACTIVE for admins)
-   [ ] Implement field-level change detection
-   [ ] Return early if no changes detected
-   [ ] For USER: Store changes in forApprovalVersion, set status to FOR_APPROVAL
-   [ ] For ADMIN: Apply changes directly
-   [ ] For ADMIN reactivating INACTIVE: Accept status from DTO, validate INACTIVE → ACTIVE transition only
-   [ ] Add detailed change description to activityLog (specific message for reactivation)
-   [ ] Publish ACCOUNT_REACTIVATED event when status changes from INACTIVE to ACTIVE
-   [ ] Test with USER and ADMIN roles
-   [ ] Test with no changes (should return early)
-   [ ] Test INACTIVE → ACTIVE reactivation (admin only)

### ✅ DELETE Operation Checklist

**For Master Data (Soft Delete - INACTIVE/FOR_DEACTIVATION):**

-   [ ] Determine if this is master data (customer, product, account, etc.)
-   [ ] Fetch existing record and validate existence
-   [ ] Reject if already INACTIVE
-   [ ] For NEW_RECORD: Hard delete (remove from DB)
-   [ ] For USER: Set status to FOR_DEACTIVATION
-   [ ] For ADMIN: Set status to INACTIVE
-   [ ] Store deletion reason
-   [ ] Add deletion event to activityLog
-   [ ] Test with USER and ADMIN roles
-   [ ] Test with NEW_RECORD (should hard delete)

**For Transactional Data (Hard Delete - FOR_DELETION):**

-   [ ] Determine if this is transactional data (invoice, voucher, journal entry, etc.)
-   [ ] Fetch existing record and validate existence
-   [ ] For NEW_RECORD: Hard delete immediately
-   [ ] For USER: Set status to FOR_DELETION (marks for hard delete pending approval)
-   [ ] For ADMIN: Create audit log then call deleteRecord() to hard delete
-   [ ] Store deletion reason in audit log
-   [ ] DO NOT use INACTIVE or FOR_DEACTIVATION statuses
-   [ ] Test with USER and ADMIN roles
-   [ ] Verify admin deletion removes record from main table
-   [ ] Verify deletion audit log is created

-   [ ] Fetch existing record and validate existence
-   [ ] Reject if already INACTIVE
-   [ ] For NEW_RECORD: Hard delete (remove from DB)
-   [ ] For NEW_RECORD: Hard delete (remove from DB)
-   [ ] For USER: Set status to FOR_DEACTIVATION
-   [ ] For ADMIN: Set status to INACTIVE
-   [ ] Store deletion reason
-   [ ] Add deletion event to activityLog
-   [ ] Test with USER and ADMIN roles
-   [ ] Test with NEW_RECORD (should hard delete)

### ✅ APPROVE Operation Checklist

**For Master Data (Soft Delete Approval):**

-   [ ] Check authorization (only ADMIN/SUPER_ADMIN)
-   [ ] Implement switch statement for all approvable statuses
-   [ ] For NEW_RECORD: Change to ACTIVE
-   [ ] For FOR_APPROVAL: Merge forApprovalVersion, set to ACTIVE, clear forApprovalVersion
-   [ ] For FOR_DEACTIVATION: Set to INACTIVE (soft delete)
-   [ ] DO NOT handle FOR_DELETION (not used for master data)
-   [ ] Add approval event to activityLog
-   [ ] Return status-specific success messages
-   [ ] Test all approvable statuses

**For Transactional Data (Hard Delete Approval):**

-   [ ] Check authorization (only ADMIN/SUPER_ADMIN)
-   [ ] Implement switch statement for all approvable statuses
-   [ ] For NEW_RECORD: Change to ACTIVE
-   [ ] For FOR_APPROVAL: Merge forApprovalVersion, set to ACTIVE, clear forApprovalVersion
-   [ ] For FOR_DELETION: Create audit log then call deleteRecord() to hard delete
-   [ ] DO NOT handle FOR_DEACTIVATION (not used for transactional data)
-   [ ] Verify record is removed from main table
-   [ ] Verify audit log captures deletion details
-   [ ] Return success message (no record to return)
-   [ ] Test all approvable statuses

### ✅ DENY Operation Checklist

**For Master Data:**

-   [ ] Check authorization (only ADMIN/SUPER_ADMIN)
-   [ ] Implement switch statement for all deniable statuses
-   [ ] For NEW_RECORD: Hard delete
-   [ ] For FOR_APPROVAL: Set to ACTIVE, clear forApprovalVersion
-   [ ] For FOR_DEACTIVATION: Set to ACTIVE, clear deletionReason
-   [ ] Add denial event with reason to activityLog
-   [ ] Return status-specific success messages
-   [ ] Test all deniable statuses

**For Transactional Data:**

-   [ ] Check authorization (only ADMIN/SUPER_ADMIN)
-   [ ] Implement switch statement for all deniable statuses
-   [ ] For NEW_RECORD: Hard delete
-   [ ] For FOR_APPROVAL: Set to ACTIVE, clear forApprovalVersion
-   [ ] For FOR_DELETION: Set to ACTIVE, clear deletionReason (restore record)
-   [ ] Add denial event with reason to activityLog
-   [ ] Return status-specific success messages
-   [ ] Test all deniable statuses

### ✅ Frontend Form Checklist

-   [ ] Implement useEffect with ONLY [isCreateMode, selectedRecord] dependencies
-   [ ] Implement canEditFields = !isReadOnly && (isCreateMode || status === ACTIVE || (hasApprovalPermission && status === INACTIVE))
-   [ ] Add field-level validation
-   [ ] Display error messages below fields
-   [ ] Disable fields when canEditFields is false
-   [ ] Style disabled fields (gray background + cursor-not-allowed)
-   [ ] Add status selector field (visible for admins viewing INACTIVE records)
-   [ ] Implement conditional button rendering (REACTIVATE vs DELETE)
-   [ ] Test typing in create mode (should not lag)
-   [ ] Test editing ACTIVE record (should work)
-   [ ] Test editing INACTIVE record as admin (should allow status change to ACTIVE)
-   [ ] Test editing non-ACTIVE record as user (should be disabled)

### ✅ Frontend Edit Page Checklist

-   [ ] Implement tab-based interface (Details/Approval/Logs)
-   [ ] Auto-select approval tab for admins viewing pending records
-   [ ] Integrate DeleteConfirmationModal for soft delete
-   [ ] Integrate ReactivateConfirmationModal for reactivation (INACTIVE records only)
-   [ ] Handle reactivate action (update status to ACTIVE, redirect with success message)
-   [ ] Implement approval/denial handlers for admin users
-   [ ] Display activity logs with timestamps and user info
-   [ ] Test tab switching functionality
-   [ ] Test modal confirmation workflows (delete and reactivate)
-   [ ] Test approval/denial for pending records
-   [ ] Include all 6 status badge colors
-   [ ] Implement status-specific tab labels (e.g., "Deletion Request")
-   [ ] Show current vs. proposed comparison for FOR_APPROVAL
-   [ ] Display deletion/deactivation reason for FOR_DELETION/FOR_DEACTIVATION
-   [ ] Implement approve and deny handlers
-   [ ] Show deny reason modal
-   [ ] Display activity log in chronological order
-   [ ] Test all status types

### ✅ Frontend List View Checklist

-   [ ] Implement cursor-based pagination
-   [ ] Add status filter dropdown (all 6 statuses + ALL)
-   [ ] Add search input (account name/code)
-   [ ] Display status badges with correct colors for all 6 statuses
-   [ ] Show role-based action buttons (Edit/Delete/Approve/Deny)
-   [ ] Disable edit for non-ACTIVE records (except admins)
-   [ ] Hide delete for INACTIVE/FOR_DELETION/FOR_DEACTIVATION
-   [ ] Show approve/deny only for admins on pending records
-   [ ] Test with USER and ADMIN roles

---

## Summary

This Accounts module demonstrates the complete implementation pattern for:

1. **Role-based workflows** (USER requires approval, ADMIN has direct access)
2. **Status-driven state machine** (6 statuses with clear transitions)
3. **Approval workflow** (forApprovalVersion for pending changes)
4. **Audit trail** (activityLog for every action)
5. **Soft delete** (INACTIVE vs. hard delete)
6. **Field-level change detection** (prevent no-op updates)
7. **Responsive UI** (mobile-first with Tailwind)
8. **Type safety** (TypeScript throughout backend and frontend)

**Use this document as a reference** when implementing other modules (Customer, Product, Inventory, etc.) to ensure consistency in:

-   Backend handler patterns (CQRS)
-   Frontend component structure (shared forms, tab wrappers)
-   UI/UX standards (colors, buttons, validation)
-   Business rule enforcement (status transitions, permissions)
-   Activity logging (detailed audit trail)

**Key Takeaways**:

-   Always implement ALL 6 status cases in switch statements
-   Never include user interaction state in useEffect dependencies
-   Always clear forApprovalVersion after approval/denial
-   Role-based logic should be centralized in handlers
-   Activity log should capture WHO did WHAT and WHEN with details

---

## 📊 Feature Comparison Matrix

This table compares implementation details between Master Data (Accounts) and Transactional (Vouchers) patterns:

| Feature                                | Master Data (Accounts)                                       | Transactional (Vouchers)                       | Notes                                              |
| -------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------- | --- |
| **DELETE STRATEGY**                    |                                                              |                                                |                                                    |     |
| Status after USER delete               | FOR_DEACTIVATION                                             | FOR_DELETION                                   | Different status enums                             |
| Status after ADMIN delete              | INACTIVE                                                     | N/A (hard delete)                              | Admin removes immediately                          |
| Final result after approval            | INACTIVE (soft delete)                                       | Hard delete (record removed)                   | Key difference                                     |
| Statuses used                          | INACTIVE, FOR_DEACTIVATION                                   | FOR_DELETION only                              | No INACTIVE for transactional                      |
| Database operation                     | Update status field                                          | `deleteRecord()` call                          | Transactional physically removes                   |
| Record visibility after delete         | Hidden via GSI1 filter                                       | Completely removed                             | Master data preserved                              |
| **HANDLERS**                           |                                                              |                                                |                                                    |     |
| Create handler                         | ✅ Yes                                                       | ✅ Yes                                         | USER→NEW_RECORD, ADMIN→ACTIVE                      |
| Update handler                         | ✅ Yes                                                       | ✅ Yes                                         | USER→FOR_APPROVAL, ADMIN→direct                    |
| Delete handler                         | ✅ Yes                                                       | ✅ Yes                                         | Different implementations                          |
| Approve handler                        | ✅ Yes                                                       | ✅ Yes                                         | Handles all pending states                         |
| Deny handler                           | ✅ Yes                                                       | ✅ Yes                                         | Reverts to ACTIVE                                  |
| Delete handler sets status             | Yes (INACTIVE/FOR_DEACTIVATION)                              | USER only (FOR_DELETION)                       | Admin uses deleteRecord()                          |
| Delete handler calls deleteRecord()    | ❌ Never                                                     | ✅ Admin only                                  | Critical difference                                |
| Approve handler hard deletes           | ❌ No                                                        | ✅ Yes (FOR_DELETION)                          | Removes record from DB                             |
| detectChanges optimization             | ✅ Yes                                                       | ✅ Yes                                         | Both prevent unnecessary writes                    |
| **FRONTEND COMPONENTS**                |                                                              |                                                |                                                    |     |
| DeleteConfirmationModal                | ✅ Yes                                                       | ✅ Yes                                         | Both require modal                                 |
| DenyReasonDialog                       | ✅ Yes                                                       | ✅ Yes                                         | Both require dialog                                |
| Delete button visibility               | status === ACTIVE                                            | status === ACTIVE                              | Same logic                                         |
| Delete reason field                    | ✅ Required                                                  | ✅ Required                                    | Both capture deletionReason                        |
| Tab navigation (Details/Approval/Logs) | ✅ Yes                                                       | ✅ Yes                                         | Edit page tabs                                     |
| Approval buttons (ADMIN only)          | ✅ Yes                                                       | ✅ Yes                                         | FOR_APPROVAL/FOR_DEACTIVATION/FOR_DELETION         |
| **DTO/SCHEMA**                         |                                                              |                                                |                                                    |     |
| accountId/voucherId                    | ✅ accountId                                                 | ✅ voucherId                                   | Primary key field name                             |
| deletionReason property                | ✅ Optional                                                  | ✅ Optional                                    | Both have this field                               |
| changeReason property                  | ✅ Required (USER)                                           | ✅ Required (USER)                             | Required for approval workflow                     |
| approverMessage property               | ✅ Optional                                                  | ✅ Optional                                    | For denials                                        |
| activityLogs array                     | ✅ Required                                                  | ✅ Required                                    | Audit trail                                        |
| forApprovalVersion object              | ✅ Required                                                  | ✅ Required                                    | Pending changes storage                            |
| StatusEnum values used                 | ACTIVE, NEW_RECORD, FOR_APPROVAL, INACTIVE, FOR_DEACTIVATION | ACTIVE, NEW_RECORD, FOR_APPROVAL, FOR_DELETION | Different delete statuses                          |
| GSI1SK pattern                         | `${status}#${accountId}`                                     | `${status}#${voucherId}`                       | Status-based filtering                             |
| **API ENDPOINTS**                      |                                                              |                                                |                                                    |     |
| POST /entities                         | ✅ Create                                                    | ✅ Create                                      | Same                                               |
| PUT /entities/:id                      | ✅ Update                                                    | ✅ Update                                      | Same                                               |
| DELETE /entities/:id                   | ✅ Delete                                                    | ✅ Delete                                      | Different backend logic                            |
| POST /entities/:id/approve             | ✅ Approve                                                   | ✅ Approve                                     | Different approval logic                           |
| POST /entities/:id/deny                | ✅ Deny                                                      | ✅ Deny                                        | Same revert logic                                  |
| GET /entities                          | ✅ List (paginated)                                          | ✅ List (paginated)                            | Same                                               |
| GET /entities/:id                      | ✅ Get by ID                                                 | ✅ Get by ID                                   | Same                                               |
| GET /entities/search/:field/:value     | ✅ Search                                                    | ✅ Search                                      | Same                                               |
| **VALIDATION**                         |                                                              |                                                |                                                    |     |
| Prevent delete if status ≠ ACTIVE      | ✅ Yes                                                       | ✅ Yes                                         | Both enforce                                       |
| Require changeReason for USER          | ✅ Yes                                                       | ✅ Yes                                         | Both enforce                                       |
| Require deletionReason                 | ✅ Yes (modal)                                               | ✅ Yes (modal)                                 | Both enforce via modal                             |
| Require approverMessage for denial     | ✅ Yes                                                       | ✅ Yes                                         | Both enforce                                       |
| Role-based authorization               | ✅ Yes                                                       | ✅ Yes                                         | USER vs ADMIN/SUPER_ADMIN                          |
| **QUERYING**                           |                                                              |                                                |                                                    |     |
| Filter by status via GSI1              | ✅ Yes                                                       | ✅ Yes                                         | Excludes soft-deleted/pending                      |
| Search by entity number                | ✅ accountNumber                                             | ✅ voucherNumber                               | GSI2 pattern                                       |
| Pagination support                     | ✅ Yes                                                       | ✅ Yes                                         | Cursor-based                                       |
| Default query excludes deleted         | ✅ Yes (INACTIVE hidden)                                     | ✅ N/A (record removed)                        | Different mechanisms                               |
| **ACTIVITY LOGGING**                   |                                                              |                                                |                                                    |     |
| Log creation                           | ✅ Yes                                                       | ✅ Yes                                         | "Created by {user}"                                |
| Log updates                            | ✅ Yes                                                       | ✅ Yes                                         | "Updated by {user}: {reason}"                      |
| Log deletions                          | ✅ Yes                                                       | ✅ Yes                                         | "Marked for deactivation" vs "Marked for deletion" |
| Log approvals                          | ✅ Yes                                                       | ✅ Yes                                         | "Approved by {user}"                               |
| Log denials                            | ✅ Yes                                                       | ✅ Yes                                         | "Denied by {user}: {message}"                      |
| Log deletion reason                    | ✅ Yes                                                       | ✅ Yes                                         | Both append deletionReason                         |
| **ERROR HANDLING**                     |                                                              |                                                |                                                    |     |
| Record not found                       | ✅ NotFoundException                                         | ✅ NotFoundException                           | Same                                               |
| Unauthorized                           | ✅ UnauthorizedException                                     | ✅ UnauthorizedException                       | Same                                               |
| Invalid status transition              | ✅ BadRequestException                                       | ✅ BadRequestException                         | Same                                               |
| Missing required fields                | ✅ BadRequestException                                       | ✅ BadRequestException                         | Same                                               |
| **MOBILE RESPONSIVENESS**              |                                                              |                                                |                                                    |     |
| Responsive table/cards                 | ✅ Yes                                                       | ✅ Yes                                         | Desktop table, mobile cards                        |
| Touch-optimized buttons                | ✅ Yes                                                       | ✅ Yes                                         | Both mobile-friendly                               |
| Responsive forms                       | ✅ Yes                                                       | ✅ Yes                                         | Both adaptive                                      |

### Key Takeaways from Matrix

**Identical Implementation** (✅ Same across both):

-   Create/Update approval workflow
-   Role-based authorization
-   Change reason requirement for USER
-   Denial workflow with approverMessage
-   Frontend form validation
-   API endpoint structure
-   Activity logging patterns
-   Search and pagination
-   Mobile responsiveness

**Critical Differences** (⚠️ Must implement differently):

1. **Delete Status**: FOR_DEACTIVATION (master) vs FOR_DELETION (transactional)
2. **Final Delete State**: INACTIVE (soft) vs Hard delete (removed)
3. **Admin Delete Method**: Set status (master) vs deleteRecord() (transactional)
4. **Approve Delete Action**: Set INACTIVE (master) vs deleteRecord() (transactional)
5. **StatusEnum Values**: Includes INACTIVE/FOR_DEACTIVATION (master) vs FOR_DELETION only (transactional)

### Implementation Decision Tree

```
When implementing DELETE for a new module:

1. Is this Master Data or Transactional?
   ├─ Master Data
   │  ├─ USER delete → status = FOR_DEACTIVATION
   │  ├─ ADMIN delete → status = INACTIVE
   │  └─ Approve → status = INACTIVE
   │
   └─ Transactional
      ├─ USER delete → status = FOR_DELETION
      ├─ ADMIN delete → databaseService.deleteRecord()
      └─ Approve → databaseService.deleteRecord()

2. Update StatusEnum to include:
   ├─ Master: INACTIVE, FOR_DEACTIVATION
   └─ Transactional: FOR_DELETION

3. Update GSI1 queries to:
   ├─ Master: Filter out INACTIVE and FOR_DEACTIVATION
   └─ Transactional: No filter needed (record removed)
```

---

## ⚠️ CRITICAL: Delete Strategy Summary

**ALWAYS remember this when implementing ANY module:**

### Master Data / Lookup Entities → SOFT DELETE

**Examples**: Customer, Product, Account, Supplier, Employee, Category  
**Statuses**: INACTIVE, FOR_DEACTIVATION  
**Why**: Referenced by transactions, must preserve for history  
**Delete Flow**:

-   USER → FOR_DEACTIVATION (pending) → INACTIVE (approved)
-   ADMIN → INACTIVE (immediate)

### Transactional Records → HARD DELETE

**Examples**: Invoice, Voucher, Journal Entry, Purchase Order, Return Goods Sold  
**Statuses**: FOR_DELETION (pending only)  
**Why**: Discrete events that can be removed if invalid  
**Delete Flow**:

-   USER → FOR_DELETION (pending) → Hard delete from DB (approved)
-   ADMIN → Hard delete from DB (immediate)

### Quick Decision

```
Is this record referenced by other entities/transactions?
YES → Use SOFT DELETE (INACTIVE/FOR_DEACTIVATION)
NO  → Use HARD DELETE (FOR_DELETION)
```

### Implementation Checklist

When implementing DELETE operation, ask:

1. **What type of record is this?**

    - [ ] Master/Lookup data → Use INACTIVE/FOR_DEACTIVATION
    - [ ] Transactional data → Use FOR_DELETION

2. **Update DELETE handler accordingly:**

    - [ ] Master data: `status = INACTIVE` or `FOR_DEACTIVATION`
    - [ ] Transactional: `databaseService.deleteRecord()` for admin, `status = FOR_DELETION` for user

3. **Update APPROVE handler accordingly:**

    - [ ] Master data: `status = INACTIVE`
    - [ ] Transactional: `databaseService.deleteRecord()` + create audit log

4. **Update DENY handler accordingly:**

    - [ ] Both types: `status = ACTIVE` (restore)

5. **Never mix patterns:**
    - [ ] Don't use INACTIVE for transactional records
    - [ ] Don't use FOR_DELETION for master data
    - [ ] Don't use FOR_DEACTIVATION for transactional records

---

## 🎨 Shared Frontend Components Library

**Location**: `libs/frontend/components-web/src/`  
**Purpose**: Eliminate code duplication across modules (70-85% reduction achieved)  
**Last Updated**: February 2026  
**Status**: ✅ Production Ready

### Mandatory Component Usage

**RULE 1: Use Shared Components - NOT Module-Specific Copies**

All account modules MUST use components from `@components-web` instead of creating module-specific versions.

```typescript
// ✅ CORRECT - Use shared components
import { DeleteConfirmationModal, DenyReasonDialog, StatusBadge, ListHeader } from '@components-web';

// ❌ WRONG - Don't create module-specific components
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
```

### Available Shared Components

#### 1. DeleteConfirmationModal

**Purpose**: Standardized delete confirmation with deletionReason capture (master data soft delete)

```typescript
import { DeleteConfirmationModal } from '@components-web';

<DeleteConfirmationModal
    show={showDeleteConfirm}
    record={selectedRecord}
    recordDisplayName={record.name}
    onConfirm={(deletionReason: string) => handleDeleteConfirm(deletionReason)}
    onCancel={() => setShowDeleteConfirm(false)}
/>;
```

**Features**:

-   Red trash icon theme
-   Mandatory deletionReason textarea (minimum 3 characters)
-   ESC key handler
-   Responsive design
-   Validation error display

**Backend Integration**:

```typescript
// DELETE command must accept deletionReason
export class DeleteCommand {
    constructor(
        public readonly id: string,
        public readonly dto: EntityDto,
        public readonly user: UserDto,
        public readonly deletionReason?: string // <-- Required
    ) {}
}

// Handler stores deletionReason in DTO
await this.databaseService.updateRecord({
    ...existingRecord,
    status: hasApprovalPermission ? StatusEnum.INACTIVE : StatusEnum.FOR_DEACTIVATION,
    deletionReason: command.deletionReason || 'No reason provided',
    activityLogs: [...logs],
});
```

#### 2. ConfirmationModal (Generic)

**Purpose**: Flexible confirmation modal with multiple variants

```typescript
import { ConfirmationModal, ConfirmationModalVariant } from '@components-web';

<ConfirmationModal
    show={showReactivateConfirm}
    record={selectedRecord}
    variant="reactivate" // 'delete' | 'reactivate' | 'warning' | 'info'
    recordDisplayName={record.name}
    customTitle="Custom Title"
    customMessage="Custom message text"
    customConfirmText="Custom Button Text"
    onConfirm={() => handleConfirm()}
    onCancel={() => setShowConfirm(false)}
/>;
```

**Variants**:

-   `delete`: Red theme, trash icon
-   `reactivate`: Green theme, checkmark icon
-   `warning`: Yellow theme, warning icon
-   `info`: Blue theme, info icon

#### 3. DenyReasonDialog

**Purpose**: Standardized denial with approverMessage capture

```typescript
import { DenyReasonDialog } from '@components-web';

<DenyReasonDialog
    show={showDenyDialog}
    record={selectedRecord}
    recordDisplayName={record.name}
    onConfirm={(approverMessage: string) => handleDenyConfirm(approverMessage)}
    onCancel={() => setShowDenyDialog(false)}
/>;
```

**Features**:

-   Yellow warning theme
-   Mandatory approverMessage textarea (minimum 3 characters)
-   ESC key handler
-   Validation error display

#### 4. StatusBadge

**Purpose**: Centralized status display with consistent colors

```typescript
import { StatusBadge } from '@components-web';

<StatusBadge status={record.status} />;
```

**Supported Statuses**:

-   `ACTIVE`: Green background
-   `INACTIVE`: Gray background
-   `FOR_APPROVAL`: Yellow background
-   `FOR_DEACTIVATION`: Orange background
-   `NEW_RECORD`: Blue background
-   `FOR_DELETION`: Red background
-   `DRAFT`: Purple background

#### 5. ListHeader

**Purpose**: Standardized list page header with search, filter, create, refresh

```typescript
import { ListHeader } from '@components-web';

<ListHeader
    title="Customers"
    searchValue={searchTerm}
    searchPlaceholder="Search customers..."
    statusFilter={statusFilter}
    statusOptions={[
        { value: 'ALL', label: 'All Statuses' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
    ]}
    showCreateButton={canCreate}
    createButtonText="Create Customer"
    showRefreshButton={true}
    onSearchChange={setSearchTerm}
    onStatusFilterChange={setStatusFilter}
    onCreateClick={() => router.push('/customers/customer/create')}
    onRefreshClick={() => fetchRecords()}
/>;
```

**Features**:

-   Search input with icon
-   Status dropdown filter
-   Create button (optional)
-   Refresh button (optional)
-   Fully responsive

### Migration Checklist

When migrating a module to shared components:

-   [ ] Replace module-specific `DeleteConfirmationModal` with `@components-web`
-   [ ] Replace module-specific `DenyReasonDialog` with `@components-web`
-   [ ] Replace module-specific `Header` component with `ListHeader`
-   [ ] Replace inline status badges with `StatusBadge`
-   [ ] Update delete handler to accept `deletionReason` parameter
-   [ ] Update DELETE API endpoint to accept `deletionReason` query parameter
-   [ ] Add `deletionReason?: string` to backend DTO
-   [ ] Add `deletionReason?: string` to frontend TypeScript interface
-   [ ] Update frontend delete handler signature: `handleDeleteConfirm(deletionReason: string)`
-   [ ] Delete old module-specific component files

---

## 🔄 Reactivation Pattern (Master Data Only)

**Purpose**: Restore INACTIVE records to ACTIVE status  
**Applies To**: Master Data modules only (Customer, Product, Account, Territory Manager, etc.)  
**Status**: ✅ Implemented in Territory Manager

### Backend Implementation

#### 1. Add REACTIVATED Event to Enum

```typescript
// libs/dto/src/lib/enums/{entity}.event.enum.ts
export enum TerritoryManagerEventEnum {
    TERRITORY_MANAGER_UPDATED = 'TERRITORY_MANAGER_UPDATED',
    TERRITORY_MANAGER_REACTIVATED = 'TERRITORY_MANAGER_REACTIVATED', // <-- Add this
}
```

#### 2. Detect Reactivation in Update Handler

```typescript
// apps/{module}/{service}/src/app/{entity}/command/update/update.handler.ts

async execute(command: UpdateCommand): Promise<EntityDto> {
  const existingRecord = await this.databaseService.getRecord(command.id);

  // Capture old status BEFORE update
  const oldStatus = existingRecord.status;

  const hasApprovalPermission = /* check user role */;

  // ... perform update logic ...

  const updatedRecord = await this.databaseService.updateRecord({
    ...existingRecord,
    ...command.dto,
    status: hasApprovalPermission ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL
  });

  // Detect reactivation: INACTIVE → ACTIVE
  if (hasApprovalPermission &&
      oldStatus === StatusEnum.INACTIVE &&
      updatedRecord.status === StatusEnum.ACTIVE) {
    await this.publishReactivatedEvent(command.id);
  }

  return updatedRecord;
}

private async publishReactivatedEvent(entityId: string): Promise<void> {
  const eventDto: EntityEventDto = {
    eventType: EntityEventEnum.ENTITY_REACTIVATED,
    entityId: entityId,
    timestamp: new Date().toISOString()
  };

  // Publish to all relevant event queues
  await this.messageQueueService.publishMessage(
    this.configService.get('CUSTOMER_EVENT_SQS'),
    JSON.stringify(eventDto)
  );

  await this.messageQueueService.publishMessage(
    this.configService.get('INVOICE_EVENT_SQS'),
    JSON.stringify(eventDto)
  );
}
```

#### 3. Update Event Handlers

Event handlers for related modules should handle `ENTITY_REACTIVATED` events:

```typescript
// apps/customer/customer-event-handler-service/src/handlers/entity.handler.ts

switch (event.eventType) {
    case EntityEventEnum.ENTITY_UPDATED:
        // Handle update
        break;
    case EntityEventEnum.ENTITY_REACTIVATED:
        // Handle reactivation - typically no action needed
        // Name hasn't changed, so no updates required to referencing entities
        console.log(`Entity ${event.entityId} reactivated - no action required`);
        break;
}
```

### Frontend Implementation

#### 1. Add Reactivate Button to Form

```typescript
// apps/web-app/src/app/(authenticated-routes)/{module}/{entity}/components/EntityForm.tsx

interface EntityFormProps {
    onReactivate?: () => void; // <-- Add this prop
    // ... other props
}

// In button area
{
    !isCreateMode && isAdminUser && selectedRecord?.status === StatusEnum.INACTIVE && onReactivate ? (
        <button type="button" onClick={onReactivate} className="... bg-green-600 hover:bg-green-700 ...">
            <svg>{/* checkmark icon */}</svg>
            Reactivate
        </button>
    ) : (
        <div className="hidden sm:block" />
    );
}
```

#### 2. Add Handlers to Edit Page

```typescript
// apps/web-app/src/app/(authenticated-routes)/{module}/{entity}/[id]/edit/page.tsx

const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);

const handleReactivateClick = () => {
    setShowReactivateConfirm(true);
};

const handleReactivateConfirm = async () => {
    if (!selectedRecord) return;

    try {
        setIsLoading(true);
        setShowReactivateConfirm(false);

        const reactivatedRecord = await EntityApi.updateEntity(
            selectedRecord.id,
            {
                ...selectedRecord,
                status: StatusEnum.ACTIVE,
            },
            userRole
        );

        setSelectedRecord(reactivatedRecord);
        setFlashNotification({
            title: 'Success!',
            message: 'Record reactivated successfully!',
            alertType: 'success',
        });
        router.replace('/{module}/{entity}');
    } catch (err) {
        // Handle error
    } finally {
        setIsLoading(false);
    }
};

// Render modal
<ConfirmationModal
    show={showReactivateConfirm}
    record={selectedRecord}
    variant="reactivate"
    recordDisplayName={selectedRecord?.name}
    onConfirm={handleReactivateConfirm}
    onCancel={() => setShowReactivateConfirm(false)}
/>;
```

### Reactivation Checklist

When adding reactivation to a master data module:

-   [ ] Add `ENTITY_REACTIVATED` to event enum
-   [ ] Capture `oldStatus` before update in update handler
-   [ ] Add reactivation detection conditional
-   [ ] Implement `publishReactivatedEvent()` method
-   [ ] Update related event handlers to handle `ENTITY_REACTIVATED`
-   [ ] Add `onReactivate?: () => void` prop to form component
-   [ ] Add reactivate button (green, visible when INACTIVE + isAdminUser)
-   [ ] Add `showReactivateConfirm` state to edit page
-   [ ] Add `handleReactivateClick` and `handleReactivateConfirm` handlers
-   [ ] Render `ConfirmationModal` with `variant="reactivate"`

---

## 🔍 Backend Status Filtering (GSI2 Queries)

**RULE 2: Use Backend Status Filtering - NOT Client-Side .filter()**

**Problem**: Many modules incorrectly fetch all records then filter by status client-side.

```typescript
// ❌ WRONG - Client-side filtering (inefficient)
const response = await EntityApi.getRecords(pageSize, direction, cursor, userRole);
const filteredData =
    statusFilter === 'ALL' ? response.data : response.data.filter((record) => record.status === statusFilter);
setRecords(filteredData);
```

**Solution**: Use backend GSI2 queries for status filtering.

```typescript
// ✅ CORRECT - Backend status filtering (efficient)
let response;
if (statusFilter !== 'ALL') {
    response = await EntityApi.getRecordsByStatus(statusFilter, pageSize, direction, cursor, userRole);
} else {
    response = await EntityApi.getRecords(pageSize, direction, cursor, userRole);
}
setRecords(response.data); // No client-side filtering needed
```

### Backend API Implementation

All master data modules should have `getRecordsByStatus` endpoint:

```typescript
// apps/{module}/{service}/src/app/{entity}/{entity}.controller.ts

@Get('/by-status/:status')
@ApiOperation({ summary: 'Get entities by status' })
@ApiParam({ name: 'status', enum: StatusEnum })
async getRecordsByStatus(
  @Param('status') status: StatusEnum,
  @Query('limit') limit: number,
  @Query('direction') direction: 'next' | 'prev',
  @Query('cursor') cursor: string,
  @Query('userRole') userRole?: RoleEnum
): Promise<GetRecordsResponseDto<EntityDto>> {
  const query = new GetRecordsByStatusQuery(status, limit, direction, cursor, userRole);
  return this.queryBus.execute(query);
}
```

### Query Handler Implementation

```typescript
// apps/{module}/{service}/src/app/{entity}/query/get-by-status/get-by-status.handler.ts

@QueryHandler(GetRecordsByStatusQuery)
export class GetRecordsByStatusHandler implements IQueryHandler<GetRecordsByStatusQuery> {
    constructor(
        @Inject(EntityDatabaseServiceAbstract)
        private readonly databaseService: EntityDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusQuery): Promise<GetRecordsResponseDto<EntityDto>> {
        // Use GSI2 for efficient status-based queries
        return this.databaseService.getRecordsByStatus(query.status, query.limit, query.direction, query.cursor);
    }
}
```

### Frontend API Client

```typescript
// libs/frontend/data-access/src/api/{entity}.api.ts

class EntityApi extends AxiosConfig {
    public getRecordsByStatus = async (
        status: StatusEnum,
        limit: number,
        direction?: 'next' | 'prev',
        cursor?: any,
        userRole?: RoleEnum
    ): Promise<GetRecordsResponseDto<EntityDto>> => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (direction) params.append('direction', direction);
        if (cursor) params.append('cursor', typeof cursor === 'object' ? JSON.stringify(cursor) : cursor);
        if (userRole) params.append('userRole', userRole);

        const response = await this.axiosInstance.get(`/entity/by-status/${status}?${params.toString()}`);
        return response.data;
    };
}
```

### Status Filtering Migration Checklist

When fixing client-side filtering in a module:

-   [ ] Verify backend has `getRecordsByStatus` endpoint
-   [ ] Verify database service has `getRecordsByStatus` method using GSI2
-   [ ] Add `getRecordsByStatus` to frontend API client
-   [ ] Update list page fetch logic to use backend filtering
-   [ ] Remove all `.filter(record => record.status === ...)` client-side code
-   [ ] Remove `filteredData`, `filteredCustomers`, `filteredRecords` variables
-   [ ] Test pagination works correctly with status filtering
-   [ ] Verify performance improvement (fewer records transferred)

---

## 📝 Territory Manager Module - Reference Implementation

**Status**: ✅ Fully Refactored (February 2026)  
**Module Type**: Master Data  
**Delete Pattern**: Soft Delete (INACTIVE/FOR_DEACTIVATION)

### Changes Implemented

1. **Fixed Hybrid Delete Pattern**: Removed incorrect FOR_DELETION usage
2. **Added deletionReason Field**: Captures audit trail for deletions
3. **Implemented Reactivation Feature**: ADMIN can restore INACTIVE records to ACTIVE
4. **Backend Status Filtering**: Replaced client-side filtering with GSI2 queries
5. **Shared Components**: Using ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog

### Key Files Modified

**Backend**:

-   `delete.handler.ts`: Changed to always use `updateRecord()` with INACTIVE/FOR_DEACTIVATION
-   `approve.handler.ts`: Removed FOR_DELETION case, deleted `approveDeletion()` method
-   `update.handler.ts`: Added reactivation detection and event publishing
-   `territory.manager.dto.ts`: Added `deletionReason?: string`
-   `territory-manager.event.enum.ts`: Added `TERRITORY_MANAGER_REACTIVATED`

**Frontend**:

-   `page.tsx` (list): Removed client-side filtering, using `getTerritoryManagersByStatus()`
-   `edit/page.tsx`: Added reactivate handlers and ConfirmationModal
-   `TerritoryManagerForm.tsx`: Added `onReactivate` prop and reactivate button
-   `DeleteConfirmationModal.tsx`: Now using shared `DeleteConfirmationModal` from `@components-web`

### Territory Manager as Template

Use Territory Manager as the reference template when refactoring other master data modules:

```bash
# Modules needing similar refactoring:
- Customer (main + areas/terms/types/classifications)
- Product (main + categories)
- Supplier
- Employee
```

For each module, follow this migration pattern:

1. Check if it uses FOR_DELETION (transactional pattern) incorrectly
2. Fix DELETE handler to use INACTIVE/FOR_DEACTIVATION
3. Fix APPROVE handler to remove FOR_DELETION support
4. Add deletionReason field and capture
5. Implement reactivation feature
6. Fix client-side filtering
7. Migrate to shared components

---

**End of Reference Document**
