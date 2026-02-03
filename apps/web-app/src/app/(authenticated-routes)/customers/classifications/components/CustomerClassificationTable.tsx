'use client';

import { Pagination } from '@components-web';
import { CustomerClassificationDto } from '@data-access/index';

interface CustomerClassificationTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (customerClassification: CustomerClassificationDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function CustomerClassificationTable({
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
}: CustomerClassificationTableProps) {
    return (
        <>
            {/* Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500 text-base">Loading customer classifications...</div>
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
                                    tableData.map((customerClassification) => (
                                        <tr
                                            key={customerClassification.customerClassificationId}
                                            onClick={() => onRowClick(customerClassification)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {customerClassification.customerClassificationName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{customerClassification.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {customerClassification.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${customerClassification.latestActivity.style.bgColor} ${customerClassification.latestActivity.style.textColor}`}
                                                        title={customerClassification.latestActivity.text}
                                                    >
                                                        {customerClassification.latestActivity.text.length > 50
                                                            ? `${customerClassification.latestActivity.text.substring(
                                                                  0,
                                                                  50
                                                              )}...`
                                                            : customerClassification.latestActivity.text}
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
                                                ? `No customer classifications found matching "${searchQuery}"`
                                                : 'No customer classifications found'}
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
                <div className="sm:hidden space-y-4">
                    {tableData.length > 0 ? (
                        tableData.map((customerClassification) => (
                            <button
                                key={customerClassification.customerClassificationId}
                                type="button"
                                onClick={() => onRowClick(customerClassification)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {customerClassification.customerClassificationName || '-'}
                                        </h3>
                                        {customerClassification.latestActivity && (
                                            <p className="mt-2 text-xs">
                                                <span className="font-medium text-gray-700">Latest Activity: </span>
                                                <span
                                                    className={`px-2 py-1 rounded ${customerClassification.latestActivity.style.bgColor} ${customerClassification.latestActivity.style.textColor}`}
                                                >
                                                    {customerClassification.latestActivity.text.length > 60
                                                        ? `${customerClassification.latestActivity.text.substring(
                                                              0,
                                                              60
                                                          )}...`
                                                        : customerClassification.latestActivity.text}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div>{customerClassification.status}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                            {searchQuery
                                ? `No customer classifications found matching "${searchQuery}"`
                                : 'No customer classifications found'}
                        </div>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="sm:hidden rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
                    Loading customer classifications...
                </div>
            )}

            {/* Pagination */}
            <Pagination
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                prevCursor={prevCursor}
                nextCursor={nextCursor}
                onPrevious={onPrevious}
                onNext={onNext}
            />
        </>
    );
}
