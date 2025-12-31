'use client';

import { useEffect, useState } from 'react';

interface DenyReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
  purchaseOrderData: any;
}

export function DenyReasonDialog({ isOpen, onClose, onSubmit, isSubmitting, purchaseOrderData }: DenyReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please provide a reason for denying this record.');
      return;
    }

    if (trimmedReason.length < 3) {
      setError('Reason must be at least 3 characters long.');
      return;
    }

    onSubmit(trimmedReason);
  };

  if (!isOpen || !purchaseOrderData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-lg">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 m-0">Deny Purchase Order Changes</h3>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Please provide a reason for denying <strong>{purchaseOrderData.docNo || purchaseOrderData.rawMaterialsPurchaseOrderId}</strong>:
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
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 focus:border-red-500'
            }`}
            rows={4}
            disabled={isSubmitting}
          />
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Deny Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
