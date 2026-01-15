interface TableHeader {
  key: string;
  label: string;
}

interface StockPurchaseOrderTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: TableHeader[];
  searchQuery: string;
  onRowClick: (record: any) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor?: string;
  nextCursor?: string;
  onPrevious: () => void;
  onNext: () => void;
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
}: StockPurchaseOrderTableProps) {
  return (
    <>
      {/* Table (Desktop) */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-base text-gray-500">
            Loading purchase orders...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-blue-700 bg-blue-600">
                <tr>
                  {headers.map((header) => (
                    <th key={header.key} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white">
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
                          {header.key === 'status' || header.key === 'poStatus' ? (
                            <div>{row[header.key]}</div>
                          ) : header.key === 'latestActivity' ? (
                            row[header.key] ? (
                              <span
                                className={`px-2 py-1 rounded ${row[header.key].style.bgColor} ${row[header.key].style.textColor}`}
                                title={row[header.key].text}
                              >
                                {row[header.key].text.length > 50 
                                  ? `${row[header.key].text.substring(0, 50)}...` 
                                  : row[header.key].text}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          ) : (
                            <span className="font-medium text-gray-900">{row[header.key] || '-'}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? `No purchase orders found matching "${searchQuery}"` : 'No purchase orders found'}
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
                      <h3 className="text-base font-semibold text-gray-900">
                        {row.docNo || '-'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {row.stockSupplierName || '-'}
                      </p>
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
              {searchQuery ? `No purchase orders found matching "${searchQuery}"` : 'No purchase orders found'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
          Loading purchase orders...
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={onPrevious}
            disabled={!prevCursor}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
              !prevCursor
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!nextCursor}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
              !nextCursor
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
