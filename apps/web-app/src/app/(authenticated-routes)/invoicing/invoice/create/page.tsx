'use client';

import { InvoiceApi, InvoiceDto, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import InvoiceForm from '../[id]/edit/components/InvoiceForm';

export default function CreateInvoicePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (invoice: InvoiceDto) => {
    try {
      setIsLoading(true);
      setError(null);
      
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
        changeReason: invoice.changeReason
      }, userRole);
      
      setSuccessMessage('Invoice created successfully!');
      
      // Navigate back to invoice list after a short delay
      setTimeout(() => {
        router.push('/invoicing/invoice');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="bg-transparent border-none text-green-600 cursor-pointer text-lg font-bold hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

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
          <a href="/invoicing/invoice" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Invoice
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Invoice Form */}
      <InvoiceForm
        isCreateMode={true}
        selectedInvoice={null}
        successMessage={successMessage}
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
