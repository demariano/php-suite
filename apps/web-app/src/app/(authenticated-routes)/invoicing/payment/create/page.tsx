'use client';

import { extractErrorMessage, PaymentApi, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { PaymentDto } from '@dto';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PaymentForm from '../[id]/edit/components/PaymentForm';

export default function CreatePaymentPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const handleSave = async (payment: PaymentDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Create new payment
            const newPayment = await PaymentApi.createPayment(
                {
                    paymentDate: payment.paymentDate,
                    paymentAmount: payment.paymentAmount,
                    customerId: payment.customerId,
                    customerName: payment.customerName,
                    receiptNo: payment.receiptNo,
                    activityLogs: payment.activityLogs,
                    forApprovalVersion: payment.forApprovalVersion,
                    contractPayment: payment.contractPayment,
                    status: payment.status,
                    contractId: payment.contractId,
                    contractName: payment.contractName,
                    contractNo: payment.contractNo,
                    changeReason: payment.changeReason,
                    chequeClearStatus: payment.chequeClearStatus,
                    paymentDetails: payment.paymentDetails,
                    paymentInvoiceDetails: payment.paymentInvoiceDetails,
                } as any,
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Payment created successfully!',
                alertType: 'success',
            });

            // Navigate immediately - notification will persist
            router.push('/invoicing/payment');
        } catch (error) {
            console.error('Error creating payment:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to create payment. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/invoicing/payment');
    };

    const handleDelete = () => {
        // Not applicable for create mode
    };

    const handleApprove = () => {
        // Not applicable for create mode
    };

    const handleDeny = () => {
        // Not applicable for create mode
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Invoicing
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing/payment"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Payment
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            {/* Payment Form */}
            <div className="flex justify-center">
                <PaymentForm
                    isCreateMode={true}
                    selectedPayment={null}
                    successMessage={null}
                    isAdminUser={isAdminUser}
                    isLoading={isLoading}
                    activeTab="details"
                    onTabChange={() => {}} // Not used in create mode
                    onSave={handleSave as any}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
