'use client';

import { Pagination } from '@components-web';
import { AreaDto } from '@data-access/index';

interface AreaTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (area: AreaDto) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function AreaTable({
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
}: AreaTableProps) {
    return (
        <>
            {/* Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500 text-base">Loading customer areas...</div>
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
                                    tableData.map((area) => (
                                        <tr
                                            key={area.areaId}
                                            onClick={() => onRowClick(area)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {area.areaName || '-'}
                                            </td>
                                            <td className="px-6 py-5">{area.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {area.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${area.latestActivity.style.bgColor} ${area.latestActivity.style.textColor}`}
                                                        title={area.latestActivity.text}
                                                    >
                                                        {area.latestActivity.text.length > 50
                                                            ? `${area.latestActivity.text.substring(0, 50)}...`
                                                            : area.latestActivity.text}
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
                                                ? `No customer areas found matching "${searchQuery}"`
                                                : 'No customer areas found'}
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
                        tableData.map((area) => (
                            <button
                                key={area.areaId}
                                type="button"
                                onClick={() => onRowClick(area)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {area.areaName || '-'}
                                        </h3>
                                        {area.latestActivity && (
                                            <p className="mt-2 text-xs">
                                                <span className="font-medium text-gray-700">Latest Activity: </span>
                                                <span
                                                    className={`px-2 py-1 rounded ${area.latestActivity.style.bgColor} ${area.latestActivity.style.textColor}`}
                                                >
                                                    {area.latestActivity.text.length > 60
                                                        ? `${area.latestActivity.text.substring(0, 60)}...`
                                                        : area.latestActivity.text}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div>{area.status}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                            {searchQuery
                                ? `No customer areas found matching "${searchQuery}"`
                                : 'No customer areas found'}
                        </div>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="sm:hidden rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
                    Loading customer areas...
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
