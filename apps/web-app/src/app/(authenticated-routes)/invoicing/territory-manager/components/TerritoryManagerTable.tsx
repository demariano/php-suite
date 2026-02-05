'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { TerritoryManagerDto } from '@data-access/index';

interface TerritoryManagerTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (territoryManager: TerritoryManagerDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function TerritoryManagerTable({
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
}: TerritoryManagerTableProps) {
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
                                    tableData.map((territoryManager) => (
                                        <tr
                                            key={territoryManager.territoryManagerId}
                                            onClick={() => onRowClick(territoryManager)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {territoryManager.territoryManagerName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{territoryManager.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {territoryManager.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${territoryManager.latestActivity.style.bgColor} ${territoryManager.latestActivity.style.textColor}`}
                                                        title={territoryManager.latestActivity.text}
                                                    >
                                                        {territoryManager.latestActivity.text.length > 50
                                                            ? `${territoryManager.latestActivity.text.substring(
                                                                  0,
                                                                  50
                                                              )}...`
                                                            : territoryManager.latestActivity.text}
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
                                                searchQuery={searchQuery}
                                                entityName="territory managers"
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
                        tableData.map((territoryManager) => (
                            <button
                                key={territoryManager.territoryManagerId}
                                type="button"
                                onClick={() => onRowClick(territoryManager)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {territoryManager.territoryManagerName || '-'}
                                        </h3>
                                    </div>
                                    <div>{territoryManager.status}</div>
                                </div>
                                {territoryManager.latestActivity && (
                                    <div className="mt-2">
                                        <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                                        <dd>
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${territoryManager.latestActivity.style.bgColor} ${territoryManager.latestActivity.style.textColor}`}
                                            >
                                                {territoryManager.latestActivity.text.length > 60
                                                    ? `${territoryManager.latestActivity.text.substring(0, 60)}...`
                                                    : territoryManager.latestActivity.text}
                                            </span>
                                        </dd>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <EmptyTableState
                            message={
                                searchQuery
                                    ? `No territory managers found matching "${searchQuery}"`
                                    : 'No territory managers found'
                            }
                        />
                    )}
                </div>
            )}

            {isLoading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
                    Loading territory managers...
                </div>
            )}

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
