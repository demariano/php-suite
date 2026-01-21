# Invoice Module Comprehensive Analysis

## Executive Summary

This document provides a comprehensive analysis of the invoice module, covering DRAFT functionality, event handling, approval flows, and identifying gaps and potential bugs.

**Analysis Date:** 2024
**Module:** Invoicing Service (apps/invoicing)
**Architecture:** NestJS + CQRS + DynamoDB + Event-Driven (SQS)

---

## 1. Status Lifecycle & Transitions

### Status Values

-   **DRAFT** - Temporary/incomplete invoices, no business rules applied
-   **NEW_RECORD** - Pending approval from non-admin users (exceeds threshold)
-   **ACTIVE** - Approved and effective invoices (counted in contract amounts, stock deducted)
-   **FOR_APPROVAL** - Modification pending approval
-   **FOR_DELETION** - Deletion pending approval

### Status Transition Matrix

| Current Status | Action          | Admin User  | Non-Admin User                                         | Final Status           | Events Triggered                                     |
| -------------- | --------------- | ----------- | ------------------------------------------------------ | ---------------------- | ---------------------------------------------------- |
| -              | Create (Direct) | ACTIVE      | ACTIVE (if ≤ threshold) or NEW_RECORD (if > threshold) | ACTIVE/NEW_RECORD      | ACTIVE: Inventory + Contract                         |
| -              | Create (DRAFT)  | DRAFT       | DRAFT                                                  | DRAFT                  | None                                                 |
| DRAFT          | Submit Draft    | ACTIVE      | ACTIVE (if ≤ threshold) or NEW_RECORD (if > threshold) | ACTIVE/NEW_RECORD      | ACTIVE: None; NEW_RECORD: None                       |
| DRAFT          | Update          | DRAFT       | DRAFT                                                  | DRAFT                  | None                                                 |
| DRAFT          | Delete          | Hard Delete | Hard Delete                                            | (deleted)              | None                                                 |
| NEW_RECORD     | Approve         | ACTIVE      | N/A                                                    | ACTIVE                 | Inventory + Contract                                 |
| NEW_RECORD     | Deny            | Hard Delete | N/A                                                    | (deleted)              | None                                                 |
| ACTIVE         | Update          | ACTIVE      | FOR_APPROVAL                                           | ACTIVE/FOR_APPROVAL    | Admin: Stock Deltas + Contract; Non-admin: Contract  |
| ACTIVE         | Delete          | Hard Delete | FOR_DELETION                                           | (deleted)/FOR_DELETION | Admin: Restore Stock + Contract; Non-admin: Contract |
| FOR_APPROVAL   | Approve         | ACTIVE      | N/A                                                    | ACTIVE                 | Stock Deltas + Contract                              |
| FOR_APPROVAL   | Deny            | ACTIVE      | N/A                                                    | ACTIVE                 | None                                                 |
| FOR_DELETION   | Approve         | Hard Delete | N/A                                                    | (deleted)              | Restore Stock + Contract                             |
| FOR_DELETION   | Deny            | ACTIVE      | N/A                                                    | ACTIVE                 | None                                                 |

---

## 2. DRAFT Invoice Functionality

### DRAFT Creation & Behavior

```typescript
// CreateHandler - Lines 44-67
if (command.invoiceDto.status === StatusEnum.DRAFT) {
    command.invoiceDto.docno = `DRAFT-${ulid()}`;
    // ... create and return early
}
```

**DRAFT Characteristics:**

-   ✅ Uses ULID-based temporary docno (format: `DRAFT-{ulid}`)
-   ✅ No validation applied (contract amount, stock availability)
-   ✅ No events triggered (inventory, contract)
-   ✅ Can be updated freely without approval flow
-   ✅ Can be deleted without approval or stock restoration
-   ✅ Not counted in contract `invoicedAmount`
-   ✅ Does NOT reserve stock

### DRAFT Submit Flow

```typescript
// SubmitDraftHandler - Lines 38-99
async execute(command: SubmitDraftCommand) {
    1. Validate DRAFT status
    2. Validate required fields (customer, items, non-free items)
    3. Generate final docno (STARTING_INVOICE_NUMBER + count)
    4. Determine final status (ACTIVE or NEW_RECORD based on role + threshold)
    5. Validate contract amount IF finalStatus === ACTIVE
    6. Update record (no hard delete)
    7. No inventory events sent here
}
```

