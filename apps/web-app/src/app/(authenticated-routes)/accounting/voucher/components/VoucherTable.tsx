'use client';

import { VoucherDto } from '@data-access/index';

interface VoucherTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchTerm: string;
  onRowClick: (voucher: VoucherDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: string | undefined;
  nextCursor: string | undefined;
  onPrevious: () => void;
  onNext: () => void;
}

export default function VoucherTable({
  isLoading,
  tableData,
  headers,
  searchTerm,
  onRowClick,
  pageSize,
  onPageSizeChange,
  prevCursor,
  nextCursor,
  onPrevious,
  onNext
}: VoucherTableProps) {
  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '-';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 text-base">
            Loading vouchers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-blue-600 border-b border-blue-700">
                <tr>
                  {headers.map((header) => (
                    <th key={header.key} className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.length > 0 ? (
                  tableData.map((voucher) => (
                    <tr
                      key={voucher.voucherId}
                      onClick={() => onRowClick(voucher)}
                      className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {voucher.voucherNo || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {voucher.voucherDate || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {voucher.accountName || '-'}
                      </td>
                      <td className="px-6 py-5">
                        {voucher.status}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formatAmount(voucher.totalAmount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? `No vouchers found matching "${searchTerm}"` : 'No vouchers found'}
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
            tableData.map((voucher) => (
              <button
                key={voucher.voucherId}
                type="button"
                onClick={() => onRowClick(voucher)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {voucher.voucherNo || '-'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{voucher.accountName || 'No account'}</p>
                  </div>
                  <div>{voucher.status}</div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Date</dt>
                    <dd className="text-right text-gray-900">{voucher.voucherDate || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Amount</dt>
                    <dd className="text-right text-gray-900">{formatAmount(voucher.totalAmount)}</dd>
                  </div>
                </dl>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {searchTerm ? `No vouchers found matching "${searchTerm}"` : 'No vouchers found'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="sm:hidden rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
          Loading vouchers...
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-auto"
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
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!nextCursor}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
              !nextCursor
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
