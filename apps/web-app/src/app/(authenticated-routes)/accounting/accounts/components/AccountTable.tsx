'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { AccountsDto } from '@data-access/index';

interface AccountTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (account: AccountsDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export default function AccountTable({
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
}: AccountTableProps) {
    const emptyStateMessage = searchQuery ? `No accounts found matching "${searchQuery}"` : 'No accounts found';

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
                                    tableData.map((account) => (
                                        <tr
                                            key={account.accountingId}
                                            onClick={() => onRowClick(account)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {account.accountName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {account.accountType || '-'}
                                            </td>
                                            <td className="px-6 py-5">{account.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {account.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${account.latestActivity.style.bgColor} ${account.latestActivity.style.textColor}`}
                                                        title={account.latestActivity.text}
                                                    >
                                                        {account.latestActivity.text.length > 50
                                                            ? `${account.latestActivity.text.substring(0, 50)}...`
                                                            : account.latestActivity.text}
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
                        tableData.map((account) => (
                            <button
                                key={account.accountingId}
                                type="button"
                                onClick={() => onRowClick(account)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {account.accountName || '-'}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {account.accountType || 'No type assigned'}
                                        </p>
                                    </div>
                                    <div>{account.status}</div>
                                </div>
                                {account.latestActivity && (
                                    <div className="mt-2">
                                        <dt className="mb-1 font-medium text-gray-500">Latest Activity</dt>
                                        <dd>
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${account.latestActivity.style.bgColor} ${account.latestActivity.style.textColor}`}
                                            >
                                                {account.latestActivity.text.length > 60
                                                    ? `${account.latestActivity.text.substring(0, 60)}...`
                                                    : account.latestActivity.text}
                                            </span>
                                        </dd>
                                    </div>
                                )}
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
