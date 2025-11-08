'use client';

import { useState, useMemo } from 'react';
import { Button, Input } from '@components-web';
import { Add, Search, More, ChevronLeft, ChevronRight, ArrowDown, CheckboxOn, CheckboxOff } from '@components-web';

// Sales Order Data Type
interface SalesOrder {
  id: string;
  orderNumber: string;
  companyName: string;
  status: 'FULFILLED' | 'CONFIRMED' | 'PARTIALLY SHIPPED';
  total: number;
  created: Date;
  lastUpdated: Date;
}

// Dummy data - 25 sales orders
const generateDummyData = (): SalesOrder[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const orders: SalesOrder[] = [
    { id: '1', orderNumber: 'SO-00001', companyName: 'Acme Corporation', status: 'FULFILLED', total: 3456.78, created: new Date('2024-01-15'), lastUpdated: new Date('2024-01-20') },
    { id: '2', orderNumber: 'SO-00002', companyName: 'Tech Solutions Inc', status: 'CONFIRMED', total: 8923.45, created: new Date('2024-02-10'), lastUpdated: today },
    { id: '3', orderNumber: 'SO-00003', companyName: 'Gaspar Antunes', status: 'FULFILLED', total: 2674.56, created: new Date('2019-05-10'), lastUpdated: yesterday },
    { id: '4', orderNumber: 'SO-00004', companyName: 'Trienke van Aartsen', status: 'CONFIRMED', total: 1478.48, created: new Date('2019-05-12'), lastUpdated: new Date('2019-06-12') },
    { id: '5', orderNumber: 'SO-00005', companyName: 'Global Industries', status: 'PARTIALLY SHIPPED', total: 5234.12, created: new Date('2024-03-05'), lastUpdated: today },
    { id: '6', orderNumber: 'SO-00006', companyName: 'Digital Dynamics', status: 'FULFILLED', total: 1890.33, created: new Date('2024-01-22'), lastUpdated: new Date('2024-01-25') },
    { id: '7', orderNumber: 'SO-00007', companyName: 'Enterprise Systems', status: 'CONFIRMED', total: 7654.89, created: new Date('2024-02-18'), lastUpdated: yesterday },
    { id: '8', orderNumber: 'SO-00008', companyName: 'Innovation Labs', status: 'PARTIALLY SHIPPED', total: 4321.67, created: new Date('2024-03-01'), lastUpdated: today },
    { id: '9', orderNumber: 'SO-00009', companyName: 'Mega Corp', status: 'FULFILLED', total: 9876.54, created: new Date('2024-01-08'), lastUpdated: new Date('2024-01-12') },
    { id: '10', orderNumber: 'SO-00010', companyName: 'Startup Ventures', status: 'CONFIRMED', total: 2345.78, created: new Date('2024-02-25'), lastUpdated: yesterday },
    { id: '11', orderNumber: 'SO-00011', companyName: 'Cloud Services Ltd', status: 'FULFILLED', total: 6789.01, created: new Date('2024-01-30'), lastUpdated: new Date('2024-02-05') },
    { id: '12', orderNumber: 'SO-00012', companyName: 'Data Analytics Co', status: 'PARTIALLY SHIPPED', total: 3456.12, created: new Date('2024-03-10'), lastUpdated: today },
    { id: '13', orderNumber: 'SO-00013', companyName: 'Software Solutions', status: 'CONFIRMED', total: 5678.90, created: new Date('2024-02-15'), lastUpdated: yesterday },
    { id: '14', orderNumber: 'SO-00014', companyName: 'Network Systems', status: 'FULFILLED', total: 1234.56, created: new Date('2024-01-18'), lastUpdated: new Date('2024-01-22') },
    { id: '15', orderNumber: 'SO-00015', companyName: 'Mobile Apps Inc', status: 'CONFIRMED', total: 8901.23, created: new Date('2024-02-28'), lastUpdated: today },
    { id: '16', orderNumber: 'SO-00016', companyName: 'Web Development Co', status: 'PARTIALLY SHIPPED', total: 4567.89, created: new Date('2024-03-08'), lastUpdated: yesterday },
    { id: '17', orderNumber: 'SO-00017', companyName: 'IT Consulting Group', status: 'FULFILLED', total: 7890.12, created: new Date('2024-01-25'), lastUpdated: new Date('2024-01-30') },
    { id: '18', orderNumber: 'SO-00018', companyName: 'Security Systems', status: 'CONFIRMED', total: 2345.67, created: new Date('2024-02-20'), lastUpdated: today },
    { id: '19', orderNumber: 'SO-00019', companyName: 'AI Technologies', status: 'FULFILLED', total: 6789.45, created: new Date('2024-01-12'), lastUpdated: new Date('2024-01-18') },
    { id: '20', orderNumber: 'SO-00020', companyName: 'Blockchain Solutions', status: 'PARTIALLY SHIPPED', total: 3456.78, created: new Date('2024-03-12'), lastUpdated: yesterday },
    { id: '21', orderNumber: 'SO-00021', companyName: 'E-commerce Platform', status: 'CONFIRMED', total: 5678.90, created: new Date('2024-02-22'), lastUpdated: today },
    { id: '22', orderNumber: 'SO-00022', companyName: 'Marketing Agency', status: 'FULFILLED', total: 1234.56, created: new Date('2024-01-20'), lastUpdated: new Date('2024-01-25') },
    { id: '23', orderNumber: 'SO-00023', companyName: 'Design Studio', status: 'CONFIRMED', total: 8901.23, created: new Date('2024-03-01'), lastUpdated: yesterday },
    { id: '24', orderNumber: 'SO-00024', companyName: 'Content Creators', status: 'PARTIALLY SHIPPED', total: 4567.89, created: new Date('2024-03-15'), lastUpdated: today },
    { id: '25', orderNumber: 'SO-00025', companyName: 'Media Production', status: 'FULFILLED', total: 7890.12, created: new Date('2024-01-28'), lastUpdated: new Date('2024-02-02') },
  ];
  
  return orders;
};