**Submit Draft Process:**

-   ✅ Validates required fields before submission
-   ✅ Generates sequential final docno
-   ✅ Admin users → ACTIVE directly
-   ✅ Non-admin users → ACTIVE (if ≤ threshold) or NEW_RECORD (if > threshold)
-   ⚠️ **GAP #1:** Contract validation ONLY for ACTIVE, NOT for NEW_RECORD (Line 53-55)
-   ⚠️ **GAP #2:** No inventory events sent during submit (relies on approval flow)

---

## 3. Event System Architecture

### Event Types

#### 3.1 Inventory Events (INVENTORY_EVENT_SQS)

```typescript
enum InventoryEventEnum {
    INVOICE_APPROVED, // Deducts stock
    INVOICE_DELETED, // Restores stock
}
```

**Trigger Points:**

| Scenario                       | Handler                 | Event                                                 | Stock Items                      |
| ------------------------------ | ----------------------- | ----------------------------------------------------- | -------------------------------- |
| Create ACTIVE invoice          | CreateHandler L124      | INVOICE_APPROVED                                      | All items                        |
| Update DRAFT → ACTIVE          | UpdateHandler L73-77    | INVOICE_APPROVED                                      | All items                        |
| Update ACTIVE → ACTIVE (admin) | UpdateHandler L78-86    | INVOICE_APPROVED (deduct) + INVOICE_DELETED (restore) | Delta items only                 |
| Approve NEW_RECORD → ACTIVE    | ApproveHandler L161-170 | INVOICE_APPROVED                                      | All items (first time)           |
| Approve FOR_APPROVAL → ACTIVE  | ApproveHandler L147-158 | Stock Deltas                                          | Delta items only                 |
| Admin delete ACTIVE            | DeleteHandler L152-159  | INVOICE_DELETED                                       | All items                        |
| Approve FOR_DELETION           | ApproveHandler L203-215 | INVOICE_DELETED                                       | All items (if originally ACTIVE) |

**Stock Delta Calculation:**

```typescript
// ApproveHandler & UpdateHandler - buildStockMap()
// Compares OLD vs NEW invoiceDetails
// Deducts: qty increased or new items
// Restores: qty decreased or removed items
```

#### 3.2 Contract Invoice Events (INVOICE_EVENT_SQS)

```typescript
enum ContractInvoiceEventEnum {
    RECALCULATE_INVOICED_AMOUNT,
}
```

**Trigger Points:**

| Scenario                                 | Handler            | Line        | Condition                                                 |
| ---------------------------------------- | ------------------ | ----------- | --------------------------------------------------------- |
| Create ACTIVE with contract              | CreateHandler      | 126-131     | `status === ACTIVE && contractId`                         |
| Submit Draft (ACTIVE) with contract      | SubmitDraftHandler | **MISSING** | ❌ Not triggered!                                         |
| Update ACTIVE (admin)                    | UpdateHandler      | 83-88       | `hasApprovalPermission && contractId && status !== DRAFT` |
| Update ACTIVE → FOR_APPROVAL (non-admin) | UpdateHandler      | 92-97       | `!hasApprovalPermission && contractId`                    |
| Approve NEW_RECORD/FOR_APPROVAL → ACTIVE | ApproveHandler     | 176-183     | `contractId`                                              |
| Admin delete ACTIVE                      | DeleteHandler      | 156-161     | `contractId && originalStatus === ACTIVE`                 |
| Non-admin delete ACTIVE (soft)           | DeleteHandler      | 167-170     | `originalStatus === ACTIVE && contractId`                 |
| Approve FOR_DELETION                     | ApproveHandler     | 217-222     | `contractId`                                              |

**Contract Recalculation Logic:**

```typescript
// ContractInvoiceHandlerService.recalculateInvoicedAmount()
// 1. Fetch all invoices for contract
// 2. Sum finalAmount from ACTIVE invoices only
// 3. Update contract.invoicedAmount
```

