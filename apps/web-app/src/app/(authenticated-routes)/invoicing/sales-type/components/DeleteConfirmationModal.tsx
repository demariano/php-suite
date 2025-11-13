'use client';

import { SalesTypeDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  salesType: SalesTypeDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  show, 
  salesType, 
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

  if (!show || !salesType) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md sm:max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
            ⚠️
          </div>
          <h3 className="m-0 text-lg font-semibold text-gray-800">
            Delete Sales Type
          </h3>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-gray-600">
          Are you sure you want to delete <strong>&quot;{salesType.salesTypeName}&quot;</strong>? 
          This action cannot be undone.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
