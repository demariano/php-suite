'use client';

import { extractErrorMessage, PaymentApi, PaymentDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PaymentForm from './components/PaymentForm';

interface EditPaymentPageProps {
  params: {
    id: string;
  };
}

export default function EditPaymentPage({ params }: EditPaymentPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch payment details on component mount
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const payment = await PaymentApi.getPaymentById(params.id, userRole);
        setSelectedPayment(payment);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((payment.status === StatusEnum.FOR_APPROVAL || payment.status === StatusEnum.NEW_RECORD || payment.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching payment:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load payment details. Please try again.');
        setFlashNotification({
          title: 'Error',
          message: errorMessage,
          alertType: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchPayment();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (payment: PaymentDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing payment
      const updatedPayment = await PaymentApi.updatePayment(params.id, {
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
        paymentInvoiceDetails: payment.paymentInvoiceDetails
      }, userRole);
      
      setSelectedPayment(updatedPayment);
      setFlashNotification({
        title: 'Success!',
        message: 'Payment updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to payment list after a short delay
      setTimeout(() => {
        router.push('/invoicing/payment');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating payment:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update payment. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await PaymentApi.deletePayment(selectedPayment, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Payment deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to payment list after a short delay
      setTimeout(() => {
        router.push('/invoicing/payment');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting payment:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete payment. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedPayment = await PaymentApi.approvePayment(selectedPayment.paymentId, userRole);
      setSelectedPayment(approvedPayment);
      setFlashNotification({
        title: 'Success!',
        message: 'Payment approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to payment list after a short delay
      setTimeout(() => {
        router.push('/invoicing/payment');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving payment:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve payment. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = async () => {
    if (!selectedPayment) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedPayment = await PaymentApi.denyPayment(selectedPayment.paymentId, userRole);
      setSelectedPayment(deniedPayment);
      setFlashNotification({
        title: 'Success!',
        message: 'Payment changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to payment list after a short delay
      setTimeout(() => {
        router.push('/invoicing/payment');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying payment:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny payment. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/invoicing/payment');
  };

  if (!selectedPayment && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Payment not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoicing
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing/payment" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Payment
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedPayment && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading payment details...</div>
        </div>
      )}

      {/* Payment Form */}
      {selectedPayment && (
        <PaymentForm
          isCreateMode={false}
          selectedPayment={selectedPayment}
          successMessage={null}
          isAdminUser={isAdminUser}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={handleSave}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
