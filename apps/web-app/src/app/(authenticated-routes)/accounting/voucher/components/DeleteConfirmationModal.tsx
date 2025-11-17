'use client';

import { VoucherDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  voucher: VoucherDto | null;
  onConfirm: (deleteReason: string) => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  show,
  voucher,
  onConfirm,
  onCancel
}: DeleteConfirmationModalProps) {
  const [deleteReason, setDeleteReason] = useState('');

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

  // Reset delete reason when modal opens
  useEffect(() => {
    if (show) {
      setDeleteReason('');
    }
  }, [show]);

  const handleConfirm = () => {
    if (deleteReason.trim().length < 10) {
      return; // Don't confirm if reason is too short
    }
    onConfirm(deleteReason);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-xl">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 m-0">
            Delete Voucher
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Are you sure you want to delete voucher <strong>{voucher?.voucherNo}</strong>? This action cannot be undone.
        </p>

        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>
              Delete Reason<span className="ml-1 text-red-600">*</span>
            </span>
          </label>
          <textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Please provide a reason for deletion (minimum 10 characters)"
            className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-vertical"
            rows={3}
          />
          <p className="mt-2 text-xs text-gray-500">
            {deleteReason.length}/10 characters minimum
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteReason.trim().length < 10}
            className={`px-6 py-3 font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
              deleteReason.trim().length < 10
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
