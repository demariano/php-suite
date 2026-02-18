'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { SalesTypeDto } from '@data-access/index';

interface SalesTypeTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (salesType: SalesTypeDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function SalesTypeTable({
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
}: SalesTypeTableProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <TableSkeleton columns={headers.length} rows={5} />
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
                                    tableData.map((salesType) => (
                                        <tr
                                            key={salesType.salesTypeId}
                                            onClick={() => onRowClick(salesType)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {salesType.salesTypeName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{salesType.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {salesType.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${salesType.latestActivity.style.bgColor} ${salesType.latestActivity.style.textColor}`}
                                                        title={salesType.latestActivity.text}
                                                    >
                                                        {salesType.latestActivity.text.length > 50
                                                            ? `${salesType.latestActivity.text.substring(0, 50)}...`
                                                            : salesType.latestActivity.text}
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
                                                        ? `No sales types found matching "${searchQuery}"`
                                                        : 'No sales types found'
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile Cards */}
            {!isLoading && (
                <div className="space-y-4 sm:hidden">
                    {tableData.length > 0 ? (
                        tableData.map((salesType) => (
                            <button
                                key={salesType.salesTypeId}
                                type="button"
                                onClick={() => onRowClick(salesType)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {salesType.salesTypeName || '-'}
                                        </h3>
                                    </div>
                                    <div>{salesType.status}</div>
                                </div>
                                {salesType.latestActivity && (
                                    <div className="mt-2">
                                        <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                                        <dd>
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${salesType.latestActivity.style.bgColor} ${salesType.latestActivity.style.textColor}`}
                                            >
                                                {salesType.latestActivity.text.length > 60
                                                    ? `${salesType.latestActivity.text.substring(0, 60)}...`
                                                    : salesType.latestActivity.text}
                                            </span>
                                        </dd>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <EmptyTableState
                            message={
                                searchQuery ? `No sales types found matching "${searchQuery}"` : 'No sales types found'
                            }
                        />
                    )}
                </div>
            )}

            {isLoading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
                    Loading sales types...
                </div>
            )}

            {/* Mobile Pagination */}
            <div className="mt-4 sm:hidden space-y-3 bg-gray-50 border-t border-gray-200 px-4 py-5 rounded-xl">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                />
            </div>

            {/* Pagination */}
            <div className="mt-6 hidden sm:flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
