'use client';

import { AreaDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  area: AreaDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  show, 
  area, 
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

  if (!show || !area) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-xl">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 m-0">
            Delete Area
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Are you sure you want to delete <strong>&quot;{area.areaName}&quot;</strong>? 
          This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
