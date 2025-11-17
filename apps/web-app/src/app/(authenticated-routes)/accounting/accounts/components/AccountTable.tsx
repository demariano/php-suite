'use client';

import { AccountsDto } from '@data-access/index';

interface AccountTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchQuery: string;
  onRowClick: (account: AccountsDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: any;
  nextCursor: any;
  onPrevious: () => void;
  onNext: () => void;
}

export default function AccountTable({
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
}: AccountTableProps) {
  const emptyStateMessage = searchQuery
    ? `No accounts found matching "${searchQuery}"`
    : 'No accounts found';

  return (
    <div className="space-y-6">
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:block">
        {isLoading ? (
          <div className="p-10 text-center text-base text-gray-500">Loading accounts...</div>
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
                  tableData.map((account) => (
                    <tr
                      key={account.accountingId}
                      onClick={() => onRowClick(account)}
                      className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {account.accountName || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{account.accountType || '-'}</td>
                      <td className="px-6 py-5">{account.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {emptyStateMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="space-y-4 sm:hidden">
          {tableData.length > 0 ? (
            tableData.map((account) => (
              <button
                key={account.accountingId}
                type="button"
                onClick={() => onRowClick(account)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{account.accountName || '-'}</h3>
                    <p className="mt-1 text-sm text-gray-600">{account.accountType || 'No type assigned'}</p>
                  </div>
                  <div>{account.status}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {emptyStateMessage}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
          Loading accounts...
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
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
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
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
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

