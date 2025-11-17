'use client';

import { AccountsDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  account: AccountsDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ show, account, onConfirm, onCancel }: DeleteConfirmationModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onCancel();
      }
    };

    if (show) {
      document.addEventListener('keydown', handler);
    }

    return () => document.removeEventListener('keydown', handler);
  }, [show, onCancel]);

  if (!show || !account) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg sm:p-6 mx-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">⚠️</div>
          <div>
            <p className="m-0 text-lg font-semibold text-gray-900">Delete Account</p>
            <p className="m-0 text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-gray-600 leading-relaxed">
          Are you sure you want to delete <strong>{account.accountName || 'this account'}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
