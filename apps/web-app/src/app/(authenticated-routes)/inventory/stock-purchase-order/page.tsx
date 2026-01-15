'use client';

import { StockPurchaseOrderApi } from '@data-access/api/stock-purchase-order.api';
import { StatusEnum, StockPurchaseOrderDto, StockPurchaseOrderStatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';
import { StockPurchaseOrderHeader, StockPurchaseOrderTable } from './components';

export default function StockPurchaseOrderPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<StockPurchaseOrderDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(10);

  const hasFetchedRef = useRef(false);

  const fetchPurchaseOrders = async (direction?: 'next' | 'prev', cursor?: string, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const serializedCursor = cursor && typeof cursor === 'object' 
        ? JSON.stringify(cursor) 
        : cursor;
      
      let response;
      const currentPageSize = customPageSize ?? pageSize;
      
      response = await StockPurchaseOrderApi.getStockPurchaseOrders({
        limit: currentPageSize
      });
      
      if (response?.data) {
        const responseData = response.data;
        if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          const pageData = responseData as { data: StockPurchaseOrderDto[]; nextCursorPointer?: string; prevCursorPointer?: string };
          setPurchaseOrders(pageData.data || []);
          setNextCursor(pageData.nextCursorPointer || undefined);
          setPrevCursor(pageData.prevCursorPointer || undefined);
        } else if (Array.isArray(responseData)) {
          setPurchaseOrders(responseData);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        } else {
          setPurchaseOrders([]);
          setNextCursor(undefined);
          setPrevCursor(undefined);
        }
      } else {
        setPurchaseOrders([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }
      
      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch {
      setError('Failed to load stock purchase orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchPurchaseOrders();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  useEffect(() => {
    if (searchQuery === '') {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchPurchaseOrders();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const headers = [
    { key: 'docNo', label: 'DOC NO' },
    { key: 'poDate', label: 'PO DATE' },
    { key: 'stockSupplierName', label: 'SUPPLIER' },
    { key: 'status', label: 'APPROVAL STATUS' },
    { key: 'poStatus', label: 'PO STATUS' },
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

  const getPoStatusText = (poStatus: StockPurchaseOrderStatusEnum): string => {
    switch (poStatus) {
      case StockPurchaseOrderStatusEnum.SYSTEM_GENERATED:
        return 'System Generated';
      case StockPurchaseOrderStatusEnum.PENDING:
        return 'Pending';
      case StockPurchaseOrderStatusEnum.PARTIAL:
        return 'Partial';
      case StockPurchaseOrderStatusEnum.COMPLETED:
        return 'Completed';
      default:
        return poStatus;
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
      <span 
        className={`${baseClasses} ${colorClasses}`} 
        style={{ 
          backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', 
          color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' 
        }}
      >
        {getStatusText(status)}
      </span>
    );
  };

  const getPoStatusBadge = (poStatus: StockPurchaseOrderStatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    let bgColor = "";
    let textColor = "";
    
    if (poStatus === StockPurchaseOrderStatusEnum.SYSTEM_GENERATED) {
      colorClasses = "!bg-purple-100 !text-purple-800";
      bgColor = "#f3e8ff";
      textColor = "#6b21a8";
    } else if (poStatus === StockPurchaseOrderStatusEnum.PENDING) {
      colorClasses = "!bg-gray-100 !text-gray-800";
      bgColor = "#f3f4f6";
      textColor = "#1f2937";
    } else if (poStatus === StockPurchaseOrderStatusEnum.PARTIAL) {
      colorClasses = "!bg-blue-100 !text-blue-800";
      bgColor = "#dbeafe";
      textColor = "#1e40af";
    } else if (poStatus === StockPurchaseOrderStatusEnum.COMPLETED) {
      colorClasses = "!bg-green-100 !text-green-800";
      bgColor = "#dcfce7";
      textColor = "#166534";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
      bgColor = "#f3f4f6";
      textColor = "#6b7280";
    }
    
    return (
      <span 
        className={`${baseClasses} ${colorClasses}`} 
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {getPoStatusText(poStatus)}
      </span>
    );
  };

  const handleRowClick = async (purchaseOrder: StockPurchaseOrderDto) => {
    window.location.href = `/inventory/stock-purchase-order/${purchaseOrder.stockPurchaseOrderId}/edit`;
  };

  const handleCreateClick = () => {
    window.location.href = '/inventory/stock-purchase-order/create';
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    fetchPurchaseOrders(undefined, undefined, newPageSize);
  };

  const tableData = purchaseOrders?.map(purchaseOrder => {
    let latestActivity = null;
    if (purchaseOrder.activityLogs && purchaseOrder.activityLogs.length > 0) {
      const lastLog = purchaseOrder.activityLogs[purchaseOrder.activityLogs.length - 1];
      const parsed = parseActivityLog(lastLog);
      const activityStyle = getActivityStyle(parsed.activity);
      latestActivity = {
        text: parsed.activity,
        style: activityStyle
      };
    }

    return {
      ...purchaseOrder,
      status: getStatusBadge(purchaseOrder.status || StatusEnum.ACTIVE),
      poStatus: getPoStatusBadge(purchaseOrder.poStatus || StockPurchaseOrderStatusEnum.PENDING),
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
          <a href="/inventory" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Inventory
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Stock Purchase Order</span>
        </nav>
      </div>

      {/* Header */}
      <div>
        <StockPurchaseOrderHeader
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
            fetchPurchaseOrders();
          }}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Table */}
      <div>
        <StockPurchaseOrderTable
          isLoading={isLoading}
          tableData={tableData}
          headers={headers}
          searchQuery={searchQuery}
          onRowClick={handleRowClick}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          prevCursor={prevCursor}
          nextCursor={nextCursor}
          onPrevious={() => fetchPurchaseOrders('prev', prevCursor)}
          onNext={() => fetchPurchaseOrders('next', nextCursor)}
        />
      </div>
    </div>
  );
}
