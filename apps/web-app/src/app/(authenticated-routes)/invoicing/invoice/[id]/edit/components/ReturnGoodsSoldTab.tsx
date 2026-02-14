'use client';

import { InvoiceDetailsDto, InvoiceDto, ReturnGoodSoldApi, ReturnGoodSoldDto } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ReturnGoodsSoldTabProps {
    formData: InvoiceDto;
}

export default function ReturnGoodsSoldTab({ formData }: ReturnGoodsSoldTabProps) {
    const [rgsRecords, setRgsRecords] = useState<ReturnGoodSoldDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const computeFinalAmount = (details: InvoiceDetailsDto[]): number => {
        const invoiceAmount = details.reduce((sum: number, d: InvoiceDetailsDto) => sum + (d.amount || 0), 0);
        const effectiveTaxRate = formData.taxable ? (formData.taxRate || 0) / 100 : 0;
        return invoiceAmount + invoiceAmount * effectiveTaxRate;
    };

    useEffect(() => {
        const fetchRgsRecords = async () => {
            if (!formData.invoiceId) return;

            try {
                setIsLoading(true);
                const response = await ReturnGoodSoldApi.getReturnGoodSoldsByInvoiceId(formData.invoiceId, 100);
                if (response && response.statusCode === 200 && response.data) {
                    setRgsRecords(response.data);
                } else if (Array.isArray(response)) {
                    // Handle interceptor stripping the wrapper
                    setRgsRecords(response as unknown as ReturnGoodSoldDto[]);
                } else {
                    setRgsRecords([]);
                }
            } catch (error) {
                console.error('Error fetching return goods sold records:', error);
                setRgsRecords([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRgsRecords();
    }, [formData.invoiceId]);

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        Active
                    </span>
                );
            case 'FOR_APPROVAL':
            case 'NEW_RECORD':
                return (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                        {status === 'FOR_APPROVAL' ? 'For Approval' : 'New Record'}
                    </span>
                );
            case 'FOR_DELETION':
                return (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                        For Deletion
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                        {status || '-'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-blue-900">Return Goods Sold History</h3>
                <p className="mt-1 text-sm text-blue-700">
                    View all return goods sold records applied to this invoice. Total RGS Records: {rgsRecords.length}
                </p>
            </div>

            {/* RGS Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <span className="ml-3 text-sm text-gray-500">Loading return goods sold records...</span>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    #
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    RGS Doc No
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Date Returned
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Original Items
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Modified Items
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Original Amount
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                                >
                                    Modified Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {rgsRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
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
                                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                                />
                                            </svg>
                                            <p className="text-lg font-semibold text-gray-500">
                                                No return goods sold recorded
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Return goods sold records will appear here when they reference this
                                                invoice
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rgsRecords.map((rgs: ReturnGoodSoldDto, index: number) => {
                                    const originalItems = rgs.originalInvoiceDetails?.length || 0;
                                    const modifiedItems = rgs.modifiedInvoiceDetails?.length || 0;
                                    const originalAmount = computeFinalAmount(rgs.originalInvoiceDetails || []);
                                    const modifiedAmount = computeFinalAmount(rgs.modifiedInvoiceDetails || []);

                                    return (
                                        <tr
                                            key={rgs.returnGoodSoldId}
                                            className="cursor-pointer transition-colors hover:bg-blue-50"
                                            onClick={() =>
                                                router.push(`/invoicing/return-good-sold/${rgs.returnGoodSoldId}/edit`)
                                            }
                                        >
                                            <td className="whitespace-nowrap px-4 py-4">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4">
                                                <span className="font-medium text-gray-900">{rgs.rgsDocno || '-'}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {rgs.dateReturned
                                                        ? new Date(rgs.dateReturned).toLocaleDateString('en-US', {
                                                              year: 'numeric',
                                                              month: 'short',
                                                              day: 'numeric',
                                                          })
                                                        : '-'}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-center">
                                                {getStatusBadge(rgs.status)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right">
                                                <span className="font-medium text-gray-900">{originalItems}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right">
                                                <span className="font-medium text-gray-900">{modifiedItems}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right">
                                                <span className="text-sm font-medium text-gray-900">
                                                    ₱{originalAmount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-right">
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                                                    ₱{modifiedAmount.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Summary Footer */}
            {rgsRecords.length > 0 &&
                (() => {
                    const totalOriginalAmount = rgsRecords.reduce(
                        (sum, rgs) => sum + computeFinalAmount(rgs.originalInvoiceDetails || []),
                        0
                    );
                    const totalModifiedAmount = rgsRecords.reduce(
                        (sum, rgs) => sum + computeFinalAmount(rgs.modifiedInvoiceDetails || []),
                        0
                    );
                    const difference = totalOriginalAmount - totalModifiedAmount;

                    return (
                        <div className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-green-50 p-4">
                            <div className="flex items-center gap-3">
                                <svg
                                    className="h-8 w-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                    />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-green-900">Total Returns Summary</p>
                                    <p className="text-xs text-green-700">{rgsRecords.length} return(s) recorded</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-900">Amount Difference</p>
                                <p className="text-2xl font-bold text-green-700">₱{difference.toFixed(2)}</p>
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}
