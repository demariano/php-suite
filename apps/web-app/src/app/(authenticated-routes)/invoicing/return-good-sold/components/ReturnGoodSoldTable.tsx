'use client';

import { ReturnGoodSoldDto } from '@data-access/index';

interface ReturnGoodSoldTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: Array<{ key: string; label: string }>;
  searchQuery: string;
  onRowClick: (record: ReturnGoodSoldDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor?: string;
  nextCursor?: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function ReturnGoodSoldTable({
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
  onNext
}: ReturnGoodSoldTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-base text-gray-500">
            Loading return good sold records...
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
                  tableData.map((record) => (
                    <tr
                      key={record.returnGoodSoldId}
                      onClick={() => onRowClick(record)}
                      className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {record.rgsDocno || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {record.dateReturned || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {record.customerName || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {record.invoiceDocno || '-'}
                      </td>
                      <td className="px-6 py-5">{record.status}</td>
                      <td className="px-6 py-5 text-sm">
                        {record.latestActivity ? (
                          <span 
                            className={`px-2 py-1 rounded ${record.latestActivity.style.bgColor} ${record.latestActivity.style.textColor}`}
                            title={record.latestActivity.text}
                          >
                            {record.latestActivity.text.length > 50 
                              ? `${record.latestActivity.text.substring(0, 50)}...` 
                              : record.latestActivity.text}
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
                      {searchQuery ? `No return good sold records found matching "${searchQuery}"` : 'No return good sold records found'}
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
            tableData.map((record) => (
              <button
                key={record.returnGoodSoldId}
                type="button"
                onClick={() => onRowClick(record)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {record.rgsDocno || '-'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{record.customerName || 'No customer'}</p>
                  </div>
                  <div>{record.status}</div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Date Returned</dt>
                    <dd className="text-right text-gray-900">{record.dateReturned || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Invoice Doc No</dt>
                    <dd className="text-right text-gray-900">{record.invoiceDocno || '-'}</dd>
                  </div>
                  {record.latestActivity && (
                    <div className="mt-2">
                      <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                      <dd>
                        <span 
                          className={`px-2 py-1 rounded text-xs ${record.latestActivity.style.bgColor} ${record.latestActivity.style.textColor}`}
                        >
                          {record.latestActivity.text.length > 60 
                            ? `${record.latestActivity.text.substring(0, 60)}...` 
                            : record.latestActivity.text}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {searchQuery ? `No return good sold records found matching "${searchQuery}"` : 'No return good sold records found'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
          Loading return good sold records...
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
