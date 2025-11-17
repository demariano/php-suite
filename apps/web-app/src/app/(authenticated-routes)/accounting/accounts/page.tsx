'use client';

import { AccountApi, AccountsDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useRef, useState } from 'react';
import { AccountHeader, AccountTable } from './components';

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
      return status || 'Inactive';
  }
};

const getStatusBadge = (status: StatusEnum) => {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide shadow-sm';
  const variants: Record<StatusEnum | string, string> = {
    [StatusEnum.ACTIVE]: 'bg-green-100 text-green-800 border border-green-200',
    [StatusEnum.FOR_APPROVAL]: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    [StatusEnum.FOR_DELETION]: 'bg-red-100 text-red-800 border border-red-200',
    [StatusEnum.NEW_RECORD]: 'bg-blue-100 text-blue-800 border border-blue-200',
  };

  return (
    <span className={`${baseClasses} ${variants[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      {getStatusText(status)}
    </span>
  );
};

export default function AccountsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<AccountsDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [nextCursor, setNextCursor] = useState<any>(undefined);
  const [prevCursor, setPrevCursor] = useState<any>(undefined);
  const [currentCursor, setCurrentCursor] = useState<any>(undefined);

  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const hasFetchedRef = useRef(false);

  const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
  const canCreateAccount = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const fetchAccounts = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const serializedCursor =
        cursor && typeof cursor === 'object'
          ? JSON.stringify(cursor)
          : cursor;
      const currentPageSize = customPageSize ?? pageSize;
      const trimmedQuery = searchQuery.trim();

      const response = trimmedQuery
        ? await AccountApi.getAccountsByName(trimmedQuery, currentPageSize, direction, serializedCursor, userRole)
        : await AccountApi.getAccounts(currentPageSize, direction, serializedCursor, userRole);

      if (response?.statusCode === 200 && Array.isArray(response.data)) {
        setAccounts(response.data);
        setNextCursor(response.nextCursorPointer || undefined);
        setPrevCursor(response.prevCursorPointer || undefined);
      } else {
        setAccounts([]);
        setNextCursor(undefined);
        setPrevCursor(undefined);
      }

      if (direction && cursor) {
        setCurrentCursor(cursor);
      } else {
        setCurrentCursor(undefined);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAccounts();
  }, [env.BYPASS_AUTH, authedUser?.userRole, pageSize]);

  useEffect(() => {
    if (searchQuery === '') {
      fetchAccounts();
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchAccounts();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const headers = [
    { key: 'accountName', label: 'ACCOUNT NAME' },
    { key: 'accountType', label: 'ACCOUNT TYPE' },
    { key: 'status', label: 'STATUS' },
  ];

  const handleRowClick = (account: AccountsDto) => {
    if (account?.accountingId) {
      window.location.href = `/accounting/accounts/${account.accountingId}/edit`;
    }
  };

  const handleCreateClick = () => {
    window.location.href = '/accounting/accounts/create';
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setCurrentCursor(undefined);
    fetchAccounts(undefined, undefined, newPageSize);
  };

  const tableData =
    accounts?.map((account) => ({
      ...account,
      status: getStatusBadge(account.status || StatusEnum.ACTIVE),
    })) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-lg font-bold leading-none text-red-600 transition-colors duration-200 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      <div>
        <nav className="flex items-center gap-2 text-sm">
          <a href="/dashboard" className="text-blue-500 transition-colors duration-200 hover:text-blue-600">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/accounting" className="text-blue-500 transition-colors duration-200 hover:text-blue-600">
            Accounting
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 font-medium">Accounts</span>
        </nav>
      </div>

      <AccountHeader
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
          fetchAccounts();
        }}
        onCreateClick={handleCreateClick}
        isLoading={isLoading}
        canCreate={canCreateAccount}
      />

      <AccountTable
        isLoading={isLoading}
        tableData={tableData}
        headers={headers}
        searchQuery={searchQuery}
        onRowClick={handleRowClick}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        prevCursor={prevCursor}
        nextCursor={nextCursor}
        onPrevious={() => fetchAccounts('prev', prevCursor)}
        onNext={() => fetchAccounts('next', nextCursor)}
      />
    </div>
  );
}

