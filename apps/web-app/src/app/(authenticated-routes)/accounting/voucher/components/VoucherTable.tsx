'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { VoucherDto } from '@data-access/index';

interface VoucherTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (voucher: VoucherDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export default function VoucherTable({
    isLoading,
    tableData,
    headers,
    searchQuery,
    onRowClick,
    pageSize,
    onPageSizeChange,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
}: VoucherTableProps) {
    const formatAmount = (amount: number) => {
        if (amount === undefined || amount === null) return '-';
        return `₱${amount.toFixed(2)}`;
    };

    const emptyStateMessage = searchQuery ? `No vouchers found matching "${searchQuery}"` : 'No vouchers found';

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:block">
                {isLoading ? (
                    <TableSkeleton rows={5} columns={headers.length} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="border-b border-blue-700 bg-blue-600">
                                <tr>
                                    {headers.map((header) => (
                                        <th
                                            key={header.key}
                                            className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                                        >
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {tableData.length > 0 ? (
                                    tableData.map((voucher) => (
                                        <tr
                                            key={voucher.voucherId}
                                            onClick={() => onRowClick(voucher)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {voucher.voucherNo || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {voucher.voucherDate || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {voucher.accountName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{voucher.status}</td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {formatAmount(voucher.totalAmount)}
                                            </td>
                                            <td className="px-6 py-5 text-sm">
                                                {voucher.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${voucher.latestActivity.style.bgColor} ${voucher.latestActivity.style.textColor}`}
                                                        title={voucher.latestActivity.text}
                                                    >
                                                        {voucher.latestActivity.text.length > 50
                                                            ? `${voucher.latestActivity.text.substring(0, 50)}...`
                                                            : voucher.latestActivity.text}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={headers.length}>
                                            <EmptyTableState message={emptyStateMessage} />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile Cards */}
            {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
                    <TableSkeleton rows={3} columns={1} />
                </div>
            ) : (
                <div className="space-y-4 sm:hidden">
                    {tableData.length > 0 ? (
                        tableData.map((voucher) => (
                            <button
                                key={voucher.voucherId}
                                type="button"
                                onClick={() => onRowClick(voucher)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {voucher.voucherNo || '-'}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {voucher.accountName || 'No account'}
                                        </p>
                                    </div>
                                    <div>{voucher.status}</div>
                                </div>
                                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                                    <div className="flex justify-between gap-3">
                                        <dt className="font-medium text-gray-500">Date</dt>
                                        <dd className="text-right text-gray-900">{voucher.voucherDate || '-'}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="font-medium text-gray-500">Amount</dt>
                                        <dd className="text-right text-gray-900">
                                            {formatAmount(voucher.totalAmount)}
                                        </dd>
                                    </div>
                                    {voucher.latestActivity && (
                                        <div className="mt-2">
                                            <dt className="mb-1 font-medium text-gray-500">Latest Activity</dt>
                                            <dd>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${voucher.latestActivity.style.bgColor} ${voucher.latestActivity.style.textColor}`}
                                                >
                                                    {voucher.latestActivity.text.length > 60
                                                        ? `${voucher.latestActivity.text.substring(0, 60)}...`
                                                        : voucher.latestActivity.text}
                                                </span>
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </button>
                        ))
                    ) : (
                        <EmptyTableState message={emptyStateMessage} />
                    )}
                </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    hasPrevious={hasPrevious}
                    hasNext={hasNext}
                    onPrevious={onPrevious}
                    onNext={onNext}
                />
            </div>
        </>
    );
}
