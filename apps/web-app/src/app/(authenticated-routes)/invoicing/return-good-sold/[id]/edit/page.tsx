'use client';

import { extractErrorMessage, InvoiceApi, ReturnGoodSoldApi, ReturnGoodSoldDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReturnGoodSoldForm from './components/ReturnGoodSoldForm';

interface EditReturnGoodSoldPageProps {
  params: {
    id: string;
  };
}

export default function EditReturnGoodSoldPage({ params }: EditReturnGoodSoldPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReturnGoodSoldDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch return good sold record details on component mount
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setIsLoading(true);
        
        const record = await ReturnGoodSoldApi.getReturnGoodSoldById(params.id);
        
        // Fetch invoice details to populate product price type for adding stock items
        if (record.invoiceId) {
          try {
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            const invoice = await InvoiceApi.getInvoiceById(record.invoiceId, userRole);
            
            // Update the record with invoice product price type data
            const enrichedRecord = {
              ...record,
              productPriceTypeId: invoice.productPriceTypeId,
              productPriceTypeName: invoice.productPriceTypeName
            };
            
            setSelectedRecord(enrichedRecord);
          } catch (invoiceError) {
            console.error('Error fetching invoice details:', invoiceError);
            // Don't fail the whole load if invoice fetch fails
            // User can still view the return-good-sold record
            setSelectedRecord(record);
          }
        } else {
          setSelectedRecord(record);
        }
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((record.status === StatusEnum.FOR_APPROVAL || record.status === StatusEnum.NEW_RECORD || record.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching return good sold record:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load return good sold details. Please try again.');
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
      fetchRecord();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (record: ReturnGoodSoldDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing return good sold record
      const updatedRecord = await ReturnGoodSoldApi.updateReturnGoodSold(params.id, {
        invoiceId: record.invoiceId,
        customerId: record.customerId,
        customerName: record.customerName,
        docno: record.docno,
        dateReturned: record.dateReturned,
        originalInvoiceDetails: record.originalInvoiceDetails,
        modifiedInvoiceDetails: record.modifiedInvoiceDetails,
        status: record.status,
        activityLogs: record.activityLogs,
        forApprovalVersion: record.forApprovalVersion,
        changeReason: record.changeReason
      }, userRole);
      
      setSelectedRecord(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Return good sold record updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to return good sold list after a short delay
      setTimeout(() => {
        router.push('/invoicing/return-good-sold');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating return good sold:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update return good sold record. Please try again.');
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
    if (!selectedRecord) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ReturnGoodSoldApi.deleteReturnGoodSold(selectedRecord, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Return good sold record deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to return good sold list after a short delay
      setTimeout(() => {
        router.push('/invoicing/return-good-sold');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting return good sold:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete return good sold record. Please try again.');
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
    if (!selectedRecord) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedRecord = await ReturnGoodSoldApi.approveReturnGoodSold(selectedRecord.returnGoodSoldId, userRole);
      setSelectedRecord(approvedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Return good sold record approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to return good sold list after a short delay
      setTimeout(() => {
        router.push('/invoicing/return-good-sold');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving return good sold:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve return good sold record. Please try again.');
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
    if (!selectedRecord) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedRecord = await ReturnGoodSoldApi.denyReturnGoodSold(selectedRecord.returnGoodSoldId, userRole);
      setSelectedRecord(deniedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Return good sold changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to return good sold list after a short delay
      setTimeout(() => {
        router.push('/invoicing/return-good-sold');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying return good sold:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny return good sold record. Please try again.');
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

  if (!selectedRecord && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Return good sold record not found</span>
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
          <a href="/invoicing/return-good-sold" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Return Good Sold
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedRecord && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading return good sold details...</div>
        </div>
      )}

      {/* Return Good Sold Form */}
      {selectedRecord && (
        <ReturnGoodSoldForm
          isCreateMode={false}
          selectedRecord={selectedRecord}
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

