'use client';

import { useEffect } from 'react';

interface CustomerChangeConfirmationModalProps {
    show: boolean;
    itemCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function CustomerChangeConfirmationModal({
    show,
    itemCount,
    onConfirm,
    onCancel,
}: CustomerChangeConfirmationModalProps) {
    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onCancel();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onCancel]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-500">
                        ⚠️
                    </div>
                    <h3 className="m-0 text-lg font-semibold text-gray-800">Change Customer</h3>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-gray-500">
                    You have{' '}
                    <strong>
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </strong>{' '}
                    in your invoice. Changing the customer will clear all invoice details and restore stock quantities.
                    This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-md border border-gray-300 bg-transparent px-5 py-2.5 text-sm font-medium text-gray-500 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
                    >
                        Clear & Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
