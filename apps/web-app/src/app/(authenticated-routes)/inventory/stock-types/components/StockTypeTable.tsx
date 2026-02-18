'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { StockTypeDto } from '@data-access/index';
import { ReactNode } from 'react';

type StockTypeTableRow = Omit<StockTypeDto, 'status'> & {
    status: ReactNode;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
};

interface StockTypeTableProps {
    isLoading: boolean;
    tableData: StockTypeTableRow[];
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

export default function StockTypeTable({
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
}: StockTypeTableProps) {
    // Early return with loading skeleton
    if (isLoading) {
        return (
            <>
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            </>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        {/* Table Header */}
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

                        {/* Table Body */}
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tableData.length > 0 ? (
                                tableData.map((stockType) => (
                                    <tr
                                        key={stockType.stockTypeId}
                                        onClick={() => onRowClick(stockType)}
                                        className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                    >
                                        {/* Column: Stock Type Name */}
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {stockType.stockTypeName || '-'}
                                        </td>

                                        {/* Column: Status */}
                                        <td className="px-6 py-5">{stockType.status}</td>

                                        {/* Column: Latest Activity */}
                                        <td className="px-6 py-5 text-sm">
                                            {stockType.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${stockType.latestActivity.style.bgColor} ${stockType.latestActivity.style.textColor}`}
                                                    title={stockType.latestActivity.text}
                                                >
                                                    {stockType.latestActivity.text.length > 50
                                                        ? `${stockType.latestActivity.text.substring(0, 50)}...`
                                                        : stockType.latestActivity.text}
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
                                                    ? `No stock types found matching "${searchQuery}"`
                                                    : 'No stock types found'
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Desktop Pagination */}
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
            <div className="sm:hidden space-y-4">
                {tableData.length > 0 ? (
                    tableData.map((stockType) => (
                        <button
                            key={stockType.stockTypeId}
                            onClick={() => onRowClick(stockType)}
                            className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 text-left"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{stockType.stockTypeName || '-'}</h3>
                                {stockType.status}
                            </div>

                            {/* Card Activity */}
                            {stockType.latestActivity && (
                                <div className="mt-2">
                                    <span className="text-xs font-medium text-gray-500">Latest Activity: </span>
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${stockType.latestActivity.style.bgColor} ${stockType.latestActivity.style.textColor}`}
                                    >
                                        {stockType.latestActivity.text.length > 60
                                            ? `${stockType.latestActivity.text.substring(0, 60)}...`
                                            : stockType.latestActivity.text}
                                    </span>
                                </div>
                            )}
                        </button>
                    ))
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-8">
                        <EmptyTableState
                            message={
                                searchQuery ? `No stock types found matching "${searchQuery}"` : 'No stock types found'
                            }
                        />
                    </div>
                )}
            </div>

            {/* Mobile Pagination */}
            {!isLoading && (
                <div className="sm:hidden flex flex-col gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                    <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                    <PaginationButtons
                        onPrevious={onPrevious}
                        onNext={onNext}
                        hasPrevious={!!prevCursor}
                        hasNext={!!nextCursor}
                    />
                </div>
            )}
        </>
    );
}
