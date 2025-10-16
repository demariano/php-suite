'use client';

import { InvoiceApi, InvoiceDto, StatusEnum, useEnv, useLocalStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import InvoiceForm from './components/InvoiceForm';

interface EditInvoicePageProps {
  params: {
    id: string;
  };
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch invoice details on component mount
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const invoice = await InvoiceApi.getInvoiceById(params.id, userRole);
        setSelectedInvoice(invoice);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((invoice.status === StatusEnum.FOR_APPROVAL || invoice.status === StatusEnum.NEW_RECORD || invoice.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchInvoice();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (invoice: InvoiceDto) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing invoice
      const updatedInvoice = await InvoiceApi.updateInvoice(params.id, {
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
      
      setSelectedInvoice(updatedInvoice);
      setSuccessMessage('Invoice updated successfully!');
      
      // Navigate back to invoice list after a short delay
      setTimeout(() => {
        router.push('/invoicing/invoice');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError('Failed to update invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await InvoiceApi.deleteInvoice(selectedInvoice, userRole);
      
      setSuccessMessage('Invoice deleted successfully!');
      
      // Navigate back to invoice list after a short delay
      setTimeout(() => {
        router.push('/invoicing/invoice');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Failed to delete invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedInvoice) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedInvoice = await InvoiceApi.approveInvoice(selectedInvoice.invoiceId, userRole);
      setSelectedInvoice(approvedInvoice);
      setSuccessMessage('Invoice approved successfully!');
      
      // Navigate back to invoice list after a short delay
      setTimeout(() => {
        router.push('/invoicing/invoice');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving invoice:', err);
      setError('Failed to approve invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = async () => {
    if (!selectedInvoice) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedInvoice = await InvoiceApi.denyInvoice(selectedInvoice.invoiceId, userRole);
      setSelectedInvoice(deniedInvoice);
      setSuccessMessage('Invoice changes denied successfully!');
      
      // Navigate back to invoice list after a short delay
      setTimeout(() => {
        router.push('/invoicing/invoice');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying invoice:', err);
      setError('Failed to deny invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/invoicing/invoice');
  };

  if (!selectedInvoice && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Invoice not found</span>
        </div>
      </div>
    );
  }

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
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedInvoice && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading invoice details...</div>
        </div>
      )}

      {/* Invoice Form */}
      {selectedInvoice && (
        <InvoiceForm
          isCreateMode={false}
          selectedInvoice={selectedInvoice}
          successMessage={successMessage}
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
