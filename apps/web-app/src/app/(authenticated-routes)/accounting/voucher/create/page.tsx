'use client';

import { extractErrorMessage, useEnv, useLocalStore, useSessionStore, VoucherApi, VoucherDto } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import VoucherForm from '../[id]/edit/components/VoucherForm';

export default function CreateVoucherPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (voucher: VoucherDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new voucher
      const newVoucher = await VoucherApi.createVoucher({
        voucherNo: voucher.voucherNo,
        voucherDate: voucher.voucherDate,
        voucherAmount: voucher.voucherAmount,
        remarks: voucher.remarks,
        voucherDetails: voucher.voucherDetails,
        paymentType: voucher.paymentType,
        bankName: voucher.bankName,
        chequeNo: voucher.chequeNo,
        chequeDate: voucher.chequeDate,
        totalAmount: voucher.totalAmount,
        accountId: voucher.accountId,
        accountName: voucher.accountName,
        accountType: voucher.accountType,
        customerId: voucher.customerId,
        customerName: voucher.customerName,
        areaId: voucher.areaId,
        areaName: voucher.areaName,
        status: voucher.status,
        changeReason: voucher.changeReason
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Voucher created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to voucher list after a short delay
      setTimeout(() => {
        router.push('/accounting/voucher');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating voucher:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create voucher. Please try again.');
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
    router.push('/accounting/voucher');
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
          <a href="/accounting" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Accounting
          </a>
          <span className="text-gray-400">/</span>
          <a href="/accounting/voucher" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Voucher
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Voucher Form */}
      <VoucherForm
        isCreateMode={true}
        selectedVoucher={null}
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
