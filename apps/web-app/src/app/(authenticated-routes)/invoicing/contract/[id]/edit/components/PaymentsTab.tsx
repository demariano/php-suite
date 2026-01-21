'use client';

import { ContractDto, ContractPaymentDto } from '@data-access/index';
import { useRouter } from 'next/navigation';

interface PaymentsTabProps {
    formData: ContractDto;
}

export default function PaymentsTab({ formData }: PaymentsTabProps) {
    const router = useRouter();
    const payments = formData.payments || [];

    const handlePaymentClick = (paymentId: string) => {
        router.push(`/invoicing/payment/${paymentId}/edit`);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <h3 className="text-lg font-semibold text-blue-900">Payment History</h3>
                <p className="mt-1 text-sm text-blue-700">
                    View all payments applied to this contract. Total Amount Paid: ₱
                    {formData.totalAmountPaid?.toFixed(2) || '0.00'}
                </p>
            </div>

            {/* Payment Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Receipt No
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Payment Date
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-white"
                            >
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
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
                                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                        <p className="text-lg font-semibold text-gray-500">No payments recorded</p>
                                        <p className="text-sm text-gray-400">
                                            Payments will appear here when they are applied to this contract
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            payments.map((payment: ContractPaymentDto, index: number) => (
                                <tr
                                    key={`${payment.paymentId}-${index}`}
                                    onClick={() => handlePaymentClick(payment.paymentId)}
                                    className="cursor-pointer transition-colors hover:bg-blue-50"
                                >
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{payment.receiptNo}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                                            ₱{payment.paymentAmount.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            {payments.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-3">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-green-900">Total Payments</p>
                            <p className="text-xs text-green-700">{payments.length} payment(s) recorded</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-green-900">Total Amount Paid</p>
                        <p className="text-2xl font-bold text-green-700">
                            ₱{formData.totalAmountPaid?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
