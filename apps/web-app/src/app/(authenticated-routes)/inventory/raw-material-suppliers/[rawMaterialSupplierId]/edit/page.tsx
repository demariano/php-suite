'use client';

import {
    RawMaterialSupplierApi,
    RawMaterialSupplierDto,
    StatusEnum,
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../components/ChangeReasonField';
import { createFieldChangeDetector } from '../../../../utils/fieldChangeDetection';

type ActiveTab = 'details' | 'approval' | 'logs';

export default function EditRawMaterialSupplierPage({ params }: { params: { rawMaterialSupplierId: string } }) {
  const router = useRouter();
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

  const [selectedSupplier, setSelectedSupplier] = useState<RawMaterialSupplierDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [approverMessage, setApproverMessage] = useState('');
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [denyError, setDenyError] = useState('');

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!params.rawMaterialSupplierId) return;

      try {
        setIsLoading(true);
        setError(null);
        const supplier = await RawMaterialSupplierApi.getRawMaterialSupplierById(
          params.rawMaterialSupplierId,
          userRole
        );
        setSelectedSupplier(supplier);

        if (supplier && ([StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION] as StatusEnum[]).includes(supplier.status || StatusEnum.ACTIVE) && isAdminUser) {
          setActiveTab('approval');
        } else {
          setActiveTab('details');
        }
      } catch (err: any) {
        console.error('Failed to fetch raw material supplier:', err);
        const message = err?.message || 'Failed to load raw material supplier details. Please try again.';
        setError(message);
        setFlashNotification({
          title: 'Error!',
          message,
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupplier();
  }, [params.rawMaterialSupplierId, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

  const handleSave = async () => {
    if (!selectedSupplier?.rawMaterialSupplierId) return;

    const errors: string[] = [];
    if (!selectedSupplier.rawMaterialSupplierName?.trim()) {
      errors.push('Supplier Name is required.');
    }
    if (!isAdminUser && (!selectedSupplier.changeReason || !selectedSupplier.changeReason.trim())) {
      errors.push('Please provide a reason for the change.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    try {
      setIsSaving(true);
      setError(null);

      const updatedPayload: RawMaterialSupplierDto = {
        ...selectedSupplier,
        rawMaterialSupplierName: selectedSupplier.rawMaterialSupplierName.trim(),
        changeReason: selectedSupplier.changeReason?.trim() || undefined,
        status: isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL
      };

      const updated = await RawMaterialSupplierApi.updateRawMaterialSupplier(
        selectedSupplier.rawMaterialSupplierId,
        updatedPayload,
        userRole
      );

      setSelectedSupplier(updated);
      setFlashNotification({
        title: 'Success!',
        message: 'Raw material supplier updated successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/raw-material-suppliers');
    } catch (err: any) {
      console.error('Failed to save raw material supplier:', err);
      const message = err?.message || 'Failed to save raw material supplier. Please try again.';
      setError(message);
      setFlashNotification({
        title: 'Error!',
        message,
        alertType: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSupplier?.rawMaterialSupplierId) return;

    try {
      setIsSaving(true);
      await RawMaterialSupplierApi.approveRawMaterialSupplier(selectedSupplier.rawMaterialSupplierId, userRole);
      setFlashNotification({
        title: 'Success!',
        message: 'Raw material supplier approved successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/raw-material-suppliers');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to approve raw material supplier. Please try again.');
      setFlashNotification({
        title: 'Error',
        message,
        alertType: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier?.rawMaterialSupplierId) return;

    try {
      setIsSaving(true);
      await RawMaterialSupplierApi.deleteRawMaterialSupplier(selectedSupplier, userRole);
      setFlashNotification({
        title: 'Success!',
        message: 'Raw material supplier deleted successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/raw-material-suppliers');
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete raw material supplier. Please try again.');
      setFlashNotification({
        title: 'Error',
        message,
        alertType: 'error'
      });
    } finally {
      setIsSaving(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => setShowDeleteDialog(false);

  const handleDenyConfirm = async (reason: string) => {
    if (!selectedSupplier?.rawMaterialSupplierId) return;

    try {
      setIsSaving(true);
      await RawMaterialSupplierApi.denyRawMaterialSupplier(selectedSupplier.rawMaterialSupplierId, reason, userRole);
      setFlashNotification({
        title: 'Success!',
        message: 'Raw material supplier changes denied successfully!',
        alertType: 'success'
      });
      router.replace('/inventory/raw-material-suppliers');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to deny raw material supplier changes. Please try again.');
      setFlashNotification({
        title: 'Error',
        message,
        alertType: 'error'
      });
    } finally {
      setIsSaving(false);
      setShowDenyDialog(false);
    }
  };

  const handleCancel = () => {
    router.replace('/inventory/raw-material-suppliers');
  };

  const getStatusText = (status: StatusEnum): string => {
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'Active';
      case StatusEnum.FOR_APPROVAL:
        return 'For Approval';
      case StatusEnum.FOR_DELETION:
        return 'For Deletion';
      case StatusEnum.NEW_RECORD:
        return 'New Record';
      default:
        return status;
    }
  };

  const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
      return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }

    switch (status) {
      case StatusEnum.ACTIVE:
        return 'bg-green-600 text-white shadow-sm';
      case StatusEnum.FOR_APPROVAL:
        return 'bg-yellow-500 text-white shadow-sm';
      case StatusEnum.FOR_DELETION:
        return 'bg-red-600 text-white shadow-sm';
      case StatusEnum.NEW_RECORD:
        return 'bg-blue-600 text-white shadow-sm';
      default:
        return 'bg-gray-500 text-white shadow-sm';
    }
  };

  const isFormDisabled = !isAdminUser && selectedSupplier?.status !== StatusEnum.ACTIVE;

  const renderReadOnlyField = (
    label: string,
    value: unknown,
    colorClass: string,
    isChanged: boolean
  ) => (
    <div className="group">
      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
        <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`}></span>
        {label}
      </label>
      <div
        className={`w-full cursor-not-allowed rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm ${
          isChanged ? 'border-blue-500 bg-blue-50 text-gray-700' : 'border-gray-200 bg-gray-50 text-gray-500'
        }`}
      >
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </div>
    </div>
  );

  const renderApprovalTab = () => {
    if (!selectedSupplier) return null;

    if (selectedSupplier.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                <p className="mt-1 text-sm text-red-700">This record has been marked for deletion and is awaiting approval.</p>
              </div>
            </div>
            {selectedSupplier.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedSupplier.changeReason}</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowDenyDialog(true)}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Processing...' : 'Deny Deletion'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Processing...' : 'Approve Deletion'}
                </button>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}

            <button
              type="button"
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (!selectedSupplier.forApprovalVersion) return null;

    const isFieldChanged = createFieldChangeDetector(
      selectedSupplier as Record<string, unknown>,
      selectedSupplier.forApprovalVersion as Record<string, unknown>
    );

    return (
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-green-400 bg-white p-4 shadow-sm sm:p-6">
        {selectedSupplier.changeReason && (
          <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="m-0 text-base font-bold text-blue-600">Change Reason and Modification Made</h4>
            </div>
            <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm font-medium text-gray-500 shadow-sm whitespace-pre-wrap leading-relaxed">
              {selectedSupplier.changeReason}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600">Raw Material Supplier Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderReadOnlyField('Name', selectedSupplier.forApprovalVersion.rawMaterialSupplierName, 'bg-blue-500', isFieldChanged('rawMaterialSupplierName'))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && ([StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION] as StatusEnum[]).includes(selectedSupplier.status || StatusEnum.ACTIVE) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => setShowDenyDialog(true)}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : 'Deny Changes'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

          <button
            type="button"
            onClick={handleCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderLogsTab = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="m-0 text-base font-bold text-blue-600">Activity Logs</h3>
        </div>
        {renderActivityLogsTable(selectedSupplier?.activityLogs)}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (isLoading && !selectedSupplier) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-gray-600">Loading raw material supplier details...</div>
      </div>
    );
  }

  if (!selectedSupplier && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>Raw material supplier not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-lg">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 m-0">Delete Raw Material Supplier</h3>
            </div>
            <p className="text-sm text-gray-700">This action will mark the record for deletion pending approval. Continue?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSaving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
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
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <a href="/inventory/raw-material-suppliers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Raw Material Suppliers
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {selectedSupplier && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
              <div className="flex flex-nowrap gap-2">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    getTabColorClasses(selectedSupplier.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Raw Material Supplier
                    <span className="mx-1">-</span>
                    <span>{getStatusText(selectedSupplier.status || StatusEnum.ACTIVE)}</span>
                  </span>
                </button>

                {selectedSupplier.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                      activeTab === 'approval'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Changes
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity Logs
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
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

                  {!isAdminUser && (
                    <ChangeReasonField
                      value={selectedSupplier.changeReason || ''}
                      onChange={(e) =>
                        setSelectedSupplier((prev) => prev ? { ...prev, changeReason: e.target.value } : prev)
                      }
                      disabled={isFormDisabled}
                    />
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
                          <h3 className="text-base font-bold text-blue-600">Raw Material Supplier Information</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div className="group">
                            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                              Supplier Name
                            </label>
                            <input
                              type="text"
                              value={selectedSupplier.rawMaterialSupplierName || ''}
                              onChange={(e) =>
                                setSelectedSupplier((prev) => prev ? { ...prev, rawMaterialSupplierName: e.target.value } : prev)
                              }
                              placeholder="Enter supplier name"
                              disabled={isFormDisabled}
                              className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                                isFormDisabled
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-md'
                              }`}
                            />
                          </div>
                            </div>
                          </div>
                        </div>
                      </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 pt-4">
                    {selectedSupplier.status === StatusEnum.ACTIVE ? (
                      <button
                        type="button"
                        onClick={handleDelete}
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
                      {(selectedSupplier.status === StatusEnum.ACTIVE || isAdminUser) && (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={(isFormDisabled && !isAdminUser) || isSaving}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'approval' && renderApprovalTab()}

              {activeTab === 'logs' && renderLogsTab()}
            </div>
          </div>
        </div>
      )}

      {showDenyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-lg">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 m-0">Deny Raw Material Supplier Changes</h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Please provide a reason for denying this record:
            </p>

            <div className="space-y-2">
              <textarea
                value={approverMessage}
                onChange={(e) => {
                  setApproverMessage(e.target.value);
                  setDenyError('');
                }}
                placeholder="Enter reason for denial..."
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  denyError
                    ? 'border-red-500 bg-red-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:shadow-md'
                }`}
                rows={4}
                autoFocus
              />
              {denyError && <p className="text-sm text-red-600">{denyError}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDenyDialog(false);
                  setApproverMessage('');
                  setDenyError('');
                }}
                className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = approverMessage.trim();
                  if (!trimmed) {
                    setDenyError('Please provide a reason for denying this record.');
                    return;
                  }
                  if (trimmed.length < 3) {
                    setDenyError('Reason must be at least 3 characters long.');
                    return;
                  }
                  handleDenyConfirm(trimmed);
                }}
                disabled={isSaving}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isSaving ? 'Denying...' : 'Deny'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
