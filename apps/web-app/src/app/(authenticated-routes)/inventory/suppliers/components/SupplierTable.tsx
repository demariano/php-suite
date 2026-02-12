'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ReactNode } from 'react';

interface SupplierTableRow {
    supplierId?: string;
    supplierName?: string;
    email?: string;
    phone?: string;
    contactPerson?: string;
    status: ReactNode;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
    [key: string]: unknown;
}

interface SupplierTableProps {
    isLoading: boolean;
    tableData: SupplierTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (row: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function SupplierTable({
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
}: SupplierTableProps) {
    if (isLoading) {
        return <TableSkeleton columns={headers.length} rows={5} />;
    }

    return (
        <>
            {/* Table (Desktop) */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
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
                                tableData.map((supplier) => (
                                    <tr
                                        key={supplier.supplierId}
                                        onClick={() => onRowClick(supplier as any)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {supplier.supplierName || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-700">{supplier.email || '-'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-700">{supplier.phone || '-'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-700">
                                            {supplier.contactPerson || '-'}
                                        </td>
                                        <td className="px-6 py-5">{supplier.status}</td>
                                        <td className="px-6 py-5 text-sm">
                                            {supplier.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${supplier.latestActivity.style.bgColor} ${supplier.latestActivity.style.textColor}`}
                                                    title={supplier.latestActivity.text}
                                                >
                                                    {supplier.latestActivity.text.length > 50
                                                        ? `${supplier.latestActivity.text.substring(0, 50)}...`
                                                        : supplier.latestActivity.text}
                                                </span>
                                            ) : (
                                                '-'
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
                                                    ? `No suppliers found matching "${searchQuery}"`
                                                    : 'No suppliers found'
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-4 sm:hidden">
                {tableData.length > 0 ? (
                    tableData.map((supplier) => (
                        <button
                            key={supplier.supplierId}
                            type="button"
                            onClick={() => onRowClick(supplier as any)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {supplier.supplierName || '-'}
                                    </h3>
                                </div>
                                <div>{supplier.status}</div>
                            </div>
                            <dl className="mt-3 space-y-2 text-sm">
                                <div>
                                    <dt className="font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-gray-900">{supplier.email || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-500">Phone</dt>
                                    <dd className="mt-1 text-gray-900">{supplier.phone || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-500">Contact Person</dt>
                                    <dd className="mt-1 text-gray-900">{supplier.contactPerson || '-'}</dd>
                                </div>
                                {supplier.latestActivity && (
                                    <div>
                                        <dt className="font-medium text-gray-500">Latest Activity</dt>
                                        <dd className="mt-1">
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${supplier.latestActivity.style.bgColor} ${supplier.latestActivity.style.textColor}`}
                                            >
                                                {supplier.latestActivity.text.length > 60
                                                    ? `${supplier.latestActivity.text.substring(0, 60)}...`
                                                    : supplier.latestActivity.text}
                                            </span>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </button>
                    ))
                ) : (
                    <EmptyTableState
                        message={searchQuery ? `No suppliers found matching "${searchQuery}"` : 'No suppliers found'}
                    />
                )}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                />
            </div>
        </>
    );
}
