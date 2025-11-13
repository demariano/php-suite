'use client';

import { ProductCategoryDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  category: ProductCategoryDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  show, 
  category, 
  onConfirm, 
  onCancel 
}: DeleteConfirmationModalProps) {
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

  if (!show || !category) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <span className="text-xl text-red-600">⚠️</span>
          </div>
          <h3 className="m-0 text-lg font-semibold text-gray-900">
            Delete Product Category
          </h3>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-gray-600">
          Are you sure you want to delete <strong>&quot;{category.productCategoryName}&quot;</strong>? 
          This action cannot be undone.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
