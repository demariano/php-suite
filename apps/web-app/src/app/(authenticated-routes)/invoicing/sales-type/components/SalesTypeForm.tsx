'use client';

import { SalesTypeDto, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';
import NumberInput from '../../../components/NumberInput';

interface SalesTypeFormProps {
  isCreateMode: boolean;
  selectedSalesType: SalesTypeDto | null;
  successMessage: string | null;
  onSave: (salesType: SalesTypeDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
}

export default function SalesTypeForm({
  isCreateMode,
  selectedSalesType,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false
}: SalesTypeFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    salesTypeName: '',
    allowDiscount: false,
    contractSales: false,
    defaultDiscount: 0,
    defaultTax: 0,
    incomeGenerating: false,
    taxable: false,
    changeReason: ''
  });

  useEffect(() => {
    if (!isCreateMode && selectedSalesType) {
      setFormData({
        salesTypeName: selectedSalesType.salesTypeName || '',
        allowDiscount: selectedSalesType.allowDiscount || false,
        contractSales: selectedSalesType.contractSales || false,
        defaultDiscount: selectedSalesType.defaultDiscount || 0,
        defaultTax: selectedSalesType.defaultTax || 0,
        incomeGenerating: selectedSalesType.incomeGenerating || false,
        taxable: selectedSalesType.taxable || false,
        changeReason: selectedSalesType.changeReason || ''
      });
    }
  }, [isCreateMode, selectedSalesType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.salesTypeName.trim()) {
      errors.push('Sales Type Name is required.');
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
      const newSalesType = {
        salesTypeName: formData.salesTypeName,
        allowDiscount: formData.allowDiscount,
        contractSales: formData.contractSales,
        defaultDiscount: formData.defaultDiscount,
        defaultTax: formData.defaultTax,
        incomeGenerating: formData.incomeGenerating,
        taxable: formData.taxable,
        status: StatusEnum.NEW_RECORD
      } as SalesTypeDto;
      onSave(newSalesType);
    } else {
      // Determine status based on user role
      const newStatus = isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL;
      
      const updatedSalesType = {
        ...selectedSalesType,
        salesTypeName: formData.salesTypeName,
        allowDiscount: formData.allowDiscount,
        contractSales: formData.contractSales,
        defaultDiscount: formData.defaultDiscount,
        defaultTax: formData.defaultTax,
        incomeGenerating: formData.incomeGenerating,
        taxable: formData.taxable,
        status: newStatus,
        changeReason: formData.changeReason.trim() || undefined
      } as SalesTypeDto;
      onSave(updatedSalesType);
    }
  };

  const isFormDisabled = !isCreateMode && selectedSalesType?.status !== StatusEnum.ACTIVE;

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

      {!isCreateMode && selectedSalesType &&
        (selectedSalesType.status === StatusEnum.FOR_APPROVAL ||
          selectedSalesType.status === StatusEnum.NEW_RECORD ||
          selectedSalesType.status === StatusEnum.FOR_DELETION) && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
              ⚠
            </div>
            <span className="text-sm font-semibold">
              {selectedSalesType.status === StatusEnum.FOR_DELETION
                ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
            </span>
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
                Sales Type Information
              </h3>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Sales Type Name
                </label>
                <input
                  type="text"
                  name="salesTypeName"
                  value={formData.salesTypeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, salesTypeName: e.target.value }))}
                  placeholder={isCreateMode ? 'Enter sales type name' : ''}
                  disabled={isFormDisabled}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    isFormDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Default Discount (%)
                </label>
                <NumberInput
                  value={formData.defaultDiscount}
                  onChange={(value: number) => setFormData(prev => ({ ...prev, defaultDiscount: value }))}
                  placeholder="Enter discount percentage"
                  disabled={isFormDisabled}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    isFormDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Default Tax (%)
                </label>
                <NumberInput
                  value={formData.defaultTax}
                  onChange={(value: number) => setFormData(prev => ({ ...prev, defaultTax: value }))}
                  placeholder="Enter tax percentage"
                  disabled={isFormDisabled}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    isFormDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <header className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600 m-0">
                Sales Type Options
              </h3>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowDiscount}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowDiscount: e.target.checked }))}
                    disabled={isFormDisabled}
                    className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                      isFormDisabled
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-50'
                        : 'border-gray-300 bg-white cursor-pointer'
                    }`}
                  />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Allow Discount
                </label>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.contractSales}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractSales: e.target.checked }))}
                    disabled={isFormDisabled}
                    className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                      isFormDisabled
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-50'
                        : 'border-gray-300 bg-white cursor-pointer'
                    }`}
                  />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Contract Sales
                </label>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.incomeGenerating}
                    onChange={(e) => setFormData(prev => ({ ...prev, incomeGenerating: e.target.checked }))}
                    disabled={isFormDisabled}
                    className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                      isFormDisabled
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-50'
                        : 'border-gray-300 bg-white cursor-pointer'
                    }`}
                  />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Income Generating
                </label>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.taxable}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))}
                    disabled={isFormDisabled}
                    className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                      isFormDisabled
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-50'
                        : 'border-gray-300 bg-white cursor-pointer'
                    }`}
                  />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Taxable
                </label>
              </div>
            </div>
          </div>
        </section>

        {!isCreateMode && !isAdminUser && (
          <section className="space-y-4">
            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
              <header className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-600 m-0">
                  Change Reason
                </h3>
              </header>
              <div className="grid grid-cols-1 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Change Reason and Modification Made
                  </label>
                  <textarea
                    name="changeReason"
                    value={formData.changeReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                    placeholder="Please explain the reason for this change..."
                    rows={3}
                    disabled={isFormDisabled}
                    className={`min-h-[80px] w-full resize-vertical px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      isFormDisabled
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                    }`}
                    required={!isAdminUser}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    This field is required when making changes to the sales type record.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {!isCreateMode && selectedSalesType?.status === StatusEnum.ACTIVE ? (
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
          {(isCreateMode || selectedSalesType?.status === StatusEnum.ACTIVE) && (
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCreateMode ? 'Create Sales Type' : 'Save Changes'}
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
