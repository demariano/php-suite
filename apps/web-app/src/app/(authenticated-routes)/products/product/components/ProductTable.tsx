'use client';

import { ProductDto } from '@data-access/index';
import { ReactNode } from 'react';

type ProductTableRow = ProductDto & { status: ReactNode };

interface ProductTableProps {
    isLoading: boolean;
    tableData: ProductTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (product: ProductDto) => void;
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
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500 text-base">Loading products...</div>
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
                                        <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                                            {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-sm font-medium text-gray-600">Rows per page:</span>
                    <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-auto"
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!prevCursor}
                        className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
                            !prevCursor
                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!nextCursor}
                        className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
                            !nextCursor
                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Mobile Cards */}
            {!isLoading && (
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
                        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                            {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'}
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Pagination */}
            {!isLoading && (
                <div className="sm:hidden flex flex-col gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Rows per page:</span>
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={pageSize}
                            onChange={(event) => onPageSizeChange(Number(event.target.value))}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div className="flex w-full gap-2">
                        <button
                            type="button"
                            onClick={onPrevious}
                            disabled={!prevCursor}
                            className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors duration-200 ${
                                prevCursor
                                    ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
                                    : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                            }`}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            disabled={!nextCursor}
                            className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors duration-200 ${
                                nextCursor
                                    ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
                                    : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                            }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
