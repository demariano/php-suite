---
name: 'frontend-entity-form'
description: 'USE FOR: Creating React form components for entity CRUD with approval workflow UI. Covers two form variants: simple create-mode form and full edit-mode form with status-colored tabs, field change detection (createFieldChangeDetector), inline diff rendering (old → new), forApprovalVersion display, ChangeReasonField for non-admin users, Activity Logs tab (renderActivityLogsTable), action buttons (Save/Delete/Reactivate/Approve/Deny/Cancel) conditional by status and role.'
---

# Frontend Entity Form Pattern

Two form variants exist per entity:

1. **Create Form** (`components/{Entity}Form.tsx`) — simpler, used by create page
2. **Edit Form** (`[id]/edit/components/{Entity}Form.tsx`) — full version with tabs, approval UI, diffs

## Create Form Template (Simple)

```tsx
'use client';

import { {Entity}Dto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../components';

interface {Entity}FormProps {
    isCreateMode: boolean;
    selectedEntity: {Entity}Dto | null;
    successMessage: string | null;
    onSave: (entity: {Entity}Dto) => void;
    onDelete: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
}

export default function {Entity}Form({
    isCreateMode, selectedEntity, successMessage,
    onSave, onDelete, onCancel, isAdminUser = false,
}: {Entity}FormProps) {
    const [userHasMadeSelections, setUserHasMadeSelections] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        {entityCamel}Name: '',
        changeReason: '',
        // ... other entity fields
    });

    // Initialize form data from entity (edit mode only)
    useEffect(() => {
        if (!isCreateMode && selectedEntity && !userHasMadeSelections) {
            setFormData({
                {entityCamel}Name: selectedEntity.{entityCamel}Name || '',
                changeReason: selectedEntity.changeReason || '',
            });
        }
    }, [isCreateMode, selectedEntity, userHasMadeSelections]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const errors: string[] = [];
        if (!formData.{entityCamel}Name?.trim()) errors.push('{Entity} name is required.');
        if (!isCreateMode && !isAdminUser && !formData.changeReason?.trim()) {
            errors.push('Please provide a reason for the change.');
        }
        if (errors.length > 0) { setValidationErrors(errors); return; }
        setValidationErrors([]);

        if (isCreateMode) {
            onSave({ {entityCamel}Name: formData.{entityCamel}Name.trim(), status: StatusEnum.NEW_RECORD } as {Entity}Dto);
        } else {
            onSave({
                ...selectedEntity,
                {entityCamel}Name: formData.{entityCamel}Name.trim(),
                status: isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL,
                changeReason: formData.changeReason?.trim() || undefined,
            } as {Entity}Dto);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
                    <ul className="list-disc pl-5 text-sm text-red-700">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            {/* Change Reason (non-admin, edit mode) */}
            {!isCreateMode && !isAdminUser && (
                <ChangeReasonField
                    value={formData.changeReason}
                    onChange={(e) => { setFormData(prev => ({ ...prev, changeReason: e.target.value })); setUserHasMadeSelections(true); }}
                    disabled={!isCreateMode && selectedEntity?.status !== StatusEnum.ACTIVE}
                />
            )}

            {/* Entity Fields */}
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2">{Entity} Name</label>
                        <input
                            type="text"
                            value={formData.{entityCamel}Name}
                            onChange={(e) => { setFormData(prev => ({ ...prev, {entityCamel}Name: e.target.value })); setUserHasMadeSelections(true); }}
                            disabled={!isCreateMode && selectedEntity?.status !== StatusEnum.ACTIVE}
                            className="w-full px-4 py-3 border-2 rounded-xl text-sm"
                            required
                        />
                    </div>
                    {/* Add more fields as needed */}
                </div>
            </div>

            {/* Action Buttons: Save + Cancel + Delete/Reactivate */}
            <div className="mt-8 flex gap-3 border-t-2 pt-6">
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
                    {isCreateMode ? 'Create {Entity}' : 'Save Changes'}
                </button>
                <button type="button" onClick={onCancel} className="border-2 border-gray-300 px-6 py-3 rounded-xl font-semibold">Cancel</button>
            </div>
        </form>
    );
}
```

## Edit Form Template (Full — with Tabs, Approval UI, Diffs)

