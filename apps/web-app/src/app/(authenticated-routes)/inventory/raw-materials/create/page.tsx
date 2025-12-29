'use client';

import {
  RawMaterialApi,
  RawMaterialDto,
  RawMaterialUnitDto,
  StatusEnum,
  useEnv,
  useLocalStore,
  useSessionStore,
} from '@data-access/index';
import RawMaterialUnitSearchableSelectionModal from '../../../search-modals/RawMaterialUnitSearchableSelectionModal';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function CreateRawMaterialPage() {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

  const [formData, setFormData] = useState<RawMaterialDto>({
    rawMaterialId: '',
    rawMaterialName: '',
    description: '',
    rawMaterialUnitId: '',
    rawMaterialUnitName: '',
    changeReason: '',
    activityLogs: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    // keep parity with other create page lifecycle
  }, [env.BYPASS_AUTH, authedUser?.userRole]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!formData.rawMaterialName?.trim()) {
      errors.push('Raw Material Name is required.');
    }
    if (!formData.rawMaterialUnitId) {
      errors.push('Raw Material Unit is required.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setFlashNotification({
        title: 'Validation error',
        message: errors.join(' '),
        alertType: 'warning',
      });
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);
    setError(null);
    try {
      await RawMaterialApi.createRawMaterial(
        {
          rawMaterialName: formData.rawMaterialName?.trim(),
          description: formData.description?.trim() || undefined,
          rawMaterialUnitId: formData.rawMaterialUnitId,
          rawMaterialUnitName: formData.rawMaterialUnitName,
          changeReason: formData.changeReason?.trim() || undefined,
          status: StatusEnum.NEW_RECORD,
        } as RawMaterialDto,
        userRole
      );
      setFlashNotification({
        title: 'Success!',
        message: 'Raw material created successfully!',
        alertType: 'success',
      });
      router.replace('/inventory/raw-materials');
    } catch (err: any) {
      console.error('Failed to create raw material:', err);
      const message = err?.message || 'Failed to create raw material. Please try again.';
      setError(message);
      setFlashNotification({
        title: 'Error!',
        message,
        alertType: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.replace('/inventory/raw-materials');
  };

  const clearUnitSelection = () => {
    setFormData((prev) => ({ ...prev, rawMaterialUnitId: '', rawMaterialUnitName: '' }));
  };

  const handleUnitSelect = (unit: RawMaterialUnitDto) => {
    setFormData((prev) => ({
      ...prev,
      rawMaterialUnitId: unit.rawMaterialUnitId || '',
      rawMaterialUnitName: unit.rawMaterialUnitName || '',
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      <div>
        <nav className="flex items-center gap-2 text-sm">
          <a href="/dashboard" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory/raw-materials" className="text-blue-500 no-underline hover:text-blue-600 transition-colors duration-200">
            Raw Materials
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 font-medium">Create</span>
        </nav>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Raw Material</h1>

      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 w-full sm:max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {validationErrors.length > 0 && (
              <div className="mb-2 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <span className="text-base">⚠️</span>
                  <span>Please fix the following errors:</span>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                  {validationErrors.map((errMsg, idx) => (
                    <li key={idx}>{errMsg}</li>
                  ))}
                </ul>
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
                    <h3 className="text-base font-bold text-blue-600">Raw Material Information</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="group">
                      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        Raw Material Name
                      </label>
                      <input
                        type="text"
                        value={formData.rawMaterialName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, rawMaterialName: e.target.value }))}
                        placeholder="Enter raw material name"
                        required
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        Description (optional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter description"
                        rows={3}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        Raw Material Unit
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.rawMaterialUnitName || ''}
                          readOnly
                          placeholder="Select a raw material unit"
                          className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md"
                          onClick={() => setShowUnitModal(true)}
                          required
                        />
                        {formData.rawMaterialUnitName && (
                          <button
                            type="button"
                            onClick={clearUnitSelection}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t-2 border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden sm:block" />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isSubmitting ? 'Submitting...' : 'Create Raw Material'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <RawMaterialUnitSearchableSelectionModal
        show={showUnitModal}
        title="Select Raw Material Unit"
        selectedValue={formData.rawMaterialUnitId || null}
        onSelect={handleUnitSelect}
        onClose={() => setShowUnitModal(false)}
      />
    </div>
  );
}
