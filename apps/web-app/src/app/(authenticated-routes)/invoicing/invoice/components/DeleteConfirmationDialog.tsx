'use client';

import { InvoiceDto, StatusEnum } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationDialogProps {
    show: boolean;
    invoice: InvoiceDto | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DeleteConfirmationDialog({
    show,
    invoice,
    onConfirm,
    onCancel,
}: DeleteConfirmationDialogProps) {
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

    const isDraft = invoice.status === StatusEnum.DRAFT;
    const displayDocno = invoice.docno || invoice.invoiceId;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-lg">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 m-0">
                        {isDraft ? 'Delete Draft Invoice' : 'Delete Invoice'}
                    </h3>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Are you sure you want to delete invoice{' '}
                        <strong className="text-gray-900">{displayDocno}</strong>?
                    </p>

                    {isDraft ? (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                            <p className="text-sm text-yellow-800">
                                This will permanently delete the draft invoice and restore reserved stock quantities.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-800">
                                <strong>Warning:</strong> This action cannot be undone. The invoice will be deleted and
                                stock quantities will be restored.
                            </p>
                        </div>
                    )}

                    {invoice.invoiceDetails && invoice.invoiceDetails.length > 0 && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <p className="text-xs font-semibold text-blue-900 mb-2">
                                Affected Items ({invoice.invoiceDetails.length}):
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {invoice.invoiceDetails.slice(0, 5).map((detail, index) => (
                                    <p key={index} className="text-xs text-blue-800">
                                        • {detail.productName} (Qty: {detail.qty})
                                    </p>
                                ))}
                                {invoice.invoiceDetails.length > 5 && (
                                    <p className="text-xs text-blue-700 italic">
                                        ...and {invoice.invoiceDetails.length - 5} more items
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Delete Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
