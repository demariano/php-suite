'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ProductDto } from '@data-access/index';
import { ReactNode } from 'react';

type ProductTableRow = Omit<ProductDto, 'status'> & { status: ReactNode; latestActivity?: any; [key: string]: unknown };

interface ProductTableProps {
    isLoading: boolean;
    tableData: ProductTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (row: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: any;
    nextCursor: any;
    onPrevious: () => void;
    onNext: () => void;
}

const formatCriticalLevel = (level?: number | null): string => {
    if (level === undefined || level === null) {
        return '-';
    }

    return level.toString();
};

export default function ProductTable({
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
}: ProductTableProps) {
    return (
        <>
            {/* Desktop Table */}
            {isLoading ? (
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
            ) : (
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
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
                                {tableData.length > 0 ? (
                                    tableData.map((product) => (
                                        <tr
                                            key={product.productId}
                                            onClick={() => onRowClick(product)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {product.productName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {product.productCategoryName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {product.productClassName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {formatCriticalLevel(product.criticalLevel)}
                                            </td>
                                            <td className="px-6 py-5">{product.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {product.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${product.latestActivity.style.bgColor} ${product.latestActivity.style.textColor}`}
                                                        title={product.latestActivity.text}
                                                    >
                                                        {product.latestActivity.text.length > 50
                                                            ? `${product.latestActivity.text.substring(0, 50)}...`
                                                            : product.latestActivity.text}
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
                                                        ? `No products found matching "${searchQuery}"`
                                                        : 'No products found'
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
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
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length > 0 ? (
                        tableData.map((product) => (
                            <button
                                key={product.productId}
                                onClick={() => onRowClick(product)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{product.productName || '-'}</h3>
                                    {product.status}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div>Category: {product.productCategoryName || '-'}</div>
                                    <div>Class: {product.productClassName || '-'}</div>
                                    <div>Critical Level: {formatCriticalLevel(product.criticalLevel)}</div>
                                </div>
                                {product.latestActivity && (
                                    <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">Latest Activity: </span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${product.latestActivity.style.bgColor} ${product.latestActivity.style.textColor}`}
                                        >
                                            {product.latestActivity.text.length > 60
                                                ? `${product.latestActivity.text.substring(0, 60)}...`
                                                : product.latestActivity.text}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-8">
                            <EmptyTableState
                                message={
                                    searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'
                                }
                            />
                        </div>
                    )}
                </div>
            )}

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
