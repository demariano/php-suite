'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { AreaDto } from '@data-access/index';

interface TableRowData {
    areaId?: string;
    areaName?: string;
    status: React.ReactNode;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
    [key: string]: unknown;
}

interface AreaTableProps {
    isLoading: boolean;
    tableData: TableRowData[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (area: AreaDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function AreaTable({
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
}: AreaTableProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                ) : tableData.length > 0 ? (
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
                                {tableData.map((area) => (
                                    <tr
                                        key={area.areaId}
                                        onClick={() => onRowClick(area as unknown as AreaDto)}
                                        className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {area.areaName || '-'}
                                        </td>
                                        <td className="px-6 py-5">{area.status}</td>
                                        <td className="px-6 py-5 text-sm">
                                            {area.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${area.latestActivity.style.bgColor} ${area.latestActivity.style.textColor}`}
                                                    title={area.latestActivity.text}
                                                >
                                                    {area.latestActivity.text.length > 50
                                                        ? `${area.latestActivity.text.substring(0, 50)}...`
                                                        : area.latestActivity.text}
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
                ) : (
                    <EmptyTableState
                        message={
                            searchQuery
                                ? `No customer areas found matching "${searchQuery}"`
                                : 'No customer areas found'
                        }
                    />
                )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={1} />
                ) : tableData.length > 0 ? (
                    <div className="space-y-4">
                        {tableData.map((area) => (
                            <button
                                key={area.areaId}
                                type="button"
                                onClick={() => onRowClick(area as unknown as AreaDto)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {area.areaName || '-'}
                                        </h3>
                                        {area.latestActivity && (
                                            <p className="mt-2 text-xs">
                                                <span className="font-medium text-gray-700">Latest Activity: </span>
                                                <span
                                                    className={`px-2 py-1 rounded ${area.latestActivity.style.bgColor} ${area.latestActivity.style.textColor}`}
                                                >
                                                    {area.latestActivity.text.length > 60
                                                        ? `${area.latestActivity.text.substring(0, 60)}...`
                                                        : area.latestActivity.text}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div>{area.status}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <EmptyTableState
                        message={
                            searchQuery
                                ? `No customer areas found matching "${searchQuery}"`
                                : 'No customer areas found'
                        }
                    />
                )}
            </div>

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
            <div className="mt-6 hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
