'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { StockDto } from '@data-access/index';
import { ReactNode } from 'react';

type StockTableRow = Omit<StockDto, 'status'> & {
    status: ReactNode;
    latestActivity: string;
};

interface StockTableProps {
    isLoading: boolean;
    tableData: StockTableRow[];
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

export default function StockTable({
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
}: StockTableProps) {
    if (isLoading) {
        return <TableSkeleton />;
    }

    return (
        <>
            {tableData.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <EmptyTableState message="No stocks found. Try adjusting your search or filters." />
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
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
                                    {tableData.map((item) => (
                                        <tr
                                            key={item.stockId}
                                            onClick={() => onRowClick(item)}
                                            className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                                        >
                                            {headers.map((header) => (
                                                <td key={header.key} className="px-6 py-5 text-sm">
                                                    {header.key === 'productName' && (
                                                        <span className="font-medium text-gray-900">
                                                            {item.productName || '-'}
                                                        </span>
                                                    )}
                                                    {header.key === 'lotNo' && (
                                                        <span className="text-gray-700">{item.lotNo || '-'}</span>
                                                    )}
                                                    {header.key === 'totalQuantity' && (
                                                        <span className="text-gray-700">{item.totalQuantity || 0}</span>
                                                    )}
                                                    {header.key === 'productUnitName' && (
                                                        <span className="text-gray-700">
                                                            {item.productUnitName || '-'}
                                                        </span>
                                                    )}
                                                    {header.key === 'stockTypeName' && (
                                                        <span className="text-gray-700">
                                                            {item.stockTypeName || '-'}
                                                        </span>
                                                    )}
                                                    {header.key === 'status' && item.status}
                                                    {header.key === 'latestActivity' && (
                                                        <span className="text-gray-700">{item.latestActivity}</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-4">
                        {tableData.map((item) => (
                            <button
                                key={item.stockId}
                                onClick={() => onRowClick(item)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-left hover:bg-gray-50 transition-colors"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">PRODUCT NAME</div>
                                        <div className="font-medium text-gray-900">{item.productName || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">STATUS</div>
                                        <div>{item.status}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">LOT NO</div>
                                        <div className="text-sm text-gray-700">{item.lotNo || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">TOTAL QTY</div>
                                        <div className="text-sm text-gray-700">{item.totalQuantity || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">UNIT</div>
                                        <div className="text-sm text-gray-700">{item.productUnitName || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">STOCK TYPE</div>
                                        <div className="text-sm text-gray-700">{item.stockTypeName || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-xs text-gray-500 mb-1">LATEST ACTIVITY</div>
                                        <div className="text-sm text-gray-700">{item.latestActivity}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Pagination Controls */}
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
