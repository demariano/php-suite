---
name: 'frontend-create-page'
description: 'USE FOR: Creating Next.js App Router create pages for new entity records. Covers breadcrumb navigation, single-tab layout (Entity Information), CategoryForm in create mode, handleSave with API call, flash notification via useSessionStore, router.push back to list, extractErrorMessage error handling.'
---

# Frontend Create Page Pattern

## Complete Create Page Template

```tsx
'use client';

import {
    {Entity}Api,
    {Entity}Dto,
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {Entity}Form from '../components/{Entity}Form';

export default function Create{Entity}Page() {
    const [isLoading, setIsLoading] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    const handleSave = async ({entityCamel}: {Entity}Dto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await {Entity}Api.create{Entity}(
                {
                    {entityCamel}Name: {entityCamel}.{entityCamel}Name,
                    // ... include all create-relevant fields
                    status: {entityCamel}.status,
                },
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: '{Entity Label} created successfully!',
                alertType: 'success',
            });

            router.push('/{module}/{entity-plural}');
        } catch (error) {
            console.error('Error creating {entity label}:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to create {entity label}. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => router.push('/{module}/{entity-plural}');
    const handleDelete = () => { /* Not applicable for create mode */ };

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2">
                    <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">Home</a>
                    <span className="text-gray-400">/</span>
                    <a href="/{module}" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">{Module}</a>
                    <span className="text-gray-400">/</span>
                    <a href="/{module}/{entity-plural}" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">{Entity Label}s</a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            {/* Single Tab: Entity Information */}
            <div className="flex justify-center">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                    <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                        <div className="flex gap-2 flex-nowrap">
                            <button className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm">
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {Entity Label} Information
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 bg-white">
                        <{Entity}Form
                            isCreateMode={true}
                            selectedEntity={null}
                            successMessage={null}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onCancel={handleCancel}
                            isAdminUser={isAdminUser}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
```

## Key Conventions

| Convention                               | Details                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `isCreateMode={true}`                    | Form renders in create mode (all fields editable)                    |
| `useSessionStore().setFlashNotification` | Success/error toast persists across navigation                       |
| `extractErrorMessage(error, fallback)`   | Safely extract error message from API response                       |
| `router.push` after save                 | Navigate back to list immediately                                    |
| BYPASS_AUTH guard                        | Only pass `userRole` in dev mode with bypass enabled                 |
| Single tab only                          | Create pages show only "{Entity} Information" tab (no Activity Logs) |
