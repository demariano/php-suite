'use client';

import { Add, Input, Search } from '@components-web';
import {
    RawMaterialSupplierApi,
    RawMaterialSupplierDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore
} from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useEffect, useRef, useState } from 'react';

export default function RawMaterialSuppliersPage() {
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

  const [items, setItems] = useState<RawMaterialSupplierDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

  const hasFetchedRef = useRef(false);

  const fetchRecords = async (direction?: 'next' | 'prev', cursor?: string, customSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const size = customSize ?? pageSize;
      const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

      let response;
      if (searchQuery.trim()) {
        response = await RawMaterialSupplierApi.searchRawMaterialSuppliersByName(
          searchQuery.trim(),
          size,
          direction,
          serializedCursor,
          userRole
        );
      } else {
        response = await RawMaterialSupplierApi.getRawMaterialSuppliers(size, direction, serializedCursor, userRole);
      }

      if (response && response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
        setNextCursor(response.nextCursorPointer || undefined);
        setPrevCursor(response.prevCursorPointer || undefined);
      } else {
        setItems([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }

      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err: any) {
      console.error('Failed to load raw material suppliers:', err);
      setError('Failed to load raw material suppliers. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: err?.message || 'Failed to load raw material suppliers.',
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchRecords();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  useEffect(() => {
    if (searchQuery === '') return;
    const timeout = setTimeout(() => fetchRecords(), 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const headers = [
    { key: 'name', label: 'NAME' },
    { key: 'status', label: 'STATUS' },
    { key: 'latestActivity', label: 'LATEST ACTIVITY' },
  ];

  const statusBadge = (status?: StatusEnum) => {
    const effectiveStatus = status || StatusEnum.ACTIVE;
    const colorMap: Record<StatusEnum, string> = {
      [StatusEnum.ACTIVE]: 'bg-green-600 text-white',
      [StatusEnum.FOR_APPROVAL]: 'bg-yellow-500 text-white',
      [StatusEnum.FOR_DELETION]: 'bg-red-600 text-white',
      [StatusEnum.NEW_RECORD]: 'bg-blue-600 text-white',
      [StatusEnum.DRAFT]: 'bg-gray-600 text-white',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${colorMap[effectiveStatus]}`}>
        {effectiveStatus.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    );
  };

  const tableData = items.map((item) => {
    const latestLog = item.activityLogs?.[item.activityLogs.length - 1];
    const parsed = latestLog ? parseActivityLog(latestLog) : null;
    const activityStyle = parsed ? getActivityStyle(parsed.activity) : undefined;

    return {
      supplierId: item.rawMaterialSupplierId,
      supplierName: item.rawMaterialSupplierName,
      status: statusBadge(item.status),
      latestActivity: parsed && activityStyle
        ? { text: parsed.activity, style: activityStyle }
        : null,
    };
  });

  const handleRowClick = (record: { supplierId?: string }) => {
    if (!record?.supplierId) return;
    window.location.href = `/inventory/raw-material-suppliers/${record.supplierId}/edit`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3 sm:flex-1 sm:max-w-md">
          <div className="flex-1">
            <Input
              placeholder="Filter raw material suppliers"
              value={searchQuery}
              onChange={(val) => setSearchQuery(val as string)}
              leftIcon={Search}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCurrentCursor(undefined);
              setNextCursor(undefined);
              setPrevCursor(undefined);
              fetchRecords();
            }}
            disabled={isLoading}
            aria-disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white p-2 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          type="button"
          onClick={() => (window.location.href = '/inventory/raw-material-suppliers/create')}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
          <Add size={18} />
          New raw material supplier
        </button>
      </div>

      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-10 text-center text-base text-gray-500">Loading raw material suppliers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-blue-700 bg-blue-600">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tableData.length > 0 ? (
                  tableData.map((supplier) => (
                    <tr
                      key={supplier.supplierId}
                      onClick={() => handleRowClick(supplier)}
                      className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {supplier.supplierName || '-'}
                      </td>
                      <td className="px-6 py-5">{supplier.status}</td>
                      <td className="px-6 py-5 text-sm">
                        {supplier.latestActivity ? (
                          <span
                            className={`px-2 py-1 rounded ${supplier.latestActivity.style.bgColor} ${supplier.latestActivity.style.textColor}`}
                            title={supplier.latestActivity.text}
                          >
                            {supplier.latestActivity.text.length > 50
                              ? `${supplier.latestActivity.text.substring(0, 50)}...`
                              : supplier.latestActivity.text}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? `No suppliers found matching "${searchQuery}"` : 'No suppliers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="space-y-4 sm:hidden">
          {tableData.length > 0 ? (
            tableData.map((supplier) => (
              <button
                key={supplier.supplierId}
                type="button"
                onClick={() => handleRowClick(supplier)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{supplier.supplierName || '-'}</h3>
                  </div>
                  <div>{supplier.status}</div>
                </div>
                {supplier.latestActivity && (
                  <div className="mt-2">
                    <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                    <dd>
                      <span
                        className={`px-2 py-1 rounded text-xs ${supplier.latestActivity.style.bgColor} ${supplier.latestActivity.style.textColor}`}
                      >
                        {supplier.latestActivity.text.length > 60
                          ? `${supplier.latestActivity.text.substring(0, 60)}...`
                          : supplier.latestActivity.text}
                      </span>
                    </dd>
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {searchQuery ? `No suppliers found matching "${searchQuery}"` : 'No suppliers found'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:hidden">
          Loading raw material suppliers...
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setNextCursor(undefined);
              setPrevCursor(undefined);
              setCurrentCursor(undefined);
              fetchRecords(undefined, undefined, newSize);
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={() => fetchRecords('prev', prevCursor)}
            disabled={!prevCursor}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
              !prevCursor
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => fetchRecords('next', nextCursor)}
            disabled={!nextCursor}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 sm:w-auto ${
              !nextCursor
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
