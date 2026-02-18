'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { CustomerDto } from '@data-access/index';
import { ReactNode } from 'react';

type CustomerTableRow = Omit<CustomerDto, 'status'> & {
    status: ReactNode;
    formattedBalance: string;
    formattedCreditLimit: string;
    formattedCustomerCredit: string;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
    [key: string]: unknown;
};

interface CustomerTableProps {
    isLoading: boolean;
    tableData: CustomerTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (customer: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: any;
    nextCursor: any;
    onPrevious: () => void;
    onNext: () => void;
}

export default function CustomerTable({
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
}: CustomerTableProps) {
    return (
        <>
            {/* Desktop Table */}
            {isLoading ? (
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
            ) : (
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    {tableData.length === 0 ? (
                        <EmptyTableState message="No customers found. Try adjusting your search or filters." />
                    ) : (
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
                                    {tableData.map((customer) => (
                                        <tr
                                            key={customer.customerId}
                                            onClick={() => onRowClick(customer)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {customer.customerName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">{customer.email || '-'}</td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {customer.contactNo || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {customer.customerTypeName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{customer.status}</td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {customer.formattedBalance}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {customer.formattedCreditLimit}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {customer.formattedCustomerCredit}
                                            </td>
                                            <td className="px-6 py-5 text-sm">
                                                {customer.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${customer.latestActivity.style.bgColor} ${customer.latestActivity.style.textColor}`}
                                                        title={customer.latestActivity.text}
                                                    >
                                                        {customer.latestActivity.text.length > 50
                                                            ? `${customer.latestActivity.text.substring(0, 50)}...`
                                                            : customer.latestActivity.text}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            <div className="mt-6 hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                />
            </div>

            {/* Mobile Cards */}
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length === 0 ? (
                        <EmptyTableState message="No customers found. Try adjusting your search or filters." />
                    ) : (
                        <>
                            {tableData.map((customer) => (
                                <button
                                    key={customer.customerId}
                                    type="button"
                                    onClick={() => onRowClick(customer)}
                                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">
                                                {customer.customerName || '-'}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {customer.email || 'No email on file'}
                                            </p>
                                        </div>
                                        <div>{customer.status}</div>
                                    </div>
                                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                                        <div className="flex justify-between gap-3">
                                            <dt className="font-medium text-gray-500">Contact</dt>
                                            <dd className="text-right text-gray-900">{customer.contactNo || '-'}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="font-medium text-gray-500">Type</dt>
                                            <dd className="text-right text-gray-900">
                                                {customer.customerTypeName || '-'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="font-medium text-gray-500">Balance</dt>
                                            <dd className="text-right text-gray-900">{customer.formattedBalance}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="font-medium text-gray-500">Credit Limit</dt>
                                            <dd className="text-right text-gray-900">
                                                {customer.formattedCreditLimit}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="font-medium text-gray-500">Customer Credit</dt>
                                            <dd className="text-right text-gray-900">
                                                {customer.formattedCustomerCredit}
                                            </dd>
                                        </div>
                                        {customer.latestActivity && (
                                            <div className="mt-2">
                                                <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                                                <dd>
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs ${customer.latestActivity.style.bgColor} ${customer.latestActivity.style.textColor}`}
                                                    >
                                                        {customer.latestActivity.text.length > 60
                                                            ? `${customer.latestActivity.text.substring(0, 60)}...`
                                                            : customer.latestActivity.text}
                                                    </span>
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </button>
                            ))}
                            <div className="space-y-3 bg-gray-50 border-t border-gray-200 px-4 py-5 rounded-xl">
                                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                                <PaginationButtons
                                    onPrevious={onPrevious}
                                    onNext={onNext}
                                    hasPrevious={!!prevCursor}
                                    hasNext={!!nextCursor}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
