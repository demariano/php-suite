'use client';

import { extractErrorMessage, ProductApi, ProductUnitRawMaterialDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import ProductUnitRawMaterialForm from './components/ProductUnitRawMaterialForm';

interface EditProductUnitRawMaterialPageProps {
  params: {
    id: string;
  };
}

export default function EditProductUnitRawMaterialPage({ params }: EditProductUnitRawMaterialPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductUnitRawMaterialDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch record details on component mount
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const record = await ProductApi.getProductUnitRawMaterialById(params.id, userRole);
        setSelectedRecord(record);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((record.status === StatusEnum.FOR_APPROVAL || record.status === StatusEnum.NEW_RECORD || record.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching record:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load record details. Please try again.');
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

  const handleSave = async (record: ProductUnitRawMaterialDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing record
      const updatedRecord = await ProductApi.updateProductUnitRawMaterial(record.productUnitRawMaterialId, {
        productUnitRawMaterialId: record.productUnitRawMaterialId,
        productId: record.productId,
        productName: record.productName,
        rawMaterialsPerUnit: record.rawMaterialsPerUnit,
        status: record.status,
        changeReason: record.changeReason
      }, userRole);
      
      setSelectedRecord(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Product unit raw material updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to list after a short delay
      setTimeout(() => {
        router.push('/products/product-unit-raw-material');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating record:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update record. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
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
      
      await ProductApi.deleteProductUnitRawMaterial(selectedRecord, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product unit raw material deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to list after a short delay
      setTimeout(() => {
        router.push('/products/product-unit-raw-material');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting record:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete record. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductUnitRawMaterial(selectedRecord.productUnitRawMaterialId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product unit raw material approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to list after a short delay
      setTimeout(() => {
        router.push('/products/product-unit-raw-material');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving record:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve record. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeny = () => {
    setShowDenyDialog(true);
  };

  const handleDenyConfirm = async (approverMessage: string) => {
    if (!selectedRecord) return;
    
    try {
      setIsLoading(true);
      setShowDenyDialog(false);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record with approverMessage
      await ProductApi.denyProductUnitRawMaterial(selectedRecord.productUnitRawMaterialId, approverMessage, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to list after a short delay
      setTimeout(() => {
        router.push('/products/product-unit-raw-material');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying record:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny record. Please try again.');
      setFlashNotification({
        title: 'Error',
        message: errorMessage,
        alertType: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDenyCancel = () => {
    setShowDenyDialog(false);
  };

  const handleCancel = () => {
    router.push('/products/product-unit-raw-material');
  };

  // Helper function to get status text
  const getStatusText = (status: StatusEnum): string => {
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'Active';
      case StatusEnum.FOR_APPROVAL:
        return 'For Approval';
      case StatusEnum.FOR_DELETION:
        return 'For Deletion';
      case StatusEnum.NEW_RECORD:
        return 'New Record';
      default:
        return status;
    }
  };

  // Helper function to get tab color based on status
  const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
    if (!isActive) {
      return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }
    
    switch (status) {
      case StatusEnum.ACTIVE:
        return 'bg-green-600 text-white shadow-sm';
      case StatusEnum.FOR_APPROVAL:
        return 'bg-yellow-500 text-white shadow-sm';
      case StatusEnum.FOR_DELETION:
        return 'bg-red-600 text-white shadow-sm';
      case StatusEnum.NEW_RECORD:
        return 'bg-blue-600 text-white shadow-sm';
      default:
        return 'bg-gray-500 text-white shadow-sm';
    }
  };

  if (!selectedRecord && !isLoading) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Record not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Home
          </a>
          <span>/</span>
          <a href="/products" className="text-blue-600 hover:text-blue-700">
            Products
          </a>
          <span>/</span>
          <a href="/products/product-unit-raw-material" className="text-blue-600 hover:text-blue-700">
            Product Unit Raw Material
          </a>
          <span>/</span>
          <span className="text-gray-800 font-medium">Edit</span>
        </nav>
      </div>

      {isLoading && !selectedRecord ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-600 text-sm">Loading record details...</div>
        </div>
      ) : null}

      {selectedRecord && (
        <ProductUnitRawMaterialForm
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

      <DeleteConfirmationModal
        show={showDeleteConfirm}
        record={selectedRecord}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <DenyReasonDialog
        show={showDenyDialog}
        record={selectedRecord}
        onConfirm={handleDenyConfirm}
        onCancel={handleDenyCancel}
      />
    </div>
  );
}
