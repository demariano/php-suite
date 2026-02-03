'use client';

import { Pagination } from '@components-web';
import { CustomerTypeDto } from '@data-access/index';

interface CustomerTypeTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (customerType: CustomerTypeDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function CustomerTypeTable({
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
}: CustomerTypeTableProps) {
    return (
        <>
            {/* Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <div className="p-10 text-center text-base text-gray-500">Loading customer types...</div>
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
                                    tableData.map((customerType) => (
                                        <tr
                                            key={customerType.customerTypeId}
                                            onClick={() => onRowClick(customerType)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {customerType.customerTypeName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{customerType.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {customerType.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${customerType.latestActivity.style.bgColor} ${customerType.latestActivity.style.textColor}`}
                                                        title={customerType.latestActivity.text}
                                                    >
                                                        {customerType.latestActivity.text.length > 50
                                                            ? `${customerType.latestActivity.text.substring(0, 50)}...`
                                                            : customerType.latestActivity.text}
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
                                            {searchQuery
                                                ? `No customer types found matching "${searchQuery}"`
                                                : 'No customer types found'}
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
                        tableData.map((customerType) => (
                            <button
                                key={customerType.customerTypeId}
                                type="button"
                                onClick={() => onRowClick(customerType)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {customerType.customerTypeName || '-'}
                                        </h3>
                                        {customerType.latestActivity && (
                                            <p className="mt-2 text-xs">
                                                <span className="font-medium text-gray-700">Latest Activity: </span>
                                                <span
                                                    className={`px-2 py-1 rounded ${customerType.latestActivity.style.bgColor} ${customerType.latestActivity.style.textColor}`}
                                                >
                                                    {customerType.latestActivity.text.length > 60
                                                        ? `${customerType.latestActivity.text.substring(0, 60)}...`
                                                        : customerType.latestActivity.text}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div>{customerType.status}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                            {searchQuery
                                ? `No customer types found matching "${searchQuery}"`
                                : 'No customer types found'}
                        </div>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
                    Loading customer types...
                </div>
            )}

            {/* Pagination */}
            <Pagination
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                onPrevious={onPrevious}
                onNext={onNext}
                hasPrevious={!!prevCursor}
                hasNext={!!nextCursor}
            />
        </>
    );
}
