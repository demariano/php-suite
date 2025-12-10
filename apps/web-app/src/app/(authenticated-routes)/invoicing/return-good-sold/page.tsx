'use client';

import { ReturnGoodSoldApi, ReturnGoodSoldDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { ReturnGoodSoldHeader, ReturnGoodSoldTable } from './components';
import { parseActivityLog, getActivityStyle } from '@web-app/utils/activityLogUtils';

export default function ReturnGoodSoldPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<ReturnGoodSoldDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch return good sold records from API
  const fetchRecords = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // Use custom page size if provided, otherwise use state page size
      const currentPageSize = customPageSize ?? pageSize;
      
      // If search query exists, use search API, otherwise use regular pagination API
      if (searchQuery && searchQuery.trim() !== '') {
        response = await ReturnGoodSoldApi.getReturnGoodSoldsByDocno(
          searchQuery.trim(),
          currentPageSize,
          direction,
          serializedCursor
        );
      } else {
        response = await ReturnGoodSoldApi.getReturnGoodSolds(
          currentPageSize, 
          direction,
          serializedCursor
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of records
        if (Array.isArray(response.data)) {
          setRecords(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setRecords([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setRecords([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
    } catch {
      setError('Failed to load return good sold records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchRecords();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search query changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search query
    if (searchQuery === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchRecords();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const headers = [
    { key: 'rgsDocno', label: 'RGS DOC NO' },
    { key: 'dateReturned', label: 'DATE RETURNED' },
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'invoiceDocno', label: 'INVOICE DOC NO' },
    { key: 'status', label: 'STATUS' },
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

  const handleRowClick = async (record: ReturnGoodSoldDto) => {
    // Navigate to edit return good sold page
    window.location.href = `/invoicing/return-good-sold/${record.returnGoodSoldId}/edit`;
  };

  const handleCreateClick = () => {
    // Navigate to create return good sold page
    window.location.href = '/invoicing/return-good-sold/create';
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchRecords(undefined, undefined, newPageSize);
  };

  // Transform data for table display
  const tableData = records?.map(record => {
    // Get the latest activity log entry
    let latestActivity = null;
    if (record.activityLogs && record.activityLogs.length > 0) {
      const lastLog = record.activityLogs[record.activityLogs.length - 1];
      const parsed = parseActivityLog(lastLog);
      const activityStyle = getActivityStyle(parsed.activity);
      latestActivity = {
        text: parsed.activity,
        style: activityStyle
      };
    }

    return {
      ...record,
      status: getStatusBadge(record.status || StatusEnum.ACTIVE),
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
          <span className="text-gray-800 text-sm font-medium">Return Good Sold</span>
        </nav>
      </div>

      {/* Header */}
      <div>
        <ReturnGoodSoldHeader
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
            fetchRecords();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div>
        <ReturnGoodSoldTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchQuery={searchQuery}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchRecords('prev', prevCursor)}
          onNext={() => fetchRecords('next', nextCursor)}
        />
      </div>
    </div>
  );
}