```tsx
'use client';

import { {Entity}Dto, StatusEnum } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useMemo, useState } from 'react';
import { ChangeReasonField, ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';

interface {Entity}FormProps {
    isCreateMode: boolean;
    selected{Entity}: {Entity}Dto | null;
    successMessage: string | null;
    onSave: (entity: {Entity}Dto) => void;
    onDelete: () => void;
    onReactivate?: () => void;
    onCancel: () => void;
    isAdminUser?: boolean;
    activeTab?: 'details' | 'logs';
    onTabChange?: (tab: 'details' | 'logs') => void;
    isLoading?: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
}

// ──── Status-colored tab classes ────
const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-600 text-white shadow-sm',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white shadow-sm',
    [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.FOR_DEACTIVATION]: 'bg-red-600 text-white shadow-sm',
    [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white shadow-sm',
    [StatusEnum.INACTIVE]: 'bg-gray-500 text-white shadow-sm',
    [StatusEnum.DRAFT]: 'bg-blue-600 text-white shadow-sm',
};

export default function {Entity}Form({
    isCreateMode, selected{Entity}, successMessage, onSave, onDelete, onReactivate,
    onCancel, isAdminUser = false, activeTab = 'details', onTabChange,
    isLoading = false, onApprove, onDeny,
}: {Entity}FormProps) {
    const [formData, setFormData] = useState({ {entityCamel}Name: '', changeReason: '' });

    const currentStatus = selected{Entity}?.status ?? StatusEnum.NEW_RECORD;
    const pendingVersion = useMemo(() => (selected{Entity}?.forApprovalVersion ?? {}) as any, [selected{Entity}?.forApprovalVersion]);
    const canEditDetails = isCreateMode || currentStatus === StatusEnum.ACTIVE;
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);
    const showApprovalUI = isApprovalState && !isCreateMode;
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    useEffect(() => {
        if (!isCreateMode && selected{Entity}) {
            setFormData({
                {entityCamel}Name: selected{Entity}.{entityCamel}Name ?? '',
                changeReason: selected{Entity}.changeReason ?? '',
            });
        }
    }, [isCreateMode, selected{Entity}]);

    // ──── Field Change Detection ────
    const isFieldChanged = createFieldChangeDetector(
        (selected{Entity} ?? {}) as any,
        (selected{Entity}?.forApprovalVersion as any) ?? undefined
    );

    // ──── Inline Diff Rendering ────
    const renderFieldWithInlineDiff = (label: string, fieldName: string, currentValue: unknown, pendingValue: unknown) => {
        const hasChange = isFieldChanged(fieldName);

        if (showApprovalUI && hasChange) {
            return (
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">{label}</label>
                    <div className="px-4 py-3 border-2 border-blue-300 bg-blue-50 rounded-xl text-sm font-medium">
                        <span className="line-through text-gray-500">{String(currentValue ?? '-')}</span>
                        <span className="mx-2 text-blue-600">→</span>
                        <span className="font-semibold text-blue-700">{String(pendingValue ?? '-')}</span>
                    </div>
                </div>
            );
        }

        // Normal read-only display
        return (
            <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
                <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-white text-gray-500">
                    {String(currentValue ?? '-')}
                </div>
            </div>
        );
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isCreateMode) {
            onSave({ {entityCamel}Name: formData.{entityCamel}Name, status: StatusEnum.NEW_RECORD } as {Entity}Dto);
        } else {
            onSave({ ...selected{Entity}, {entityCamel}Name: formData.{entityCamel}Name, changeReason: !isAdminUser ? formData.changeReason?.trim() || undefined : selected{Entity}?.changeReason } as {Entity}Dto);
        }
    };

    // ──── Details Tab ────
    const renderDetailsTab = () => (
        <div className="space-y-6">
            {!isCreateMode && !isAdminUser && currentStatus === StatusEnum.ACTIVE && (
                <ChangeReasonField value={formData.changeReason} onChange={(e) => setFormData(p => ({ ...p, changeReason: e.target.value }))} disabled={!canEditDetails} />
            )}
            {showApprovalUI && selected{Entity}?.changeReason && <ChangeReasonReadOnly value={selected{Entity}.changeReason} />}
            {showDeletionCard && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-8">
                    <h3 className="text-lg font-bold text-red-800">
                        {currentStatus === StatusEnum.FOR_DELETION ? 'Record Marked for Deletion' : 'Record Marked for Deactivation'}
                    </h3>
                    {selected{Entity}?.changeReason && (
                        <div className="bg-white border-2 border-red-200 rounded-lg p-4 text-sm">{selected{Entity}.changeReason}</div>
                    )}
                </div>
            )}

            <div className={`border-2 rounded-xl p-4 sm:p-6 ${showApprovalUI ? 'border-green-400' : 'border-gray-200'}`}>
                {showApprovalUI ? (
                    <>{renderFieldWithInlineDiff('{Entity} Name', '{entityCamel}Name', selected{Entity}?.{entityCamel}Name, pendingVersion.{entityCamel}Name)}</>
                ) : (
                    <input type="text" value={formData.{entityCamel}Name} onChange={(e) => setFormData(p => ({ ...p, {entityCamel}Name: e.target.value }))}
                        disabled={!canEditDetails} className="w-full px-4 py-3 border-2 rounded-xl text-sm" required />
                )}
            </div>
        </div>
    );

    // ──── Logs Tab ────
    const renderLogsTab = () => (
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
            {renderActivityLogsTable(selected{Entity}?.activityLogs, 'No activity logs available.')}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                    {/* Status-Colored Tabs */}
                    <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2">
                        <div className="flex gap-2">
                            <button type="button" onClick={() => onTabChange?.('details')}
                                className={`${activeTab === 'details' ? STATUS_TAB_CLASSES[currentStatus] : 'bg-white text-gray-600'} px-5 py-3 rounded-lg font-semibold text-sm`}>
                                {Entity} Information - {currentStatus}
                            </button>
                            {!isCreateMode && (
                                <button type="button" onClick={() => onTabChange?.('logs')}
                                    className={`${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} px-5 py-3 rounded-lg font-semibold text-sm`}>
                                    Activity Logs
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-white space-y-6">
                        {activeTab === 'details' && renderDetailsTab()}
                        {!isCreateMode && activeTab === 'logs' && renderLogsTab()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 border-t-2 pt-6 px-4 pb-4 sm:flex-row sm:justify-between">
                        {/* Left: Delete (ACTIVE) or Reactivate (INACTIVE) */}
                        {!isCreateMode && currentStatus === StatusEnum.ACTIVE && (
                            <button type="button" onClick={onDelete} disabled={isLoading} className="bg-red-600 text-white px-6 py-3 rounded-xl">Delete</button>
                        )}
                        {!isCreateMode && isAdminUser && currentStatus === StatusEnum.INACTIVE && onReactivate && (
                            <button type="button" onClick={onReactivate} className="bg-green-600 text-white px-6 py-3 rounded-xl">Reactivate</button>
                        )}

                        {/* Right: Save + Approve/Deny + Cancel */}
                        <div className="flex gap-2">
                            {(isCreateMode || currentStatus === StatusEnum.ACTIVE) && (
                                <button type="submit" disabled={!canEditDetails || isLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl">
                                    {isCreateMode ? 'Create' : 'Save Changes'}
                                </button>
                            )}
                            {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                                <>
                                    <button type="button" onClick={onDeny} disabled={isLoading} className="bg-red-600 text-white px-6 py-3 rounded-xl">Deny</button>
                                    <button type="button" onClick={onApprove} disabled={isLoading} className="bg-green-600 text-white px-6 py-3 rounded-xl">Approve</button>
                                </>
                            )}
                            <button type="button" onClick={onCancel} className="border-2 border-gray-300 px-6 py-3 rounded-xl">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
```

## Key Utilities

| Utility                     | Import                       | Purpose                                      |
| --------------------------- | ---------------------------- | -------------------------------------------- |
| `createFieldChangeDetector` | `utils/fieldChangeDetection` | Returns `isFieldChanged(fieldName)` function |
| `renderActivityLogsTable`   | `utils/activityLogUtils`     | Renders activity logs in table format        |
| `ChangeReasonField`         | Shared components            | Editable change reason textarea              |
| `ChangeReasonReadOnly`      | Shared components            | Read-only change reason display              |

## Form State Logic

| Status           | Form Fields       | Change Reason        | Inline Diffs         | Action Buttons |
| ---------------- | ----------------- | -------------------- | -------------------- | -------------- |
| ACTIVE           | Editable inputs   | Editable (non-admin) | No                   | Save + Delete  |
| FOR_APPROVAL     | Read-only + diffs | Read-only            | Yes (old → new)      | Approve + Deny |
| NEW_RECORD       | Read-only         | Read-only            | No (only new values) | Approve + Deny |
| FOR_DEACTIVATION | Deletion card     | Read-only            | No                   | Approve + Deny |
| INACTIVE         | Read-only         | -                    | No                   | Reactivate     |
