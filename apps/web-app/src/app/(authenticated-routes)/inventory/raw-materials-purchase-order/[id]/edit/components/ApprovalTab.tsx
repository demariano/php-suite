'use client';

interface OrderItem {
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialUnitId?: string;
    rawMaterialUnitName: string;
    qty: number;
}

interface DeliveredItem {
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialUnitId?: string;
    rawMaterialUnitName: string;
    deliveredQty: number;
    lotNo: string;
}

interface DeliveryGroup {
    deliveryDate: string;
    rawMaterials: DeliveredItem[];
}

interface ApprovalTabProps {
    purchaseOrderData: any;
    status: string;
    onApprove: () => void;
    onDeny: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
    isAdminUser: boolean;
}

const createFieldChangeDetector = (
    original: Record<string, unknown>,
    forApproval: Record<string, unknown> | undefined
) => {
    return (fieldName: string): boolean => {
        if (!forApproval) return false;
        const originalValue = original[fieldName];
        const newValue = forApproval[fieldName];

        if (originalValue === newValue) return false;
        if (originalValue === undefined && newValue === undefined) return false;

        // For complex objects/arrays, do deep comparison
        if (typeof originalValue === 'object' || typeof newValue === 'object') {
            return JSON.stringify(originalValue) !== JSON.stringify(newValue);
        }

        return true;
    };
};

