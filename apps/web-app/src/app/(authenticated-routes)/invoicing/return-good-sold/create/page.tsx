'use client';

import { extractErrorMessage, ReturnGoodSoldApi, ReturnGoodSoldDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ReturnGoodSoldForm from '../[id]/edit/components/ReturnGoodSoldForm';

export default function CreateReturnGoodSoldPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (record: ReturnGoodSoldDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new return good sold record
      const newRecord = await ReturnGoodSoldApi.createReturnGoodSold({
        invoiceId: record.invoiceId,
        customerId: record.customerId,
        customerName: record.customerName,
        invoiceDocno: record.invoiceDocno,
        rgsDocno: record.rgsDocno,
        dateReturned: record.dateReturned,
        originalInvoiceDetails: record.originalInvoiceDetails,
        modifiedInvoiceDetails: record.modifiedInvoiceDetails,
        status: record.status,
        activityLogs: record.activityLogs,
        forApprovalVersion: record.forApprovalVersion,
        changeReason: record.changeReason
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Return good sold record created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to return good sold list after a short delay
      setTimeout(() => {
        router.push('/invoicing/return-good-sold');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating return good sold:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create return good sold record. Please try again.');
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
    router.push('/invoicing/return-good-sold');
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
          <a href="/invoicing/return-good-sold" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Return Good Sold
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Return Good Sold Form */}
      <ReturnGoodSoldForm
        isCreateMode={true}
        selectedRecord={null}
        successMessage={null}
        isAdminUser={isAdminUser}
        isLoading={isLoading}
        activeTab="details"
        onTabChange={() => {}} // Not used in create mode
        onSave={handleSave}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onCancel={handleCancel}
      />
    </div>
  );
}

