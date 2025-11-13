'use client';

import { ProductDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
    show: boolean;
    product: ProductDto | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DeleteConfirmationModal({ show, product, onConfirm, onCancel }: DeleteConfirmationModalProps) {
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

    if (!show || !product) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-lg">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 m-0">Delete Product</h3>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                    Are you sure you want to delete <strong>{product.productName}</strong>? This action cannot be
                    undone.
                </p>

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
                        onClick={onConfirm}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
