'use client';

import { AreaDto, CollectionReceiptRangeDto } from '@data-access/index';
import { useEffect, useState } from 'react';
import NumberInput from '../../../components/NumberInput';
import AreaSearchableSelectionModal from '../../../search-modals/AreaSearchableSelectionModal';

interface CollectionReceiptRangeFormProps {
  isCreateMode: boolean;
  selectedRange: CollectionReceiptRangeDto | null;
  successMessage: string | null;
  onSave: (range: CollectionReceiptRangeDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  onCancelReceipt?: () => void;
  showCancelReceiptButton?: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
}

export default function CollectionReceiptRangeForm({
  isCreateMode,
  selectedRange,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  onCancelReceipt,
  showCancelReceiptButton = false
}: CollectionReceiptRangeFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [formData, setFormData] = useState({
    areaId: '',
    areaName: '',
    startNumber: 0,
    endNumber: 0,
  });

  useEffect(() => {
    if (!isCreateMode && selectedRange) {
      setFormData({
        areaId: selectedRange.areaId || '',
        areaName: selectedRange.areaName || '',
        startNumber: selectedRange.startNumber || 0,
        endNumber: selectedRange.endNumber || 0,
      });
    }
  }, [isCreateMode, selectedRange]);

  const handleAreaSelect = (area: AreaDto) => {
    setFormData(prev => ({ ...prev, areaId: area.areaId, areaName: area.areaName || '' }));
    setShowAreaModal(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.areaId?.trim()) {
      errors.push('Area is required.');
    }

    if (!formData.areaName?.trim()) {
      errors.push('Area name is required.');
    }

    if (formData.startNumber < 0) {
      errors.push('Start number must be greater than or equal to 0.');
    }

    if (formData.endNumber <= formData.startNumber) {
      errors.push('End number must be greater than start number.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    if (isCreateMode) {
      const newRange = {
        areaId: formData.areaId,
        areaName: formData.areaName,
        startNumber: formData.startNumber,
        endNumber: formData.endNumber,
      } as CollectionReceiptRangeDto;
      onSave(newRange);
    } else {
      const updatedRange = {
        ...selectedRange,
        areaId: formData.areaId,
        areaName: formData.areaName,
        startNumber: formData.startNumber,
        endNumber: formData.endNumber,
      } as CollectionReceiptRangeDto;
      onSave(updatedRange);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
              ✓
            </div>
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mb-4 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
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

        <div className="space-y-6">
          <section className="space-y-4">
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
              <header className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600 m-0">
                  Collection Receipt Range Information
                </h3>
              </header>
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Area
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAreaModal(true)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md text-left"
                  >
                    {formData.areaName || 'Select Area'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Start Number
                    </label>
                    <NumberInput
                      value={Math.floor(formData.startNumber)}
                      onChange={(value: number) => setFormData(prev => ({ ...prev, startNumber: Math.floor(value) }))}
                      placeholder="Enter start number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                      step={1}
                      min={0}
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      End Number
                    </label>
                    <NumberInput
                      value={Math.floor(formData.endNumber)}
                      onChange={(value: number) => setFormData(prev => ({ ...prev, endNumber: Math.floor(value) }))}
                      placeholder="Enter end number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                      step={1}
                      min={0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {!isCreateMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
            {showCancelReceiptButton && onCancelReceipt && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancelReceipt();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Receipt Number
              </button>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCreateMode ? 'Create Range' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      </form>

      <AreaSearchableSelectionModal
        show={showAreaModal}
        title="Select Area"
        selectedValue={formData.areaId}
        onSelect={handleAreaSelect}
        onClose={() => setShowAreaModal(false)}
      />
    </>
  );
}

