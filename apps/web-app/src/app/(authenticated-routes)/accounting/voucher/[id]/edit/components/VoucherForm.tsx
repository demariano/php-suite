'use client';

import {
    AccountTypeEnum,
    PaymentTypeEnum,
    StatusEnum,
    VoucherDetailDto,
    VoucherDto,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useEffect, useState } from 'react';
import { ChangeReasonReadOnly } from '../../../../../components';
import { createFieldChangeDetector } from '../../../../../utils/fieldChangeDetection';
import PaymentDetailsTab from './PaymentDetailsTab';
import RecordDetailsTab from './RecordDetailsTab';
import VoucherDetailsTab from './VoucherDetailsTab';

interface VoucherFormProps {
    isCreateMode: boolean;
    selectedVoucher: VoucherDto | null;
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    activeTab: 'details' | 'logs';
    onTabChange: (tab: 'details' | 'logs') => void;
    onSave: (voucher: VoucherDto) => void;
    onDelete: () => void;
    onApprove: () => void;
    onDeny: () => void;
    onCancel: () => void;
}

export default function VoucherForm({
    isCreateMode,
    selectedVoucher,
    successMessage,
    isAdminUser,
    isLoading,
    activeTab,
    onTabChange,
    onSave,
    onDelete,
    onApprove,
    onDeny,
    onCancel,
}: VoucherFormProps) {
    const [formData, setFormData] = useState<VoucherDto>({
        voucherId: '',
        voucherNo: '',
        voucherDate: new Date().toISOString().split('T')[0],
        voucherAmount: 0,
        activityLogs: [],
        forApprovalVersion: {},
        changeReason: '',
        status: isCreateMode ? StatusEnum.NEW_RECORD : StatusEnum.ACTIVE,
        remarks: '',
        voucherDetails: [],
        paymentType: PaymentTypeEnum.CASH,
        bankName: '',
        chequeNo: '',
        chequeDate: '',
        totalAmount: 0,
        accountId: '',
        accountName: '',
        accountType: AccountTypeEnum.OTHERS,
        customerId: '',
        customerName: '',
        areaId: '',
        areaName: '',
    });

    // Toast notification hook
    const { setFlashNotification } = useSessionStore();

    // Initialize form data when selectedVoucher changes
    useEffect(() => {
        if (selectedVoucher) {
            setFormData({
                ...selectedVoucher,
                voucherDetails: selectedVoucher.voucherDetails || [],
            });
        } else if (isCreateMode) {
            setFormData({
                voucherId: '',
                voucherNo: '',
                voucherDate: new Date().toISOString().split('T')[0],
                voucherAmount: 0,
                activityLogs: [],
                forApprovalVersion: {},
                changeReason: '',
                status: StatusEnum.NEW_RECORD,
                remarks: '',
                voucherDetails: [],
                paymentType: PaymentTypeEnum.CASH,
                bankName: '',
                chequeNo: '',
                chequeDate: '',
                totalAmount: 0,
                accountId: '',
                accountName: '',
                accountType: AccountTypeEnum.OTHERS,
                customerId: '',
                customerName: '',
                areaId: '',
                areaName: '',
            });
        }
    }, [selectedVoucher, isCreateMode]);

    // Validation function for voucher data
    const validateVoucher = (voucher: VoucherDto): string | null => {
        if (!voucher.voucherNo || voucher.voucherNo.trim() === '') {
            return 'Voucher number is required and cannot be empty.';
        }
        if (!voucher.accountId || voucher.accountId.trim() === '') {
            return 'Please select an account before saving the voucher.';
        }
        if (!voucher.voucherDetails || voucher.voucherDetails.length === 0) {
            return 'Please add at least one voucher detail item.';
        }
        if (!voucher.totalAmount || voucher.totalAmount <= 0) {
            return 'Total amount must be greater than zero.';
        }
        if (!isCreateMode && !isAdminUser) {
            if (!voucher.changeReason || voucher.changeReason.trim() === '') {
                return 'Change reason is required when modifying a voucher.';
            }
            if (voucher.changeReason.trim().length < 10) {
                return 'Change reason must be at least 10 characters when modifying a voucher.';
            }
        }
        return null;
    };

    const handleSave = () => {
        const validationError = validateVoucher(formData);
        if (validationError) {
            setFlashNotification({
                title: 'Validation Error',
                message: validationError,
                alertType: 'error',
            });
            return;
        }
        onSave(formData);
    };

    const handleFormDataChange = (updatedData: Partial<VoucherDto>) => {
        setFormData((prev) => ({
            ...prev,
            ...updatedData,
        }));
    };

    // Status helpers
    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.FOR_DEACTIVATION:
                return 'For Deactivation';
            case StatusEnum.INACTIVE:
                return 'Inactive';
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
        const base = 'text-white shadow-sm';
        switch (status) {
            case StatusEnum.ACTIVE:
                return `bg-green-600 ${base}`;
            case StatusEnum.FOR_APPROVAL:
                return `bg-yellow-500 ${base}`;
            case StatusEnum.FOR_DELETION:
                return `bg-red-600 ${base}`;
            case StatusEnum.FOR_DEACTIVATION:
                return `bg-orange-500 ${base}`;
            case StatusEnum.INACTIVE:
                return `bg-gray-500 ${base}`;
            case StatusEnum.NEW_RECORD:
                return `bg-blue-600 ${base}`;
            default:
                return `bg-gray-500 ${base}`;
        }
    };

    // Approval state detection (matches Products pattern)
    const currentStatus = formData.status || StatusEnum.ACTIVE;
    const isApprovalState = [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD].includes(currentStatus);
    const showApprovalUI = isApprovalState && !isCreateMode;
    const showDeletionCard = currentStatus === StatusEnum.FOR_DELETION || currentStatus === StatusEnum.FOR_DEACTIVATION;

    // Field change detection for approval view
    const isFieldChanged = createFieldChangeDetector(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        selectedVoucher as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selectedVoucher?.forApprovalVersion as any) ?? undefined
    );

    // Helper function to check if arrays have changes
    const hasArrayChanges = (fieldName: string): boolean => {
        if (!selectedVoucher?.forApprovalVersion) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalValue = (selectedVoucher as any)[fieldName];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newValue = (selectedVoucher.forApprovalVersion as any)[fieldName];

        if (!originalValue && !newValue) return false;
        if (!originalValue || !newValue) return true;
        if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizeArray = (arr: any[], idField: string) => {
            return arr
                .map((item) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const normalized: any = {};
                    Object.keys(item).forEach((key) => {
                        if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
                            normalized[key] = item[key];
                        }
                    });
                    return normalized;
                })
                .sort((a, b) => (a[idField] || '').toString().localeCompare((b[idField] || '').toString()));
        };

        if (fieldName === 'voucherDetails') {
            const normalizedOriginal = normalizeArray(originalValue, 'subAccount');
            const normalizedNew = normalizeArray(newValue, 'subAccount');
            return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
        }

        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
    };

    // Compute the merged approval data for inline display
    const approvalVersionData: VoucherDto = selectedVoucher
        ? {
              ...selectedVoucher,
              ...selectedVoucher.forApprovalVersion,
          }
        : formData;

    // Render voucher detail changes with legends and per-row badges
    const renderVoucherDetailChanges = () => {
        if (!showApprovalUI || !selectedVoucher) return null;
        const detailsChanged = hasArrayChanges('voucherDetails');
        if (!detailsChanged) return null;

        const original = selectedVoucher.voucherDetails || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pending = ((selectedVoucher.forApprovalVersion as any)?.voucherDetails || []) as VoucherDetailDto[];

        // Build per-row status
        const originalMap = new Map<string, VoucherDetailDto>();
        original.forEach((d) => originalMap.set(d.subAccount, d));
        const pendingMap = new Map<string, VoucherDetailDto>();
        pending.forEach((d) => pendingMap.set(d.subAccount, d));

        const rows: Array<{ detail: VoucherDetailDto; status: 'added' | 'removed' | 'modified' | 'unchanged' }> = [];

        // Pending items
        pending.forEach((d) => {
            const orig = originalMap.get(d.subAccount);
            if (!orig) {
                rows.push({ detail: d, status: 'added' });
            } else if (orig.amount !== d.amount) {
                rows.push({ detail: d, status: 'modified' });
            } else {
                rows.push({ detail: d, status: 'unchanged' });
            }
        });

        // Removed items (in original but not in pending)
        original.forEach((d) => {
            if (!pendingMap.has(d.subAccount)) {
                rows.push({ detail: d, status: 'removed' });
            }
        });

        return rows;
    };

    const formatNumberWithCommas = (value: string | number): string => {
        if (!value && value !== 0) return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Render the details tab content
    const renderDetailsContent = () => {
        // If in approval or deletion state, show read-only with inline diffs
        if (showApprovalUI || showDeletionCard) {
            return (
                <div>
                    {/* Change Reason Read-Only */}
                    {showApprovalUI && selectedVoucher?.changeReason && (
                        <div className="mb-5">
                            <ChangeReasonReadOnly value={selectedVoucher.changeReason} />
                        </div>
                    )}

                    {/* Deletion/Deactivation Card */}
                    {showDeletionCard && (
                        <div
                            className={`mb-5 rounded-xl border-2 p-4 shadow-sm sm:p-8 space-y-4 ${
                                currentStatus === StatusEnum.FOR_DELETION
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-orange-300 bg-orange-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white text-lg ${
                                        currentStatus === StatusEnum.FOR_DELETION ? 'bg-red-600' : 'bg-orange-600'
                                    }`}
                                >
                                    🗑️
                                </div>
                                <div>
                                    <h3
                                        className={`text-lg font-bold m-0 ${
                                            currentStatus === StatusEnum.FOR_DELETION
                                                ? 'text-red-800'
                                                : 'text-orange-800'
                                        }`}
                                    >
                                        {currentStatus === StatusEnum.FOR_DELETION
                                            ? 'Record Marked for Deletion'
                                            : 'Record Marked for Deactivation'}
                                    </h3>
                                    <p
                                        className={`text-sm ${
                                            currentStatus === StatusEnum.FOR_DELETION
                                                ? 'text-red-700'
                                                : 'text-orange-700'
                                        }`}
                                    >
                                        This record has been marked for{' '}
                                        {currentStatus === StatusEnum.FOR_DELETION ? 'deletion' : 'deactivation'} and is
                                        awaiting approval.
                                    </p>
                                </div>
                            </div>
                            {selectedVoucher?.changeReason && (
                                <div className="space-y-2">
                                    <p
                                        className={`text-sm font-semibold ${
                                            currentStatus === StatusEnum.FOR_DELETION
                                                ? 'text-red-700'
                                                : 'text-orange-700'
                                        }`}
                                    >
                                        {currentStatus === StatusEnum.FOR_DELETION ? 'Deletion' : 'Deactivation'} Reason
                                    </p>
                                    <div
                                        className={`rounded-lg border-2 bg-white p-4 text-sm text-gray-700 whitespace-pre-wrap ${
                                            currentStatus === StatusEnum.FOR_DELETION
                                                ? 'border-red-200'
                                                : 'border-orange-200'
                                        }`}
                                    >
                                        {selectedVoucher.changeReason}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Record Details with inline diffs */}
                    <RecordDetailsTab
                        formData={showApprovalUI ? approvalVersionData : formData}
                        onFormDataChange={() => {
                            /* read-only noop */
                        }}
                        isCreateMode={false}
                        isAdminUser={isAdminUser}
                        isReadOnly={true}
                        isFieldChanged={showApprovalUI ? isFieldChanged : undefined}
                    />

                    {/* Voucher Details with legends and badges */}
                    {showApprovalUI && hasArrayChanges('voucherDetails') ? (
                        renderVoucherDetailsWithBadges()
                    ) : (
                        <VoucherDetailsTab
                            formData={showApprovalUI ? approvalVersionData : formData}
                            onFormDataChange={() => {
                                /* read-only noop */
                            }}
                            isCreateMode={false}
                            isReadOnly={true}
                            selectedVoucher={selectedVoucher}
                            hasArrayChanges={showApprovalUI ? hasArrayChanges : undefined}
                        />
                    )}

                    {/* Payment Details with inline diffs */}
                    <PaymentDetailsTab
                        formData={showApprovalUI ? approvalVersionData : formData}
                        onFormDataChange={() => {
                            /* read-only noop */
                        }}
                        isCreateMode={false}
                        isReadOnly={true}
                        isFieldChanged={showApprovalUI ? isFieldChanged : undefined}
                    />
                </div>
            );
        }

        // Normal editable view (ACTIVE or create mode)
        return (
            <div>
                {/* Warning Banner for Pending Records */}
                {!isCreateMode &&
                    selectedVoucher &&
                    (selectedVoucher.status === StatusEnum.FOR_APPROVAL ||
                        selectedVoucher.status === StatusEnum.NEW_RECORD ||
                        selectedVoucher.status === StatusEnum.FOR_DELETION) && (
                        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                                ⚠
                            </div>
                            <span className="text-sm font-semibold">
                                {selectedVoucher.status === StatusEnum.FOR_DELETION
                                    ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                                    : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
                            </span>
                        </div>
                    )}
                <RecordDetailsTab
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    isCreateMode={isCreateMode}
                    isAdminUser={isAdminUser}
                    isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
                />
                <VoucherDetailsTab
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    isCreateMode={isCreateMode}
                    isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
                />
                <PaymentDetailsTab
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    isCreateMode={isCreateMode}
                    isReadOnly={!isCreateMode && selectedVoucher?.status !== StatusEnum.ACTIVE}
                />
            </div>
        );
    };

    // Render voucher details table with per-row badges and legend
    const renderVoucherDetailsWithBadges = () => {
        const detailRows = renderVoucherDetailChanges();
        if (!detailRows) return null;

        const hasAdded = detailRows.some((r) => r.status === 'added');
        const hasModified = detailRows.some((r) => r.status === 'modified');
        const hasRemoved = detailRows.some((r) => r.status === 'removed');

        return (
            <div className="space-y-6 mt-6">
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </div>
                        <h4 className="text-base font-bold rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-1 text-blue-700">
                            Voucher Details
                        </h4>
                    </div>

                    {/* Legend */}
                    <div className="mb-3 flex flex-wrap gap-3 text-xs">
                        {hasAdded && (
                            <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded border border-green-300 bg-green-100" />
                                <span>Added</span>
                            </span>
                        )}
                        {hasModified && (
                            <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded border border-blue-300 bg-blue-100" />
                                <span>Modified</span>
                            </span>
                        )}
                        {hasRemoved && (
                            <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
                                <span>Removed</span>
                            </span>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Sub Account
                                        </th>
                                        <th className="px-6 py-4 text-right text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-right text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {detailRows.map((row, index) => (
                                        <tr
                                            key={`${row.detail.subAccount}-${index}`}
                                            className={
                                                row.status === 'added'
                                                    ? 'bg-green-50'
                                                    : row.status === 'removed'
                                                    ? 'bg-red-50'
                                                    : row.status === 'modified'
                                                    ? 'bg-blue-50'
                                                    : ''
                                            }
                                        >
                                            <td
                                                className={`px-6 py-5 text-sm font-medium ${
                                                    row.status === 'removed'
                                                        ? 'line-through text-gray-500'
                                                        : 'text-gray-900'
                                                }`}
                                            >
                                                {row.detail.subAccount}
                                            </td>
                                            <td
                                                className={`px-6 py-5 text-sm text-right ${
                                                    row.status === 'removed'
                                                        ? 'line-through text-gray-500'
                                                        : row.status === 'modified'
                                                        ? 'font-semibold text-blue-700'
                                                        : 'text-gray-600'
                                                }`}
                                            >
                                                {formatNumberWithCommas(row.detail.amount || 0)}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {row.status === 'added' && (
                                                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                                                        ➕ ADDED
                                                    </span>
                                                )}
                                                {row.status === 'modified' && (
                                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                                                        ✏️ MODIFIED
                                                    </span>
                                                )}
                                                {row.status === 'removed' && (
                                                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                                                        ➖ REMOVED
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total row */}
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                            {formatNumberWithCommas(approvalVersionData.totalAmount || 0)}
                                        </td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex justify-center">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-6xl">
                {/* Tab Navigation — only 2 tabs: Details + Activity Logs (no Pending Changes tab) */}
                <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                    <div className="flex gap-2 flex-nowrap">
                        <button
                            onClick={() => onTabChange('details')}
                            className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                activeTab === 'details'
                                    ? getTabColorClasses(currentStatus, true)
                                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Voucher Information
                                {!isCreateMode && selectedVoucher && (
                                    <>
                                        <span className="mx-1">-</span>
                                        <span>{getStatusText(currentStatus)}</span>
                                    </>
                                )}
                            </span>
                        </button>

                        {!isCreateMode && (
                            <button
                                onClick={() => onTabChange('logs')}
                                className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                    activeTab === 'logs'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Activity Logs
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6 bg-white">
                    {activeTab === 'details' && renderDetailsContent()}

                    {activeTab === 'logs' && !isCreateMode && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                        Activity Logs
                                    </h3>
                                </div>
                                {renderActivityLogsTable(selectedVoucher?.activityLogs, 'No activity logs available')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons — visible on ALL tabs (matches Products) */}
                <div className="flex flex-col gap-3 border-t-2 border-gray-200 pt-6 px-4 sm:px-6 pb-4 sm:pb-6 sm:flex-row sm:items-center sm:justify-between">
                    {!isCreateMode && selectedVoucher?.status === StatusEnum.ACTIVE ? (
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
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            Delete
                        </button>
                    ) : (
                        <div className="hidden sm:block" />
                    )}

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {(isCreateMode || selectedVoucher?.status === StatusEnum.ACTIVE) && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                {isLoading ? 'Saving...' : isCreateMode ? 'Create Voucher' : 'Save Changes'}
                            </button>
                        )}
                        {/* Approval Buttons — "Deny" and "Approve" labels matching Products */}
                        {!isCreateMode && isAdminUser && (isApprovalState || showDeletionCard) && (
                            <>
                                <button
                                    type="button"
                                    onClick={onDeny}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    Deny
                                </button>
                                <button
                                    type="button"
                                    onClick={onApprove}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    Approve
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
