'use client';

import { ProductCategoryDto } from '@data-access/index';

interface CategoryTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchTerm: string;
  onRowClick: (category: ProductCategoryDto) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: any;
  nextCursor: any;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CategoryTable({
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
}: CategoryTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {isLoading ? (
        <div className="p-10 text-center text-gray-500 text-base">
          Loading categories...
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {headers.map((header, index) => (
                <th key={header.key} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? tableData.map((category, index) => (
              <tr 
                key={category.productCategoryId}
                onClick={() => onRowClick(category)}
                className="cursor-pointer border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm text-gray-900">
                  {category.productCategoryName}
                </td>
                <td className="px-6 py-4">
                  {category.status}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? `No categories found matching "${searchTerm}"` : 'No categories found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      
      {/* Custom Pagination */}
      <div className="flex justify-between items-center px-6 py-5 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm font-medium">Rows per page:</span>
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white cursor-pointer min-w-15 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className={`px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
              prevCursor 
                ? 'text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-400 hover:shadow-md' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!prevCursor}
            onClick={onPrevious}
          >
            Previous
          </button>
          <button 
            className={`px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
              nextCursor 
                ? 'text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-400 hover:shadow-md' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!nextCursor}
            onClick={onNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
