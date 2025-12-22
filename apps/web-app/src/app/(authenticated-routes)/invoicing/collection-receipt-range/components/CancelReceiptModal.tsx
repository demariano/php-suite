'use client';

import { CollectionReceiptRangeDto } from '@data-access/index';
import { useEffect, useState } from 'react';

interface CancelReceiptModalProps {
  show: boolean;
  range: CollectionReceiptRangeDto | null;
  onConfirm: (receiptNumber: number, cancellationReason: string) => void;
  onCancel: () => void;
}

export default function CancelReceiptModal({
  show,
  range,
  onConfirm,
  onCancel
}: CancelReceiptModalProps) {
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (show) {
      setReceiptNumber(0);
      setCancellationReason('');
      setValidationErrors([]);
    }
  }, [show]);

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

  if (!show || !range) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!receiptNumber || receiptNumber < 1) {
      errors.push('Receipt number is required and must be greater than 0.');
    }

    if (receiptNumber < range.startNumber || receiptNumber > range.endNumber) {
      errors.push(`Receipt number must be between ${range.startNumber} and ${range.endNumber}.`);
    }

    const isAlreadyCancelled = range.cancelledReceiptNumbers?.some(
      (cancelled) => cancelled.receiptNumber === receiptNumber
    );

    if (isAlreadyCancelled) {
      errors.push('This receipt number is already cancelled.');
    }

    if (!cancellationReason.trim()) {
      errors.push('Cancellation reason is required.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    onConfirm(receiptNumber, cancellationReason);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md sm:max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-xl text-yellow-600">
            ⚠️
          </div>
          <h3 className="m-0 text-lg font-semibold text-gray-800">
            Cancel Receipt Number
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          {validationErrors.length > 0 && (
            <div className="mb-4 space-y-2 rounded-xl border-2 border-red-500 bg-red-50 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <span className="text-base">⚠️</span>
                <span>Please fix the following errors:</span>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Range: <strong>{range.startNumber} - {range.endNumber}</strong> for <strong>{range.areaName}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Receipt Number
              </label>
              <input
                type="number"
                value={receiptNumber || ''}
                onChange={(e) => setReceiptNumber(Number(e.target.value))}
                min={range.startNumber}
                max={range.endNumber}
                placeholder={`Enter number between ${range.startNumber} and ${range.endNumber}`}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancellation"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:w-auto"
            >
              Cancel Receipt Number
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

