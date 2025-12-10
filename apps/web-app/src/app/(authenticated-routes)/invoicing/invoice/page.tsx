'use client';

import { InvoiceApi, InvoiceDto, PaymentStatusEnum, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { InvoiceHeader, InvoiceTable } from './components';

export default function InvoicePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch invoices from API
  const fetchInvoices = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      // const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // Use custom page size if provided, otherwise use state page size
      const currentPageSize = customPageSize ?? pageSize;
      
      // If search query exists, use search API, otherwise use regular pagination API
      if (searchQuery && searchQuery.trim() !== '') {
        response = await InvoiceApi.getInvoicesByDocno(
          searchQuery.trim(),
          currentPageSize,
          direction,
          serializedCursor
        );
      } else {
        response = await InvoiceApi.getInvoices(
          currentPageSize, 
          direction,
          serializedCursor
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of invoices
        if (Array.isArray(response.data)) {
          setInvoices(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setInvoices([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setInvoices([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      // Note: currentCursor tracking removed as it's not used in this implementation
    } catch {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchInvoices();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search query changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search query
    if (searchQuery === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const headers = [
    { key: 'docno', label: 'DOC NO' },
    { key: 'invoiceDate', label: 'INVOICE DATE' },
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'status', label: 'STATUS' },
    { key: 'paymentStatus', label: 'PAID STATUS' },
    { key: 'latestActivity', label: 'LATEST ACTIVITY' }
  ];

  // Helper function to get status text
  const getStatusText = (status: StatusEnum): string => {
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'Active';
      case StatusEnum.FOR_APPROVAL:
        return 'For Approval';
      case StatusEnum.FOR_DELETION:
        return 'For Deletion';
      case StatusEnum.NEW_RECORD:
        return 'New Record';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {getStatusText(status)}
      </span>
    );
  };


  const getPaymentStatusBadge = (status: PaymentStatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === PaymentStatusEnum.PENDING) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === PaymentStatusEnum.PARTIAL) {
      colorClasses = "!bg-orange-100 !text-orange-800";
    } else if (status === PaymentStatusEnum.PAID) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === PaymentStatusEnum.PENDING ? '#fef3c7' : status === PaymentStatusEnum.PARTIAL ? '#fed7aa' : status === PaymentStatusEnum.PAID ? '#dcfce7' : '#f3f4f6', color: status === PaymentStatusEnum.PENDING ? '#92400e' : status === PaymentStatusEnum.PARTIAL ? '#c2410c' : status === PaymentStatusEnum.PAID ? '#166534' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  const handleRowClick = async (invoice: InvoiceDto) => {
    // Navigate to edit invoice page
    window.location.href = `/invoicing/invoice/${invoice.invoiceId}/edit`;
  };

  const handleCreateClick = () => {
    // Navigate to create invoice page
    window.location.href = '/invoicing/invoice/create';
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchInvoices(undefined, undefined, newPageSize);
  };

  // Transform data for table display
  const tableData = invoices?.map(invoice => {
    // Get the latest activity log entry
    let latestActivity = null;
    if (invoice.activityLogs && invoice.activityLogs.length > 0) {
      const lastLog = invoice.activityLogs[invoice.activityLogs.length - 1];
      const parsed = parseActivityLog(lastLog);
      const activityStyle = getActivityStyle(parsed.activity);
      latestActivity = {
        text: parsed.activity,
        style: activityStyle
      };
    }

    return {
      ...invoice,
      status: getStatusBadge(invoice.status || StatusEnum.ACTIVE),
      paymentStatus: getPaymentStatusBadge(invoice.paymentStatus || PaymentStatusEnum.PENDING),
      latestActivity
    };
  }) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoicing
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Invoice</span>
        </nav>
      </div>

      {/* Header */}
      <div>
        <InvoiceHeader
          searchQuery={searchQuery}
          onSearchChange={(value: string) => {
            setSearchQuery(value);
            // Reset pagination when search query changes
            setNextCursor(undefined);
            setPrevCursor(undefined);
          }}
          onRefresh={() => {
            setSearchQuery('');
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchInvoices();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div>
        <InvoiceTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchQuery={searchQuery}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchInvoices('prev', prevCursor)}
          onNext={() => fetchInvoices('next', nextCursor)}
        />
      </div>
    </div>
  );
}