**CRITICAL:** Only ACTIVE invoices are counted. NEW_RECORD, FOR_APPROVAL, FOR_DELETION are excluded.

---

## 4. Approval Flow Analysis

### 4.1 Create Flow

**Admin/Super Admin:**

```
Create → ACTIVE → Stock Deducted → Contract Updated
```

**Non-Admin (Under Threshold):**

```
Create → ACTIVE → Stock Deducted → Contract Updated
```

**Non-Admin (Over Threshold):**

```
Create → NEW_RECORD → (awaiting approval) → No Stock Reserved → Not in Contract Amount
  ↓ Approve
ACTIVE → Stock Deducted → Contract Updated
  ↓ Deny
Hard Deleted → No Events
```

### 4.2 Submit Draft Flow

**Admin/Super Admin:**

```
DRAFT → Submit → ACTIVE → No Events Sent Yet
  ↓ (Later actions trigger events)
```

**Non-Admin (Under Threshold):**

```
DRAFT → Submit → ACTIVE → No Events Sent Yet
  ↓ (Later actions trigger events)
```

**Non-Admin (Over Threshold):**

```
DRAFT → Submit → NEW_RECORD → No Events
  ↓ Approve
ACTIVE → Stock Deducted → Contract Updated
  ↓ Deny
Hard Deleted
```

⚠️ **GAP #3:** Submit draft does NOT trigger inventory/contract events even for ACTIVE status. Unclear when these events are triggered for submitted drafts.

### 4.3 Update Flow

**Admin Update ACTIVE:**

```
ACTIVE → Update → ACTIVE (in-place) → Stock Deltas Applied → Contract Recalculated
```

**Non-Admin Update ACTIVE:**

```
ACTIVE → Update → FOR_APPROVAL (staged changes) → Contract Recalculated (immediately)
  ↓ Approve
ACTIVE (changes applied) → Stock Deltas Applied → Contract Recalculated (again)
  ↓ Deny
ACTIVE (reverted to original) → No Events
```

⚠️ **GAP #4:** Non-admin ACTIVE update triggers contract recalculation TWICE:

1. When marking FOR_APPROVAL (UpdateHandler L92-97)
2. When approving (ApproveHandler L176-183)

⚠️ **BEHAVIOR ISSUE:** Contract recalculation on FOR_APPROVAL may show incorrect invoicedAmount since invoice is still ACTIVE in the calculation.

### 4.4 Delete Flow

**Admin Delete ACTIVE:**

```
ACTIVE → Hard Delete → Stock Restored → Contract Recalculated
```

**Non-Admin Delete ACTIVE:**

```
ACTIVE → FOR_DELETION → Contract Recalculated (immediately) → Stock Still Deducted
  ↓ Approve
Hard Deleted → Stock Restored → Contract Recalculated (again)
  ↓ Deny
ACTIVE (reverted) → No Events
```

⚠️ **GAP #5:** Non-admin delete triggers contract recalculation when marking FOR_DELETION, but invoice remains ACTIVE in database until approved. This could cause:

-   Contract amount discrepancy (FOR_DELETION counted as not ACTIVE in recalculation)
-   Stock still deducted until approval

---

## 5. Validation System

### 5.1 Validation Endpoint (POST /invoices/validate)

**ValidateInvoiceHandler:**

```typescript
Validations:
1. Required Fields (for SUBMIT_DRAFT only)
   - Customer selected
   - At least one detail item
   - At least one non-free item (qty > 0)

2. Contract Amount Limit (if contractId && status !== DRAFT)
   - Fetches contract
   - Calculates current invoicedAmount
   - Subtracts existing invoice amount (for updates)
   - Checks: (current + new) <= contract.contractAmount

3. Configuration Requirements
   - INVOICE_AMOUNT_NEEDED_FOR_APPROVAL exists
   - STARTING_INVOICE_NUMBER exists
```

**Frontend Integration:**

-   ✅ Create page validates before deleting draft
-   ✅ Edit page validates before submit draft
-   ✅ Detailed error display
-   ✅ Draft preserved on validation failure

### 5.2 Handler-Level Validation

**CreateHandler:**

