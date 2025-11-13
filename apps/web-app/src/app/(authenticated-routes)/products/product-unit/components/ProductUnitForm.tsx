'use client';

import { ProductUnitDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';

interface ProductUnitFormProps {
  isCreateMode: boolean;
  selectedProductUnit: ProductUnitDto | null;
  successMessage: string | null;
  onSave: (productUnit: ProductUnitDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
}

export default function ProductUnitForm({
  isCreateMode,
  selectedProductUnit,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false
}: ProductUnitFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    productUnitName: '',
    changeReason: ''
  });

  useEffect(() => {
    if (!isCreateMode && selectedProductUnit) {
      setFormData({
        productUnitName: selectedProductUnit.productUnitName || '',
        changeReason: selectedProductUnit.changeReason || ''
      });
    }
  }, [isCreateMode, selectedProductUnit]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.productUnitName.trim()) {
      errors.push('Product Unit Name is required.');
    }

    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    if (isCreateMode) {
      const newProductUnit = {
        productUnitName: formData.productUnitName,
        status: StatusEnum.NEW_RECORD
      } as ProductUnitDto;
      onSave(newProductUnit);
    } else {
      const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;
      
      const updatedProductUnit = {
        ...selectedProductUnit,
        productUnitName: formData.productUnitName,
        status: newStatus,
        changeReason: formData.changeReason.trim() || undefined
      } as ProductUnitDto;
      onSave(updatedProductUnit);
    }
  };

  const isFormDisabled = !isCreateMode && selectedProductUnit?.status !== StatusEnum.ACTIVE;

  return (
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

      {!isCreateMode && selectedProductUnit &&
        (selectedProductUnit.status === StatusEnum.FOR_APPROVAL ||
          selectedProductUnit.status === StatusEnum.NEW_RECORD ||
          selectedProductUnit.status === StatusEnum.FOR_DELETION) && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
              ⚠
            </div>
            <span className="text-sm font-semibold">
              {selectedProductUnit.status === StatusEnum.FOR_DELETION
                ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
            </span>
          </div>
        )}

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">
                Product Unit Information
              </h3>
            </div>
            <div className="group">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                Product Unit Name
              </label>
              <input
                type="text"
                name="productUnitName"
                value={formData.productUnitName}
                onChange={(e) => setFormData(prev => ({ ...prev, productUnitName: e.target.value }))}
                placeholder={isCreateMode ? 'Enter product unit name' : ''}
                disabled={isFormDisabled}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  isFormDisabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                }`}
                required
              />
            </div>
          </div>
        </div>

        {!isCreateMode && !isAdminUser && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600">
                  Change Reason
                </h3>
              </div>
              <div className="group">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  Change Reason and Modification Made
                </label>
                <textarea
                  name="changeReason"
                  value={formData.changeReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                  placeholder="Please explain the reason for this change..."
                  rows={3}
                  disabled={isFormDisabled}
                  className={`min-h-[80px] w-full resize-vertical rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFormDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                  required={!isAdminUser}
                />
                <div className="mt-2 text-xs text-gray-500">
                  This field is required when making changes to the product unit record.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {!isCreateMode && selectedProductUnit?.status === StatusEnum.ACTIVE ? (
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
        ) : (
          <div className="hidden sm:block" />
        )}

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {(isCreateMode || selectedProductUnit?.status === StatusEnum.ACTIVE) && (
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCreateMode ? 'Create Product Unit' : 'Save Changes'}
            </button>
          )}
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
  );
}

