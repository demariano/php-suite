import { EmptyTableState, PageSizeSelector, PaginationButtons, StatusBadge, TableSkeleton } from '@components-web';
import { StatusEnum, StockPurchaseOrderStatusEnum } from '@data-access/index';
import { ReactNode } from 'react';

interface TableHeader {
    key: string;
    label: string;
}

interface TableRowData {
    stockPurchaseOrderId?: string;
    docNo?: string;
    poDate?: string;
    stockSupplierName?: string;
    status?: StatusEnum;
    poStatus: StockPurchaseOrderStatusEnum;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
    [key: string]: unknown;
}

interface StockPurchaseOrderTableProps {
    isLoading: boolean;
    tableData: TableRowData[];
    headers: TableHeader[];
    searchQuery: string;
    onRowClick: (record: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor?: string;
    nextCursor?: string;
    onPrevious: () => void;
    onNext: () => void;
    getPoStatusBadge: (poStatus: StockPurchaseOrderStatusEnum) => ReactNode;
}

export function StockPurchaseOrderTable({
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
    getPoStatusBadge,
}: StockPurchaseOrderTableProps) {
    if (isLoading) {
        return <TableSkeleton columns={headers.length} />;
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
                                tableData.map((row) => (
                                    <tr
                                        key={row.stockPurchaseOrderId}
                                        onClick={() => onRowClick(row)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {row.docNo || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-900">{row.poDate || '-'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-900">
                                            {row.stockSupplierName || '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-6 py-5">{getPoStatusBadge(row.poStatus)}</td>
                                        <td className="px-6 py-5 text-sm">
                                            {row.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${row.latestActivity.style.bgColor} ${row.latestActivity.style.textColor}`}
                                                    title={row.latestActivity.text}
                                                >
                                                    {row.latestActivity.text.length > 50
                                                        ? `${row.latestActivity.text.substring(0, 50)}...`
                                                        : row.latestActivity.text}
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
                                                    ? `No purchase orders found matching "${searchQuery}"`
                                                    : 'No purchase orders found'
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
                    tableData.map((row) => (
                        <button
                            key={row.stockPurchaseOrderId}
                            type="button"
                            onClick={() => onRowClick(row)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">{row.docNo || '-'}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{row.stockSupplierName || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={row.status} />
                                    {getPoStatusBadge(row.poStatus)}
                                </div>
                                {row.latestActivity && (
                                    <div className="mt-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${row.latestActivity.style.bgColor} ${row.latestActivity.style.textColor}`}
                                        >
                                            {row.latestActivity.text.length > 60
                                                ? `${row.latestActivity.text.substring(0, 60)}...`
                                                : row.latestActivity.text}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))
                ) : (
                    <EmptyTableState
                        message={
                            searchQuery
                                ? `No purchase orders found matching "${searchQuery}"`
                                : 'No purchase orders found'
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