export function ApprovalTab({
    purchaseOrderData,
    status,
    onApprove,
    onDeny,
    onCancel,
    isSubmitting,
    isAdminUser,
}: ApprovalTabProps) {
    const forApprovalVersion = purchaseOrderData?.forApprovalVersion;
    const isForDeletion = status === 'FOR_DELETION';
    const isForApproval = status === 'FOR_APPROVAL' || status === 'NEW_RECORD';

    if (!isForApproval && !isForDeletion) {
        return (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-500">No approval required. The purchase order is {status}.</p>
            </div>
        );
    }

    // FOR_DELETION - Show deletion reason and approval buttons
    if (isForDeletion) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
                    <div className="mb-4 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                            <p className="mt-1 text-sm text-red-700">
                                This purchase order has been marked for deletion and is awaiting approval.
                            </p>
                        </div>
                    </div>
                    {purchaseOrderData?.changeReason && (
                        <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                            <p className="mb-2 text-sm font-semibold text-gray-700">Deletion Reason:</p>
                            <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                                {purchaseOrderData.changeReason}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                    {isAdminUser && (
                        <>
                            <button
                                type="button"
                                onClick={onDeny}
                                disabled={isSubmitting}
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
                                {isSubmitting ? 'Processing...' : 'Deny'}
                            </button>
                            <button
                                type="button"
                                onClick={onApprove}
                                disabled={isSubmitting}
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
                                {isSubmitting ? 'Processing...' : 'Approve'}
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
        );
    }

    if (!forApprovalVersion) return null;

    const approvalData = forApprovalVersion;
    const isFieldChanged = createFieldChangeDetector(purchaseOrderData as any, forApprovalVersion as any);

    const hasArrayChanges = (fieldName: string): boolean => {
        if (!purchaseOrderData?.forApprovalVersion) return false;
        const originalValue = purchaseOrderData[fieldName];
        const newValue = forApprovalVersion[fieldName];

        if (!originalValue && !newValue) return false;
        if (!originalValue || !newValue) return true;
        if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;

        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
    };

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
        return (
            <div className="group">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                    <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`}></span>
                    {label}
                </label>
                <div className="w-full cursor-not-allowed rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium shadow-sm text-gray-500">
                    {formatValue(value)}
                </div>
            </div>
        );
    };

    const renderFieldWithInlineDiff = (label: string, fieldName: string, colorClass: string) => {
        const hasChange = isFieldChanged(fieldName);
        if (!hasChange) {
            // For NEW_RECORD, show the forApprovalVersion value; for FOR_APPROVAL show current
            const displayValue =
                status === 'NEW_RECORD'
                    ? formatValue(forApprovalVersion?.[fieldName])
                    : formatValue(purchaseOrderData?.[fieldName]);
            return renderReadOnlyField(label, displayValue, colorClass);
        }

        const originalValue = formatValue(purchaseOrderData?.[fieldName]);
        const newValue = formatValue(forApprovalVersion?.[fieldName]);

        return (
            <div className="group">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                    <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`}></span>
                    {label}
                </label>
                <div className="w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium shadow-sm">
                    <span className="line-through text-gray-500">{originalValue}</span>
                    <span className="mx-2">&rarr;</span>
                    <span className="font-semibold text-blue-700">{newValue}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-green-400 bg-white p-4 shadow-sm sm:p-6">
            {purchaseOrderData?.changeReason && (
                <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </div>
                        <h4 className="m-0 text-base font-bold text-blue-600">Change Reason and Modification Made</h4>
                    </div>
                    <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm font-medium text-gray-500 shadow-sm whitespace-pre-wrap leading-relaxed">
                        {purchaseOrderData.changeReason}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 shadow-md">
                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-blue-600">Purchase Order Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {renderFieldWithInlineDiff('Document Number', 'docNo', 'bg-blue-500')}
                        {renderFieldWithInlineDiff('PO Date', 'poDate', 'bg-blue-500')}
                        {renderFieldWithInlineDiff('Supplier', 'rawMaterialSupplierName', 'bg-blue-500')}
                        {renderFieldWithInlineDiff('PO Status', 'poStatus', 'bg-blue-500')}
                    </div>
                </div>
            </div>

            {/* Purchase Order Items */}
            {(() => {
                const itemsChanged = hasArrayChanges('purchaseOrderDetails');
                const originalItems: any[] = purchaseOrderData.purchaseOrderDetails || [];
                const newItems: any[] = (forApprovalVersion?.purchaseOrderDetails || []) as any[];
                const originalHasItems = originalItems.length > 0;
                const newHasItems = newItems.length > 0;
                const allRemoved = originalHasItems && !newHasItems;

                // Render if there are changes OR if new array has items
                if (!itemsChanged && !newHasItems) return null;

                // Compute row statuses
                const originalMap = new Map<string, any>();
                originalItems.forEach((item: any) => {
                    if (item.rawMaterialId) originalMap.set(item.rawMaterialId, item);
                });
                const newMap = new Map<string, any>();
                newItems.forEach((item: any) => {
                    if (item.rawMaterialId) newMap.set(item.rawMaterialId, item);
                });

                type RowStatus = 'added' | 'modified' | 'removed' | 'unchanged';
                interface RowWithStatus {
                    item: any;
                    status: RowStatus;
                }

                const rows: RowWithStatus[] = [];

                // Items in new array
                newItems.forEach((item: any) => {
                    const orig = originalMap.get(item.rawMaterialId);
                    if (!orig) {
                        rows.push({ item, status: 'added' });
                    } else if (JSON.stringify(orig) !== JSON.stringify(item)) {
                        rows.push({ item, status: 'modified' });
                    } else {
                        rows.push({ item, status: 'unchanged' });
                    }
                });

                // Items removed (in original but not in new)
                originalItems.forEach((item: any) => {
                    if (!newMap.has(item.rawMaterialId)) {
                        rows.push({ item, status: 'removed' });
                    }
                });

                const hasAdded = rows.some((r) => r.status === 'added');
                const hasModified = rows.some((r) => r.status === 'modified');
                const hasRemoved = rows.some((r) => r.status === 'removed');
                const showLegend = itemsChanged && (hasAdded || hasModified || hasRemoved);

                const getRowBg = (s: RowStatus) => {
                    switch (s) {
                        case 'added':
                            return 'bg-green-50';
                        case 'modified':
                            return 'bg-blue-50';
                        case 'removed':
                            return 'bg-red-50';
                        default:
                            return '';
                    }
                };

                const getStatusBadge = (s: RowStatus) => {
                    switch (s) {
                        case 'added':
                            return (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                    ➕ ADDED
                                </span>
                            );
                        case 'modified':
                            return (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                    ✏️ MODIFIED
                                </span>
                            );
                        case 'removed':
                            return (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                    ➖ REMOVED
                                </span>
                            );
                        default:
                            return null;
                    }
                };

                return (
                    <div className="mt-6">
                        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h-10a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2zM9 10h6M9 14h6M9 18h6"
                                        />
                                    </svg>
                                </div>
                                <h4
                                    className={`text-base font-bold ${
                                        itemsChanged
                                            ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                            : 'text-blue-600'
                                    }`}
                                >
                                    Ordered Items
                                </h4>
                            </div>

                            {/* Legend */}
                            {showLegend && (
                                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs font-semibold text-gray-600">Legend:</span>
                                    {hasAdded && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                                            <span className="inline-block w-3 h-3 rounded-sm bg-green-200 border border-green-400"></span>
                                            Added
                                        </span>
                                    )}
                                    {hasModified && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                                            <span className="inline-block w-3 h-3 rounded-sm bg-blue-200 border border-blue-400"></span>
                                            Modified
                                        </span>
                                    )}
                                    {hasRemoved && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                                            <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border border-red-400"></span>
                                            Removed
                                        </span>
                                    )}
                                </div>
                            )}

                            {allRemoved ? (
                                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-600 rounded-lg">
                                            <svg
                                                className="w-5 h-5 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">
                                                All ordered items have been removed
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                {originalItems.length} item{originalItems.length !== 1 ? 's' : ''} will
                                                be removed upon approval
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                    {rows.length === 0 ? (
                                        <div className="p-10 text-center text-gray-500 text-base">
                                            No ordered items in pending changes.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-white border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                            Raw Material
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                            Unit
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                            Quantity
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {rows.map((row, index) => (
                                                        <tr
                                                            key={index}
                                                            className={`transition-all duration-200 ${getRowBg(
                                                                row.status
                                                            )} ${
                                                                row.status === 'removed'
                                                                    ? 'line-through text-gray-500'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                {row.item.rawMaterialName || '-'}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                {row.item.rawMaterialUnitName || '-'}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                                {row.item.qty || 0}
                                                            </td>
                                                            <td className="px-6 py-5 text-sm">
                                                                {getStatusBadge(row.status)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                {isAdminUser && (
                    <>
                        <button
                            type="button"
                            onClick={onDeny}
                            disabled={isSubmitting}
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
                            {isSubmitting ? 'Processing...' : 'Deny'}
                        </button>
                        <button
                            type="button"
                            onClick={onApprove}
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isSubmitting ? 'Processing...' : 'Approve'}
                        </button>
                    </>
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
    );
}
