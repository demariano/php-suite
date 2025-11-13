'use client';

import { PaymentDto } from '@data-access/index';

interface PaymentTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchQuery: string;
  onRowClick: (payment: PaymentDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: string | undefined;
  nextCursor: string | undefined;
  onPrevious: () => void;
  onNext: () => void;
}

export default function PaymentTable({
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
}: PaymentTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-base text-gray-500">
            Loading payments...
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
                  tableData.map((payment) => (
                    <tr
                      key={payment.paymentId}
                      onClick={() => onRowClick(payment)}
                      className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {payment.receiptNo || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {payment.paymentDate || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {payment.customerName || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {payment.paymentAmount || '-'}
                      </td>
                      <td className="px-6 py-5">{payment.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? `No payments found matching "${searchQuery}"` : 'No payments found'}
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
            tableData.map((payment) => (
              <button
                key={payment.paymentId}
                type="button"
                onClick={() => onRowClick(payment)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {payment.receiptNo || '-'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{payment.customerName || 'No customer'}</p>
                  </div>
                  <div>{payment.status}</div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Payment Date</dt>
                    <dd className="text-right text-gray-900">{payment.paymentDate || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-medium text-gray-500">Amount</dt>
                    <dd className="text-right text-gray-900">{payment.paymentAmount || '-'}</dd>
                  </div>
                </dl>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {searchQuery ? `No payments found matching "${searchQuery}"` : 'No payments found'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
          Loading payments...
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
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