// Format date helper
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format relative date helper
const formatRelativeDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  
  if (dateToCheck.getTime() === today.getTime()) {
    return 'Today';
  } else if (dateToCheck.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return formatDate(date);
  }
};

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' $';
};

export default function UILayoutTestingPage() {
  const [orders] = useState<SalesOrder[]>(generateDummyData());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const [sortColumn, setSortColumn] = useState<'orderNumber' | 'companyName' | 'status' | 'total' | 'created' | 'lastUpdated'>('orderNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const searchText = filterText.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(searchText) ||
        order.companyName.toLowerCase().includes(searchText) ||
        order.status.toLowerCase().includes(searchText)
      );
    });

    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortColumn) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'companyName':
          aValue = a.companyName;
          bValue = b.companyName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'created':
          aValue = a.created.getTime();
          bValue = b.created.getTime();
          break;
        case 'lastUpdated':
          aValue = a.lastUpdated.getTime();
          bValue = b.lastUpdated.getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [orders, filterText, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(order => order.id)));
    }
  };

  // Handle individual row selection
  const handleRowSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Handle sort
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: SalesOrder['status'] }) => {
    const statusConfig = {
      FULFILLED: { text: 'text-green-600', dot: 'bg-green-500' },
      CONFIRMED: { text: 'text-blue-600', dot: 'bg-blue-500' },
      'PARTIALLY SHIPPED': { text: 'text-red-600', dot: 'bg-red-500' },
    };

    const config = statusConfig[status];

    return (
      <span className={`inline-flex items-center gap-1.5 ${config.text} text-sm font-semibold`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
        {status}
      </span>
    );
  };

  // Check if all current page items are selected
  const allSelected = paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrders.has(order.id));
  const someSelected = paginatedOrders.some(order => selectedOrders.has(order.id)) && !allSelected;

  return (
    <div className="p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="flex-1">
            <Input
              placeholder="Filter sales orders"
              value={filterText}
              onChange={(val) => {
                setFilterText(val as string);
                setCurrentPage(1);
              }}
              leftIcon={Search}
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <More size={20} color="#6B7280" />
          </button>
        </div>
        <Button
          label="New sales order"
          leftIcon={Add}
          variant="primary"
          onClick={() => console.log('New sales order clicked')}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full border-collapse">
          <thead className="bg-blue-600 border-b border-blue-700">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center justify-center w-5 h-5 transition-opacity hover:opacity-70"
                >
                  {allSelected ? (
                    <CheckboxOn size={20} color="#FFFFFF" />
                  ) : someSelected ? (
                    <div className="w-5 h-5 border-2 border-white bg-white rounded flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">-</span>
                    </div>
                  ) : (
                    <CheckboxOff size={20} color="#FFFFFF" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('orderNumber')}
                  className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider hover:text-blue-100 transition-colors duration-200"
                >
                  Order #
                  {sortColumn === 'orderNumber' && (
                    <ArrowDown 
                      size={16} 
                      color="#FFFFFF"
                      className={sortDirection === 'asc' ? 'transform rotate-180 transition-transform' : 'transition-transform'}
                    />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                Company name
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-white font-semibold text-xs uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider">
                Last updated
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider w-12">
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order, index) => {
              const isSelected = selectedOrders.has(order.id);
              return (
                <tr
                  key={order.id}
                  className={`transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600 hover:bg-blue-100' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-5">
                    <button
                      onClick={() => handleRowSelect(order.id)}
                      className="flex items-center justify-center w-5 h-5 transition-opacity hover:opacity-70"
                    >
                      {isSelected ? (
                        <CheckboxOn size={20} color="#2563EB" />
                      ) : (
                        <CheckboxOff size={20} color="#6B7280" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-900">
                    #{order.orderNumber}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-900">
                    {order.companyName}
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {formatDate(order.created)}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {formatRelativeDate(order.lastUpdated)}
                  </td>
                  <td className="px-6 py-5">
                    <button className="p-1.5 hover:bg-gray-200 rounded-md transition-colors duration-200">
                      <More size={18} color="#6B7280" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
        <div className="text-sm font-medium text-gray-600">
          Showing <span className="text-gray-900 font-semibold">{startIndex + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(endIndex, filteredAndSortedOrders.length)}</span> of <span className="text-gray-900 font-semibold">{filteredAndSortedOrders.length}</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              currentPage === 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first page, last page, current page, and pages around current
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                );
              })
              .map((page, index, array) => {
                // Add ellipsis if there's a gap
                const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-500 font-medium">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
