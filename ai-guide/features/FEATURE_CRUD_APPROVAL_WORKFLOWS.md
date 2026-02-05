# CRUD & Approval Workflow Guide

> **Purpose**: Comprehensive guide for implementing CRUD operations with approval workflows in this monorepo.
> **Audience**: AI assistants and developers implementing new modules.

---

## Table of Contents

1. [Quick Start Protocol](#1-quick-start-protocol)
2. [Core Concepts](#2-core-concepts)
3. [Status System](#3-status-system)
4. [Role-Based Permissions](#4-role-based-permissions)
5. [Entity Classification](#5-entity-classification)
6. [Component Library (Mandatory)](#6-component-library-mandatory)
7. [UI/UX Standards (Mandatory)](#7-uiux-standards-mandatory)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Backend Implementation](#9-backend-implementation)
10. [Inline Diff Mode](#10-inline-diff-mode)
11. [Testing Checklist](#11-testing-checklist)
12. [Find & Replace Table](#12-find--replace-table)
13. [Anti-Hallucination Checklist](#13-anti-hallucination-checklist)

---

## 1. Quick Start Protocol

### AI Session Start Checklist

Before implementing ANY feature:

```
□ Step 1: Read MIGRATION_STATUS.md to check what's already done
□ Step 2: Identify the reference implementation (usually Products module)
□ Step 3: Read the actual reference files - DO NOT assume patterns
□ Step 4: Read COMPONENT_LIBRARY_REFERENCE.md for UI components
□ Step 5: Read Section 7 (UI/UX Standards) - Use EXACT code patterns
□ Step 6: Determine entity type (Master vs Transactional)
□ Step 7: Implement following the reference, adapting names only
□ Step 8: Validate against UI/UX Checklist in Section 13
```

### Critical Rules

| Rule                                     | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| **Never assume import paths**            | Always read actual files to verify                   |
| **Never create custom modals**           | Use `@components-web` modals                         |
| **Never create custom action buttons**   | Use `ApprovalActionButtons`, `FormActionButtons`     |
| **Never create custom UI styling**       | Copy EXACT classes from Section 7                    |
| **Always read reference implementation** | Products module is the gold standard                 |
| **Verify entity type first**             | Master Data vs Transactional affects delete behavior |
| **No header cards on edit forms**        | Form starts with tabs, status in tab label           |
| **Activity Logs use gray theme**         | Never purple - use `bg-gray-600`, `text-gray-700`    |

---

## 2. Core Concepts

### Approval Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER ACTIONS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  CREATE (new record)     → Status: NEW_RECORD      → Needs approval     │
│  EDIT (active record)    → Status: FOR_APPROVAL    → Needs approval     │
│  DELETE (active record)  → Status: FOR_DELETION*   → Needs approval     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ADMIN ACTIONS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  APPROVE (pending)       → Status: ACTIVE (or INACTIVE for delete)      │
│  DENY (pending)          → Reverts to previous state or hard deletes    │
│  REACTIVATE (inactive)   → Status: ACTIVE                               │
│  DIRECT CRUD             → Immediate effect, no approval needed         │
└─────────────────────────────────────────────────────────────────────────┘

* FOR_DELETION for Transactional, FOR_DEACTIVATION for Master Data
```

### Key Data Fields

| Field                | Purpose                             | When Required          |
| -------------------- | ----------------------------------- | ---------------------- |
| `status`             | Current record status               | Always present         |
| `forApprovalVersion` | Pending changes awaiting approval   | When status is pending |
| `changeReason`       | USER explanation for edits          | USER edit only         |
| `deletionReason`     | USER explanation for delete request | USER delete only       |
| `approverMessage`    | ADMIN explanation for denying       | ADMIN deny only        |
| `activityLogs`       | Audit trail of all actions          | Always maintained      |
| `createdBy`          | User who created the record         | Set on create          |
| `updatedBy`          | User who last modified              | Updated on each change |

---

## 3. Status System

### Status Definitions

| Status             | Description                           | Who Can Set     |
| ------------------ | ------------------------------------- | --------------- |
| `ACTIVE`           | Record is live and editable           | ADMIN (approve) |
| `NEW_RECORD`       | Newly created, pending first approval | USER (create)   |
| `FOR_APPROVAL`     | Edit pending approval                 | USER (edit)     |
| `FOR_DELETION`     | Deletion pending (Transactional Data) | USER (delete)   |
| `FOR_DEACTIVATION` | Deactivation pending (Master Data)    | USER (delete)   |
| `INACTIVE`         | Soft-deleted, can be reactivated      | ADMIN           |

### Status Transition Diagram

```
                    ┌────────────┐
     USER Create    │ NEW_RECORD │
         ─────────► │            │
                    └─────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │ ADMIN Approve │ ADMIN Deny    │
          ▼               ▼               │
    ┌──────────┐    (Hard Delete)         │
    │  ACTIVE  │◄─────────────────────────┘
    │          │
    └────┬─────┘
         │
    ┌────┴────────────────────────────┐
    │                                 │
    ▼ USER Edit                       ▼ USER Delete
┌──────────────┐             ┌────────────────────┐
│ FOR_APPROVAL │             │ FOR_DELETION or    │
│              │             │ FOR_DEACTIVATION   │
└──────┬───────┘             └─────────┬──────────┘
       │                               │
       │ ADMIN                         │ ADMIN
       │ Approve/Deny                  │ Approve/Deny
       ▼                               ▼
┌──────────┐                    ┌──────────┐
│  ACTIVE  │                    │ INACTIVE │ (or Hard Delete)
│          │◄───────────────────│          │
└──────────┘   ADMIN Reactivate └──────────┘
```

---

## 4. Role-Based Permissions

### Permission Matrix - ADMIN

| Status             | View | Edit | Delete | Approve | Deny | Reactivate |
| ------------------ | ---- | ---- | ------ | ------- | ---- | ---------- |
| `ACTIVE`           | ✅   | ✅   | ✅     | ❌      | ❌   | ❌         |
| `NEW_RECORD`       | ✅   | ❌   | ❌     | ✅      | ✅   | ❌         |
| `FOR_APPROVAL`     | ✅   | ❌   | ❌     | ✅      | ✅   | ❌         |
| `FOR_DELETION`     | ✅   | ❌   | ❌     | ✅      | ✅   | ❌         |
| `FOR_DEACTIVATION` | ✅   | ❌   | ❌     | ✅      | ✅   | ❌         |
| `INACTIVE`         | ✅   | ❌   | ❌     | ❌      | ❌   | ✅         |

### Permission Matrix - USER

| Status             | View | Edit   | Delete | Approve | Deny | Reactivate |
| ------------------ | ---- | ------ | ------ | ------- | ---- | ---------- |
| `ACTIVE`           | ✅   | ✅ ^1^ | ✅ ^1^ | ❌      | ❌   | ❌         |
| `NEW_RECORD`       | ✅   | ❌     | ❌     | ❌      | ❌   | ❌         |
| `FOR_APPROVAL`     | ✅   | ❌     | ❌     | ❌      | ❌   | ❌         |
| `FOR_DELETION`     | ✅   | ❌     | ❌     | ❌      | ❌   | ❌         |
| `FOR_DEACTIVATION` | ✅   | ❌     | ❌     | ❌      | ❌   | ❌         |
| `INACTIVE`         | ✅   | ❌     | ❌     | ❌      | ❌   | ❌         |

> ^1^ USER edit/delete requires approval

### Button Visibility Rules

```typescript
// STANDARD PATTERN - Apply to all modules

// Edit form fields are editable only in these conditions:
const canEdit = isCreateMode || currentStatus === StatusEnum.ACTIVE;

// Delete button visibility
const showDeleteButton = !isCreateMode && currentStatus === StatusEnum.ACTIVE;

// Approve/Deny buttons (creation and edit approval)
const showApprovalButtons = isAdmin && [StatusEnum.NEW_RECORD, StatusEnum.FOR_APPROVAL].includes(currentStatus);

// Approve/Deny buttons (deletion/deactivation approval)
const showDeletionApprovalButtons =
    isAdmin && [StatusEnum.FOR_DELETION, StatusEnum.FOR_DEACTIVATION].includes(currentStatus);

// Reactivate button
const showReactivateButton = isAdmin && currentStatus === StatusEnum.INACTIVE;

// Save/Cancel buttons
const showSaveButtons = canEdit;

// Change reason field (USER editing ACTIVE records)
const showChangeReason = !isAdmin && !isCreateMode && currentStatus === StatusEnum.ACTIVE;
```

### Button Positioning (UI Layout)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FORM FOOTER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ Delete ]                                     [ Deny ] [ Approve ]     │
│  [ Reactivate ]                                 [ Cancel ] [ Save ]      │
│                                                                          │
│  ◄─── LEFT SIDE ───►                           ◄─── RIGHT SIDE ───►     │
│  (Destructive/Secondary)                        (Primary Actions)        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Entity Classification

### Master Data vs Transactional Data

| Aspect          | Master Data                     | Transactional Data               |
| --------------- | ------------------------------- | -------------------------------- |
| **Definition**  | Reference/configuration data    | Business transaction records     |
| **Examples**    | Products, Categories, Customers | Invoices, Sales Orders, Receipts |
| **Lifespan**    | Long-lived, rarely deleted      | May be deleted or archived       |
| **Delete Type** | Soft delete (→ INACTIVE)        | Hard delete (removed from DB)    |
| **User Delete** | Status → `FOR_DEACTIVATION`     | Status → `FOR_DELETION`          |
| **Admin Deny**  | Status → `ACTIVE`               | Status → `ACTIVE` or hard delete |

### Determining Entity Type

```
Is the entity referenced by other entities?
    YES → Master Data (soft delete)
    NO  → Check: Can it be recreated without data loss?
            YES → Transactional Data (hard delete)
            NO  → Master Data (soft delete)
```

### Common Classifications

| Module           | Entity Type   | Delete Status      |
| ---------------- | ------------- | ------------------ |
| Product          | Master Data   | `FOR_DEACTIVATION` |
| Product Category | Master Data   | `FOR_DEACTIVATION` |
| Customer         | Master Data   | `FOR_DEACTIVATION` |
| Vendor           | Master Data   | `FOR_DEACTIVATION` |
| Invoice          | Transactional | `FOR_DELETION`     |
| Sales Order      | Transactional | `FOR_DELETION`     |
| Stock Adjustment | Transactional | `FOR_DELETION`     |

---

## 6. Component Library (Mandatory)

> **CRITICAL**: Use existing components from `@components-web`. DO NOT create custom versions.

### Import Pattern

```typescript
import {
    // Form Structure
    FormSectionCard,
    EditFormTabs,
    FormActionButtons,

    // Approval Components
    ApprovalActionButtons,
    DeletionApprovalCard,
    DeactivationApprovalCard,

    // Diff Display
    ChangeSummaryCard,
    FieldDiffRow,
    ArrayDiffTable,

    // Modals (NEVER create custom)
    DeleteConfirmationModal,
    DenyReasonDialog,
    ConfirmationModal,

    // Form Controls
    InputControl,
    SelectControl,
    TextareaControl,
    NumericInputControl,
    DateInputControl,
} from '@components-web';
```

### Modal Usage Reference

#### Delete Modal

```tsx
<DeleteConfirmationModal
    isOpen={showDeleteModal}
    onClose={() => setShowDeleteModal(false)}
    onConfirm={(reason) => handleDeleteConfirm(reason)}
    title="Confirm Deletion"
    recordName={record.name}
    requireReason={!isAdmin} // USER needs reason, ADMIN doesn't
/>
```

#### Deny Modal

```tsx
<DenyReasonDialog
    isOpen={showDenyModal}
    onClose={() => setShowDenyModal(false)}
    onConfirm={(approverMessage) => handleDenyConfirm(approverMessage)}
    recordName={record.name}
/>
```

#### Reactivate Modal

```tsx
<ConfirmationModal
    isOpen={showReactivateModal}
    onClose={() => setShowReactivateModal(false)}
    onConfirm={handleReactivateConfirm}
    title="Confirm Reactivation"
    message={`This will reactivate "${record.name}".`}
    confirmText="Reactivate"
    variant="success"
/>
```

### Tab Navigation

```tsx
// Standard tab structure for edit forms
const tabs = [
    {
        id: 'details',
        label: `${moduleName} Information - ${getStatusText(status)}`,
    },
    // Conditionally add Pending Changes tab
    ...(showPendingChanges
        ? [
              {
                  id: 'pending',
                  label: 'Pending Changes',
              },
          ]
        : []),
    // Activity logs (not in create mode)
    ...(!isCreateMode
        ? [
              {
                  id: 'logs',
                  label: 'Activity Logs',
              },
          ]
        : []),
];
```

---

## 7. UI/UX Standards (Mandatory)

> **⚠️ CRITICAL**: This section defines the EXACT UI/UX patterns that MUST be used. DO NOT create alternative implementations.

### Form Layout Structure

**NO header cards on edit forms.** The form should start directly with tabs.

```tsx
// ✅ CORRECT - Form starts with tabs, no header
<form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Tab Navigation - FIRST element, no header above */}
        <div className="flex justify-center border-b border-gray-200 bg-gray-50/50 p-4">
            <div className="inline-flex gap-2 p-1 bg-gray-100 rounded-xl">
                {/* Tab buttons */}
            </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 bg-white space-y-6">
            {/* Tab content */}
        </div>

        {/* Footer with Action Buttons */}
        <div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Buttons */}
        </div>
    </div>
</form>

// ❌ WRONG - No header card with status badge
<div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
    <h1>Edit Product</h1>
    <span className="badge">{status}</span>
</div>
```

### Status Tab Classes (Exact Values)

```typescript
// MANDATORY: Use these exact classes for status-based tab styling
const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-600 text-white shadow-sm',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white shadow-sm',
    [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.FOR_DEACTIVATION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white shadow-sm',
    [StatusEnum.INACTIVE]: 'bg-gray-500 text-white shadow-sm',
    [StatusEnum.DRAFT]: 'bg-blue-600 text-white shadow-sm',
};

const getTabClassName = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
        return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }
    return STATUS_TAB_CLASSES[status] ?? STATUS_TAB_CLASSES[StatusEnum.NEW_RECORD];
};
```

### Tab Button Styling (Exact Classes)

```tsx
// Details Tab - Status colored when active
<button
    type="button"
    onClick={() => onTabChange('details')}
    className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0 ${
        getTabClassName(currentStatus, activeTab === 'details')
    }`}
>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    {detailsTabLabel}
</button>

// Activity Logs Tab - Blue when active, NOT purple
<button
    type="button"
    onClick={() => onTabChange('logs')}
    className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center gap-2 flex-shrink-0 ${
        activeTab === 'logs'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Activity Logs
</button>
```

### Footer Styling (Exact Classes)

```tsx
// ✅ CORRECT - Simple border, no background color
<div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6 sm:flex-row sm:items-center sm:justify-between">

// ❌ WRONG - No background colors on footer
<div className="border-t border-gray-200 bg-gray-50/80 ...">
```

### Button Styling (Exact Classes)

```tsx
// DELETE Button (Left side, Red)
<button
    type="button"
    onClick={onDelete}
    disabled={isLoading}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto disabled:bg-red-300 disabled:cursor-not-allowed"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    Delete
</button>

// REACTIVATE Button (Left side, Green)
<button
    type="button"
    onClick={onReactivate}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    Reactivate
</button>

// SAVE/CREATE Button (Right side, Blue)
<button
    type="submit"
    disabled={!canEditDetails || isLoading}
    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    {isCreateMode ? 'Create [Module]' : 'Save Changes'}
</button>

// APPROVE Button (Right side, Green)
<button
    type="button"
    onClick={onApprove}
    disabled={isLoading}
    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    Approve
</button>

// DENY Button (Right side, Red)
<button
    type="button"
    onClick={onDeny}
    disabled={isLoading}
    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    Deny
</button>

// CANCEL Button (Right side, Gray outline)
<button
    type="button"
    onClick={onCancel}
    className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    Cancel
</button>
```

### Form Section Card Styling

```tsx
// Section with icon header
<div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
    <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {/* Icon path */}
            </svg>
        </div>
        <h3 className="text-base font-bold text-blue-600 m-0">Section Title</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form fields */}
    </div>
</div>

// Section with approval border (when showApprovalUI is true)
<div className={`border-2 rounded-xl p-4 sm:p-6 ${
    showApprovalUI ? 'border-green-400 bg-white' : 'border-gray-200'
}`}>
```

### Input Field Styling

```tsx
// Editable input
<input
    type="text"
    value={value}
    onChange={handleChange}
    disabled={!canEditDetails}
    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm focus:outline-none transition-all duration-200 ${
        canEditDetails
            ? 'border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
    }`}
    placeholder="Enter value"
/>

// Read-only field (with change detection highlight)
<div className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
    fieldChanged
        ? 'border-blue-500 bg-blue-50 text-gray-700'
        : 'border-gray-200 bg-white text-gray-500'
}`}>
    {formatValue(value)}
</div>
```

### Inline Diff Display

```tsx
// Field with pending change (approval state)
<div className="space-y-1">
    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
        {label}
    </label>
    <div className="px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-xl text-sm font-medium">
        <span className="line-through text-gray-500">{formatValue(currentValue)}</span>
        <span className="mx-2 text-blue-600">→</span>
        <span className="font-semibold text-blue-700">{formatValue(pendingValue)}</span>
    </div>
</div>
```

### Deletion/Deactivation Card

```tsx
// Only shown when status is FOR_DELETION or FOR_DEACTIVATION
<div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-8 space-y-4">
    <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">🗑️</div>
        <div>
            <h3 className="text-lg font-bold text-red-800 m-0">
                {currentStatus === StatusEnum.FOR_DELETION
                    ? 'Record Marked for Deletion'
                    : 'Record Marked for Deactivation'}
            </h3>
            <p className="text-sm text-red-700">
                This record has been marked for{' '}
                {currentStatus === StatusEnum.FOR_DELETION ? 'deletion' : 'deactivation'}
                and is awaiting approval.
            </p>
        </div>
    </div>
    {selectedRecord?.changeReason && (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">
                {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
            </p>
            <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedRecord.changeReason}
            </div>
        </div>
    )}
</div>
```

### Activity Logs Styling

```tsx
// ✅ CORRECT - Gray theme for activity logs
const renderLogsTab = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-base font-bold text-gray-700 m-0">Activity History</h3>
            </div>
            {renderActivityLogsTable(selectedRecord?.activityLogs ?? [])}
        </div>
    );
};

// ❌ WRONG - No purple/violet colors
<div className="p-2 bg-purple-600 rounded-lg">  // DON'T USE
<h3 className="text-purple-700">  // DON'T USE
```

### UI/UX Test Checklist (Add to E2E Tests)

```typescript
describe('UI/UX Consistency Tests', () => {
    test('edit form has NO header card', async () => {
        // First child of form should be tab navigation, not a gradient header
        const form = page.locator('form');
        const firstChild = form.locator('> div').first();
        await expect(firstChild).not.toHaveClass(/bg-gradient/);
        await expect(firstChild).toContainText('Information'); // Tab label
    });

    test('footer has correct styling', async () => {
        const footer = page.locator('.border-t-2.border-gray-200');
        await expect(footer).toBeVisible();
        await expect(footer).not.toHaveClass(/bg-gray-50/);
    });

    test('activity logs use gray theme', async () => {
        await page.click('text=Activity Logs');
        const header = page.locator('h3:has-text("Activity History")');
        await expect(header).toHaveClass(/text-gray-700/);
        await expect(header).not.toHaveClass(/text-purple/);
    });

    test('status is shown in tab label, not header', async () => {
        const tabButton = page.locator('button:has-text("Information")');
        await expect(tabButton).toContainText(/Active|For Approval|New Record/);
    });

    test('delete button is on left side', async () => {
        const footer = page.locator('.border-t-2');
        const deleteBtn = footer.locator('button:has-text("Delete")');
        // Verify it's in the first flex child (left side)
    });

    test('approve/save buttons are on right side', async () => {
        const footer = page.locator('.border-t-2');
        const rightSide = footer.locator('.sm\\:w-auto').last();
        await expect(rightSide.locator('button:has-text("Save"), button:has-text("Approve")')).toBeVisible();
    });
});
```

---

## 8. Frontend Implementation

### File Structure

```
apps/web-app/src/app/(authenticated-routes)/[domain]/[module]/
├── page.tsx                    # List page
├── create/
│   └── page.tsx               # Create page
└── [id]/
    └── edit/
        ├── page.tsx           # Edit page (orchestrator)
        └── components/
            └── [Module]Form.tsx   # Form component
```

### Edit Page Pattern (page.tsx)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocalStore, useSessionStore } from '@data-access/index';
import { DeleteConfirmationModal, DenyReasonDialog, ConfirmationModal } from '@components-web';
import { ModuleForm } from './components/ModuleForm';
import { ModuleApi } from '@/api/module-main.api';
import { ModuleDto, StatusEnum } from '@dto';

export default function EditModulePage() {
    const params = useParams();
    const router = useRouter();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();

    const [record, setRecord] = useState<ModuleDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);

    const recordId = params.id as string;
    const isAdmin = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const currentStatus = record?.status;

    useEffect(() => {
        fetchRecord();
    }, [recordId]);

    const fetchRecord = async () => {
        try {
            const result = await ModuleApi.getById(recordId);
            setRecord(result.data);
        } catch (error) {
            console.error('Failed to fetch record:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // === HANDLERS ===
    const handleSave = async (data: ModuleFormData) => {
        await ModuleApi.update(recordId, data);
        setFlashNotification({ type: 'success', message: 'Saved successfully' });
        router.push('/domain/module');
    };

    const handleDeleteConfirm = async (reason?: string) => {
        await ModuleApi.delete(recordId, reason);
        setFlashNotification({ type: 'success', message: 'Deleted successfully' });
        router.push('/domain/module');
    };

    const handleApprove = async () => {
        await ModuleApi.approve(recordId);
        setFlashNotification({ type: 'success', message: 'Approved successfully' });
        router.push('/domain/module');
    };

    const handleDenyConfirm = async (approverMessage: string) => {
        await ModuleApi.deny(recordId, approverMessage);
        setFlashNotification({ type: 'success', message: 'Denied successfully' });
        router.push('/domain/module');
    };

    const handleReactivateConfirm = async () => {
        await ModuleApi.reactivate(recordId);
        setFlashNotification({ type: 'success', message: 'Reactivated successfully' });
        await fetchRecord(); // Refresh to show ACTIVE status
    };

    return (
        <>
            <ModuleForm
                record={record}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onSave={handleSave}
                onDelete={() => setShowDeleteModal(true)}
                onApprove={handleApprove}
                onDeny={() => setShowDenyModal(true)}
                onReactivate={() => setShowReactivateModal(true)}
            />

            {/* Modals */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                recordName={record?.name || ''}
                requireReason={!isAdmin}
            />

            <DenyReasonDialog
                isOpen={showDenyModal}
                onClose={() => setShowDenyModal(false)}
                onConfirm={handleDenyConfirm}
                recordName={record?.name || ''}
            />

            <ConfirmationModal
                isOpen={showReactivateModal}
                onClose={() => setShowReactivateModal(false)}
                onConfirm={handleReactivateConfirm}
                title="Confirm Reactivation"
                message={`This will reactivate "${record?.name}".`}
                confirmText="Reactivate"
                variant="success"
            />
        </>
    );
}
```

### Form Component Pattern

```typescript
// Key patterns for ModuleForm.tsx

interface ModuleFormProps {
    record: ModuleDto | null;
    isLoading: boolean;
    isAdmin: boolean;
    isCreateMode?: boolean;
    onSave: (data: ModuleFormData) => Promise<void>;
    onDelete?: () => void;
    onApprove?: () => Promise<void>;
    onDeny?: () => void;
    onReactivate?: () => void;
}

export function ModuleForm({
    record,
    isLoading,
    isAdmin,
    isCreateMode = false,
    onSave,
    onDelete,
    onApprove,
    onDeny,
    onReactivate,
}: ModuleFormProps) {
    const currentStatus = record?.status;

    // === EDITABILITY & VISIBILITY RULES ===
    const canEdit = isCreateMode || currentStatus === StatusEnum.ACTIVE;
    const showDeleteButton = !isCreateMode && currentStatus === StatusEnum.ACTIVE;
    const showApprovalButtons = isAdmin && [StatusEnum.NEW_RECORD, StatusEnum.FOR_APPROVAL].includes(currentStatus);
    const showDeletionApprovalButtons =
        isAdmin && [StatusEnum.FOR_DELETION, StatusEnum.FOR_DEACTIVATION].includes(currentStatus);
    const showReactivateButton = isAdmin && currentStatus === StatusEnum.INACTIVE;
    const showSaveButtons = canEdit;
    const showChangeReason = !isAdmin && !isCreateMode && currentStatus === StatusEnum.ACTIVE;

    // Tab label with status
    const detailsTabLabel = `Module Information - ${getStatusText(currentStatus)}`;

    // Pending changes tab visibility
    const showPendingChanges = [
        StatusEnum.NEW_RECORD,
        StatusEnum.FOR_APPROVAL,
        StatusEnum.FOR_DELETION,
        StatusEnum.FOR_DEACTIVATION,
    ].includes(currentStatus);

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <TabNavigation
                tabs={[
                    { id: 'details', label: detailsTabLabel },
                    ...(showPendingChanges ? [{ id: 'pending', label: 'Pending Changes' }] : []),
                    ...(!isCreateMode ? [{ id: 'logs', label: 'Activity Logs' }] : []),
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'details' && <FormFields disabled={!canEdit} />}

            {activeTab === 'pending' && <PendingChangesDisplay record={record} isAdmin={isAdmin} />}

            {activeTab === 'logs' && <ActivityLogs logs={record?.activityLogs} />}

            {/* Footer with Action Buttons */}
            <FormFooter
                leftSide={
                    <>
                        {showDeleteButton && <DeleteButton onClick={onDelete} />}
                        {showReactivateButton && <ReactivateButton onClick={onReactivate} />}
                    </>
                }
                rightSide={
                    <>
                        {showApprovalButtons && <ApprovalButtons onApprove={onApprove} onDeny={onDeny} />}
                        {showDeletionApprovalButtons && (
                            <DeletionApprovalButtons onApprove={onApprove} onDeny={onDeny} />
                        )}
                        {showSaveButtons && <SaveCancelButtons onSave={handleSubmit} onCancel={handleCancel} />}
                    </>
                }
            />
        </div>
    );
}
```

### API Client Pattern

```typescript
// module-main.api.ts
import { apiClient, buildUrl } from '@/utils/api';

export const ModuleApi = {
    // CREATE
    create: async (data: CreateModuleDto) => {
        return apiClient.post(buildUrl('/module'), data);
    },

    // READ
    getById: async (id: string) => {
        return apiClient.get(buildUrl(`/module/${id}`));
    },

    getAll: async (params?: QueryParams) => {
        return apiClient.get(buildUrl('/module', params));
    },

    // UPDATE
    update: async (id: string, data: UpdateModuleDto) => {
        return apiClient.put(buildUrl(`/module/${id}`), data);
    },

    // DELETE
    delete: async (id: string, deletionReason?: string) => {
        return apiClient.delete(buildUrl(`/module/${id}`), { data: { deletionReason } });
    },

    // APPROVE
    approve: async (id: string) => {
        return apiClient.post(buildUrl(`/module/${id}/approve`));
    },

    // DENY
    deny: async (id: string, approverMessage: string) => {
        return apiClient.post(buildUrl(`/module/${id}/deny`), { approverMessage });
    },

    // REACTIVATE
    reactivate: async (id: string) => {
        return apiClient.post(buildUrl(`/module/${id}/reactivate`));
    },
};
```

---

## 9. Backend Implementation

### File Structure

```
apps/[domain]/[module]-api-service/src/app/[module]/
├── command/
│   ├── create/
│   │   ├── create.command.ts
│   │   └── create.handler.ts
│   ├── update/
│   │   ├── update.command.ts
│   │   └── update.handler.ts
│   ├── delete/
│   │   ├── delete.command.ts
│   │   └── delete.handler.ts
│   ├── approve/
│   │   ├── approve.command.ts
│   │   └── approve.handler.ts
│   ├── deny-record/
│   │   ├── deny.command.ts
│   │   └── deny.handler.ts
│   └── reactivate/
│       ├── reactivate.command.ts
│       └── reactivate.handler.ts
├── query/
│   ├── get-by-id/
│   └── get-all/
├── module.controller.ts
└── module.module.ts
```

### Handler Patterns

#### Create Handler (USER → NEW_RECORD)

```typescript
// create.handler.ts
@CommandHandler(CreateModuleCommand)
export class CreateModuleHandler implements ICommandHandler<CreateModuleCommand> {
    async execute(command: CreateModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { user, ...data } = command;
        const isAdmin = this.isAdminRole(user.userRole);

        const newRecord: ModuleDto = {
            id: generateId(),
            ...data,
            status: isAdmin ? StatusEnum.ACTIVE : StatusEnum.NEW_RECORD,
            forApprovalVersion: isAdmin ? null : { ...data },
            activityLogs: [
                {
                    action: isAdmin ? 'CREATED' : 'SUBMITTED_FOR_APPROVAL',
                    timestamp: new Date().toISOString(),
                    userId: user.userId,
                    userName: user.userName,
                },
            ],
            createdBy: user.userId,
            createdAt: new Date().toISOString(),
        };

        await this.databaseService.create(newRecord);
        return { data: newRecord };
    }
}
```

#### Update Handler (USER → FOR_APPROVAL)

```typescript
// update.handler.ts
@CommandHandler(UpdateModuleCommand)
export class UpdateModuleHandler implements ICommandHandler<UpdateModuleCommand> {
    async execute(command: UpdateModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { id, user, changeReason, ...updates } = command;
        const existing = await this.databaseService.getById(id);
        const isAdmin = this.isAdminRole(user.userRole);

        if (isAdmin) {
            // ADMIN: Direct update
            const updated = {
                ...existing,
                ...updates,
                updatedBy: user.userId,
                updatedAt: new Date().toISOString(),
                activityLogs: [
                    ...existing.activityLogs,
                    {
                        action: 'UPDATED',
                        timestamp: new Date().toISOString(),
                        userId: user.userId,
                    },
                ],
            };
            await this.databaseService.update(id, updated);
            return { data: updated };
        } else {
            // USER: Submit for approval
            const updated = {
                ...existing,
                status: StatusEnum.FOR_APPROVAL,
                forApprovalVersion: { ...updates },
                changeReason,
                activityLogs: [
                    ...existing.activityLogs,
                    {
                        action: 'SUBMITTED_CHANGES_FOR_APPROVAL',
                        timestamp: new Date().toISOString(),
                        userId: user.userId,
                        changeReason,
                    },
                ],
            };
            await this.databaseService.update(id, updated);
            return { data: updated };
        }
    }
}
```

#### Delete Handler (USER → FOR_DELETION/FOR_DEACTIVATION)

```typescript
// delete.handler.ts - MASTER DATA
@CommandHandler(DeleteModuleCommand)
export class DeleteModuleHandler implements ICommandHandler<DeleteModuleCommand> {
    async execute(command: DeleteModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { id, user, deletionReason } = command;
        const existing = await this.databaseService.getById(id);
        const isAdmin = this.isAdminRole(user.userRole);

        if (isAdmin) {
            // ADMIN: Direct soft delete
            const updated = {
                ...existing,
                status: StatusEnum.INACTIVE,
                activityLogs: [
                    ...existing.activityLogs,
                    {
                        action: 'DEACTIVATED',
                        timestamp: new Date().toISOString(),
                        userId: user.userId,
                    },
                ],
            };
            await this.databaseService.update(id, updated);
            return { data: updated };
        } else {
            // USER: Submit for approval (Master Data → FOR_DEACTIVATION)
            const updated = {
                ...existing,
                status: StatusEnum.FOR_DEACTIVATION,
                deletionReason,
                activityLogs: [
                    ...existing.activityLogs,
                    {
                        action: 'SUBMITTED_FOR_DEACTIVATION',
                        timestamp: new Date().toISOString(),
                        userId: user.userId,
                        deletionReason,
                    },
                ],
            };
            await this.databaseService.update(id, updated);
            return { data: updated };
        }
    }
}
```

#### Approve Handler

```typescript
// approve.handler.ts
@CommandHandler(ApproveModuleCommand)
export class ApproveModuleHandler implements ICommandHandler<ApproveModuleCommand> {
    async execute(command: ApproveModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { id, user } = command;
        const existing = await this.databaseService.getById(id);

        switch (existing.status) {
            case StatusEnum.NEW_RECORD:
            case StatusEnum.FOR_APPROVAL:
                // Apply pending changes
                const updated = {
                    ...existing,
                    ...existing.forApprovalVersion,
                    status: StatusEnum.ACTIVE,
                    forApprovalVersion: null,
                    changeReason: null,
                    activityLogs: [
                        ...existing.activityLogs,
                        {
                            action: 'APPROVED',
                            timestamp: new Date().toISOString(),
                            userId: user.userId,
                        },
                    ],
                };
                await this.databaseService.update(id, updated);
                return { data: updated };

            case StatusEnum.FOR_DEACTIVATION:
                // Soft delete (Master Data)
                const deactivated = {
                    ...existing,
                    status: StatusEnum.INACTIVE,
                    forApprovalVersion: null,
                    deletionReason: null,
                    activityLogs: [
                        ...existing.activityLogs,
                        {
                            action: 'DEACTIVATION_APPROVED',
                            timestamp: new Date().toISOString(),
                            userId: user.userId,
                        },
                    ],
                };
                await this.databaseService.update(id, deactivated);
                return { data: deactivated };

            case StatusEnum.FOR_DELETION:
                // Hard delete (Transactional Data)
                await this.databaseService.delete(id);
                return { data: null, message: 'Record deleted' };
        }
    }
}
```

#### Deny Handler

```typescript
// deny.handler.ts
@CommandHandler(DenyModuleCommand)
export class DenyModuleHandler implements ICommandHandler<DenyModuleCommand> {
    async execute(command: DenyModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { id, user, approverMessage } = command;
        const existing = await this.databaseService.getById(id);

        switch (existing.status) {
            case StatusEnum.NEW_RECORD:
                // Hard delete - record never existed
                await this.databaseService.delete(id);
                return { data: null, message: 'Record denied and deleted' };

            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.FOR_DEACTIVATION:
            case StatusEnum.FOR_DELETION:
                // Revert to ACTIVE
                const updated = {
                    ...existing,
                    status: StatusEnum.ACTIVE,
                    forApprovalVersion: null,
                    changeReason: null,
                    deletionReason: null,
                    approverMessage,
                    activityLogs: [
                        ...existing.activityLogs,
                        {
                            action: 'DENIED',
                            timestamp: new Date().toISOString(),
                            userId: user.userId,
                            approverMessage,
                        },
                    ],
                };
                await this.databaseService.update(id, updated);
                return { data: updated };
        }
    }
}
```

#### Reactivate Handler

```typescript
// reactivate.handler.ts
@CommandHandler(ReactivateModuleCommand)
export class ReactivateModuleHandler implements ICommandHandler<ReactivateModuleCommand> {
    async execute(command: ReactivateModuleCommand): Promise<ResponseDto<ModuleDto>> {
        const { id, user } = command;
        const existing = await this.databaseService.getById(id);

        if (existing.status !== StatusEnum.INACTIVE) {
            throw new BadRequestException('Only INACTIVE records can be reactivated');
        }

        const updated = {
            ...existing,
            status: StatusEnum.ACTIVE,
            activityLogs: [
                ...existing.activityLogs,
                {
                    action: 'REACTIVATED',
                    timestamp: new Date().toISOString(),
                    userId: user.userId,
                },
            ],
        };

        await this.databaseService.update(id, updated);
        return { data: updated };
    }
}
```

### Controller Pattern

```typescript
// module.controller.ts
@Controller('module')
export class ModuleController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    create(@Body() dto: CreateModuleDto, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new CreateModuleCommand({ ...dto, user }));
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetModuleByIdQuery(id));
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateModuleDto, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new UpdateModuleCommand({ id, ...dto, user }));
    }

    @Delete(':id')
    delete(@Param('id') id: string, @Body() dto: DeleteModuleDto, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new DeleteModuleCommand({ id, ...dto, user }));
    }

    @Post(':id/approve')
    approve(@Param('id') id: string, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new ApproveModuleCommand({ id, user }));
    }

    @Post(':id/deny')
    deny(@Param('id') id: string, @Body() dto: DenyModuleDto, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new DenyModuleCommand({ id, ...dto, user }));
    }

    @Post(':id/reactivate')
    reactivate(@Param('id') id: string, @UserCognitoDecorator() user: UserCognito) {
        return this.commandBus.execute(new ReactivateModuleCommand({ id, user }));
    }
}
```

---

## 10. Inline Diff Mode

### When to Show Inline Diffs

Inline diff mode displays pending changes directly on form fields when:

-   Status is `NEW_RECORD`, `FOR_APPROVAL`, `FOR_DELETION`, or `FOR_DEACTIVATION`
-   Admin is viewing the record
-   There are differences between current and `forApprovalVersion`

### Diff Display Pattern

```tsx
// Field with inline diff
const FieldWithDiff = ({ current, pending, label, disabled }) => {
    const hasDiff = current !== pending && pending !== undefined;

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <div className="relative">
                <input
                    value={current}
                    disabled={disabled}
                    className={hasDiff ? 'border-yellow-500 bg-yellow-50' : ''}
                />
                {hasDiff && (
                    <div className="mt-1 text-sm">
                        <span className="text-red-600 line-through">{current}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-medium">{pending}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
```

### Using FieldDiffRow Component

```tsx
import { FieldDiffRow } from '@components-web';

// In your Pending Changes tab
<FieldDiffRow
    label="Product Name"
    oldValue={record.productName}
    newValue={record.forApprovalVersion?.productName}
/>

<FieldDiffRow
    label="Price"
    oldValue={formatCurrency(record.price)}
    newValue={formatCurrency(record.forApprovalVersion?.price)}
/>
```

### Array Diff for Collections

```tsx
import { ArrayDiffTable } from '@components-web';

// For comparing arrays (e.g., product deals)
<ArrayDiffTable
    label="Product Deals"
    oldItems={record.productDeals}
    newItems={record.forApprovalVersion?.productDeals}
    columns={[
        { key: 'unitOfMeasureId', label: 'UOM' },
        { key: 'quantity', label: 'Qty' },
        { key: 'price', label: 'Price' },
    ]}
    getItemKey={(item) => item.id}
/>;
```

---

## 11. Testing Checklist

### Playwright E2E Test Scenarios

#### USER Role Tests

```typescript
describe('USER Role - Create Flow', () => {
    test('creates record with NEW_RECORD status', async () => {
        // 1. Navigate to create page
        // 2. Fill form
        // 3. Submit
        // 4. Verify status is NEW_RECORD
        // 5. Verify form fields are disabled
        // 6. Verify no action buttons shown
    });
});

describe('USER Role - Edit Flow', () => {
    test('requires changeReason for edits', async () => {
        // 1. Open ACTIVE record
        // 2. Make changes
        // 3. Verify changeReason field is visible
        // 4. Verify Save is disabled without changeReason
        // 5. Enter changeReason (min 10 chars)
        // 6. Submit
        // 7. Verify status changes to FOR_APPROVAL
    });
});

describe('USER Role - Delete Flow', () => {
    test('submits deletion for approval', async () => {
        // 1. Open ACTIVE record
        // 2. Click Delete
        // 3. Verify modal asks for reason
        // 4. Enter reason
        // 5. Confirm
        // 6. Verify status is FOR_DELETION or FOR_DEACTIVATION
    });
});
```

#### ADMIN Role Tests

```typescript
describe('ADMIN Role - Direct Operations', () => {
    test('creates record as ACTIVE immediately', async () => {
        // 1. Create record
        // 2. Verify status is ACTIVE immediately
    });

    test('edits without approval', async () => {
        // 1. Edit ACTIVE record
        // 2. Verify no changeReason required
        // 3. Verify changes apply immediately
    });
});

describe('ADMIN Role - Approval Flow', () => {
    test('approves NEW_RECORD', async () => {
        // 1. Open NEW_RECORD
        // 2. Verify Approve/Deny buttons visible
        // 3. Click Approve
        // 4. Verify status is ACTIVE
    });

    test('denies with message', async () => {
        // 1. Open pending record
        // 2. Click Deny
        // 3. Enter approverMessage
        // 4. Verify status reverts to ACTIVE or record deleted
    });

    test('reactivates INACTIVE record', async () => {
        // 1. Open INACTIVE record
        // 2. Verify Reactivate button visible
        // 3. Click Reactivate
        // 4. Confirm
        // 5. Verify status is ACTIVE
    });
});
```

### Visual/UI Tests

| Test Case                    | Expected Result                                 |
| ---------------------------- | ----------------------------------------------- |
| Status in tab label          | Tab shows "Module Info - Active/New Record/etc" |
| No header card on edit forms | Form starts with tabs, no blue header           |
| Footer styling               | `border-t-2 border-gray-200` (no background)    |
| Activity Logs styling        | Gray theme (`text-gray-700`), not purple        |
| Button positioning           | Delete/Reactivate left, Approve/Save right      |
| Disabled fields when pending | Gray background, not editable                   |
| Pending changes tab          | Shows diff when status is pending               |

---

## 12. Find & Replace Table

### Module Name Replacements

| Find         | Replace With    | Example       |
| ------------ | --------------- | ------------- |
| `Product`    | `[YourModule]`  | `Customer`    |
| `product`    | `[yourModule]`  | `customer`    |
| `products`   | `[yourModules]` | `customers`   |
| `PRODUCT`    | `[YOUR_MODULE]` | `CUSTOMER`    |
| `ProductDto` | `[Module]Dto`   | `CustomerDto` |
| `productId`  | `[module]Id`    | `customerId`  |
| `/product/`  | `/[module]/`    | `/customer/`  |

### Command Replacements

| Find                       | Replace With                |
| -------------------------- | --------------------------- |
| `CreateProductCommand`     | `Create[Module]Command`     |
| `UpdateProductCommand`     | `Update[Module]Command`     |
| `DeleteProductCommand`     | `Delete[Module]Command`     |
| `ApproveProductCommand`    | `Approve[Module]Command`    |
| `DenyProductCommand`       | `Deny[Module]Command`       |
| `ReactivateProductCommand` | `Reactivate[Module]Command` |

---

## 13. Anti-Hallucination Checklist

### Before Implementing, VERIFY:

```
□ Read actual reference files (don't assume patterns)
□ Check import paths in existing code
□ Search codebase for actual component names
□ Verify API client method signatures
□ Confirm entity type (Master vs Transactional)
□ Read COMPONENT_LIBRARY_REFERENCE.md for component props
□ Verify UI/UX matches Section 7 standards EXACTLY
```

### UI/UX Validation Checklist (MANDATORY)

```
□ NO header card on edit forms (form starts with tabs)
□ Status displayed in tab label, NOT in separate header
□ Footer uses border-t-2 border-gray-200 (NO background color)
□ Activity Logs use gray theme (bg-gray-600, text-gray-700), NOT purple
□ Delete/Reactivate buttons on LEFT side of footer
□ Save/Approve/Deny/Cancel buttons on RIGHT side of footer
□ Tab buttons use STATUS_TAB_CLASSES for correct status colors
□ Input fields use exact rounded-xl border-2 classes from Section 7
□ Inline diffs use border-blue-300 bg-blue-50 (NOT custom colors)
□ Deletion card uses bg-red-50 border-red-300 styling
```

### Common Mistakes to Avoid

| ❌ Don't                             | ✅ Do Instead                                    |
| ------------------------------------ | ------------------------------------------------ |
| Invent component names               | Search codebase for actual names                 |
| Assume import paths                  | Read actual imports from reference files         |
| Create custom modals                 | Use `@components-web` modals                     |
| Create custom action buttons         | Use `ApprovalActionButtons`, `FormActionButtons` |
| Mix Master/Transactional patterns    | Determine entity type first                      |
| Add header card to edit forms        | Use tab navigation only (status in tab label)    |
| Use purple styling for Activity Logs | Use gray styling (`text-gray-700`)               |
| Add bg-gray-50 to footer             | Use only `border-t-2 border-gray-200`            |
| Create custom button styling         | Copy exact classes from Section 7                |
| Use custom colors for status tabs    | Use `STATUS_TAB_CLASSES` constant                |
| Put Delete button on right side      | Delete/Reactivate go on LEFT                     |
| Invent new diff display styling      | Use exact blue-300/blue-50 pattern               |

---

## Reference Implementation

**Primary Reference**: Products module (`apps/web-app/src/app/(authenticated-routes)/products/product/`)

Always read the actual files from this module when implementing new modules:

-   `[id]/edit/page.tsx` - Edit page orchestrator
-   `[id]/edit/components/ProductForm.tsx` - Form component with all patterns
-   `create/page.tsx` - Create page

---

_Last updated: February 2025_
