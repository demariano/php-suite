'use client';

import { ProductDealApi, ProductDealDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { ProductDealHeader, ProductDealTable } from './components';

export default function ProductDealPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productDeals, setProductDeals] = useState<ProductDealDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  // Track if initial fetch has been made to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Fetch product deals from API
  const fetchProductDeals = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
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
        response = await ProductDealApi.getProductDealsByName(
          searchQuery.trim(),
          currentPageSize,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await ProductDealApi.getProductDeals(
          currentPageSize, 
          undefined, // No status filter - show all records
          direction,
          serializedCursor, 
          userRole
        );
      }
      
      if (response && response.statusCode === 200 && response.data) {
        // The response.data contains the array of product deals
        if (Array.isArray(response.data)) {
          setProductDeals(response.data);
          
          // Set pagination cursors from response
          setNextCursor(response.nextCursorPointer || undefined);
          setPrevCursor(response.prevCursorPointer || undefined);
        } else {
          setProductDeals([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setProductDeals([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch {
      setError('Failed to load product deals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on initial load and when these dependencies change
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchProductDeals();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  // Debounce search query changes (but not on initial mount with empty search)
  useEffect(() => {
    // Only debounce if there's actually a search query
    if (searchQuery === '') {
      return; // Skip - initial load is handled by the other useEffect
    }

    const delayDebounceFn = setTimeout(() => {
      fetchProductDeals();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const headers = [
    { key: 'productDealName', label: 'NAME' },
    { key: 'minQty', label: 'MIN QTY' },
    { key: 'additionalQty', label: 'ADDITIONAL QTY' },
    { key: 'status', label: 'STATUS' },
    { key: 'latestActivity', label: 'LATEST ACTIVITY' }
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

  const handleRowClick = async (productDeal: ProductDealDto) => {
    // Navigate to edit product deal page
    window.location.href = `/products/product-deal/${productDeal.productDealId}/edit`;
  };

  const handleCreateClick = () => {
    // Navigate to create product deal page
    window.location.href = '/products/product-deal/create';
  };

  // Handle page size change - reset pagination and fetch fresh data
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setCurrentCursor(undefined);
    // Fetch with new page size and no cursor (like initial load)
    fetchProductDeals(undefined, undefined, newPageSize);
  };

  // Transform data for table display
  const tableData = productDeals?.map(productDeal => {
    // Get the latest activity log entry
    let latestActivity = null;
    if (productDeal.activityLogs && productDeal.activityLogs.length > 0) {
      const lastLog = productDeal.activityLogs[productDeal.activityLogs.length - 1];
      const parsed = parseActivityLog(lastLog);
      const activityStyle = getActivityStyle(parsed.activity);
      latestActivity = {
        text: parsed.activity,
        style: activityStyle
      };
    }

    return {
      ...productDeal,
      minQty: productDeal.minQty ?? '-',
      additionalQty: productDeal.additionalQty ?? '-',
      status: getStatusBadge(productDeal.status || StatusEnum.ACTIVE),
      latestActivity
    };
  }) || [];

  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
  const canCreate = isAdminUser;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Product Deal</span>
        </nav>
      </div>

      <ProductDealHeader
        searchQuery={searchQuery}
        onSearchChange={(value: string) => {
          setSearchQuery(value);
          setCurrentCursor(undefined);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }}
        onRefresh={() => {
          setSearchQuery('');
          setCurrentCursor(undefined);
          setNextCursor(undefined);
          setPrevCursor(undefined);
          fetchProductDeals();
        }}
        onCreateClick={handleCreateClick}
        isLoading={isLoading}
        canCreate={canCreate}
      />

      <ProductDealTable
        isLoading={isLoading}
        tableData={tableData}
        headers={headers}
        searchQuery={searchQuery}
        onRowClick={handleRowClick}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        prevCursor={prevCursor}
        nextCursor={nextCursor}
        onPrevious={() => fetchProductDeals('prev', prevCursor)}
        onNext={() => fetchProductDeals('next', nextCursor)}
      />
    </div>
  );
}

