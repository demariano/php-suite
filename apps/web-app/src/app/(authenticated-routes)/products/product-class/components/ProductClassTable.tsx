'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ProductClassDto } from '@data-access/index';
import { ReactNode } from 'react';

type ProductClassTableRow = Omit<ProductClassDto, 'status'> & {
    status: ReactNode;
    className: string;
    latestActivity: string;
};

interface ProductClassTableProps {
    isLoading: boolean;
    tableData: ProductClassTableRow[];
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

export default function ProductClassTable({
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
}: ProductClassTableProps) {
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
                        <EmptyTableState message="No product classes found. Try adjusting your search or filters." />
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
                                    {tableData.map((productClass) => (
                                        <tr
                                            key={productClass.productClassId}
                                            onClick={() => onRowClick(productClass)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {productClass.className}
                                            </td>
                                            <td className="px-6 py-5">{productClass.status}</td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {productClass.latestActivity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Cards */}
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length === 0 ? (
                        <EmptyTableState message="No product classes found. Try adjusting your search or filters." />
                    ) : (
                        tableData.map((productClass) => (
                            <div
                                key={productClass.productClassId}
                                onClick={() => onRowClick(productClass)}
                                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                                Class Name
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {productClass.className}
                                            </div>
                                        </div>
                                        <div>{productClass.status}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            Latest Activity
                                        </div>
                                        <div className="text-sm text-gray-900">{productClass.latestActivity}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination - OUTSIDE table container */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
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
