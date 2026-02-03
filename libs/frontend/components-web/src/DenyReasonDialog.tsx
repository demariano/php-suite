'use client';

import { useEffect, useState } from 'react';

interface DenyReasonDialogProps<T> {
    show: boolean;
    record: T | null;
    recordDisplayName?: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

export function DenyReasonDialog<T>({
    show,
    record,
    recordDisplayName,
    onConfirm,
    onCancel,
}: DenyReasonDialogProps<T>) {
    const [approverMessage, setApproverMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            setApproverMessage('');
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
        const trimmedMessage = approverMessage.trim();

        if (!trimmedMessage || trimmedMessage.length < 3) {
            setError('Please provide a reason (minimum 3 characters)');
            return;
        }

        setError('');
        onConfirm(trimmedMessage);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md transform rounded-2xl border-2 border-yellow-200 bg-white shadow-2xl transition-all">
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-4 flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-50">
                            <span className="text-2xl text-yellow-600">⚠</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">Deny Changes</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Please provide a reason for denying this change request.
                                {recordDisplayName && (
                                    <span className="mt-2 block font-semibold text-gray-800">{recordDisplayName}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="mb-4">
                        <label htmlFor="approver-message" className="mb-2 block text-sm font-bold text-gray-700">
                            Denial Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="approver-message"
                            value={approverMessage}
                            onChange={(e) => {
                                setApproverMessage(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Enter your reason for denying this change..."
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:w-auto"
                        >
                            Confirm Denial
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

export default DenyReasonDialog;
