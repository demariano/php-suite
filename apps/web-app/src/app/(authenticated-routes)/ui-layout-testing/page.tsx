'use client';

import { Add, ArrowDown, Input, Search } from '@components-web';
import { useMemo, useState } from 'react';

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

// Sales Order Detail Data Type
interface SalesOrderDetail {
  id: string;
  orderNumber: string;
  companyName: string;
  customerId: string;
  customerName: string;
  status: 'FULFILLED' | 'CONFIRMED' | 'PARTIALLY SHIPPED';
  total: number;
  created: Date;
  lastUpdated: Date;
  orderDate: Date;
  expectedDeliveryDate: Date;
  shippingAddress: string;
  billingAddress: string;
  paymentTerms: string;
  salesRep: string;
  notes: string;
  forApprovalVersion?: {
    orderNumber?: string;
    companyName?: string;
    status?: string;
    total?: number;
    shippingAddress?: string;
    paymentTerms?: string;
    notes?: string;
  };
  changeReason?: string;
  activityLogs: string[];
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

// Generate dummy sales order detail data
const generateSalesOrderDetail = (): SalesOrderDetail => {
  const today = new Date();
  const orderDate = new Date('2024-02-10');
  const expectedDeliveryDate = new Date('2024-02-25');
  
  return {
    id: '1',
    orderNumber: 'SO-00002',
    companyName: 'Tech Solutions Inc',
    customerId: 'CUST-001',
    customerName: 'Tech Solutions Inc',
    status: 'CONFIRMED',
    total: 8923.45,
    created: new Date('2024-02-10'),
    lastUpdated: today,
    orderDate: orderDate,
    expectedDeliveryDate: expectedDeliveryDate,
    shippingAddress: '123 Business Park, Suite 400, San Francisco, CA 94105',
    billingAddress: '123 Business Park, Suite 400, San Francisco, CA 94105',
    paymentTerms: 'Net 30',
    salesRep: 'John Smith',
    notes: 'Rush order - customer needs delivery by end of month. Please prioritize shipping.',
    forApprovalVersion: {
      orderNumber: 'SO-00002',
      companyName: 'Tech Solutions Inc',
      status: 'PARTIALLY SHIPPED',
      total: 9500.00,
      shippingAddress: '456 Corporate Blvd, Floor 2, San Francisco, CA 94110',
      paymentTerms: 'Net 45',
      notes: 'Rush order - customer needs delivery by end of month. Please prioritize shipping. Updated shipping address per customer request.'
    },
    changeReason: 'Customer requested status update and shipping address change. Total amount increased due to additional items.',
    activityLogs: [
      '2024-02-10 09:15 AM - Order created by John Smith',
      '2024-02-10 10:30 AM - Order confirmed and sent to warehouse',
      '2024-02-11 02:45 PM - Payment received - $8,923.45',
      '2024-02-12 11:20 AM - Partial shipment prepared (Items 1-5 of 8)',
      '2024-02-12 03:15 PM - Customer requested shipping address change',
      '2024-02-13 09:00 AM - Status change requested - Awaiting approval'
    ]
  };
};

export default function UILayoutTestingPage() {
  const [orders] = useState<SalesOrder[]>(generateDummyData());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const [sortColumn, setSortColumn] = useState<'orderNumber' | 'companyName' | 'status' | 'total' | 'created' | 'lastUpdated'>('orderNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [salesOrderDetail] = useState<SalesOrderDetail>(generateSalesOrderDetail());

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    const filtered = orders.filter(order => {
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

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: SalesOrder['status'] }) => {
    const statusConfig = {
      FULFILLED: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        dot: 'bg-green-500' 
      },
      CONFIRMED: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-700', 
        dot: 'bg-blue-500' 
      },
      'PARTIALLY SHIPPED': { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        dot: 'bg-orange-500' 
      },
    };

    const config = statusConfig[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md ${config.bg} ${config.text} text-xs font-semibold`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
        {status}
      </span>
    );
  };

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
          <button
            onClick={() => {
              // Refresh logic - reset filter and reload data
              setFilterText('');
              setCurrentPage(1);
              console.log('Refresh clicked');
            }}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200 border border-gray-300 bg-white"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => console.log('New sales order clicked')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Add size={18} />
          New sales order
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full border-collapse">
          <thead className="bg-blue-600 border-b border-blue-700">
            <tr>
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order) => {
              return (
                <tr
                  key={order.id}
                  className="transition-all duration-200 bg-white hover:bg-gray-50"
                >
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
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
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
              currentPage === 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Sales Order Detail Form */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">
        {/* Tab Navigation */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b-2 border-blue-200 rounded-t-xl p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                activeTab === 'details'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50 transform scale-105'
                  : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Details
              </span>
            </button>
            
            {salesOrderDetail.forApprovalVersion && (
              <button
                onClick={() => setActiveTab('approval')}
                className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'approval'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/50 transform scale-105'
                    : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-teal-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pending Changes
                </span>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-105'
                  : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-green-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Logs
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Record Details
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={salesOrderDetail.orderNumber}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={salesOrderDetail.companyName}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-indigo-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={salesOrderDetail.customerName}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-purple-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={salesOrderDetail.status} />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Total Amount
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatCurrency(salesOrderDetail.total)}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl text-sm bg-gradient-to-br from-emerald-50 to-white text-emerald-700 font-bold shadow-md transition-all duration-200 group-hover:border-emerald-400 group-hover:shadow-lg"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Order Date
                  </label>
                  <input
                    type="text"
                    value={formatDate(salesOrderDetail.orderDate)}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                    Expected Delivery Date
                  </label>
                  <input
                    type="text"
                    value={formatDate(salesOrderDetail.expectedDeliveryDate)}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-cyan-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={salesOrderDetail.paymentTerms}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-amber-300 group-hover:shadow-md"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                    Sales Representative
                  </label>
                  <input
                    type="text"
                    value={salesOrderDetail.salesRep}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-pink-300 group-hover:shadow-md"
                  />
                </div>
              </div>
              
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                  Shipping Address
                </label>
                <textarea
                  value={salesOrderDetail.shippingAddress}
                  readOnly
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 resize-none group-hover:border-teal-300 group-hover:shadow-md"
                />
              </div>
              
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  Billing Address
                </label>
                <textarea
                  value={salesOrderDetail.billingAddress}
                  readOnly
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 resize-none group-hover:border-rose-300 group-hover:shadow-md"
                />
              </div>
              
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                  Notes
                </label>
                <textarea
                  value={salesOrderDetail.notes}
                  readOnly
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 resize-none group-hover:border-violet-300 group-hover:shadow-md"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this sales order?')) {
                      console.log('Delete sales order:', salesOrderDetail.id);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Cancel clicked');
                    }}
                    className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Save sales order:', salesOrderDetail);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Approval Version Tab */}
          {activeTab === 'approval' && salesOrderDetail.forApprovalVersion && (
            <div className="animate-fadeIn">
              <div className="mb-5">
                {/* Change Reason */}
                {salesOrderDetail.changeReason && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-400 rounded-xl p-5 mb-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-teal-900">
                        Change Reason
                      </h4>
                    </div>
                    <div className="p-4 bg-white border-2 border-teal-300 rounded-lg text-sm text-teal-900 font-medium shadow-inner">
                      {salesOrderDetail.changeReason}
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-teal-200 rounded-xl p-6 mb-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-teal-200">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      Pending Changes
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {salesOrderDetail.forApprovalVersion.status !== undefined && (
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                          Status
                        </label>
                        <input
                          type="text"
                          value={String(salesOrderDetail.forApprovalVersion.status)}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl text-sm bg-gradient-to-br from-teal-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-teal-400 group-hover:shadow-md"
                        />
                      </div>
                    )}
                    
                    {salesOrderDetail.forApprovalVersion.total !== undefined && (
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                          Total Amount
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatCurrency(salesOrderDetail.forApprovalVersion.total)}
                            readOnly
                            className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl text-sm bg-gradient-to-br from-cyan-50 to-white text-cyan-700 font-bold shadow-md transition-all duration-200 group-hover:border-cyan-400 group-hover:shadow-lg"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {salesOrderDetail.forApprovalVersion.shippingAddress !== undefined && (
                      <div className="md:col-span-2 group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                          Shipping Address
                        </label>
                        <textarea
                          value={salesOrderDetail.forApprovalVersion.shippingAddress}
                          readOnly
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-sky-200 rounded-xl text-sm bg-gradient-to-br from-sky-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 resize-none group-hover:border-sky-400 group-hover:shadow-md"
                        />
                      </div>
                    )}
                    
                    {salesOrderDetail.forApprovalVersion.paymentTerms !== undefined && (
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                          Payment Terms
                        </label>
                        <input
                          type="text"
                          value={String(salesOrderDetail.forApprovalVersion.paymentTerms)}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl text-sm bg-gradient-to-br from-teal-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 group-hover:border-teal-400 group-hover:shadow-md"
                        />
                      </div>
                    )}
                    
                    {salesOrderDetail.forApprovalVersion.notes !== undefined && (
                      <div className="md:col-span-2 group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                          Notes
                        </label>
                        <textarea
                          value={salesOrderDetail.forApprovalVersion.notes}
                          readOnly
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl text-sm bg-gradient-to-br from-cyan-50 to-white text-gray-700 font-medium shadow-sm transition-all duration-200 resize-none group-hover:border-cyan-400 group-hover:shadow-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Approval Tab */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-teal-200 to-cyan-200">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Deny changes for sales order:', salesOrderDetail.id);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Deny Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Approve changes for sales order:', salesOrderDetail.id);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Changes
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    console.log('Cancel clicked');
                  }}
                  className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Activity Logs Tab */}
          {activeTab === 'logs' && (
            <div className="animate-fadeIn">
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-green-200 to-emerald-200">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Recent Activity
                  </h3>
                </div>
                {salesOrderDetail.activityLogs && salesOrderDetail.activityLogs.length > 0 ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 max-h-96 overflow-y-auto shadow-inner">
                    {salesOrderDetail.activityLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`py-3 px-4 rounded-lg mb-2 transition-all duration-200 hover:bg-white/50 hover:shadow-sm ${
                          index < salesOrderDetail.activityLogs.length - 1 ? 'border-b border-green-200' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-full ${
                            index === 0 ? 'bg-green-500' : 
                            index === 1 ? 'bg-emerald-500' : 
                            index === 2 ? 'bg-teal-500' : 
                            'bg-gray-400'
                          }`}>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-700 font-medium flex-1">{log}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-xl border-2 border-gray-200 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 italic font-medium">
                      No activity logs available
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Logs Tab */}
              <div className="flex justify-end mt-8 pt-6 border-t-2 border-gradient-to-r from-green-200 to-emerald-200">
                <button
                  type="button"
                  onClick={() => {
                    console.log('Cancel clicked');
                  }}
                  className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
