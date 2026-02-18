'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ProductDealDto } from '@data-access/index';
import { ReactNode } from 'react';

interface ProductDealTableRow {
    productDealId: string;
    dealName: string;
    minQty: number | string;
    additionalQty: number | string;
    status: ReactNode;
    latestActivity: string;
}

interface ProductDealTableProps {
    isLoading: boolean;
    tableData: ProductDealTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (productDeal: ProductDealDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function ProductDealTable({
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
}: ProductDealTableProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:block">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={headers.length} />
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
                                    tableData.map((productDeal) => (
                                        <tr
                                            key={productDeal.productDealId}
                                            onClick={() => onRowClick(productDeal as any)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {productDeal.dealName}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700">{productDeal.minQty}</td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {productDeal.additionalQty}
                                            </td>
                                            <td className="px-6 py-5">{productDeal.status}</td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {productDeal.latestActivity}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={headers.length}>
                                            <EmptyTableState
                                                message={
                                                    searchQuery
                                                        ? `No product deals found matching "${searchQuery}"`
                                                        : 'No product deals found'
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
            <div className="space-y-4 sm:hidden">
                {isLoading ? (
                    <TableSkeleton rows={pageSize} columns={1} />
                ) : tableData.length > 0 ? (
                    tableData.map((productDeal) => (
                        <button
                            key={productDeal.productDealId}
                            type="button"
                            onClick={() => onRowClick(productDeal as any)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3">
                                <span className="text-sm font-medium text-gray-600">Deal Name:</span>
                                <span className="text-sm font-semibold text-gray-900">{productDeal.dealName}</span>

                                <span className="text-sm font-medium text-gray-600">Min Qty:</span>
                                <span className="text-sm text-gray-700">{productDeal.minQty}</span>

                                <span className="text-sm font-medium text-gray-600">Additional Qty:</span>
                                <span className="text-sm text-gray-700">{productDeal.additionalQty}</span>

                                <span className="text-sm font-medium text-gray-600">Status:</span>
                                <span className="text-sm">{productDeal.status}</span>

                                <span className="text-sm font-medium text-gray-600">Latest Activity:</span>
                                <span className="text-sm text-gray-700">{productDeal.latestActivity}</span>
                            </div>
                        </button>
                    ))
                ) : (
                    <EmptyTableState
                        message={
                            searchQuery ? `No product deals found matching "${searchQuery}"` : 'No product deals found'
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
