'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { TermsDto } from '@data-access/index';

interface TableRowData {
    termsId?: string;
    termsName?: string;
    days?: number;
    status: React.ReactNode;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
    [key: string]: unknown;
}

interface TermsTableProps {
    isLoading: boolean;
    tableData: TableRowData[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (terms: TermsDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function TermsTable({
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
}: TermsTableProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                ) : tableData.length > 0 ? (
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
                                {tableData.map((terms) => (
                                    <tr
                                        key={terms.termsId}
                                        onClick={() => onRowClick(terms as unknown as TermsDto)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {terms.termsName || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-900">{terms.days || '-'}</td>
                                        <td className="px-6 py-5">{terms.status}</td>
                                        <td className="px-6 py-5 text-sm">
                                            {terms.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${terms.latestActivity.style.bgColor} ${terms.latestActivity.style.textColor}`}
                                                    title={terms.latestActivity.text}
                                                >
                                                    {terms.latestActivity.text.length > 50
                                                        ? `${terms.latestActivity.text.substring(0, 50)}...`
                                                        : terms.latestActivity.text}
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
                        message={searchQuery ? `No terms found matching "${searchQuery}"` : 'No terms found'}
                    />
                )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={1} />
                ) : tableData.length > 0 ? (
                    <div className="space-y-4">
                        {tableData.map((terms) => (
                            <button
                                key={terms.termsId}
                                type="button"
                                onClick={() => onRowClick(terms as unknown as TermsDto)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {terms.termsName || '-'}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">Days: {terms.days || '-'}</p>
                                        {terms.latestActivity && (
                                            <p className="mt-2 text-xs">
                                                <span className="font-medium text-gray-700">Latest Activity: </span>
                                                <span
                                                    className={`px-2 py-1 rounded ${terms.latestActivity.style.bgColor} ${terms.latestActivity.style.textColor}`}
                                                >
                                                    {terms.latestActivity.text.length > 60
                                                        ? `${terms.latestActivity.text.substring(0, 60)}...`
                                                        : terms.latestActivity.text}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div>{terms.status}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <EmptyTableState
                        message={searchQuery ? `No terms found matching "${searchQuery}"` : 'No terms found'}
                    />
                )}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
