# Invoice Module - Complete Flow Analysis & Action Breakdown

## Document Purpose

This document provides a comprehensive breakdown of ALL flows and actions in the invoice module, showing exactly what the code does from frontend to backend, including all validations, events, and state transitions.

**Date:** January 21, 2026  
**Status:** Post-Implementation (All critical bugs fixed)

---

## Table of Contents

1. [API Endpoints Overview](#api-endpoints-overview)
2. [Complete User Flows](#complete-user-flows)
3. [Backend Command Handlers](#backend-command-handlers)
4. [Status Transition Matrix](#status-transition-matrix)
5. [Event Flow Matrix](#event-flow-matrix)
6. [Validation Flow](#validation-flow)
7. [Role-Based Permissions](#role-based-permissions)

---

## API Endpoints Overview

| Endpoint                                         | Method | Purpose                               | Handler                           | Auth Required |
| ------------------------------------------------ | ------ | ------------------------------------- | --------------------------------- | ------------- |
| `/invoices`                                      | POST   | Create new invoice (DRAFT or final)   | CreateInvoiceHandler              | ✅ Yes        |
| `/invoices/:id`                                  | PUT    | Update existing invoice               | UpdateInvoiceHandler              | ✅ Yes        |
| `/invoices/:id`                                  | DELETE | Delete invoice (or mark FOR_DELETION) | DeleteInvoiceHandler              | ✅ Yes        |
| `/invoices/:id/submit-draft`                     | POST   | Submit DRAFT invoice                  | SubmitDraftHandler                | ✅ Yes        |
| `/invoices/:id/approve`                          | POST   | Approve pending invoice               | ApproveInvoiceHandler             | ✅ Admin only |
| `/invoices/:id/deny`                             | POST   | Deny pending invoice                  | DenyInvoiceHandler                | ✅ Admin only |
| `/invoices/validate`                             | POST   | Pre-flight validation                 | ValidateInvoiceHandler            | ✅ Yes        |
| `/invoices/validate-stock`                       | POST   | Stock availability check              | ValidateStockHandler              | ✅ Yes        |
| `/invoices/:id`                                  | GET    | Get invoice by ID                     | GetInvoiceByIdQuery               | ✅ Yes        |
| `/invoices/docno/:docno`                         | GET    | Get invoice by docno                  | GetInvoiceByDocnoQuery            | ✅ Yes        |
| `/invoices`                                      | GET    | List invoices (paginated)             | GetRecordsPaginationQuery         | ✅ Yes        |
| `/invoices/status`                               | GET    | List by status (paginated)            | GetRecordsByStatusPaginationQuery | ✅ Yes        |
| `/invoices/contract/:contractId`                 | GET    | List by contract                      | GetInvoicesByContractIdQuery      | ✅ Yes        |
| `/invoices/customer/:customerId/pending-payment` | GET    | Pending payment invoices              | GetPendingPaymentInvoicesQuery    | ✅ Yes        |

---

## Complete User Flows

### Flow 1: Create Draft Invoice

**User Journey:** User wants to create incomplete invoice for later completion

| Step | Actor    | Action                  | Frontend                    | Backend Endpoint | Handler              | Database        | Events       | Result                    |
| ---- | -------- | ----------------------- | --------------------------- | ---------------- | -------------------- | --------------- | ------------ | ------------------------- |
| 1    | User     | Clicks "Create Invoice" | -                           | -                | -                    | -               | -            | Form displayed            |
| 2    | User     | Enters partial data     | -                           | -                | -                    | -               | -            | -                         |
| 3    | User     | Clicks "Save as Draft"  | Calls `InvoiceApi.create()` | POST `/invoices` | CreateInvoiceHandler | -               | -            | -                         |
| 4    | Backend  | Validates DRAFT status  | -                           | -                | CreateInvoiceHandler | -               | -            | -                         |
| 5    | Backend  | Generates ULID docno    | -                           | -                | CreateInvoiceHandler | -               | -            | `DRAFT-{ulid}`            |
| 6    | Backend  | Sets status = DRAFT     | -                           | -                | CreateInvoiceHandler | -               | -            | -                         |
| 7    | Backend  | Adds activity log       | -                           | -                | CreateInvoiceHandler | -               | -            | "Draft created by {user}" |
| 8    | Backend  | Inserts to database     | -                           | -                | CreateInvoiceHandler | DynamoDB Insert | ❌ NO EVENTS | Record created            |
| 9    | Frontend | Shows success message   | Receives invoice data       | -                | -                    | -               | -            | -                         |
| 10   | Frontend | Redirects to edit page  | -                           | -                | -                    | -               | -            | User can continue editing |

**Key Points:**

-   ✅ No validation applied (contract, stock, required fields)
-   ✅ No events triggered (no stock deduction, no contract update)
-   ✅ Docno format: `DRAFT-{ulid}` (temporary)
-   ✅ Can be edited freely
-   ✅ Can be deleted without approval

---

### Flow 2: Submit Draft (Under Threshold)

**User Journey:** User submits draft, amount under approval threshold, becomes ACTIVE immediately

| Step | Actor         | Action                                 | Frontend                         | Backend Endpoint                  | Handler                | Database                   | Events                 | Result                            |
| ---- | ------------- | -------------------------------------- | -------------------------------- | --------------------------------- | ---------------------- | -------------------------- | ---------------------- | --------------------------------- |
| 1    | User          | Opens draft invoice                    | -                                | GET `/invoices/:id`               | GetInvoiceByIdQuery    | DynamoDB Query             | -                      | Draft displayed                   |
| 2    | User          | Completes required fields              | -                                | -                                 | -                      | -                          | -                      | -                                 |
| 3    | User          | Clicks "Submit"                        | **Validates first**              | POST `/invoices/validate`         | ValidateInvoiceHandler | -                          | -                      | Pre-flight check                  |
| 4    | Backend       | Validates required fields              | -                                | -                                 | ValidateInvoiceHandler | -                          | -                      | Customer, items, non-free items   |
| 5    | Backend       | Validates contract (if any)            | -                                | -                                 | ValidateInvoiceHandler | DynamoDB Query (Contract)  | -                      | Checks amount limit               |
| 6    | Backend       | Returns validation result              | -                                | -                                 | -                      | -                          | -                      | `{valid: true}`                   |
| 7    | Frontend      | If valid, calls submit                 | Calls `InvoiceApi.submitDraft()` | POST `/invoices/:id/submit-draft` | SubmitDraftHandler     | -                          | -                      | -                                 |
| 8    | Backend       | Validates DRAFT status                 | -                                | -                                 | SubmitDraftHandler     | DynamoDB Query             | -                      | Must be DRAFT                     |
| 9    | Backend       | Validates required fields              | -                                | -                                 | SubmitDraftHandler     | -                          | -                      | Re-validates server-side          |
| 10   | Backend       | Generates sequential docno             | -                                | -                                 | SubmitDraftHandler     | DynamoDB Query (count)     | -                      | `STARTING_NUMBER + count`         |
| 11   | Backend       | Determines final status                | -                                | -                                 | SubmitDraftHandler     | DynamoDB Query (config)    | -                      | Checks role + threshold           |
| 12   | Backend       | Role: Admin OR Amount ≤ threshold      | -                                | -                                 | SubmitDraftHandler     | -                          | -                      | Status = ACTIVE ✅                |
| 13   | Backend       | Validates contract (ACTIVE only)       | -                                | -                                 | SubmitDraftHandler     | DynamoDB Query (Contract)  | -                      | Checks remaining balance          |
| 14   | Backend       | Updates record                         | -                                | -                                 | SubmitDraftHandler     | DynamoDB Update            | -                      | DRAFT → ACTIVE                    |
| 15   | Backend       | **Sends inventory event**              | -                                | -                                 | SubmitDraftHandler     | -                          | ✅ INVENTORY_EVENT_SQS | Deducts stock                     |
| 16   | Backend       | **Sends contract event** (if contract) | -                                | -                                 | SubmitDraftHandler     | -                          | ✅ INVOICE_EVENT_SQS   | Recalculates contract amount      |
| 17   | Event Handler | Processes inventory event              | -                                | -                                 | InventoryEventHandler  | DynamoDB Update (Stock)    | -                      | Stock quantities reduced          |
| 18   | Event Handler | Processes contract event               | -                                | -                                 | ContractInvoiceHandler | DynamoDB Update (Contract) | -                      | `contract.invoicedAmount` updated |
| 19   | Frontend      | Shows success                          | Receives updated invoice         | -                                 | -                      | -                          | -                      | Status: ACTIVE                    |
| 20   | Frontend      | Redirects to invoice list              | -                                | -                                 | -                      | -                          | -                      | -                                 |

**Key Points:**

-   ✅ Sequential docno generated (e.g., `1001`)
-   ✅ Status becomes ACTIVE immediately
-   ✅ Stock deducted via event (GAP #2 FIX APPLIED)
-   ✅ Contract amount updated via event (GAP #2 FIX APPLIED)
-   ✅ Validation happens BEFORE submission (frontend pre-flight)
-   ✅ Server-side re-validation for security

---

### Flow 3: Submit Draft (Over Threshold)

**User Journey:** User submits draft, amount exceeds threshold, needs approval

| Step | Actor         | Action                                  | Frontend                         | Backend Endpoint                  | Handler                           | Database                  | Events                 | Result                             |
| ---- | ------------- | --------------------------------------- | -------------------------------- | --------------------------------- | --------------------------------- | ------------------------- | ---------------------- | ---------------------------------- |
| 1    | User          | Opens draft invoice                     | -                                | GET `/invoices/:id`               | GetInvoiceByIdQuery               | DynamoDB Query            | -                      | Draft displayed                    |
| 2    | User          | Completes required fields               | -                                | -                                 | -                                 | -                         | -                      | -                                  |
| 3    | User          | Clicks "Submit"                         | **Validates first**              | POST `/invoices/validate`         | ValidateInvoiceHandler            | -                         | -                      | Pre-flight check                   |
| 4    | Backend       | Validates required fields               | -                                | -                                 | ValidateInvoiceHandler            | -                         | -                      | ✅ Pass                            |
| 5    | Backend       | Validates contract (if any)             | -                                | -                                 | ValidateInvoiceHandler            | DynamoDB Query (Contract) | -                      | ✅ Pass                            |
| 6    | Frontend      | Calls submit                            | Calls `InvoiceApi.submitDraft()` | POST `/invoices/:id/submit-draft` | SubmitDraftHandler                | -                         | -                      | -                                  |
| 7    | Backend       | Validates DRAFT status                  | -                                | -                                 | SubmitDraftHandler                | DynamoDB Query            | -                      | ✅ Is DRAFT                        |
| 8    | Backend       | Generates sequential docno              | -                                | -                                 | SubmitDraftHandler                | DynamoDB Query (count)    | -                      | `1002`                             |
| 9    | Backend       | Determines final status                 | -                                | -                                 | SubmitDraftHandler                | DynamoDB Query (config)   | -                      | Checks role + threshold            |
| 10   | Backend       | Role: USER AND Amount > threshold       | -                                | -                                 | SubmitDraftHandler                | -                         | -                      | Status = NEW_RECORD ✅             |
| 11   | Backend       | **NO contract validation** (NEW_RECORD) | -                                | -                                 | SubmitDraftHandler                | -                         | -                      | ⚠️ Validation deferred to approval |
| 12   | Backend       | Sets up forApprovalVersion              | -                                | -                                 | SubmitDraftHandler                | -                         | -                      | Stores invoice data                |
| 13   | Backend       | Updates record                          | -                                | -                                 | SubmitDraftHandler                | DynamoDB Update           | -                      | DRAFT → NEW_RECORD                 |
| 14   | Backend       | **NO events sent**                      | -                                | -                                 | SubmitDraftHandler                | -                         | ❌ NO EVENTS           | Stock NOT deducted                 |
| 15   | Frontend      | Shows "Submitted for approval"          | Receives updated invoice         | -                                 | -                                 | -                         | -                      | Status: NEW_RECORD                 |
| 16   | Admin         | Later reviews invoice                   | -                                | GET `/invoices?status=NEW_RECORD` | GetRecordsByStatusPaginationQuery | DynamoDB Query            | -                      | Pending list                       |
| 17   | Admin         | Clicks "Approve"                        | Calls `InvoiceApi.approve()`     | POST `/invoices/:id/approve`      | ApproveInvoiceHandler             | -                         | -                      | -                                  |
| 18   | Backend       | Validates stock availability            | -                                | -                                 | ApproveInvoiceHandler             | DynamoDB Query (Stock)    | -                      | ✅ Available                       |
| 19   | Backend       | **Validates contract** (GAP #1 FIX)     | -                                | -                                 | ApproveInvoiceHandler             | DynamoDB Query (Contract) | -                      | ✅ Within limit                    |
| 20   | Backend       | Applies forApprovalVersion              | -                                | -                                 | ApproveInvoiceHandler             | -                         | -                      | Copies data to main fields         |
| 21   | Backend       | Sets status = ACTIVE                    | -                                | -                                 | ApproveInvoiceHandler             | -                         | -                      | -                                  |
| 22   | Backend       | Updates record                          | -                                | -                                 | ApproveInvoiceHandler             | DynamoDB Update           | -                      | NEW_RECORD → ACTIVE                |
| 23   | Backend       | **Sends inventory event**               | -                                | -                                 | ApproveInvoiceHandler             | -                         | ✅ INVENTORY_EVENT_SQS | Deducts stock (first time)         |
| 24   | Backend       | **Sends contract event**                | -                                | -                                 | ApproveInvoiceHandler             | -                         | ✅ INVOICE_EVENT_SQS   | Updates contract amount            |
| 25   | Event Handler | Processes events                        | -                                | -                                 | Event Handlers                    | DynamoDB Updates          | -                      | Stock reduced, contract updated    |
| 26   | Frontend      | Shows "Approved"                        | -                                | -                                 | -                                 | -                         | -                      | Status: ACTIVE                     |

**Key Points:**

-   ✅ Status becomes NEW_RECORD (awaiting approval)
-   ✅ NO stock deduction until approval
-   ✅ NO contract update until approval
-   ✅ Contract validation happens on APPROVAL (GAP #1 FIX APPLIED)
-   ✅ forApprovalVersion stores invoice data
-   ✅ Admin can approve or deny

---

### Flow 4: Create Invoice Directly (Admin)

**User Journey:** Admin creates invoice directly as ACTIVE

| Step | Actor         | Action                                 | Frontend                    | Backend Endpoint | Handler              | Database                  | Events                 | Result                     |
| ---- | ------------- | -------------------------------------- | --------------------------- | ---------------- | -------------------- | ------------------------- | ---------------------- | -------------------------- |
| 1    | Admin         | Clicks "Create Invoice"                | -                           | -                | -                    | -                         | -                      | Form displayed             |
| 2    | Admin         | Enters complete data                   | -                           | -                | -                    | -                         | -                      | -                          |
| 3    | Admin         | Clicks "Create" (not draft)            | Calls `InvoiceApi.create()` | POST `/invoices` | CreateInvoiceHandler | -                         | -                      | status NOT DRAFT           |
| 4    | Backend       | Checks status ≠ DRAFT                  | -                           | -                | CreateInvoiceHandler | -                         | -                      | Proceeds to final creation |
| 5    | Backend       | Gets STARTING_INVOICE_NUMBER           | -                           | -                | CreateInvoiceHandler | DynamoDB Query (Config)   | -                      | e.g., 1000                 |
| 6    | Backend       | Gets invoice count                     | -                           | -                | CreateInvoiceHandler | DynamoDB Query (count)    | -                      | e.g., 50                   |
| 7    | Backend       | Generates docno                        | -                           | -                | CreateInvoiceHandler | -                         | -                      | `1000 + 50 = 1050`         |
| 8    | Backend       | Checks user role                       | -                           | -                | CreateInvoiceHandler | -                         | -                      | ADMIN or SUPER_ADMIN       |
| 9    | Backend       | Sets status = ACTIVE                   | -                           | -                | CreateInvoiceHandler | -                         | -                      | Admin bypass approval      |
| 10   | Backend       | Validates contract (if any)            | -                           | -                | CreateInvoiceHandler | DynamoDB Query (Contract) | -                      | ✅ Within limit            |
| 11   | Backend       | Creates record                         | -                           | -                | CreateInvoiceHandler | DynamoDB Insert           | -                      | Inserted                   |
| 12   | Backend       | **Sends inventory event**              | -                           | -                | CreateInvoiceHandler | -                         | ✅ INVENTORY_EVENT_SQS | Deducts stock              |
| 13   | Backend       | **Sends contract event** (if contract) | -                           | -                | CreateInvoiceHandler | -                         | ✅ INVOICE_EVENT_SQS   | Updates contract           |
| 14   | Event Handler | Processes events                       | -                           | -                | Event Handlers       | DynamoDB Updates          | -                      | Stock/contract updated     |
| 15   | Frontend      | Shows success                          | Receives invoice            | -                | -                    | -                         | -                      | Status: ACTIVE             |

**Key Points:**

-   ✅ Admin bypasses approval requirement
-   ✅ Sequential docno assigned immediately
-   ✅ Status = ACTIVE from the start
-   ✅ Stock deducted immediately
-   ✅ Contract updated immediately

---

### Flow 5: Create Invoice Directly (Non-Admin, Under Threshold)

**User Journey:** Regular user creates invoice, amount under threshold

| Step | Actor         | Action                     | Frontend                    | Backend Endpoint | Handler              | Database                  | Events                 | Result                              |
| ---- | ------------- | -------------------------- | --------------------------- | ---------------- | -------------------- | ------------------------- | ---------------------- | ----------------------------------- |
| 1    | User          | Creates invoice (complete) | Calls `InvoiceApi.create()` | POST `/invoices` | CreateInvoiceHandler | -                         | -                      | -                                   |
| 2    | Backend       | Generates sequential docno | -                           | -                | CreateInvoiceHandler | DynamoDB Queries          | -                      | e.g., `1051`                        |
| 3    | Backend       | Checks user role           | -                           | -                | CreateInvoiceHandler | -                         | -                      | USER (not admin)                    |
| 4    | Backend       | Gets approval threshold    | -                           | -                | CreateInvoiceHandler | DynamoDB Query (Config)   | -                      | e.g., $5,000                        |
| 5    | Backend       | Compares invoice amount    | -                           | -                | CreateInvoiceHandler | -                         | -                      | $3,000 ≤ $5,000 ✅                  |
| 6    | Backend       | Sets status = ACTIVE       | -                           | -                | CreateInvoiceHandler | -                         | -                      | Under threshold, no approval needed |
| 7    | Backend       | Validates contract         | -                           | -                | CreateInvoiceHandler | DynamoDB Query (Contract) | -                      | ✅ Pass                             |
| 8    | Backend       | Creates record             | -                           | -                | CreateInvoiceHandler | DynamoDB Insert           | -                      | -                                   |
| 9    | Backend       | **Sends inventory event**  | -                           | -                | CreateInvoiceHandler | -                         | ✅ INVENTORY_EVENT_SQS | Deducts stock                       |
| 10   | Backend       | **Sends contract event**   | -                           | -                | CreateInvoiceHandler | -                         | ✅ INVOICE_EVENT_SQS   | Updates contract                    |
| 11   | Event Handler | Processes events           | -                           | -                | Event Handlers       | DynamoDB Updates          | -                      | Stock/contract updated              |
| 12   | Frontend      | Shows success              | -                           | -                | -                    | -                         | -                      | Status: ACTIVE                      |

**Key Points:**

-   ✅ Amount-based approval bypass
-   ✅ Status = ACTIVE (under threshold)
-   ✅ Immediate stock deduction
-   ✅ Immediate contract update

---

### Flow 6: Create Invoice Directly (Non-Admin, Over Threshold)

**User Journey:** Regular user creates invoice, amount exceeds threshold

| Step | Actor    | Action                         | Frontend                    | Backend Endpoint             | Handler               | Database                | Events       | Result                   |
| ---- | -------- | ------------------------------ | --------------------------- | ---------------------------- | --------------------- | ----------------------- | ------------ | ------------------------ |
| 1    | User     | Creates invoice (complete)     | Calls `InvoiceApi.create()` | POST `/invoices`             | CreateInvoiceHandler  | -                       | -            | -                        |
| 2    | Backend  | Generates sequential docno     | -                           | -                            | CreateInvoiceHandler  | DynamoDB Queries        | -            | e.g., `1052`             |
| 3    | Backend  | Checks user role               | -                           | -                            | CreateInvoiceHandler  | -                       | -            | USER (not admin)         |
| 4    | Backend  | Gets approval threshold        | -                           | -                            | CreateInvoiceHandler  | DynamoDB Query (Config) | -            | e.g., $5,000             |
| 5    | Backend  | Compares invoice amount        | -                           | -                            | CreateInvoiceHandler  | -                       | -            | $8,000 > $5,000 ❌       |
| 6    | Backend  | Sets status = NEW_RECORD       | -                           | -                            | CreateInvoiceHandler  | -                       | -            | Needs approval           |
| 7    | Backend  | Sets up forApprovalVersion     | -                           | -                            | CreateInvoiceHandler  | -                       | -            | Stores invoice data      |
| 8    | Backend  | **NO contract validation**     | -                           | -                            | CreateInvoiceHandler  | -                       | -            | ⚠️ Deferred to approval  |
| 9    | Backend  | Creates record                 | -                           | -                            | CreateInvoiceHandler  | DynamoDB Insert         | -            | -                        |
| 10   | Backend  | **NO events sent**             | -                           | -                            | CreateInvoiceHandler  | -                       | ❌ NO EVENTS | Stock NOT deducted       |
| 11   | Frontend | Shows "Submitted for approval" | -                           | -                            | -                     | -                       | -            | Status: NEW_RECORD       |
| 12   | Admin    | Reviews and approves           | -                           | POST `/invoices/:id/approve` | ApproveInvoiceHandler | -                       | -            | See Flow 3 (steps 17-26) |

**Key Points:**

-   ✅ Status = NEW_RECORD (needs approval)
-   ✅ NO stock deduction until approval
-   ✅ NO contract update until approval
-   ✅ Approval flow identical to Flow 3

---

### Flow 7: Update ACTIVE Invoice (Admin)

**User Journey:** Admin updates an active invoice

| Step | Actor         | Action                                         | Frontend                    | Backend Endpoint    | Handler                | Database                  | Events                 | Result                   |
| ---- | ------------- | ---------------------------------------------- | --------------------------- | ------------------- | ---------------------- | ------------------------- | ---------------------- | ------------------------ |
| 1    | Admin         | Opens invoice                                  | -                           | GET `/invoices/:id` | GetInvoiceByIdQuery    | DynamoDB Query            | -                      | ACTIVE invoice           |
| 2    | Admin         | Modifies fields                                | -                           | -                   | -                      | -                         | -                      | e.g., changes amount     |
| 3    | Admin         | Clicks "Save"                                  | Calls `InvoiceApi.update()` | PUT `/invoices/:id` | UpdateInvoiceHandler   | -                         | -                      | -                        |
| 4    | Backend       | Validates invoice exists                       | -                           | -                   | UpdateInvoiceHandler   | DynamoDB Query            | -                      | ✅ Exists                |
| 5    | Backend       | Validates docno unique                         | -                           | -                   | UpdateInvoiceHandler   | DynamoDB Query            | -                      | ✅ Unique                |
| 6    | Backend       | Checks user role                               | -                           | -                   | UpdateInvoiceHandler   | -                         | -                      | ADMIN ✅                 |
| 7    | Backend       | Validates contract (if changed)                | -                           | -                   | UpdateInvoiceHandler   | DynamoDB Query (Contract) | -                      | ✅ Pass                  |
| 8    | Backend       | Stores ORIGINAL invoiceDetails                 | -                           | -                   | UpdateInvoiceHandler   | -                         | -                      | For delta calculation    |
| 9    | Backend       | Updates record IN-PLACE                        | -                           | -                   | UpdateInvoiceHandler   | DynamoDB Update           | -                      | Status remains ACTIVE    |
| 10   | Backend       | Calculates stock deltas                        | -                           | -                   | UpdateInvoiceHandler   | -                         | -                      | Old vs new quantities    |
| 11   | Backend       | **Sends stock DEDUCT events** (increased qty)  | -                           | -                   | UpdateInvoiceHandler   | -                         | ✅ INVENTORY_EVENT_SQS | Deducts additional stock |
| 12   | Backend       | **Sends stock RESTORE events** (decreased qty) | -                           | -                   | UpdateInvoiceHandler   | -                         | ✅ INVENTORY_EVENT_SQS | Restores excess stock    |
| 13   | Backend       | **Sends contract event**                       | -                           | -                   | UpdateInvoiceHandler   | -                         | ✅ INVOICE_EVENT_SQS   | Recalculates contract    |
| 14   | Event Handler | Processes stock deltas                         | -                           | -                   | InventoryEventHandler  | DynamoDB Updates          | -                      | Stock adjusted           |
| 15   | Event Handler | Recalculates contract                          | -                           | -                   | ContractInvoiceHandler | DynamoDB Update           | -                      | Contract amount updated  |
| 16   | Frontend      | Shows success                                  | -                           | -                   | -                      | -                         | -                      | Updated                  |

**Key Points:**

-   ✅ Admin updates in-place (no approval needed)
-   ✅ Status remains ACTIVE
-   ✅ Stock deltas calculated and applied
-   ✅ Contract recalculated
-   ✅ Only ONE contract event (GAP #4 OPTIMIZATION APPLIED)

---

### Flow 8: Update ACTIVE Invoice (Non-Admin)

**User Journey:** Regular user updates active invoice, needs approval

| Step | Actor         | Action                                   | Frontend                    | Backend Endpoint             | Handler               | Database                  | Events                 | Result                                       |
| ---- | ------------- | ---------------------------------------- | --------------------------- | ---------------------------- | --------------------- | ------------------------- | ---------------------- | -------------------------------------------- |
| 1    | User          | Opens ACTIVE invoice                     | -                           | GET `/invoices/:id`          | GetInvoiceByIdQuery   | DynamoDB Query            | -                      | Invoice data                                 |
| 2    | User          | Modifies fields                          | -                           | -                            | -                     | -                         | -                      | e.g., changes items                          |
| 3    | User          | Clicks "Save"                            | Calls `InvoiceApi.update()` | PUT `/invoices/:id`          | UpdateInvoiceHandler  | -                         | -                      | -                                            |
| 4    | Backend       | Validates invoice exists                 | -                           | -                            | UpdateInvoiceHandler  | DynamoDB Query            | -                      | ✅ Exists                                    |
| 5    | Backend       | Checks user role                         | -                           | -                            | UpdateInvoiceHandler  | -                         | -                      | USER (not admin)                             |
| 6    | Backend       | Validates contract                       | -                           | -                            | UpdateInvoiceHandler  | DynamoDB Query (Contract) | -                      | ✅ Pass                                      |
| 7    | Backend       | **Stores original data**                 | -                           | -                            | UpdateInvoiceHandler  | -                         | -                      | In forApprovalVersion.originalInvoiceDetails |
| 8    | Backend       | Sets status = FOR_APPROVAL               | -                           | -                            | UpdateInvoiceHandler  | -                         | -                      | Needs admin approval                         |
| 9    | Backend       | **Stores changes in forApprovalVersion** | -                           | -                            | UpdateInvoiceHandler  | -                         | -                      | Staged changes                               |
| 10   | Backend       | **ORIGINAL data remains unchanged**      | -                           | -                            | UpdateInvoiceHandler  | DynamoDB Update           | -                      | Current invoice intact                       |
| 11   | Backend       | **NO contract event** (GAP #4 FIX)       | -                           | -                            | UpdateInvoiceHandler  | -                         | ❌ NO EVENT            | Optimization applied                         |
| 12   | Frontend      | Shows "Submitted for approval"           | -                           | -                            | -                     | -                         | -                      | Status: FOR_APPROVAL                         |
| 13   | Admin         | Reviews changes                          | -                           | GET `/invoices/:id`          | GetInvoiceByIdQuery   | DynamoDB Query            | -                      | Shows forApprovalVersion                     |
| 14   | Admin         | Clicks "Approve"                         | -                           | POST `/invoices/:id/approve` | ApproveInvoiceHandler | -                         | -                      | -                                            |
| 15   | Backend       | Validates stock for NEW items            | -                           | -                            | ApproveInvoiceHandler | DynamoDB Query (Stock)    | -                      | ✅ Available                                 |
| 16   | Backend       | **Validates contract** (GAP #1 FIX)      | -                           | -                            | ApproveInvoiceHandler | DynamoDB Query (Contract) | -                      | ✅ Within limit                              |
| 17   | Backend       | Applies forApprovalVersion               | -                           | -                            | ApproveInvoiceHandler | -                         | -                      | Overwrites main fields                       |
| 18   | Backend       | Sets status = ACTIVE                     | -                           | -                            | ApproveInvoiceHandler | DynamoDB Update           | -                      | FOR_APPROVAL → ACTIVE                        |
| 19   | Backend       | Calculates stock deltas                  | -                           | -                            | ApproveInvoiceHandler | -                         | -                      | Original vs new                              |
| 20   | Backend       | **Sends stock delta events**             | -                           | -                            | ApproveInvoiceHandler | -                         | ✅ INVENTORY_EVENT_SQS | Adjusts stock                                |
| 21   | Backend       | **Sends contract event**                 | -                           | -                            | ApproveInvoiceHandler | -                         | ✅ INVOICE_EVENT_SQS   | Recalculates                                 |
| 22   | Event Handler | Processes deltas                         | -                           | -                            | Event Handlers        | DynamoDB Updates          | -                      | Stock/contract updated                       |
| 23   | Frontend      | Shows "Approved"                         | -                           | -                            | -                     | -                         | -                      | Status: ACTIVE                               |

**Key Points:**

-   ✅ Status changes to FOR_APPROVAL
-   ✅ Original invoice data preserved
-   ✅ Changes staged in forApprovalVersion
-   ✅ Stock NOT changed until approval
-   ✅ Contract event ONLY on approval (not on FOR_APPROVAL marking)
-   ✅ GAP #4 optimization: Only ONE contract event (on approval)

---

### Flow 9: Update DRAFT Invoice

**User Journey:** User updates draft invoice (no approval needed)

| Step | Actor    | Action                     | Frontend                    | Backend Endpoint    | Handler              | Database        | Events       | Result                         |
| ---- | -------- | -------------------------- | --------------------------- | ------------------- | -------------------- | --------------- | ------------ | ------------------------------ |
| 1    | User     | Opens DRAFT invoice        | -                           | GET `/invoices/:id` | GetInvoiceByIdQuery  | DynamoDB Query  | -            | Draft data                     |
| 2    | User     | Modifies any fields        | -                           | -                   | -                    | -               | -            | -                              |
| 3    | User     | Clicks "Save"              | Calls `InvoiceApi.update()` | PUT `/invoices/:id` | UpdateInvoiceHandler | -               | -            | -                              |
| 4    | Backend  | Checks status = DRAFT      | -                           | -                   | UpdateInvoiceHandler | -               | -            | ✅ Is DRAFT                    |
| 5    | Backend  | **NO validations applied** | -                           | -                   | UpdateInvoiceHandler | -               | -            | Draft can have invalid data    |
| 6    | Backend  | Updates record IN-PLACE    | -                           | -                   | UpdateInvoiceHandler | DynamoDB Update | -            | Direct update                  |
| 7    | Backend  | **NO events sent**         | -                           | -                   | UpdateInvoiceHandler | -               | ❌ NO EVENTS | Draft doesn't affect inventory |
| 8    | Frontend | Shows success              | -                           | -                   | -                    | -               | -            | Updated                        |

**Key Points:**

-   ✅ No validations (contract, stock, required fields)
-   ✅ No approval needed (any user can update own draft)
-   ✅ No events (draft doesn't affect business logic)
-   ✅ Direct in-place update

---

### Flow 10: Delete ACTIVE Invoice (Admin)

**User Journey:** Admin deletes an active invoice

| Step | Actor         | Action                            | Frontend                    | Backend Endpoint       | Handler                | Database                   | Events                 | Result                          |
| ---- | ------------- | --------------------------------- | --------------------------- | ---------------------- | ---------------------- | -------------------------- | ---------------------- | ------------------------------- |
| 1    | Admin         | Opens ACTIVE invoice              | -                           | GET `/invoices/:id`    | GetInvoiceByIdQuery    | DynamoDB Query             | -                      | Invoice data                    |
| 2    | Admin         | Clicks "Delete"                   | Calls `InvoiceApi.delete()` | DELETE `/invoices/:id` | DeleteInvoiceHandler   | -                          | -                      | -                               |
| 3    | Backend       | Validates invoice exists          | -                           | -                      | DeleteInvoiceHandler   | DynamoDB Query             | -                      | ✅ Exists                       |
| 4    | Backend       | Checks user role                  | -                           | -                      | DeleteInvoiceHandler   | -                          | -                      | ADMIN ✅                        |
| 5    | Backend       | Stores contractId                 | -                           | -                      | DeleteInvoiceHandler   | -                          | -                      | For later event                 |
| 6    | Backend       | **HARD DELETE** from database     | -                           | -                      | DeleteInvoiceHandler   | DynamoDB Delete            | -                      | Record removed                  |
| 7    | Backend       | **Sends inventory RESTORE event** | -                           | -                      | DeleteInvoiceHandler   | -                          | ✅ INVENTORY_EVENT_SQS | Restores stock                  |
| 8    | Backend       | **Sends contract event**          | -                           | -                      | DeleteInvoiceHandler   | -                          | ✅ INVOICE_EVENT_SQS   | Recalculates (excludes deleted) |
| 9    | Event Handler | Restores stock                    | -                           | -                      | InventoryEventHandler  | DynamoDB Update (Stock)    | -                      | Stock quantities increased      |
| 10   | Event Handler | Recalculates contract             | -                           | -                      | ContractInvoiceHandler | DynamoDB Update (Contract) | -                      | Contract amount reduced         |
| 11   | Frontend      | Shows "Deleted"                   | -                           | -                      | -                      | -                          | -                      | Record gone                     |

**Key Points:**

-   ✅ Admin hard deletes immediately
-   ✅ Stock restored immediately
-   ✅ Contract updated immediately
-   ✅ No approval needed

---

### Flow 11: Delete ACTIVE Invoice (Non-Admin)

**User Journey:** Regular user deletes active invoice, needs approval

| Step | Actor         | Action                             | Frontend                    | Backend Endpoint                    | Handler                           | Database         | Events                 | Result                       |
| ---- | ------------- | ---------------------------------- | --------------------------- | ----------------------------------- | --------------------------------- | ---------------- | ---------------------- | ---------------------------- |
| 1    | User          | Opens ACTIVE invoice               | -                           | GET `/invoices/:id`                 | GetInvoiceByIdQuery               | DynamoDB Query   | -                      | Invoice data                 |
| 2    | User          | Clicks "Delete"                    | Calls `InvoiceApi.delete()` | DELETE `/invoices/:id`              | DeleteInvoiceHandler              | -                | -                      | -                            |
| 3    | Backend       | Validates invoice exists           | -                           | -                                   | DeleteInvoiceHandler              | DynamoDB Query   | -                      | ✅ Exists                    |
| 4    | Backend       | Checks user role                   | -                           | -                                   | DeleteInvoiceHandler              | -                | -                      | USER (not admin)             |
| 5    | Backend       | Stores originalStatus = ACTIVE     | -                           | -                                   | DeleteInvoiceHandler              | -                | -                      | In forApprovalVersion        |
| 6    | Backend       | Sets status = FOR_DELETION         | -                           | -                                   | DeleteInvoiceHandler              | DynamoDB Update  | -                      | Soft delete                  |
| 7    | Backend       | **NO contract event** (GAP #5 FIX) | -                           | -                                   | DeleteInvoiceHandler              | -                | ❌ NO EVENT            | Optimization applied         |
| 8    | Backend       | **Stock remains deducted**         | -                           | -                                   | DeleteInvoiceHandler              | -                | -                      | Until approval               |
| 9    | Frontend      | Shows "Deletion pending approval"  | -                           | -                                   | -                                 | -                | -                      | Status: FOR_DELETION         |
| 10   | Admin         | Reviews deletion request           | -                           | GET `/invoices?status=FOR_DELETION` | GetRecordsByStatusPaginationQuery | DynamoDB Query   | -                      | Pending list                 |
| 11   | Admin         | Clicks "Approve Deletion"          | -                           | POST `/invoices/:id/approve`        | ApproveInvoiceHandler             | -                | -                      | -                            |
| 12   | Backend       | Routes to approveDeletion()        | -                           | -                                   | ApproveInvoiceHandler             | -                | -                      | Based on FOR_DELETION status |
| 13   | Backend       | **HARD DELETE** from database      | -                           | -                                   | ApproveInvoiceHandler             | DynamoDB Delete  | -                      | Record removed               |
| 14   | Backend       | **Sends inventory RESTORE event**  | -                           | -                                   | ApproveInvoiceHandler             | -                | ✅ INVENTORY_EVENT_SQS | Restores stock               |
| 15   | Backend       | **Sends contract event**           | -                           | -                                   | ApproveInvoiceHandler             | -                | ✅ INVOICE_EVENT_SQS   | Recalculates                 |
| 16   | Event Handler | Processes events                   | -                           | -                                   | Event Handlers                    | DynamoDB Updates | -                      | Stock/contract updated       |
| 17   | Frontend      | Shows "Deletion approved"          | -                           | -                                   | -                                 | -                | -                      | Record gone                  |

**Key Points:**

-   ✅ Status changes to FOR_DELETION (soft delete)
-   ✅ Stock remains deducted until approval
-   ✅ NO contract event on FOR_DELETION marking (GAP #5 optimization)
-   ✅ Contract event ONLY on approval (when actually deleted)
-   ✅ Only ONE contract event total

---

### Flow 12: Delete DRAFT Invoice

**User Journey:** User deletes draft invoice (no approval needed)

| Step | Actor    | Action                      | Frontend                    | Backend Endpoint       | Handler              | Database        | Events       | Result                         |
| ---- | -------- | --------------------------- | --------------------------- | ---------------------- | -------------------- | --------------- | ------------ | ------------------------------ |
| 1    | User     | Opens DRAFT invoice         | -                           | GET `/invoices/:id`    | GetInvoiceByIdQuery  | DynamoDB Query  | -            | Draft data                     |
| 2    | User     | Clicks "Delete"             | Calls `InvoiceApi.delete()` | DELETE `/invoices/:id` | DeleteInvoiceHandler | -               | -            | -                              |
| 3    | Backend  | Validates invoice exists    | -                           | -                      | DeleteInvoiceHandler | DynamoDB Query  | -            | ✅ Exists                      |
| 4    | Backend  | Checks status = DRAFT       | -                           | -                      | DeleteInvoiceHandler | -               | -            | ✅ Is DRAFT                    |
| 5    | Backend  | **HARD DELETE** immediately | -                           | -                      | DeleteInvoiceHandler | DynamoDB Delete | -            | Record removed                 |
| 6    | Backend  | **NO events sent**          | -                           | -                      | DeleteInvoiceHandler | -               | ❌ NO EVENTS | Draft never affected inventory |
| 7    | Frontend | Shows "Deleted"             | -                           | -                      | -                    | -               | -            | Gone                           |

**Key Points:**

-   ✅ Immediate hard delete (no approval)
-   ✅ No events (draft never reserved stock)
-   ✅ Any user can delete own draft

---

### Flow 13: Deny Invoice Update

**User Journey:** Admin denies a pending update request

| Step | Actor    | Action                     | Frontend                  | Backend Endpoint          | Handler             | Database        | Events       | Result                           |
| ---- | -------- | -------------------------- | ------------------------- | ------------------------- | ------------------- | --------------- | ------------ | -------------------------------- |
| 1    | Admin    | Opens FOR_APPROVAL invoice | -                         | GET `/invoices/:id`       | GetInvoiceByIdQuery | DynamoDB Query  | -            | Shows proposed changes           |
| 2    | Admin    | Enters denial reason       | -                         | -                         | -                   | -               | -            | e.g., "Incorrect pricing"        |
| 3    | Admin    | Clicks "Deny"              | Calls `InvoiceApi.deny()` | POST `/invoices/:id/deny` | DenyInvoiceHandler  | -               | -            | -                                |
| 4    | Backend  | Validates invoice exists   | -                         | -                         | DenyInvoiceHandler  | DynamoDB Query  | -            | ✅ Exists                        |
| 5    | Backend  | Checks user role           | -                         | -                         | DenyInvoiceHandler  | -               | -            | ADMIN ✅                         |
| 6    | Backend  | Routes based on status     | -                         | -                         | DenyInvoiceHandler  | -               | -            | FOR_APPROVAL → denyInvoice()     |
| 7    | Backend  | Sets status = ACTIVE       | -                         | -                         | DenyInvoiceHandler  | -               | -            | Reverts to original              |
| 8    | Backend  | Clears forApprovalVersion  | -                         | -                         | DenyInvoiceHandler  | -               | -            | Discards proposed changes        |
| 9    | Backend  | Clears changeReason        | -                         | -                         | DenyInvoiceHandler  | -               | -            | -                                |
| 10   | Backend  | Adds activity log          | -                         | -                         | DenyInvoiceHandler  | -               | -            | "Denied by {admin}, reason: ..." |
| 11   | Backend  | Updates record             | -                         | -                         | DenyInvoiceHandler  | DynamoDB Update | -            | FOR_APPROVAL → ACTIVE            |
| 12   | Backend  | **NO events sent**         | -                         | -                         | DenyInvoiceHandler  | -               | ❌ NO EVENTS | Original state preserved         |
| 13   | Frontend | Shows "Denied"             | -                         | -                         | -                   | -               | -            | Original invoice intact          |

**Key Points:**

-   ✅ Reverts to ACTIVE (original state)
-   ✅ forApprovalVersion cleared (proposed changes discarded)
-   ✅ No events (nothing changed)
-   ✅ Activity log tracks denial

---

### Flow 14: Deny Invoice Deletion

**User Journey:** Admin denies a pending deletion request

| Step | Actor         | Action                                | Frontend                  | Backend Endpoint          | Handler                | Database        | Events               | Result                        |
| ---- | ------------- | ------------------------------------- | ------------------------- | ------------------------- | ---------------------- | --------------- | -------------------- | ----------------------------- |
| 1    | Admin         | Opens FOR_DELETION invoice            | -                         | GET `/invoices/:id`       | GetInvoiceByIdQuery    | DynamoDB Query  | -                    | Invoice data                  |
| 2    | Admin         | Enters denial reason                  | -                         | -                         | -                      | -               | -                    | e.g., "Keep this record"      |
| 3    | Admin         | Clicks "Deny Deletion"                | Calls `InvoiceApi.deny()` | POST `/invoices/:id/deny` | DenyInvoiceHandler     | -               | -                    | -                             |
| 4    | Backend       | Validates invoice exists              | -                         | -                         | DenyInvoiceHandler     | DynamoDB Query  | -                    | ✅ Exists                     |
| 5    | Backend       | Routes based on status                | -                         | -                         | DenyInvoiceHandler     | -               | -                    | FOR_DELETION → denyDeletion() |
| 6    | Backend       | Sets status = ACTIVE                  | -                         | -                         | DenyInvoiceHandler     | -               | -                    | Reverts from deletion         |
| 7    | Backend       | Clears changeReason                   | -                         | -                         | DenyInvoiceHandler     | -               | -                    | -                             |
| 8    | Backend       | Adds activity log                     | -                         | -                         | DenyInvoiceHandler     | -               | -                    | "Deletion denied by {admin}"  |
| 9    | Backend       | Updates record                        | -                         | -                         | DenyInvoiceHandler     | DynamoDB Update | -                    | FOR_DELETION → ACTIVE         |
| 10   | Backend       | **Sends contract event** (GAP #3 FIX) | -                         | -                         | DenyInvoiceHandler     | -               | ✅ INVOICE_EVENT_SQS | Recalculates                  |
| 11   | Event Handler | Recalculates contract                 | -                         | -                         | ContractInvoiceHandler | DynamoDB Update | -                    | Includes invoice again        |
| 12   | Frontend      | Shows "Deletion denied"               | -                         | -                         | -                      | -               | -                    | Invoice remains ACTIVE        |

**Key Points:**

-   ✅ Reverts to ACTIVE (deletion cancelled)
-   ✅ Stock remains deducted (never restored)
-   ✅ Contract event sent (GAP #3 FIX APPLIED)
-   ✅ Contract amount recalculated to include invoice

---

### Flow 15: Deny NEW_RECORD Invoice

**User Journey:** Admin denies a new invoice pending approval

| Step | Actor    | Action                             | Frontend                  | Backend Endpoint          | Handler             | Database        | Events       | Result                      |
| ---- | -------- | ---------------------------------- | ------------------------- | ------------------------- | ------------------- | --------------- | ------------ | --------------------------- |
| 1    | Admin    | Opens NEW_RECORD invoice           | -                         | GET `/invoices/:id`       | GetInvoiceByIdQuery | DynamoDB Query  | -            | Invoice data                |
| 2    | Admin    | Enters denial reason               | -                         | -                         | -                   | -               | -            | e.g., "Duplicate invoice"   |
| 3    | Admin    | Clicks "Deny"                      | Calls `InvoiceApi.deny()` | POST `/invoices/:id/deny` | DenyInvoiceHandler  | -               | -            | -                           |
| 4    | Backend  | Routes based on status             | -                         | -                         | DenyInvoiceHandler  | -               | -            | NEW_RECORD → deleteRecord() |
| 5    | Backend  | **HARD DELETE** from database      | -                         | -                         | DenyInvoiceHandler  | DynamoDB Delete | -            | Record removed              |
| 6    | Backend  | **NO events sent**                 | -                         | -                         | DenyInvoiceHandler  | -               | ❌ NO EVENTS | Never reserved stock        |
| 7    | Frontend | Shows "Invoice denied and removed" | -                         | -                         | -                   | -               | -            | Gone                        |

**Key Points:**

-   ✅ NEW_RECORD invoices are hard deleted on denial
-   ✅ No events (never deducted stock or updated contract)
-   ✅ Completely removed from system

---

## Backend Command Handlers

### Handler Execution Matrix

| Handler                    | Triggered By                      | Purpose               | Validations                                   | Database Operations | Events Sent                               | Result Status                   |
| -------------------------- | --------------------------------- | --------------------- | --------------------------------------------- | ------------------- | ----------------------------------------- | ------------------------------- |
| **CreateInvoiceHandler**   | POST `/invoices`                  | Create new invoice    | Contract (if non-DRAFT), Config               | INSERT              | Inventory + Contract (if ACTIVE)          | DRAFT / ACTIVE / NEW_RECORD     |
| **SubmitDraftHandler**     | POST `/invoices/:id/submit-draft` | Submit draft          | Required fields, Contract (if ACTIVE), Config | UPDATE              | Inventory + Contract (if ACTIVE) ✅ FIX   | ACTIVE / NEW_RECORD             |
| **UpdateInvoiceHandler**   | PUT `/invoices/:id`               | Update invoice        | Exists, Docno unique, Contract (if non-DRAFT) | UPDATE              | Stock deltas + Contract (admin only)      | DRAFT / ACTIVE / FOR_APPROVAL   |
| **ApproveInvoiceHandler**  | POST `/invoices/:id/approve`      | Approve pending       | Stock availability, **Contract** ✅ FIX       | UPDATE or DELETE    | Inventory + Contract                      | ACTIVE (or deleted)             |
| **DenyInvoiceHandler**     | POST `/invoices/:id/deny`         | Deny pending          | Exists, Admin role                            | UPDATE or DELETE    | Contract (FOR_DELETION only) ✅ FIX       | ACTIVE (or deleted)             |
| **DeleteInvoiceHandler**   | DELETE `/invoices/:id`            | Delete invoice        | Exists                                        | UPDATE or DELETE    | Inventory restore + Contract (admin only) | FOR_DELETION (or deleted)       |
| **ValidateInvoiceHandler** | POST `/invoices/validate`         | Pre-flight validation | Required fields, Contract, Config             | QUERY only          | None                                      | N/A (returns validation result) |
| **ValidateStockHandler**   | POST `/invoices/validate-stock`   | Stock availability    | Stock quantities                              | QUERY only          | None                                      | N/A (returns validation result) |

---

## Status Transition Matrix

### Complete State Machine

| Current Status | Action       | User Role | Conditions                         | Next Status  | Database Operation | Events Triggered             |
| -------------- | ------------ | --------- | ---------------------------------- | ------------ | ------------------ | ---------------------------- |
| -              | Create       | Any       | status = DRAFT                     | DRAFT        | INSERT             | None                         |
| -              | Create       | Admin     | status ≠ DRAFT                     | ACTIVE       | INSERT             | Inventory + Contract         |
| -              | Create       | User      | status ≠ DRAFT, amount ≤ threshold | ACTIVE       | INSERT             | Inventory + Contract         |
| -              | Create       | User      | status ≠ DRAFT, amount > threshold | NEW_RECORD   | INSERT             | None                         |
| DRAFT          | Submit Draft | Admin     | -                                  | ACTIVE       | UPDATE             | Inventory + Contract ✅      |
| DRAFT          | Submit Draft | User      | amount ≤ threshold                 | ACTIVE       | UPDATE             | Inventory + Contract ✅      |
| DRAFT          | Submit Draft | User      | amount > threshold                 | NEW_RECORD   | UPDATE             | None                         |
| DRAFT          | Update       | Any       | -                                  | DRAFT        | UPDATE             | None                         |
| DRAFT          | Delete       | Any       | -                                  | (deleted)    | DELETE             | None                         |
| NEW_RECORD     | Approve      | Admin     | Stock available, Contract valid ✅ | ACTIVE       | UPDATE             | Inventory + Contract         |
| NEW_RECORD     | Deny         | Admin     | -                                  | (deleted)    | DELETE             | None                         |
| ACTIVE         | Update       | Admin     | -                                  | ACTIVE       | UPDATE             | Stock deltas + Contract      |
| ACTIVE         | Update       | User      | -                                  | FOR_APPROVAL | UPDATE             | None ✅                      |
| ACTIVE         | Delete       | Admin     | -                                  | (deleted)    | DELETE             | Inventory restore + Contract |
| ACTIVE         | Delete       | User      | -                                  | FOR_DELETION | UPDATE             | None ✅                      |
| FOR_APPROVAL   | Approve      | Admin     | Stock available, Contract valid ✅ | ACTIVE       | UPDATE             | Stock deltas + Contract      |
| FOR_APPROVAL   | Deny         | Admin     | -                                  | ACTIVE       | UPDATE             | None                         |
| FOR_DELETION   | Approve      | Admin     | -                                  | (deleted)    | DELETE             | Inventory restore + Contract |
| FOR_DELETION   | Deny         | Admin     | -                                  | ACTIVE       | UPDATE             | Contract ✅                  |

**Legend:**

-   ✅ = Recent fix applied
-   (deleted) = Record removed from database

---

## Event Flow Matrix

### Inventory Events (INVENTORY_EVENT_SQS)

| Scenario                            | Event Type       | Trigger Point                        | Stock Items             | Handler               | Result                     |
| ----------------------------------- | ---------------- | ------------------------------------ | ----------------------- | --------------------- | -------------------------- |
| Create ACTIVE invoice               | INVOICE_APPROVED | CreateHandler (after insert)         | All items               | InventoryEventHandler | Stock quantities decreased |
| Submit draft → ACTIVE               | INVOICE_APPROVED | SubmitDraftHandler ✅ (after update) | All items               | InventoryEventHandler | Stock quantities decreased |
| Approve NEW_RECORD → ACTIVE         | INVOICE_APPROVED | ApproveHandler (after update)        | All items               | InventoryEventHandler | Stock quantities decreased |
| Admin update ACTIVE (qty increased) | INVOICE_APPROVED | UpdateHandler (after update)         | Delta items (increased) | InventoryEventHandler | Additional stock deducted  |
| Admin update ACTIVE (qty decreased) | INVOICE_DELETED  | UpdateHandler (after update)         | Delta items (decreased) | InventoryEventHandler | Excess stock restored      |
| Approve FOR_APPROVAL → ACTIVE       | INVOICE_APPROVED | ApproveHandler (after update)        | Delta items (increased) | InventoryEventHandler | Additional stock deducted  |
| Approve FOR_APPROVAL → ACTIVE       | INVOICE_DELETED  | ApproveHandler (after update)        | Delta items (decreased) | InventoryEventHandler | Excess stock restored      |
| Admin delete ACTIVE                 | INVOICE_DELETED  | DeleteHandler (after delete)         | All items               | InventoryEventHandler | Stock quantities restored  |
| Approve FOR_DELETION                | INVOICE_DELETED  | ApproveHandler (after delete)        | All items               | InventoryEventHandler | Stock quantities restored  |

**Event Processing:**

```typescript
// Event structure
{
  "inventoryEvent": "INVOICE_APPROVED" | "INVOICE_DELETED",
  "stockItems": [
    { "stockId": "stock-123", "qty": 10 }
  ]
}

// Handler logic
if (event === INVOICE_APPROVED) {
  stock.totalQuantity -= qty; // Deduct
} else if (event === INVOICE_DELETED) {
  stock.totalQuantity += qty; // Restore
}
```

---

### Contract Events (INVOICE_EVENT_SQS)

| Scenario                            | Trigger Point                        | Handler                | Event Data                                                 | Result                          |
| ----------------------------------- | ------------------------------------ | ---------------------- | ---------------------------------------------------------- | ------------------------------- |
| Create ACTIVE with contract         | CreateHandler (after insert)         | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Submit draft → ACTIVE with contract | SubmitDraftHandler ✅ (after update) | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Admin update ACTIVE with contract   | UpdateHandler (after update)         | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Approve NEW_RECORD with contract    | ApproveHandler (after update)        | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Approve FOR_APPROVAL with contract  | ApproveHandler (after update)        | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Admin delete ACTIVE with contract   | DeleteHandler (after delete)         | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Approve FOR_DELETION with contract  | ApproveHandler (after delete)        | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |
| Deny FOR_DELETION with contract     | DenyHandler ✅ (after update)        | ContractInvoiceHandler | `{event: "RECALCULATE_INVOICED_AMOUNT", data: contractId}` | Contract.invoicedAmount updated |

**NOT Triggered (Optimizations Applied):**

-   ❌ Update ACTIVE → FOR_APPROVAL (GAP #4 fix: removed redundant event)
-   ❌ Delete ACTIVE → FOR_DELETION (GAP #5 fix: removed redundant event)

**Event Processing:**

```typescript
// Handler: ContractInvoiceHandler.recalculateInvoicedAmount()
const invoices = await invoiceDatabaseService.findRecordsByContractId(contractId);

// Calculate total from ACTIVE invoices only
const invoicedAmount = invoices
    .filter((invoice) => invoice.status === StatusEnum.ACTIVE)
    .reduce((sum, invoice) => sum + (invoice.finalAmount || 0), 0);

await contractDatabaseService.updateInvoicedAmount(contractId, invoicedAmount);
```

**Key Points:**

-   ✅ Only ACTIVE invoices counted
-   ✅ NEW_RECORD, FOR_APPROVAL, FOR_DELETION excluded
-   ✅ Idempotent (can be called multiple times safely)
-   ✅ Scans all invoices (not delta-based)

---

## Validation Flow

### Pre-Flight Validation (POST /invoices/validate)

**Purpose:** Frontend calls this BEFORE mutating data to show errors to user

| Validation Type  | Checks Performed                                                                                            | Database Queries                                                                                       | Returns on Error                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **CREATE**       | 1. Configuration exists<br>2. Contract amount limit (if contract)                                           | - Config: INVOICE_AMOUNT_NEEDED_FOR_APPROVAL<br>- Config: STARTING_INVOICE_NUMBER<br>- Contract record | `{valid: false, errors: {contractAmountExceeded: {...}}}`                       |
| **UPDATE**       | 1. Configuration exists<br>2. Contract amount limit (if contract)<br>3. Existing invoice amount (for delta) | - Config records<br>- Contract record<br>- Existing invoice record                                     | `{valid: false, errors: {contractAmountExceeded: {...}}}`                       |
| **SUBMIT_DRAFT** | 1. Required fields<br>2. Contract amount limit (if contract)<br>3. Configuration exists                     | - Config records<br>- Contract record                                                                  | `{valid: false, errors: {missingFields: [...], contractAmountExceeded: {...}}}` |

**Required Fields for SUBMIT_DRAFT:**

-   customerId (customer must be selected)
-   invoiceDetails (at least one item)
-   At least one non-free item (qty > 0)

**Contract Validation Logic:**

```typescript
1. Fetch contract by contractId
2. Get contract.invoicedAmount (current total)
3. If UPDATE: subtract existing invoice amount
4. Add new invoice amount
5. If projected > contract.contractAmount: REJECT
6. Else: PASS
```

---

### Server-Side Validation (In Command Handlers)

| Handler                   | Validations                                                                                       | When                 | Throws Error                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| **CreateInvoiceHandler**  | 1. Contract amount (non-DRAFT)<br>2. Config exists                                                | Before INSERT        | BadRequestException                                        |
| **SubmitDraftHandler**    | 1. Invoice is DRAFT<br>2. Required fields<br>3. Contract amount (ACTIVE only)<br>4. Config exists | Before UPDATE        | BadRequestException, NotFoundException                     |
| **UpdateInvoiceHandler**  | 1. Invoice exists<br>2. Docno unique<br>3. Contract amount (non-DRAFT)                            | Before UPDATE        | BadRequestException, NotFoundException                     |
| **ApproveInvoiceHandler** | 1. Invoice exists<br>2. User is admin<br>3. Stock availability<br>4. **Contract amount** ✅       | Before UPDATE        | BadRequestException, NotFoundException, ForbiddenException |
| **DeleteInvoiceHandler**  | 1. Invoice exists                                                                                 | Before DELETE/UPDATE | BadRequestException, NotFoundException                     |
| **DenyInvoiceHandler**    | 1. Invoice exists<br>2. User is admin                                                             | Before UPDATE/DELETE | BadRequestException, NotFoundException, ForbiddenException |

---

## Role-Based Permissions

### User Role Matrix

| Role            | Create Invoice             | Create DRAFT | Update DRAFT       | Submit DRAFT            | Update ACTIVE                 | Delete ACTIVE                 | Delete DRAFT       | Approve | Deny   |
| --------------- | -------------------------- | ------------ | ------------------ | ----------------------- | ----------------------------- | ----------------------------- | ------------------ | ------- | ------ |
| **USER**        | ✅ Yes (may need approval) | ✅ Yes       | ✅ Yes (own draft) | ✅ Yes                  | ⚠️ Yes (creates FOR_APPROVAL) | ⚠️ Yes (creates FOR_DELETION) | ✅ Yes (own draft) | ❌ No   | ❌ No  |
| **ADMIN**       | ✅ Yes (no approval)       | ✅ Yes       | ✅ Yes             | ✅ Yes (becomes ACTIVE) | ✅ Yes (direct update)        | ✅ Yes (immediate delete)     | ✅ Yes             | ✅ Yes  | ✅ Yes |
| **SUPER_ADMIN** | ✅ Yes (no approval)       | ✅ Yes       | ✅ Yes             | ✅ Yes (becomes ACTIVE) | ✅ Yes (direct update)        | ✅ Yes (immediate delete)     | ✅ Yes             | ✅ Yes  | ✅ Yes |

---

### Action Permission Details

| Action                                | USER Behavior                        | ADMIN Behavior                    | Validation                                    | Events                                       |
| ------------------------------------- | ------------------------------------ | --------------------------------- | --------------------------------------------- | -------------------------------------------- |
| **Create (amount ≤ threshold)**       | Status = ACTIVE                      | Status = ACTIVE                   | Contract, Config                              | Inventory + Contract                         |
| **Create (amount > threshold)**       | Status = NEW_RECORD (needs approval) | Status = ACTIVE (bypass approval) | Config only                                   | None (USER), Both (ADMIN)                    |
| **Submit Draft (amount ≤ threshold)** | Status = ACTIVE                      | Status = ACTIVE                   | Contract, Config                              | Inventory + Contract ✅                      |
| **Submit Draft (amount > threshold)** | Status = NEW_RECORD                  | Status = ACTIVE                   | Config only (USER), Contract + Config (ADMIN) | None (USER), Both (ADMIN) ✅                 |
| **Update ACTIVE**                     | Status = FOR_APPROVAL                | Status = ACTIVE (in-place)        | Contract                                      | None (USER), Stock deltas + Contract (ADMIN) |
| **Delete ACTIVE**                     | Status = FOR_DELETION                | Hard delete                       | None                                          | None (USER), Restore + Contract (ADMIN)      |
| **Approve NEW_RECORD**                | N/A (no permission)                  | Status = ACTIVE                   | Stock + Contract ✅                           | Inventory + Contract                         |
| **Approve FOR_APPROVAL**              | N/A (no permission)                  | Status = ACTIVE                   | Stock + Contract ✅                           | Stock deltas + Contract                      |
| **Approve FOR_DELETION**              | N/A (no permission)                  | Hard delete                       | None                                          | Restore + Contract                           |
| **Deny FOR_APPROVAL**                 | N/A (no permission)                  | Status = ACTIVE                   | None                                          | None                                         |
| **Deny FOR_DELETION**                 | N/A (no permission)                  | Status = ACTIVE                   | None                                          | Contract ✅                                  |
| **Deny NEW_RECORD**                   | N/A (no permission)                  | Hard delete                       | None                                          | None                                         |

---

## Summary of Recent Fixes

### Applied Fixes

| Gap        | Description                              | Files Modified          | Impact                                                |
| ---------- | ---------------------------------------- | ----------------------- | ----------------------------------------------------- |
| **GAP #1** | Contract validation missing on approval  | approve.handler.ts      | ✅ Prevents contract overages during approval         |
| **GAP #2** | Submit draft missing events              | submit-draft.handler.ts | ✅ Fixes stock/contract tracking for submitted drafts |
| **GAP #3** | Deny deletion missing contract event     | deny.handler.ts         | ✅ Fixes contract amount when deletion denied         |
| **GAP #4** | Redundant contract event on FOR_APPROVAL | update.handler.ts       | ✅ Reduces SQS/DynamoDB overhead                      |
| **GAP #5** | Redundant contract event on FOR_DELETION | delete.handler.ts       | ✅ Reduces SQS/DynamoDB overhead                      |

---

## Architecture Decisions

### Key Design Patterns

1. **CQRS (Command Query Responsibility Segregation)**

    - Commands: Mutations (create, update, delete, approve, deny)
    - Queries: Data retrieval (get by ID, list, search)

2. **Event-Driven Architecture**

    - Asynchronous processing via SQS
    - Decoupled inventory and contract management
    - Idempotent event handlers

3. **Approval Workflow Pattern**

    - forApprovalVersion stores staged changes
    - Original data preserved during approval
    - Status-based routing (NEW_RECORD, FOR_APPROVAL, FOR_DELETION)

4. **Role-Based Access Control**

    - Permission checks in command handlers
    - Admin bypass for direct mutations
    - User requires approval for high-value changes

5. **Pre-Flight Validation**
    - Dedicated validation endpoint
    - Reduces server load (fail fast on frontend)
    - Consistent error messaging

### Data Integrity Guarantees

1. **Contract Amount Tracking**

    - Only ACTIVE invoices counted
    - Recalculated on every change
    - Idempotent (safe to call multiple times)

2. **Stock Management**

    - Delta-based adjustments (not full recalculation)
    - Immediate deduction for ACTIVE invoices
    - Deferred deduction for NEW_RECORD (until approval)

3. **Activity Logging**

    - Every state change logged
    - Limited to 10 most recent entries
    - Includes user, timestamp, and reason

4. **Soft Delete Pattern**
    - FOR_DELETION status for pending deletions
    - Hard delete only on approval or for DRAFT/NEW_RECORD
    - originalStatus preserved for event decisions

---

## End of Document

This document represents the **complete and accurate** state of the invoice module as of January 21, 2026, including all recent bug fixes and optimizations.
