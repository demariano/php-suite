'use client';

import { InvoiceDto } from '@data-access/index';
import { useEffect } from 'react';

interface CancelConfirmationDialogProps {
    show: boolean;
    invoice: InvoiceDto | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function CancelConfirmationDialog({
    show,
    invoice,
    onConfirm,
    onCancel,
}: CancelConfirmationDialogProps) {
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

    if (!show || !invoice) {
        return null;
    }

    const itemCount = invoice.invoiceDetails?.length || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 text-lg">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 m-0">Cancel Draft Invoice?</h3>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        You have unsaved changes in this draft invoice. If you cancel now, the draft will be{' '}
                        <strong className="text-gray-900">permanently deleted</strong> and all reserved stock will be
                        restored.
                    </p>

                    {itemCount > 0 && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <p className="text-xs font-semibold text-blue-900 mb-2">
                                Draft Invoice Details ({itemCount} {itemCount === 1 ? 'item' : 'items'}):
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {invoice.invoiceDetails?.slice(0, 5).map((detail, index) => (
                                    <p key={index} className="text-xs text-blue-800">
                                        • {detail.productName} (Qty: {detail.qty})
                                    </p>
                                ))}
                                {itemCount > 5 && (
                                    <p className="text-xs text-blue-700 italic">...and {itemCount - 5} more items</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                        <p className="text-sm text-orange-800">
                            <strong>Tip:</strong> Use the "Save to Draft" button if you want to keep this draft and
                            continue later.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                    >
                        No, Keep Draft
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Yes, Delete Draft
                    </button>
                </div>
            </div>
        </div>
    );
}
