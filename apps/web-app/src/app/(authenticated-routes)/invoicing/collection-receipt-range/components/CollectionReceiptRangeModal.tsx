'use client';

import { CollectionReceiptRangeDto } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useState } from 'react';
import CancelReceiptModal from './CancelReceiptModal';
import CollectionReceiptRangeForm from './CollectionReceiptRangeForm';

interface CollectionReceiptRangeModalProps {
  show: boolean;
  isCreateMode: boolean;
  selectedRange: CollectionReceiptRangeDto | null;
  activeTab: 'details' | 'logs' | 'cancelled';
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTabChange: (tab: 'details' | 'logs' | 'cancelled') => void;
  onSave: (range: CollectionReceiptRangeDto) => void;
  onDelete: () => void;
  onCancelReceipt: (receiptNumber: number, cancellationReason: string) => void;
}

export default function CollectionReceiptRangeModal({
  show,
  isCreateMode,
  selectedRange,
  activeTab,
  successMessage,
  isAdminUser,
  isLoading,
  onClose,
  onTabChange,
  onSave,
  onDelete,
  onCancelReceipt
}: CollectionReceiptRangeModalProps) {
  const [showCancelReceiptModal, setShowCancelReceiptModal] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  const handleCancelReceiptConfirm = (receiptNumber: number, cancellationReason: string) => {
    onCancelReceipt(receiptNumber, cancellationReason);
    setShowCancelReceiptModal(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-blue-200 bg-gray-50 p-4 sm:p-6">
            <h2 className="m-0 text-xl font-bold text-gray-800">
              {isCreateMode ? 'Create Collection Receipt Range' : 'Edit Collection Receipt Range'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          {!isCreateMode && (
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => onTabChange('details')}
                className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 ${
                  activeTab === 'details'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => onTabChange('cancelled')}
                className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 relative ${
                  activeTab === 'cancelled'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cancelled Receipt Numbers
                {selectedRange && selectedRange.cancelledReceiptNumbers && selectedRange.cancelledReceiptNumbers.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {selectedRange.cancelledReceiptNumbers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => onTabChange('logs')}
                className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 ${
                  activeTab === 'logs'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Activity Logs
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 sm:p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div>
                <CollectionReceiptRangeForm
                  isCreateMode={isCreateMode}
                  selectedRange={selectedRange}
                  successMessage={successMessage}
                  onSave={onSave}
                  onDelete={onDelete}
                  onCancel={onClose}
                  isAdminUser={isAdminUser}
                  onCancelReceipt={() => {
                    setShowCancelReceiptModal(true);
                    onTabChange('cancelled');
                  }}
                  showCancelReceiptButton={!isCreateMode && isAdminUser}
                />
              </div>
            )}

            {/* Cancelled Receipt Numbers Tab */}
            {activeTab === 'cancelled' && !isCreateMode && selectedRange && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800 m-0">
                    Cancelled Receipt Numbers
                    {selectedRange.cancelledReceiptNumbers && selectedRange.cancelledReceiptNumbers.length > 0 && (
                      <span className="ml-2 text-base font-normal text-gray-600">
                        ({selectedRange.cancelledReceiptNumbers.length})
                      </span>
                    )}
                  </h3>
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={() => setShowCancelReceiptModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Receipt Number
                    </button>
                  )}
                </div>

                {selectedRange.cancelledReceiptNumbers && selectedRange.cancelledReceiptNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRange.cancelledReceiptNumbers.map((cancelled, index) => (
                      <div key={index} className="border-2 border-red-200 rounded-xl p-4 bg-red-50 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-red-700">
                                Receipt #{cancelled.receiptNumber}
                              </span>
                              {cancelled.paymentId && (
                                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                                  Payment ID: {cancelled.paymentId}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-semibold">Reason:</span> {cancelled.cancellationReason}
                            </p>
                            <p className="text-xs text-gray-600">
                              Cancelled by <span className="font-semibold">{cancelled.cancelledBy}</span> on{' '}
                              {new Date(cancelled.cancelledAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm font-medium mb-2">No cancelled receipt numbers</p>
                    <p className="text-gray-400 text-xs">
                      {isAdminUser ? 'Click "Cancel Receipt Number" to cancel a receipt.' : 'No cancelled receipts yet.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Activity Logs Tab */}
            {activeTab === 'logs' && !isCreateMode && selectedRange && (
              <div>
                {selectedRange.activityLogs && selectedRange.activityLogs.length > 0 ? (
                  renderActivityLogsTable(selectedRange.activityLogs)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No activity logs available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Receipt Modal */}
      {showCancelReceiptModal && selectedRange && (
        <CancelReceiptModal
          show={showCancelReceiptModal}
          range={selectedRange}
          onConfirm={handleCancelReceiptConfirm}
          onCancel={() => setShowCancelReceiptModal(false)}
        />
      )}
    </>
  );
}

