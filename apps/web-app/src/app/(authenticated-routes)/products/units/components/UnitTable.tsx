'use client';

import { ProductUnitDto } from '@data-access/index';

interface UnitTableProps {
  isLoading: boolean;
  tableData: any[];
  headers: { key: string; label: string }[];
  searchTerm: string;
  onRowClick: (unit: ProductUnitDto, index?: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  prevCursor: any;
  nextCursor: any;
  onPrevious: () => void;
  onNext: () => void;
}

export default function UnitTable({
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
}: UnitTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {isLoading ? (
        <div className="p-10 text-center text-gray-500 text-base">
          Loading units...
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ backgroundColor: 'white' }}>
          <table className="w-full border-collapse min-w-full" style={{ backgroundColor: 'white' }}>
            <thead className="bg-white border-b border-gray-200">
              <tr>
                {headers.map((header, index) => (
                  <th key={header.key} className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'white' }}>
              {tableData.length > 0 ? tableData.map((unit, index) => (
                <tr 
                  key={unit.productUnitId}
                  onClick={() => onRowClick(unit, index)}
                  className="cursor-pointer border-b border-row-separator transition-colors duration-200 hover:bg-gray-50"
                  style={{ borderBottomWidth: '1px', backgroundColor: 'white' }}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900" style={{ backgroundColor: 'white' }}>
                    {unit.productUnitName}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4" style={{ backgroundColor: 'white' }}>
                    {unit.status}
                  </td>
                </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? `No units found matching "${searchTerm}"` : 'No units found'}
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Custom Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-200 bg-gray-50">
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
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            style={{
              padding: '8px 16px',
              backgroundColor: prevCursor ? 'white' : 'transparent',
              color: prevCursor ? '#374151' : '#9ca3af',
              border: prevCursor ? '1px solid #d1d5db' : '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: prevCursor ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: prevCursor ? 1 : 0.5,
              boxShadow: prevCursor ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none'
            }}
            disabled={!prevCursor}
            onClick={onPrevious}
            onMouseEnter={(e) => {
              if (prevCursor) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (prevCursor) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <button 
            style={{
              padding: '8px 16px',
              backgroundColor: nextCursor ? 'white' : 'transparent',
              color: nextCursor ? '#374151' : '#9ca3af',
              border: nextCursor ? '1px solid #d1d5db' : '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: nextCursor ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: nextCursor ? 1 : 0.5,
              boxShadow: nextCursor ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none'
            }}
            disabled={!nextCursor}
            onClick={onNext}
            onMouseEnter={(e) => {
              if (nextCursor) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (nextCursor) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
          </button>
        </div>
      </div>
    </div>
  );
}