-   ✅ Contract validation (Lines 113-119) for non-DRAFT
-   ✅ Configuration validation (STARTING_INVOICE_NUMBER, INVOICE_AMOUNT_NEEDED_FOR_APPROVAL)

**SubmitDraftHandler:**

-   ✅ DRAFT status validation
-   ✅ Required fields validation
-   ✅ Contract validation **ONLY IF** `finalStatus === ACTIVE` (Line 53-55)
-   ❌ **MISSING:** Contract validation for NEW_RECORD

**UpdateHandler:**

-   ✅ Invoice exists validation
-   ✅ Docno uniqueness validation
-   ✅ Contract validation (Lines 60-65) for non-DRAFT

**ApproveHandler:**

-   ✅ Stock availability validation before approval
-   ✅ User authorization validation

**DeleteHandler:**

-   ✅ Invoice exists validation
-   ✅ User authorization validation

---

## 6. Identified Gaps & Bugs

### 🔴 CRITICAL GAPS

#### GAP #1: Submit Draft Missing Contract Validation for NEW_RECORD

**Location:** `submit-draft.handler.ts` Lines 53-55

**Issue:**

```typescript
if (finalStatus === StatusEnum.ACTIVE && invoice.contractId) {
    await this.validateContractAmountLimit(invoice.contractId, invoice.invoiceAmount);
}
```

Only validates contract if ACTIVE. NEW_RECORD submissions skip validation.

**Impact:**

-   Non-admin user submits draft that exceeds contract amount
-   Invoice becomes NEW_RECORD (awaiting approval)
-   Admin approves without re-validation
-   Contract amount exceeded!

**Scenario:**

1. Contract: $10,000, invoiced: $9,000, remaining: $1,000
2. User submits draft for $2,000
3. Amount > threshold → NEW_RECORD (no validation)
4. Admin approves → ACTIVE (no validation)
5. Contract.invoicedAmount = $11,000 (exceeded by $1,000)

**Recommendation:**

```typescript
// Validate contract for both ACTIVE and NEW_RECORD
if ((finalStatus === StatusEnum.ACTIVE || finalStatus === StatusEnum.NEW_RECORD) && invoice.contractId) {
    await this.validateContractAmountLimit(invoice.contractId, invoice.invoiceAmount);
}
```

#### GAP #2: Submit Draft Doesn't Trigger Events

**Location:** `submit-draft.handler.ts`

**Issue:**
No inventory or contract events are sent after submitting draft to ACTIVE.

**Impact:**

-   DRAFT submitted → ACTIVE
-   Stock NOT deducted
-   Contract amount NOT updated
-   Data inconsistency

**Scenario:**

1. User creates DRAFT
2. User submits → ACTIVE (under threshold)
3. Invoice is ACTIVE but:
    - Stock not deducted (customer received items but inventory unchanged)
    - Contract.invoicedAmount not updated (underreported)

**Current Behavior:**
Events only triggered when:

-   Creating directly as ACTIVE (CreateHandler)
-   Approving from NEW_RECORD/FOR_APPROVAL (ApproveHandler)
-   Updating ACTIVE (UpdateHandler)

**Submitted DRAFT → ACTIVE** has no event trigger path!

**Recommendation:**

```typescript
// In submit-draft.handler.ts after updateRecord
if (updatedRecord.status === StatusEnum.ACTIVE) {
    // Send inventory event
    const stockItems = updatedRecord.invoiceDetails?.map(...);
    const inventoryEvent: InventoryEventDto = {
        inventoryEvent: InventoryEventEnum.INVOICE_APPROVED,
        stockItems: stockItems,
    };
    await this.sendInventoryEventMessage(inventoryEvent);

    // Send contract event
    if (updatedRecord.contractId) {
        await this.sendContractInvoiceEvent(
            ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
            updatedRecord.contractId
        );
    }
}
```

#### GAP #3: Approve Handler Missing Stock Validation for Submitted Drafts

**Location:** `approve.handler.ts` Lines 161-170

**Issue:**

```typescript
// NEW_RECORD or DRAFT → FOR_APPROVAL → ACTIVE: Deduct all stock (first time)
const stockItems = updatedRecord.invoiceDetails?.map((detail) => ({
    stockId: detail.stockId as string,
    qty: detail.qty as number,
}));
```

