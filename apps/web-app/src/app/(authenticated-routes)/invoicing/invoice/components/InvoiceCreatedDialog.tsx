'use client';

import { InvoiceDto } from '@data-access/index';
import { useEffect } from 'react';

interface InvoiceCreatedDialogProps {
  show: boolean;
  invoice: InvoiceDto | null;
  onAcknowledge: () => void;
}

export default function InvoiceCreatedDialog({
  show,
  invoice,
  onAcknowledge
}: InvoiceCreatedDialogProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onAcknowledge();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onAcknowledge]);

  if (!show || !invoice) return null;

  const totalAmount = invoice.invoiceAmount || invoice.finalAmount || 0;
  const totalItems = invoice.invoiceDetails?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-2xl">
            ✓
          </div>
          <h3 className="text-xl font-semibold text-gray-800 m-0">
            Invoice Created Successfully
          </h3>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Doc No
                </label>
                <p className="text-base font-medium text-gray-800 m-0">
                  {invoice.docno || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Customer Name
                </label>
                <p className="text-base font-medium text-gray-800 m-0">
                  {invoice.customerName || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Total Amount
                </label>
                <p className="text-base font-medium text-gray-800 m-0">
                  ₱{totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  No. of Total Items
                </label>
                <p className="text-base font-medium text-gray-800 m-0">
                  {totalItems}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

