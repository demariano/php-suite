'use client';

import { InvoiceApi, InvoiceDto, PaymentApi, PaymentDto } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CustomerFinancialsTabProps {
    customerId: string;
}

export default function CustomerFinancialsTab({ customerId }: CustomerFinancialsTabProps) {
    const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
    const [payments, setPayments] = useState<PaymentDto[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!customerId) return;

        const fetchInvoices = async () => {
            try {
                setIsLoadingInvoices(true);
                const response = await InvoiceApi.getInvoicesByCustomerId(customerId, 10);
                setInvoices(response?.data || []);
            } catch (error) {
                console.error('Error fetching customer invoices:', error);
                setInvoices([]);
            } finally {
                setIsLoadingInvoices(false);
            }
        };

        const fetchPayments = async () => {
            try {
                setIsLoadingPayments(true);
                const response = await PaymentApi.getPaymentsByCustomerId(customerId, 10);
                setPayments(response?.data || []);
            } catch (error) {
                console.error('Error fetching customer payments:', error);
                setPayments([]);
            } finally {
                setIsLoadingPayments(false);
            }
        };

        fetchInvoices();
        fetchPayments();
    }, [customerId]);

    const getPaymentStatusBadge = (paymentStatus?: string) => {
        switch (paymentStatus) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        Paid
                    </span>
                );
            case 'PARTIAL':
                return (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                        Partial
                    </span>
                );
            case 'OVERPAID':
                return (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                        Overpaid
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                        Unpaid
                    </span>
                );
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        Active
                    </span>
                );
            case 'FOR_APPROVAL':
                return (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                        For Approval
                    </span>
                );
            case 'NEW_RECORD':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        New Record
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                        {status || 'Unknown'}
                    </span>
                );
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const renderSpinner = (label: string) => (
        <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-sm text-gray-500">Loading {label}...</span>
        </div>
    );

    const renderEmptyState = (icon: React.ReactNode, title: string, subtitle: string) => (
        <tr>
            <td colSpan={6} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                    {icon}
                    <p className="text-lg font-semibold text-gray-500">{title}</p>
                    <p className="text-sm text-gray-400">{subtitle}</p>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-8">
            {/* Recent Invoices Section */}
            <div className="space-y-4">
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-lg font-semibold text-blue-900">Recent Invoices</h3>
                    <p className="mt-1 text-sm text-blue-700">The 10 most recent invoices for this customer</p>
                </div>

                <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                    {isLoadingInvoices ? (
                        renderSpinner('invoices')
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                                        Doc No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                                        Invoice Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">
                                        Final Amount
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                        Payment
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {invoices.length === 0
                                    ? renderEmptyState(
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
                                          </svg>,
                                          'No invoices found',
                                          'Invoices for this customer will appear here'
                                      )
                                    : invoices.map((invoice, index) => (
                                          <tr
                                              key={invoice.invoiceId}
                                              onClick={() =>
                                                  router.push(`/invoicing/invoice/${invoice.invoiceId}/edit`)
                                              }
                                              className="cursor-pointer transition-colors hover:bg-blue-50"
                                          >
                                              <td className="whitespace-nowrap px-4 py-3">
                                                  <div className="flex items-center gap-2">
                                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                          {index + 1}
                                                      </span>
                                                      <span className="font-medium text-gray-900">
                                                          {invoice.docno || '-'}
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                                                  {formatDate(invoice.invoiceDate)}
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                                  <span className="font-semibold text-gray-900">
                                                      ₱{(invoice.finalAmount || 0).toFixed(2)}
                                                  </span>
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                                  {getPaymentStatusBadge(invoice.paymentStatus)}
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                                  {getStatusBadge(invoice.status)}
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Invoice Summary */}
                {invoices.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-3">
                            <svg
                                className="h-8 w-8 text-blue-600"
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
                            <div>
                                <p className="text-sm font-medium text-blue-900">
                                    Showing {invoices.length} Invoice(s)
                                </p>
                                <p className="text-xs text-blue-700">Click a row to view invoice details</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-blue-900">Total Amount</p>
                            <p className="text-2xl font-bold text-blue-700">
                                ₱{invoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Payments Section */}
            <div className="space-y-4">
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-lg font-semibold text-blue-900">Recent Payments</h3>
                    <p className="mt-1 text-sm text-blue-700">The 10 most recent payments from this customer</p>
                </div>

                <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                    {isLoadingPayments ? (
                        renderSpinner('payments')
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                                        Receipt No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                                        Payment Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">
                                        Payment Amount
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {payments.length === 0
                                    ? renderEmptyState(
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
                                                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                              />
                                          </svg>,
                                          'No payments found',
                                          'Payments from this customer will appear here'
                                      )
                                    : payments.map((payment, index) => (
                                          <tr
                                              key={payment.paymentId}
                                              onClick={() =>
                                                  router.push(`/invoicing/payment/${payment.paymentId}/edit`)
                                              }
                                              className="cursor-pointer transition-colors hover:bg-blue-50"
                                          >
                                              <td className="whitespace-nowrap px-4 py-3">
                                                  <div className="flex items-center gap-2">
                                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                          {index + 1}
                                                      </span>
                                                      <span className="font-medium text-gray-900">
                                                          {payment.receiptNo || '-'}
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                                                  {formatDate(payment.paymentDate)}
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                                                      ₱{(payment.paymentAmount || 0).toFixed(2)}
                                                  </span>
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                                  {payment.contractPayment ? (
                                                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                                                          Contract
                                                      </span>
                                                  ) : (
                                                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                                                          Non-Contract
                                                      </span>
                                                  )}
                                              </td>
                                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                                  {getStatusBadge(payment.status)}
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Payment Summary */}
                {payments.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-3">
                            <svg
                                className="h-8 w-8 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-blue-900">
                                    Showing {payments.length} Payment(s)
                                </p>
                                <p className="text-xs text-blue-700">Click a row to view payment details</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-blue-900">Total Payments</p>
                            <p className="text-2xl font-bold text-blue-700">
                                ₱{payments.reduce((sum, pmt) => sum + (pmt.paymentAmount || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
