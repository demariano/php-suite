'use client';

import { extractErrorMessage, InvoiceApi, InvoiceDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import InvoiceForm from '../[id]/edit/components/InvoiceForm';
import InvoiceCreatedDialog from '../components/InvoiceCreatedDialog';

export default function CreateInvoicePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceDto | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (invoice: InvoiceDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new invoice
      const newInvoice = await InvoiceApi.createInvoice({
        docno: invoice.docno,
        invoiceDate: invoice.invoiceDate,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        areaId: invoice.areaId,
        areaName: invoice.areaName,
        territoryManagerId: invoice.territoryManagerId,
        territoryManagerName: invoice.territoryManagerName,
        salesTypeId: invoice.salesTypeId,
        salesTypeName: invoice.salesTypeName,
        finalAmount: invoice.finalAmount,
        invoiceAmount: invoice.invoiceAmount,
        taxAmount: invoice.taxAmount,
        contractId: invoice.contractId,
        contractName: invoice.contractName,
        termsId: invoice.termsId,
        termsName: invoice.termsName,
        productPriceTypeId: invoice.productPriceTypeId,
        productPriceTypeName: invoice.productPriceTypeName,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        printStatus: invoice.printStatus,
        invoiceDetails: invoice.invoiceDetails,
        contractSales: invoice.contractSales,
        changeReason: invoice.changeReason
      }, userRole);
      
      // Store the created invoice and show dialog instead of redirecting immediately
      setCreatedInvoice(newInvoice);
      setShowSuccessDialog(true);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Invoice created successfully!',
        alertType: 'success'
      });
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create invoice. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = () => {
    setShowSuccessDialog(false);
    router.replace('/invoicing/invoice');
  };

  const handleCancel = () => {
    router.push('/invoicing/invoice');
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
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoicing
          </a>
          <span className="text-gray-400">/</span>
          <a href="/invoicing/invoice" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoice
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      <div className="flex justify-center">
        <InvoiceForm
          isCreateMode={true}
          selectedInvoice={null}
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

      {/* Success Dialog */}
      <InvoiceCreatedDialog
        show={showSuccessDialog}
        invoice={createdInvoice}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  );
}
