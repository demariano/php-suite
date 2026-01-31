# Accounts Module - Complete Reference Documentation

**Purpose**: This document serves as the authoritative reference for the Accounts module implementation, covering all backend handlers, frontend components, business logic, UI/UX patterns, and best practices. Use this as a template for implementing other modules with consistent patterns and quality.

**Last Updated**: January 31, 2026  
**Status**: ✅ All functionality working as intended for USER, ADMIN, and SUPER_ADMIN roles

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [⚠️ CRITICAL: Delete Strategy - Soft vs Hard Delete](#critical-delete-strategy---soft-vs-hard-delete)
3. [Backend Implementation](#backend-implementation)
    - [CREATE Operation](#create-operation)
    - [UPDATE Operation](#update-operation)
    - [DELETE Operation](#delete-operation)
    - [APPROVE Operation](#approve-operation)
    - [DENY Operation](#deny-operation)
4. [Frontend Implementation](#frontend-implementation)
    - [List/Table View](#listtable-view)
    - [Create View](#create-view)
    - [Edit View](#edit-view)
    - [AccountForm Component](#accountform-component)
    - [AccountFormWrapper Component](#accountformwrapper-component)
    - [Modal Components](#modal-components)
5. [UI/UX Standards](#uiux-standards)
6. [Business Rules & Validation](#business-rules--validation)
7. [Status Lifecycle & Transitions](#status-lifecycle--transitions)
8. [Role-Based Authorization](#role-based-authorization)
9. [Code Templates](#code-templates)
10. [Anti-Patterns & Common Mistakes](#anti-patterns--common-mistakes)
11. [Implementation Checklists](#implementation-checklists)

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

| Role        | Create       | Update         | Delete             | Approve | Deny |
| ----------- | ------------ | -------------- | ------------------ | ------- | ---- |
| USER        | → NEW_RECORD | → FOR_APPROVAL | → FOR_DEACTIVATION | ❌      | ❌   |
| ADMIN       | → ACTIVE     | Direct Update  | → INACTIVE         | ✅      | ✅   |
| SUPER_ADMIN | → ACTIVE     | Direct Update  | → INACTIVE         | ✅      | ✅   |

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

## Backend Implementation

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
-   ✅ **canEditFields logic**: `!isReadOnly && (isCreateMode || status === ACTIVE)` - prevents editing non-active records
-   ✅ **Field-level validation**: Validates on blur and submit
-   ✅ **Disabled field styling**: Gray background + cursor-not-allowed for read-only fields
-   ✅ **Error display**: Red border + error message below field

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
| INACTIVE         | ❌                  | ❌             | Soft deleted, cannot edit         |
| FOR_APPROVAL     | ✅ (Update pending) | ✅ (Direct)    | Can modify pending changes        |
| FOR_DELETION     | ❌                  | ❌             | Pending deletion, cannot edit     |
| FOR_DEACTIVATION | ❌                  | ❌             | Pending deactivation, cannot edit |
| NEW_RECORD       | ❌                  | ✅ (Direct)    | Pending approval, admin can edit  |

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
-   [ ] Reject updates for INACTIVE, FOR_DELETION, FOR_DEACTIVATION statuses
-   [ ] Implement field-level change detection
-   [ ] Return early if no changes detected
-   [ ] For USER: Store changes in forApprovalVersion, set status to FOR_APPROVAL
-   [ ] For ADMIN: Apply changes directly
-   [ ] Add detailed change description to activityLog
-   [ ] Test with USER and ADMIN roles
-   [ ] Test with no changes (should return early)

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
-   [ ] Implement canEditFields = !isReadOnly && (isCreateMode || status === ACTIVE)
-   [ ] Add field-level validation
-   [ ] Display error messages below fields
-   [ ] Disable fields when canEditFields is false
-   [ ] Style disabled fields (gray background + cursor-not-allowed)
-   [ ] Test typing in create mode (should not lag)
-   [ ] Test editing ACTIVE record (should work)
-   [ ] Test editing non-ACTIVE record (should be disabled)

### ✅ Frontend Edit Page Checklist

-   [ ] Implement tab-based interface (Details/Approval/Logs)
-   [ ] Auto-select approval tab for admins viewing pending records
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

**End of Reference Document**
