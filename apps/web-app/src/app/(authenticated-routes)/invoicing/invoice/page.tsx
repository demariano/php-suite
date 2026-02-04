'use client';

import { StatusBadge } from '@components-web';
import { InvoiceApi, InvoiceDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { formatCurrency, formatDate } from '@web-app/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InvoiceHeader, InvoiceTable } from './components';

const DEFAULT_PAGE_SIZE = 10;

export default function InvoicesMainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<any>();
    const [prevCursor, setPrevCursor] = useState<any>();
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const hasFetchedRef = useRef(false);

    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const router = useRouter();

    const fetchInvoices = async (direction?: 'next' | 'prev', cursor?: any, customPageSize?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const currentPageSize = customPageSize ?? pageSize;
            const serializedCursor = cursor && typeof cursor === 'object' ? JSON.stringify(cursor) : cursor;

            // CRITICAL: Backend validation requires BOTH direction and cursor together or BOTH undefined
            const paginationDirection = direction && serializedCursor ? direction : undefined;
            const paginationCursor = direction && serializedCursor ? serializedCursor : undefined;

            const trimmedQuery = searchQuery.trim();
            let response;

            // Always use getInvoicesByStatus for filtering, optionally with docno search
            if (statusFilter !== 'ALL') {
                response = await InvoiceApi.getInvoicesByStatus(
                    currentPageSize,
                    statusFilter,
                    paginationDirection,
                    paginationCursor,
                    trimmedQuery.length > 0 ? trimmedQuery : undefined // Include docno if searching
                );
            } else if (trimmedQuery.length > 0) {
                // Search by docno only (no status filter)
                response = await InvoiceApi.getInvoicesByDocno(
                    trimmedQuery,
                    currentPageSize,
                    paginationDirection,
                    paginationCursor
                );
            } else {
                // No filter, no search - get all
                response = await InvoiceApi.getInvoices(currentPageSize, paginationDirection, paginationCursor);
            }

            if (response?.statusCode === 200 && Array.isArray(response.data)) {
                setInvoices(response.data);
                setNextCursor(response.nextCursorPointer ?? undefined);
                setPrevCursor(response.prevCursorPointer ?? undefined);
            } else {
                setInvoices([]);
                setNextCursor(undefined);
                setPrevCursor(undefined);
            }
        } catch {
            setError('Failed to load invoices. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }

        hasFetchedRef.current = true;
        fetchInvoices();
    }, [env.BYPASS_AUTH, authedUser?.userRole]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length === 0) {
            fetchInvoices();
            return;
        }

        // Reset pagination when search query changes
        setNextCursor(undefined);
        setPrevCursor(undefined);

        const timer = setTimeout(() => {
            fetchInvoices(undefined, undefined); // Reset direction and cursor for new search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when status filter changes
    useEffect(() => {
        if (!hasFetchedRef.current) return;
        setSearchQuery(''); // Clear search when filter changes
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchInvoices(undefined, undefined);
    }, [statusFilter]);

    const headers = useMemo(
        () => [
            { key: 'invoiceNumber', label: 'INVOICE #' },
            { key: 'customerName', label: 'CUSTOMER' },
            { key: 'totalAmount', label: 'TOTAL AMOUNT' },
            { key: 'status', label: 'STATUS' },
            { key: 'invoiceDate', label: 'INVOICE DATE' },
            { key: 'dueDate', label: 'DUE DATE' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            invoices.map((invoice) => {
                return {
                    ...invoice,
                    invoiceNumber: invoice.docno || '-',
                    totalAmount: invoice.finalAmount ? formatCurrency(invoice.finalAmount) : '-',
                    invoiceDate: invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-',
                    dueDate: invoice.termsName || '-', // Using terms as due date placeholder
                    status: <StatusBadge status={invoice.status ?? StatusEnum.ACTIVE} />,
                };
            }),
        [invoices]
    );

    const handleCreateClick = () => {
        router.push('/invoicing/invoice/create');
    };

    const handleRowClick = (invoice: InvoiceDto) => {
        router.push(`/invoicing/invoice/${invoice.invoiceId}/edit`);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setNextCursor(undefined);
        setPrevCursor(undefined);
        fetchInvoices(undefined, undefined, size);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Home
                    </a>
                    <span>/</span>
                    <a href="/invoicing" className="text-blue-600 hover:text-blue-700">
                        Invoicing
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Invoices</span>
                </nav>
            </div>

            <InvoiceHeader
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                }}
                onStatusFilterChange={(value) => {
                    setStatusFilter(value);
                }}
                onRefresh={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNextCursor(undefined);
                    setPrevCursor(undefined);
                    fetchInvoices();
                }}
                onCreateClick={handleCreateClick}
                isLoading={isLoading}
                canCreate={true}
                isAdminUser={authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN'}
            />

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
    );
}
