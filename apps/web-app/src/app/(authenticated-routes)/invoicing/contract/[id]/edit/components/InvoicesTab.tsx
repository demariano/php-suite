'use client';

import { InvoiceApi, InvoiceDto, StatusEnum } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface InvoicesTabProps {
    contractId: string;
    invoicedAmount?: number;
}

export default function InvoicesTab({ contractId, invoicedAmount }: InvoicesTabProps) {
    const router = useRouter();
    const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            console.log('InvoicesTab: Fetching invoices for contractId:', contractId);
            try {
                setIsLoading(true);
                setError(null);
                const data = await InvoiceApi.getInvoicesByContractId(contractId);
                console.log('InvoicesTab: Received data:', data);
                setInvoices(data || []);
            } catch (err: any) {
                console.error('InvoicesTab: Failed to fetch invoices:', err);
                setError('Failed to load invoices');
            } finally {
                setIsLoading(false);
            }
        };

        if (contractId) {
            fetchInvoices();
        } else {
            console.log('InvoicesTab: No contractId provided');
        }
    }, [contractId]);

    const handleInvoiceClick = (invoiceId: string) => {
        router.push(`/invoicing/invoice/${invoiceId}/edit`);
    };

    const getStatusBadge = (status?: StatusEnum) => {
        const statusColors: Partial<Record<StatusEnum, string>> = {
            [StatusEnum.ACTIVE]: 'bg-green-100 text-green-800',
            [StatusEnum.DRAFT]: 'bg-gray-100 text-gray-800',
            [StatusEnum.FOR_APPROVAL]: 'bg-yellow-100 text-yellow-800',
            [StatusEnum.FOR_DELETION]: 'bg-red-100 text-red-800',
            [StatusEnum.NEW_RECORD]: 'bg-blue-100 text-blue-800',
        };

        return (
            <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusColors[status || StatusEnum.ACTIVE] || 'bg-gray-100 text-gray-800'
                }`}
            >
                {status || 'ACTIVE'}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-blue-900">Contract Invoices</h3>
                <p className="mt-1 text-sm text-blue-700">
                    View all invoices created for this contract. Total Invoiced Amount: ₱
                    {invoicedAmount?.toFixed(2) || '0.00'}
                </p>
            </div>

            {/* Invoice Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Doc No
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Invoice Date
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Final Amount
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <svg
                                            className="h-16 w-16 text-gray-300"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        <p className="text-lg font-semibold text-gray-500">No invoices created</p>
                                        <p className="text-sm text-gray-400">
                                            No invoices have been created for this contract yet
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            invoices.map((invoice: InvoiceDto, index: number) => (
                                <tr
                                    key={`${invoice.invoiceId}-${index}`}
                                    onClick={() => handleInvoiceClick(invoice.invoiceId)}
                                    className="cursor-pointer transition-colors hover:bg-blue-50"
                                >
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{invoice.docno}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {invoice.invoiceDate
                                                ? new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric',
                                                  })
                                                : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                        <span className="text-sm font-semibold text-gray-900">
                                            ₱{invoice.finalAmount?.toFixed(2) || '0.00'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            {invoices.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                        <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Total Invoices</p>
                            <p className="text-xs text-blue-700">{invoices.length} invoice(s) created</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-blue-900">Total Invoiced Amount</p>
                        <p className="text-2xl font-bold text-blue-700">₱{invoicedAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
