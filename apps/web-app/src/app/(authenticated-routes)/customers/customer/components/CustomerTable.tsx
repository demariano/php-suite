'use client';

import { CustomerDto } from '@data-access/index';

interface CustomerTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchTerm: string;
  onRowClick: (customer: CustomerDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: any;
  nextCursor: any;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CustomerTable({
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
}: CustomerTableProps) {
  const formatBalance = (balance: number) => {
    if (balance === undefined || balance === null) return '-';
    return `$${balance.toFixed(2)}`;
  };

  return (
    <>
      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 text-base">
            Loading customers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-blue-600 border-b border-blue-700">
                <tr>
                  {headers.map((header, index) => (
                    <th key={header.key} className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.length > 0 ? tableData.map((customer, index) => (
                  <tr 
                    key={customer.customerId}
                    onClick={() => onRowClick(customer)}
                    className="cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50"
                  >
                    <td className="px-6 py-5 text-sm font-medium text-gray-900">
                      {customer.customerName || '-'}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {customer.email || '-'}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {customer.contactNo || '-'}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {customer.customerTypeName || '-'}
                    </td>
                    <td className="px-6 py-5">
                      {customer.status}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm mt-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={!prevCursor}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
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
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
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