Stock validation (`validateStockAvailability()`) is called at Line 104, but this path assumes it's the FIRST stock deduction. However, submitted drafts that became ACTIVE may have already had stock "conceptually" deducted.

**Impact:**
If a submitted DRAFT → ACTIVE (via GAP #2 fix) and then later approved from FOR_APPROVAL:

-   Stock deducted twice
-   Inventory underreported

**Current State:**
Since GAP #2 exists (no events on submit), this isn't a problem yet. But fixing GAP #2 would expose this issue.

**Recommendation:**
Track whether invoice already had stock deducted via a flag or check `forApprovalVersion.originalStatus`.

### ⚠️ MODERATE GAPS

#### GAP #4: Double Contract Recalculation on Update

**Location:**

-   `update.handler.ts` Lines 92-97 (FOR_APPROVAL marking)
-   `approve.handler.ts` Lines 176-183 (Approval)

**Issue:**
Non-admin updates trigger contract event TWICE:

1. When marking FOR_APPROVAL
2. When approving

**Impact:**

-   Unnecessary SQS message
-   Redundant DynamoDB queries
-   Minor performance overhead
-   No data corruption (idempotent recalculation)

**Recommendation:**
Remove contract event from FOR_APPROVAL marking (UpdateHandler). Only trigger on approval.

#### GAP #5: Non-Admin Delete Contract Recalculation Timing

**Location:** `delete.handler.ts` Lines 167-170

**Issue:**

```typescript
// Non-admin soft delete (mark FOR_DELETION)
if (originalStatus === StatusEnum.ACTIVE && contractId) {
    await this.sendContractInvoiceEvent(ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT, contractId);
}
```

Contract recalculated when marking FOR_DELETION, but invoice status not yet changed to FOR_DELETION at this point in flow (happens in `performDeletion()`).

**Impact:**

-   Contract recalculation runs while invoice still ACTIVE
-   Recalculation logic filters by `status === ACTIVE`
-   Invoice still counted in contract amount
-   Misleading contract.invoicedAmount until approval

**Recommendation:**
Move contract event to AFTER status update in `performDeletion()`.

### ℹ️ MINOR GAPS

#### GAP #6: Deny Handler Missing Contract Event

**Location:** `deny.handler.ts`

**Issue:**
When denying FOR_DELETION, invoice reverts to ACTIVE. No contract recalculation event sent.

**Impact:**
If contract was recalculated when marking FOR_DELETION (GAP #5), it's now incorrect when reverted to ACTIVE.

**Current State:**
Since GAP #5 timing issue exists, contract amount may already be wrong.

**Recommendation:**

```typescript
// In denyDeletion() after updating record
if (updatedRecord.contractId) {
    await this.sendContractInvoiceEvent(ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT, updatedRecord.contractId);
}
```

#### GAP #7: No Validation Re-check on Approval

**Location:** `approve.handler.ts`

**Issue:**
Approval handler validates stock availability but NOT contract amount.

**Impact:**
If contract changed between FOR_APPROVAL marking and approval:

-   Original validation may be stale
-   Approval could exceed new contract amount

**Scenario:**

1. Contract: $10,000, invoiced: $8,000
2. User updates invoice: $1,500 → $2,500 (FOR_APPROVAL)
3. Contract validation passes ($8,000 - $1,500 + $2,500 = $9,000 < $10,000)
4. Admin edits contract amount to $9,500
5. Admin approves invoice
6. New contract amount: $9,000 (still under $9,500, but if contract was reduced more...)

**Recommendation:**
Re-validate contract amount in `approveInvoice()` before applying changes.

---

## 7. Use Case Testing Matrix

### 7.1 DRAFT Use Cases

| Use Case                                 | Expected Result                | Actual Result                            | Status           |
| ---------------------------------------- | ------------------------------ | ---------------------------------------- | ---------------- |
| Create DRAFT                             | No validation, no events       | ✅ Works correctly                       | ✅ PASS          |
| Update DRAFT                             | Free updates, no events        | ✅ Works correctly                       | ✅ PASS          |
| Delete DRAFT                             | Hard delete, no events         | ✅ Works correctly                       | ✅ PASS          |
| Submit DRAFT (Admin)                     | ACTIVE, events sent            | ❌ ACTIVE but NO events                  | ❌ FAIL (GAP #2) |
| Submit DRAFT (Non-admin under threshold) | ACTIVE, events sent            | ❌ ACTIVE but NO events                  | ❌ FAIL (GAP #2) |
| Submit DRAFT (Non-admin over threshold)  | NEW_RECORD, contract validated | ❌ NEW_RECORD but NO contract validation | ❌ FAIL (GAP #1) |

### 7.2 NEW_RECORD Use Cases

| Use Case                           | Expected Result                          | Actual Result      | Status  |
| ---------------------------------- | ---------------------------------------- | ------------------ | ------- |
| Create NEW_RECORD (over threshold) | No stock deduction, not in contract      | ✅ Works correctly | ✅ PASS |
| Approve NEW_RECORD                 | ACTIVE, stock deducted, contract updated | ✅ Works correctly | ✅ PASS |
| Deny NEW_RECORD                    | Hard delete, no events                   | ✅ Works correctly | ✅ PASS |

### 7.3 ACTIVE Use Cases

| Use Case                  | Expected Result                                 | Actual Result                     | Status           |
| ------------------------- | ----------------------------------------------- | --------------------------------- | ---------------- |
| Create ACTIVE (direct)    | Stock deducted, contract updated                | ✅ Works correctly                | ✅ PASS          |
| Update ACTIVE (admin)     | In-place update, stock deltas, contract updated | ✅ Works correctly                | ✅ PASS          |
| Update ACTIVE (non-admin) | FOR_APPROVAL, contract event sent               | ⚠️ Works but double recalculation | ⚠️ WARN (GAP #4) |
| Delete ACTIVE (admin)     | Hard delete, stock restored, contract updated   | ✅ Works correctly                | ✅ PASS          |
| Delete ACTIVE (non-admin) | FOR_DELETION, contract event                    | ⚠️ Works but timing issue         | ⚠️ WARN (GAP #5) |

### 7.4 Approval Flow Use Cases

| Use Case                               | Expected Result                               | Actual Result                    | Status           |
| -------------------------------------- | --------------------------------------------- | -------------------------------- | ---------------- |
| Approve FOR_APPROVAL (from ACTIVE)     | Stock deltas, contract updated                | ✅ Works correctly               | ✅ PASS          |
| Approve FOR_APPROVAL (from NEW_RECORD) | Stock deducted, contract updated              | ✅ Works correctly               | ✅ PASS          |
| Deny FOR_APPROVAL                      | Revert to ACTIVE, no events                   | ✅ Works correctly               | ✅ PASS          |
| Approve FOR_DELETION                   | Hard delete, stock restored, contract updated | ✅ Works correctly               | ✅ PASS          |
| Deny FOR_DELETION                      | Revert to ACTIVE, contract event              | ❌ Reverts but NO contract event | ❌ FAIL (GAP #6) |

### 7.5 Contract Validation Use Cases

| Use Case                                            | Expected Result    | Actual Result              | Status           |
| --------------------------------------------------- | ------------------ | -------------------------- | ---------------- |
| Create with contract (under limit)                  | Allowed            | ✅ Works correctly         | ✅ PASS          |
| Create with contract (over limit)                   | Blocked            | ✅ Works correctly         | ✅ PASS          |
| Submit draft with contract (ACTIVE, under limit)    | Allowed            | ✅ Works correctly         | ✅ PASS          |
| Submit draft with contract (ACTIVE, over limit)     | Blocked            | ✅ Works correctly         | ✅ PASS          |
| Submit draft with contract (NEW_RECORD, over limit) | Should block       | ❌ Allowed (no validation) | ❌ FAIL (GAP #1) |
| Update with contract (under limit)                  | Allowed            | ✅ Works correctly         | ✅ PASS          |
| Update with contract (over limit)                   | Blocked            | ✅ Works correctly         | ✅ PASS          |
| Approve with changed contract                       | Should re-validate | ❌ No re-validation        | ⚠️ WARN (GAP #7) |

---

## 8. Event Flow Diagrams

### 8.1 Create Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE INVOICE                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  Status Type?  │
                     └────────────────┘
                      │              │
            ┌─────────┴──────┐       │
            │ DRAFT          │       │ Non-DRAFT
            ▼                        ▼
    ┌──────────────┐      ┌──────────────────────┐
    │ Create DRAFT │      │ Validate Contract    │
    │ docno: ulid  │      │ Determine Status     │
    │ No Events    │      │ (ACTIVE/NEW_RECORD)  │
    └──────────────┘      └──────────────────────┘
            │                        │
            │                        ▼
            │              ┌──────────────────────┐
            │              │ Status = ACTIVE?     │
            │              └──────────────────────┘
            │                │                  │
            │                │ Yes              │ No (NEW_RECORD)
            │                ▼                  ▼
            │      ┌─────────────────┐   ┌──────────────┐
            │      │ Send Inventory  │   │ No Events    │
            │      │ Send Contract   │   │              │
            │      └─────────────────┘   └──────────────┘
            │                │                  │
            └────────────────┴──────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Created  │
                        └──────────┘
```

### 8.2 Submit Draft Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SUBMIT DRAFT                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Validate Required   │
                   │ Fields & Draft      │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Determine Final     │
                   │ Status (Role +      │
                   │ Threshold)          │
                   └─────────────────────┘
                      │              │
            ┌─────────┴──────┐       │
            │ ACTIVE         │       │ NEW_RECORD
            ▼                        ▼
    ┌──────────────────┐    ┌────────────────────┐
    │ Validate Contract│    │ NO Validation ❌   │
    │                  │    │ GAP #1             │
    └──────────────────┘    └────────────────────┘
            │                        │
            ▼                        ▼
    ┌──────────────────┐    ┌────────────────────┐
    │ Update Record    │    │ Update Record      │
    └──────────────────┘    └────────────────────┘
            │                        │
            ▼                        ▼
    ┌──────────────────┐    ┌────────────────────┐
    │ NO Events ❌     │    │ NO Events          │
    │ GAP #2           │    │                    │
    └──────────────────┘    └────────────────────┘
```

### 8.3 Update Flow (Non-Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│ UPDATE ACTIVE (Non-Admin)                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Validate Contract   │
                   │ (with old amount    │
                   │ subtracted)         │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Store changes in    │
                   │ forApprovalVersion  │
                   │ Status = FOR_APPROVAL│
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Send Contract Event │
                   │ (Recalculate) ⚠️   │
                   │ GAP #4 - Premature  │
                   └─────────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Awaiting │
                        │ Approval │
                        └──────────┘
                      │            │
            ┌─────────┴──────┐     │
            │ APPROVE        │     │ DENY
            ▼                      ▼
    ┌──────────────────┐  ┌────────────────┐
    │ Apply changes    │  │ Revert to      │
    │ Stock deltas     │  │ original       │
    │ Contract event   │  │ No events      │
    │ ⚠️ 2nd time      │  │                │
    │ GAP #4           │  │                │
    └──────────────────┘  └────────────────┘
```

### 8.4 Delete Flow (Non-Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│ DELETE ACTIVE (Non-Admin)                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Store originalStatus│
                   │ in forApprovalVersion│
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Update Status =     │
                   │ FOR_DELETION        │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Send Contract Event │
                   │ ⚠️ But invoice still│
                   │ ACTIVE in DB        │
                   │ GAP #5              │
                   └─────────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Awaiting │
                        │ Approval │
                        └──────────┘
                      │            │
            ┌─────────┴──────┐     │
            │ APPROVE        │     │ DENY
            ▼                      ▼
    ┌──────────────────┐  ┌────────────────┐
    │ Hard delete      │  │ Revert to      │
    │ Restore stock    │  │ ACTIVE         │
    │ Contract event   │  │ NO contract    │
    │ ⚠️ 2nd time      │  │ event ❌       │
    └──────────────────┘  │ GAP #6         │
                          └────────────────┘
```

---

## 9. Recommendations Summary

### High Priority

1. **Fix GAP #1:** Add contract validation for NEW_RECORD in submit-draft.handler.ts
2. **Fix GAP #2:** Add inventory and contract events after submitting DRAFT → ACTIVE
3. **Fix GAP #6:** Add contract event when denying FOR_DELETION

### Medium Priority

4. **Fix GAP #4:** Remove duplicate contract recalculation on update approval flow
5. **Fix GAP #5:** Move contract event to after status update in delete flow
6. **Fix GAP #7:** Add contract re-validation on approval

### Low Priority

7. **Fix GAP #3:** Handle potential double stock deduction for submitted drafts (after fixing GAP #2)
8. Add comprehensive integration tests for all event flows
9. Add event idempotency keys to prevent duplicate processing
10. Consider adding invoice status change audit log with event correlation

### Code Quality

11. Consolidate duplicate `sendContractInvoiceEvent()` methods into shared service
12. Consolidate duplicate `applyStockDeltas()` and `buildStockMap()` into shared service
13. Add TypeScript strict null checks
14. Add JSDoc comments for complex validation logic

---

## 10. Architecture Strengths

✅ **Well-Implemented Features:**

1. CQRS pattern properly implemented (commands/queries separated)
2. Event-driven architecture for async processing
3. forApprovalVersion system for staged changes
4. Stock delta calculation (avoids full recalculation)
5. Activity logs with automatic limiting
6. Validation endpoint for pre-flight checks
7. Comprehensive error handling
8. Role-based access control

✅ **Good Design Decisions:**

1. DRAFT as separate status (no business rules applied)
2. Idempotent contract recalculation (scans all ACTIVE)
3. Stock validation before approval
4. Separate inventory and contract events
5. originalStatus tracking in forApprovalVersion

---

## 11. Testing Checklist

### Unit Tests Needed

-   [ ] Submit draft contract validation for NEW_RECORD
-   [ ] Submit draft event triggering for ACTIVE
-   [ ] Double contract recalculation detection
-   [ ] Contract event timing on delete
-   [ ] Deny FOR_DELETION contract event
-   [ ] Contract re-validation on approval

### Integration Tests Needed

-   [ ] End-to-end DRAFT → Submit → ACTIVE → Events flow
-   [ ] End-to-end DRAFT → Submit → NEW_RECORD → Approve → Events flow
-   [ ] Contract amount tracking across all status transitions
-   [ ] Stock quantity tracking across all status transitions
-   [ ] Concurrent approval/deny scenarios
-   [ ] Contract modification during approval window

### Manual Test Scenarios

1. Create contract with $10,000 limit
2. Create invoice #1 for $8,000 (ACTIVE) - verify contract.invoicedAmount = $8,000
3. Create DRAFT invoice #2 for $3,000
4. Submit draft (should fail with contract exceeded error)
5. Modify contract to $15,000
6. Submit draft again (should succeed as NEW_RECORD if over threshold)
7. Approve - verify contract.invoicedAmount = $11,000
8. Update invoice #1 to $9,000 as non-admin
9. Verify contract.invoicedAmount still $11,000 (not yet approved)
10. Approve update - verify contract.invoicedAmount = $12,000
11. Delete invoice #2 as non-admin
12. Verify contract.invoicedAmount = $12,000 (FOR_DELETION not counted)
13. Deny deletion - verify contract.invoicedAmount = $12,000 (should recalculate and confirm)

---

## Conclusion

The invoice module has a solid architectural foundation with CQRS, event-driven design, and approval workflows. However, there are **7 identified gaps** ranging from critical to minor:

**Critical Issues:**

-   Submit draft missing contract validation for NEW_RECORD (allows contract overages)
-   Submit draft missing event triggers (no stock deduction or contract updates)
-   Deny deletion missing contract recalculation (data inconsistency)

**Moderate Issues:**

-   Double contract recalculation on updates (performance)
-   Premature contract recalculation on delete (timing)

**Minor Issues:**

-   Potential double stock deduction (if GAP #2 fixed without GAP #3 fix)
-   Missing contract re-validation on approval (stale validation)

**Recommendation:** Prioritize fixing GAP #1, GAP #2, and GAP #6 as they have direct data integrity impact. The others are performance or edge case issues.
