---
name: 'frontend-edit-page'
description: 'USE FOR: Creating Next.js App Router edit pages for existing entity records. Covers fetch by ID on mount, handlers for save/delete/approve/deny/reactivate, DeleteConfirmationModal, DenyReasonDialog, ConfirmationModal (reactivate), CategoryForm edit mode with two tabs (details + activity logs), tab colors by status, flash notifications.'
---

# Frontend Edit Page Pattern

## Complete Edit Page Template

```tsx
'use client';

import { ConfirmationModal, DeleteConfirmationModal } from '@components-web';
import {
    extractErrorMessage,
    {Entity}Api,
    {Entity}Dto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import {Entity}Form from './components/{Entity}Form';

interface Edit{Entity}PageProps {
    params: { id: string };
}

export default function Edit{Entity}Page({ params }: Edit{Entity}PageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selected{Entity}, setSelected{Entity}] = useState<{Entity}Dto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // ──── Fetch on Mount ────
    useEffect(() => {
        const fetchEntity = async () => {
            try {
                setIsLoading(true);
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
                const entity = await {Entity}Api.get{Entity}ById(params.id, userRole);
                setSelected{Entity}(entity);
            } catch (err) {
                console.error('Error fetching {entity label}:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load {entity label} details.');
                setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        if (params.id) fetchEntity();
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole]);

    // ──── Save Handler ────
    const handleSave = async ({entityCamel}: {Entity}Dto) => {
        try {
            setIsLoading(true);
            const userRole = env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                ? authedUser?.userRole : undefined;

            const updated = await {Entity}Api.update{Entity}(
                params.id,
                {
                    {entityCamel}Id: {entityCamel}.{entityCamel}Id,
                    {entityCamel}Name: {entityCamel}.{entityCamel}Name,
                    status: {entityCamel}.status,
                    changeReason: {entityCamel}.changeReason,
                    // ... other entity-specific fields
                },
                userRole
            );

            setSelected{Entity}(updated);
            setFlashNotification({ title: 'Success!', message: '{Entity Label} updated successfully!', alertType: 'success' });
            router.push('/{module}/{entity-plural}');
        } catch (error) {
            console.error('Error updating {entity label}:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update {entity label}.');
            setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // ──── Delete Handler ────
    const handleDelete = () => setShowDeleteConfirm(true);
    const handleDeleteConfirm = async (deletionReason: string) => {
        if (!selected{Entity}) return;
        try {
            setIsLoading(true);
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await {Entity}Api.delete{Entity}(selected{Entity}, deletionReason, userRole);
            setFlashNotification({ title: 'Success!', message: '{Entity Label} deleted successfully!', alertType: 'success' });
            router.push('/{module}/{entity-plural}');
        } catch (error) {
            const errorMessage = extractErrorMessage(error, 'Failed to delete {entity label}.');
            setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    // ──── Approve Handler ────
    const handleApprove = async () => {
        if (!selected{Entity}) return;
        try {
            setIsLoading(true);
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await {Entity}Api.approve{Entity}(selected{Entity}.{entityCamel}Id, userRole);
            setFlashNotification({ title: 'Success!', message: '{Entity Label} approved successfully!', alertType: 'success' });
            router.push('/{module}/{entity-plural}');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to approve {entity label}';
            setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // ──── Deny Handler ────
    const handleDeny = () => setShowDenyDialog(true);
    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selected{Entity}) return;
        try {
            setIsLoading(true);
            setShowDenyDialog(false);
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await {Entity}Api.deny{Entity}(selected{Entity}.{entityCamel}Id, approverMessage, userRole);
            setFlashNotification({ title: 'Success!', message: '{Entity Label} changes denied successfully!', alertType: 'success' });
            router.push('/{module}/{entity-plural}');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to deny {entity label}';
            setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // ──── Reactivate Handler ────
    const handleReactivateClick = () => setShowReactivateConfirm(true);
    const handleReactivateConfirm = async () => {
        if (!selected{Entity}) return;
        try {
            setIsLoading(true);
            setShowReactivateConfirm(false);
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const reactivated = await {Entity}Api.reactivate{Entity}(selected{Entity}.{entityCamel}Id, userRole);
            setSelected{Entity}(reactivated);
            setFlashNotification({ title: 'Success!', message: '{Entity Label} reactivated successfully!', alertType: 'success' });
            router.push('/{module}/{entity-plural}');
        } catch (err) {
            const errorMessage = extractErrorMessage(err, 'Failed to reactivate {entity label}.');
            setFlashNotification({ title: 'Error', message: errorMessage, alertType: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => router.push('/{module}/{entity-plural}');

    // ──── Not Found State ────
    if (!selected{Entity} && !isLoading) {
        return (
            <div className="min-h-screen bg-white p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    <span>{Entity Label} not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">Home</a>
                    <span>/</span>
                    <a href="/{module}" className="text-blue-600 hover:text-blue-700">{Module}</a>
                    <span>/</span>
                    <a href="/{module}/{entity-plural}" className="text-blue-600 hover:text-blue-700">{Entity Label}s</a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !selected{Entity} ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="text-gray-600 text-sm">Loading {entity label} details...</div>
                </div>
            ) : null}

            {selected{Entity} && (
                <{Entity}Form
                    isCreateMode={false}
                    selected{Entity}={selected{Entity}}
                    successMessage={null}
                    isAdminUser={isAdminUser}
                    isLoading={isLoading}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onReactivate={handleReactivateClick}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onCancel={handleCancel}
                />
            )}

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                record={selected{Entity}}
                recordDisplayName={selected{Entity}?.{entityCamel}Name}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                {entityCamel}={selected{Entity}}
                onConfirm={handleDenyConfirm}
                onCancel={() => setShowDenyDialog(false)}
            />

            <ConfirmationModal
                show={showReactivateConfirm}
                record={selected{Entity}}
                variant="reactivate"
                recordDisplayName={selected{Entity}?.{entityCamel}Name}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={() => setShowReactivateConfirm(false)}
            />
        </div>
    );
}
```

## Action Availability by Status

| Status             | Save | Delete     | Approve | Deny                | Reactivate |
| ------------------ | ---- | ---------- | ------- | ------------------- | ---------- |
| `ACTIVE`           | Yes  | Admin only | -       | -                   | -          |
| `FOR_APPROVAL`     | -    | -          | Admin   | Admin               | -          |
| `NEW_RECORD`       | -    | -          | Admin   | Admin (hard delete) | -          |
| `FOR_DEACTIVATION` | -    | -          | Admin   | Admin               | -          |
| `FOR_DELETION`     | -    | -          | Admin   | Admin               | -          |
| `INACTIVE`         | -    | -          | -       | -                   | Admin only |

## Shared Modal Components

-   `DeleteConfirmationModal` from `@components-web` — requires `deletionReason` input
-   `DenyReasonDialog` — custom per-entity, requires `approverMessage`
-   `ConfirmationModal` from `@components-web` — `variant="reactivate"` with custom message
