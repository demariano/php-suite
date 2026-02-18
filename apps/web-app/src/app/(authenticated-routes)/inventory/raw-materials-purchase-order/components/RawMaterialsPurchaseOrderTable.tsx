import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';

interface Header {
    key: string;
    label: string;
}

interface RawMaterialsPurchaseOrderTableProps {
    isLoading: boolean;
    tableData: any[];
    headers: Header[];
    searchQuery: string;
    onRowClick: (record: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor?: string;
    nextCursor?: string;
    onPrevious: () => void;
    onNext: () => void;
}

export function RawMaterialsPurchaseOrderTable({
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
}: RawMaterialsPurchaseOrderTableProps) {
    if (isLoading) {
        return <TableSkeleton columns={6} />;
    }

    return (
        <>
            {/* Desktop Table */}
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
                                tableData.map((row, index) => (
                                    <tr
                                        key={index}
                                        onClick={() => onRowClick(row)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        {headers.map((header) => (
                                            <td key={header.key} className="px-6 py-5 text-sm">
                                                {header.key === 'latestActivity' ? (
                                                    row[header.key] ? (
                                                        <span
                                                            className={`px-2 py-1 rounded ${
                                                                row[header.key].style.bgColor
                                                            } ${row[header.key].style.textColor}`}
                                                            title={row[header.key].text}
                                                        >
                                                            {row[header.key].text.length > 50
                                                                ? `${row[header.key].text.substring(0, 50)}...`
                                                                : row[header.key].text}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )
                                                ) : header.key === 'status' || header.key === 'poStatus' ? (
                                                    <div>{row[header.key]}</div>
                                                ) : (
                                                    <span className="font-medium text-gray-900">
                                                        {row[header.key] || '-'}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
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
                    tableData.map((row, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onRowClick(row)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900">{row.docNo || '-'}</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {row.rawMaterialSupplierName || '-'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{row.poDate || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {row.status}
                                    {row.poStatus}
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
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                        {searchQuery
                            ? `No purchase orders found matching "${searchQuery}"`
                            : 'No purchase orders found'}
                    </div>
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
