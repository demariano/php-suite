'use client';

import { useEffect, useState } from 'react';

interface DeleteConfirmationModalProps<T> {
    show: boolean;
    record: T | null;
    recordDisplayName?: string;
    onConfirm: (deletionReason: string) => void;
    onCancel: () => void;
}

export function DeleteConfirmationModal<T>({
    show,
    record,
    recordDisplayName,
    onConfirm,
    onCancel,
}: DeleteConfirmationModalProps<T>) {
    const [deletionReason, setDeletionReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            setDeletionReason('');
            setError('');
        }
    }, [show]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && show) {
                onCancel();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [show, onCancel]);

    if (!show || !record) return null;

    const handleConfirm = () => {
        const trimmedReason = deletionReason.trim();

        if (!trimmedReason || trimmedReason.length < 3) {
            setError('Please provide a reason for deletion (minimum 3 characters)');
            return;
        }

        setError('');
        onConfirm(trimmedReason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md transform rounded-2xl border-2 border-red-200 bg-white shadow-2xl transition-all">
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-4 flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                            <span className="text-2xl text-red-600" role="img" aria-label="Delete">
                                🗑️
                            </span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Are you sure you want to delete this record? This action will set the status to INACTIVE
                                (master data soft delete).
                                {recordDisplayName && (
                                    <span className="mt-2 block font-semibold text-gray-800">{recordDisplayName}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="mb-4">
                        <label htmlFor="deletion-reason" className="mb-2 block text-sm font-bold text-gray-700">
                            Deletion Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="deletion-reason"
                            value={deletionReason}
                            onChange={(e) => {
                                setDeletionReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Please provide a reason for deleting this record"
                            rows={4}
                            className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                                error
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                        />
                        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                        <button
                            onClick={handleConfirm}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                        >
                            Delete
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DeleteConfirmationModal;
