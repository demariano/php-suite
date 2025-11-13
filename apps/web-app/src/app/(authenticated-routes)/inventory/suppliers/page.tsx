'use client';

import { StatusEnum, SupplierApi, SupplierDto, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { SupplierHeader, SupplierTable } from './components';

export default function SupplierPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch suppliers from API
  const fetchSuppliers = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Serialize cursor object to JSON string if it's an object
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      
      // Use custom page size if provided, otherwise use state page size
      const currentPageSize = customPageSize ?? pageSize;
      
      // If search query exists, use search API, otherwise use regular pagination API
      if (searchQuery && searchQuery.trim() !== '') {
        response = await SupplierApi.getSuppliersByName(
          searchQuery.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await SupplierApi.getSuppliers(
          currentPageSize,
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of suppliers
        if (Array.isArray(response.data)) {
          setSuppliers(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setSuppliers([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setSuppliers([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch {
      setError('Failed to load suppliers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchSuppliers();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search query changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search query
    if (searchQuery === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const headers = [
    { key: 'supplierName', label: 'NAME' },
    { key: 'status', label: 'STATUS' }
  ];

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
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "bg-green-600 text-white";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "bg-yellow-500 text-white";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "bg-red-600 text-white";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "bg-blue-600 text-white";
    } else {
      colorClasses = "bg-gray-600 text-white";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`}>
        {getStatusText(status)}
      </span>
    );
  };

  // Handle row click - navigate to edit page
  const handleRowClick = (supplier: SupplierDto) => {
    window.location.href = `/inventory/suppliers/${supplier.supplierId}/edit`;
  };

  // Handle create new supplier - navigate to create page
  const handleCreateClick = () => {
    window.location.href = '/inventory/suppliers/create';
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setCurrentCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchSuppliers(undefined, undefined, newPageSize);
  };

  // Transform data for table display
  const tableData = suppliers?.map(supplier => {
    return {
      ...supplier,
      status: getStatusBadge(supplier.status || StatusEnum.ACTIVE)
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
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Suppliers</span>
        </nav>
      </div>

      {/* Header */}
      <div>
        <SupplierHeader
          searchQuery={searchQuery}
          onSearchChange={(value: string) => {
            setSearchQuery(value);
            // Reset pagination when search query changes
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
          }}
          onRefresh={() => {
            setSearchQuery('');
            setCurrentCursor(undefined);
            setNextCursor(undefined);
            setPrevCursor(undefined);
            fetchSuppliers();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div>
        <SupplierTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchQuery={searchQuery}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchSuppliers('prev', prevCursor)}
          onNext={() => fetchSuppliers('next', nextCursor)}
        />
      </div>
    </div>
  );
}



