'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { RawMaterialDto } from '@data-access/index';
import { ReactNode } from 'react';

interface RawMaterialTableRow {
    rawMaterialId?: string;
    rawMaterialName: string;
    status: ReactNode;
    latestActivity: ReactNode;
}

interface RawMaterialTableProps {
    isLoading: boolean;
    tableData: RawMaterialTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (material: RawMaterialDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function RawMaterialTable({
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
}: RawMaterialTableProps) {
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
                                tableData.map((material) => (
                                    <tr
                                        key={material.rawMaterialId}
                                        onClick={() => onRowClick(material as any)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {material.rawMaterialName}
                                        </td>
                                        <td className="px-6 py-5">{material.status}</td>
                                        <td className="px-6 py-5 text-sm">{material.latestActivity}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={headers.length}>
                                        <EmptyTableState
                                            message={
                                                searchQuery
                                                    ? `No raw materials found matching "${searchQuery}"`
                                                    : 'No raw materials found'
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
                    tableData.map((material) => (
                        <button
                            key={material.rawMaterialId}
                            type="button"
                            onClick={() => onRowClick(material as any)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {material.rawMaterialName}
                                    </h3>
                                </div>
                                <div>{material.status}</div>
                            </div>
                            <dl className="mt-3 space-y-2 text-sm">
                                <div>
                                    <dt className="font-medium text-gray-500">Latest Activity</dt>
                                    <dd className="mt-1">{material.latestActivity}</dd>
                                </div>
                            </dl>
                        </button>
                    ))
                ) : (
                    <EmptyTableState
                        message={
                            searchQuery ? `No raw materials found matching "${searchQuery}"` : 'No raw materials found'
                        }
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
