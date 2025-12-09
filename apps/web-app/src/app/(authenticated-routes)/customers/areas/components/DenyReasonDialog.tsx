'use client';

import { AreaDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface DenyReasonDialogProps {
    show: boolean;
    area: AreaDto | null;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

export default function DenyReasonDialog({ show, area, onConfirm, onCancel }: DenyReasonDialogProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onCancel();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onCancel]);

    useEffect(() => {
        if (show) {
            setReason('');
            setError('');
        }
    }, [show]);

    const handleConfirm = () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setError('Please provide a reason for denying this record.');
            return;
        }

        if (trimmedReason.length < 3) {
            setError('Reason must be at least 3 characters long.');
            return;
        }

        onConfirm(trimmedReason);
    };

    if (!show || !area) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-lg">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 m-0">Deny Area Changes</h3>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                    Please provide a reason for denying <strong>{area.areaName || area.areaId}</strong>:
                </p>

                <div className="space-y-2">
                    <textarea
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter reason for denial..."
                        className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                            error
                                ? 'border-red-500 bg-red-50 text-gray-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:shadow-md'
                        }`}
                        rows={4}
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200"
                    >
                        Deny
                    </button>
                </div>
            </div>
        </div>
    );
}

