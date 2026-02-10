'use client';

import {
    RawMaterialApi,
    RawMaterialDto,
    StatusEnum,
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../components';

type ActiveTab = 'details' | 'logs';

interface DeleteConfirmationModalProps {
    show: boolean;
    rawMaterial: RawMaterialDto | null;
    onConfirm: () => void;
    onCancel: () => void;
}

function DeleteConfirmationModal({ show, rawMaterial, onConfirm, onCancel }: DeleteConfirmationModalProps) {
    if (!show || !rawMaterial) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Delete Raw Material</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Are you sure you want to delete <strong>{rawMaterial.rawMaterialName}</strong>? This action cannot
                    be undone.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

interface DenyReasonDialogProps {
    show: boolean;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

function DenyReasonDialog({ show, onConfirm, onCancel }: DenyReasonDialogProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            setReason('');
            setError('');
        }
    }, [show]);

    if (!show) return null;

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('Please provide a reason.');
            return;
        }
        onConfirm(reason.trim());
    };

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Deny Changes</h3>
                <p className="mt-2 text-sm text-gray-600">Provide a reason for denying these changes.</p>
                <textarea
                    className="mt-4 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason"
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
                    >
                        Confirm Deny
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EditRawMaterialPage({ params }: { params: { rawMaterialId: string } }) {
    const router = useRouter();
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

    const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
    const isFormDisabled = !isAdminUser && selectedRawMaterial?.status !== StatusEnum.ACTIVE;

    useEffect(() => {
        const fetchRawMaterial = async () => {
            if (!params.rawMaterialId) return;

            try {
                setIsLoading(true);
                setError(null);

                const rawMaterial = await RawMaterialApi.getRawMaterialById(params.rawMaterialId, userRole);
                setSelectedRawMaterial(rawMaterial);
                setActiveTab('details');
            } catch (err: any) {
                const message = err?.message || 'Failed to load raw material details. Please try again.';
                setError(message);
                setFlashNotification({
                    title: 'Error!',
                    message,
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRawMaterial();
    }, [params.rawMaterialId, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification, userRole]);

    const handleSave = async (rawMaterial: RawMaterialDto) => {
        try {
            setIsSaving(true);
            setError(null);

            const updatedRecord = await RawMaterialApi.updateRawMaterial(
                rawMaterial.rawMaterialId!,
                {
                    ...rawMaterial,
                    status: rawMaterial.status,
                },
                userRole
            );

            setSelectedRawMaterial(updatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw material updated successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/raw-materials');
        } catch (err: any) {
            const message = err?.message || 'Failed to save raw material. Please try again.';
            setError(message);
            setFlashNotification({
                title: 'Error!',
                message,
                alertType: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRawMaterial?.rawMaterialId) return;

        try {
            setIsSaving(true);
            await RawMaterialApi.approveRawMaterial(selectedRawMaterial.rawMaterialId, userRole);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw material approved successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/raw-materials');
        } catch (err) {
            const message = extractErrorMessage(err, 'Failed to approve raw material. Please try again.');
            setFlashNotification({ title: 'Error', message, alertType: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => setShowDenyDialog(true);

    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selectedRawMaterial?.rawMaterialId) return;

        try {
            setIsSaving(true);
            setShowDenyDialog(false);
            const denied = await RawMaterialApi.denyRawMaterial(
                selectedRawMaterial.rawMaterialId,
                approverMessage,
                userRole
            );
            setSelectedRawMaterial(denied);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw material changes denied successfully!',
                alertType: 'success',
            });
            router.push('/inventory/raw-materials');
        } catch (err) {
            const message = extractErrorMessage(err, 'Failed to deny raw material. Please try again.');
            setFlashNotification({ title: 'Error', message, alertType: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRawMaterial?.rawMaterialId) return;

        try {
            setIsSaving(true);
            setError(null);
            await RawMaterialApi.deleteRawMaterial(selectedRawMaterial.rawMaterialId, userRole);
            setFlashNotification({
                title: 'Success!',
                message: 'Raw material deleted successfully!',
                alertType: 'success',
            });
            router.replace('/inventory/raw-materials');
        } catch (err: any) {
            const message = err?.message || 'Failed to delete raw material. Please try again.';
            setError(message);
            setFlashNotification({ title: 'Error!', message, alertType: 'error' });
        } finally {
            setIsSaving(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancel = () => router.replace('/inventory/raw-materials');

    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.NEW_RECORD:
                return 'New Record';
            default:
                return status;
        }
    };

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
                return 'bg-red-600 text-white shadow-sm';
            case StatusEnum.NEW_RECORD:
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    const handleDetailsSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRawMaterial?.rawMaterialId) return;

        const errors: string[] = [];
        if (!selectedRawMaterial.rawMaterialName?.trim()) {
            errors.push('Raw Material Name is required.');
        }
        if (!isAdminUser && (!selectedRawMaterial.changeReason || !selectedRawMaterial.changeReason.trim())) {
            errors.push('Please provide a reason for the change.');
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            setFlashNotification({ title: 'Validation error', message: errors.join(' '), alertType: 'warning' });
            return;
        }

        setValidationErrors([]);
        setIsSaving(true);
        setError(null);

        try {
            const payload: RawMaterialDto = {
                ...selectedRawMaterial,
                rawMaterialName: selectedRawMaterial.rawMaterialName?.trim(),
                description: selectedRawMaterial.description?.trim() || undefined,
                changeReason: selectedRawMaterial.changeReason?.trim() || undefined,
                status: isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL,
            };

            await handleSave(payload);
        } catch (err: any) {
            const message = err?.message || 'Failed to save raw material. Please try again.';
            setError(message);
            setFlashNotification({ title: 'Error!', message, alertType: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderLogsTab = () => {
        if (!selectedRawMaterial) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-700">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedRawMaterial?.activityLogs)}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block" />
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {isAdminUser &&
                            selectedRawMaterial &&
                            [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                selectedRawMaterial.status as StatusEnum
                            ) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDeny}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && !selectedRawMaterial) {
        return (
            <div className="flex min-h-96 items-center justify-center">
                <div className="text-gray-600">Loading raw material details...</div>
            </div>
        );
    }

    if (!selectedRawMaterial && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Raw material not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <DeleteConfirmationModal
                show={showDeleteConfirm}
                rawMaterial={selectedRawMaterial}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
            <DenyReasonDialog
                show={showDenyDialog}
                onConfirm={handleDenyConfirm}
                onCancel={() => setShowDenyDialog(false)}
            />

            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/raw-materials"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Raw Materials
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {selectedRawMaterial && (
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                            <div className="flex flex-nowrap gap-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${getTabColorClasses(
                                        selectedRawMaterial.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Raw Material Information
                                        {selectedRawMaterial && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>
                                                    {getStatusText(selectedRawMaterial.status || StatusEnum.ACTIVE)}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6">
                            {activeTab === 'details' && selectedRawMaterial && (
                                <form onSubmit={handleDetailsSubmit} className="space-y-6">
                                    {validationErrors.length > 0 && (
                                        <div className="mb-2 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                                                <span className="text-base">⚠️</span>
                                                <span>Please fix the following errors:</span>
                                            </div>
                                            <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                                                {validationErrors.map((errMsg, idx) => (
                                                    <li key={idx}>{errMsg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
                                            <div className="mb-4 flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                                                    <svg
                                                        className="h-5 w-5 text-white"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-base font-bold text-blue-600">
                                                    Raw Material Information
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6">
                                                {!isAdminUser && (
                                                    <ChangeReasonField
                                                        value={selectedRawMaterial.changeReason || ''}
                                                        onChange={(e) =>
                                                            setSelectedRawMaterial((prev) =>
                                                                prev ? { ...prev, changeReason: e.target.value } : prev
                                                            )
                                                        }
                                                        disabled={isFormDisabled}
                                                    />
                                                )}

                                                <div className="group">
                                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                        Raw Material Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedRawMaterial.rawMaterialName || ''}
                                                        onChange={(e) =>
                                                            setSelectedRawMaterial((prev) =>
                                                                prev
                                                                    ? { ...prev, rawMaterialName: e.target.value }
                                                                    : prev
                                                            )
                                                        }
                                                        placeholder="Enter raw material name"
                                                        required
                                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                                                    />
                                                </div>

                                                <div className="group">
                                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                        Description (optional)
                                                    </label>
                                                    <textarea
                                                        value={selectedRawMaterial.description || ''}
                                                        onChange={(e) =>
                                                            setSelectedRawMaterial((prev) =>
                                                                prev ? { ...prev, description: e.target.value } : prev
                                                            )
                                                        }
                                                        placeholder="Enter description"
                                                        rows={3}
                                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 pt-4">
                                        {!isFormDisabled && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                                Delete
                                            </button>
                                        )}
                                        {!!isFormDisabled && <div className="hidden sm:block" />}

                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
