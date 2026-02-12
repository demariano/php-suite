'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ProductPriceTypeDto } from '@data-access/index';
import { ReactNode } from 'react';

type ProductPriceTypeTableRow = Omit<ProductPriceTypeDto, 'status'> & {
    priceTypeName?: string;
    status: ReactNode;
    latestActivity: any;
    [key: string]: unknown;
};

interface ProductPriceTypeTableProps {
    isLoading: boolean;
    tableData: ProductPriceTypeTableRow[];
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

export default function ProductPriceTypeTable({
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
}: ProductPriceTypeTableProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <TableSkeleton columns={3} rows={pageSize} />
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
                                    tableData.map((productPriceType) => (
                                        <tr
                                            key={productPriceType.productPriceTypeId}
                                            onClick={() =>
                                                onRowClick(productPriceType as unknown as ProductPriceTypeDto)
                                            }
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {productPriceType.priceTypeName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{productPriceType.status}</td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {productPriceType.latestActivity || '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={headers.length}>
                                            <EmptyTableState
                                                message={
                                                    searchQuery
                                                        ? `No product price types found matching "${searchQuery}"`
                                                        : 'No product price types found'
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
            {isLoading ? (
                <div className="space-y-4 sm:hidden">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="h-32 w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4 sm:hidden">
                    {tableData.length > 0 ? (
                        tableData.map((productPriceType) => (
                            <button
                                key={productPriceType.productPriceTypeId}
                                type="button"
                                onClick={() => onRowClick(productPriceType as unknown as ProductPriceTypeDto)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <p className="text-xs font-medium text-gray-500">Price Type Name</p>
                                        <p className="mt-1 text-sm font-semibold text-gray-900">
                                            {productPriceType.priceTypeName || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">Status</p>
                                        <div className="mt-1">{productPriceType.status}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">Latest Activity</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {productPriceType.latestActivity || '-'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <EmptyTableState
                            message={
                                searchQuery
                                    ? `No product price types found matching "${searchQuery}"`
                                    : 'No product price types found'
                            }
                        />
                    )}
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
