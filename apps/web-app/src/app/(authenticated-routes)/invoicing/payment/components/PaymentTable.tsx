'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { PaymentDto } from '@data-access/index';
import { ReactNode } from 'react';

type PaymentTableRow = PaymentDto & {
    status: ReactNode;
    paymentAmount: string;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
};

interface PaymentTableProps {
    isLoading: boolean;
    tableData: PaymentTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (payment: PaymentDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function PaymentTable({
    isLoading,
    tableData,
    headers,
    searchQuery,
    onRowClick,
    pageSize,
    onPageSizeChange,
    prevCursor,
    nextCursor,
    onPrevious,
    onNext,
}: PaymentTableProps) {
    return (
        <>
            {/* Desktop Table */}
            {isLoading ? (
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
            ) : (
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-blue-600 border-b border-blue-700">
                                <tr>
                                    {headers.map((header) => (
                                        <th
                                            key={header.key}
                                            className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider"
                                        >
                                            {header.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableData.length > 0 ? (
                                    tableData.map((payment) => (
                                        <tr
                                            key={payment.paymentId}
                                            onClick={() => onRowClick(payment)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {payment.receiptNo || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {payment.paymentDate || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {payment.customerName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {payment.paymentAmount || '-'}
                                            </td>
                                            <td className="px-6 py-5">{payment.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {payment.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${payment.latestActivity.style.bgColor} ${payment.latestActivity.style.textColor}`}
                                                        title={payment.latestActivity.text}
                                                    >
                                                        {payment.latestActivity.text.length > 50
                                                            ? `${payment.latestActivity.text.substring(0, 50)}...`
                                                            : payment.latestActivity.text}
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
                                            <EmptyTableState
                                                message={
                                                    searchQuery
                                                        ? `No payments found matching "${searchQuery}"`
                                                        : 'No payments found'
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Desktop Pagination */}
            <div className="hidden sm:flex mt-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                    variant="desktop"
                />
            </div>

            {/* Mobile Cards */}
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length > 0 ? (
                        tableData.map((payment) => (
                            <button
                                key={payment.paymentId}
                                type="button"
                                onClick={() => onRowClick(payment)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{payment.receiptNo || '-'}</h3>
                                    {payment.status}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div>Customer: {payment.customerName || '-'}</div>
                                    <div>Payment Date: {payment.paymentDate || '-'}</div>
                                    <div>Amount: {payment.paymentAmount || '-'}</div>
                                </div>
                                {payment.latestActivity && (
                                    <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">Latest Activity: </span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${payment.latestActivity.style.bgColor} ${payment.latestActivity.style.textColor}`}
                                        >
                                            {payment.latestActivity.text.length > 60
                                                ? `${payment.latestActivity.text.substring(0, 60)}...`
                                                : payment.latestActivity.text}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-8">
                            <EmptyTableState
                                message={
                                    searchQuery ? `No payments found matching "${searchQuery}"` : 'No payments found'
                                }
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Pagination */}
            {!isLoading && (
                <div className="sm:hidden flex flex-col gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                    <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                    <PaginationButtons
                        onPrevious={onPrevious}
                        onNext={onNext}
                        hasPrevious={!!prevCursor}
                        hasNext={!!nextCursor}
                        variant="mobile"
                    />
                </div>
            )}
        </>
    );
}
