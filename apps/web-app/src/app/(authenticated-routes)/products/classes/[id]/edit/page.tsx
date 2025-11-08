'use client';

import { extractErrorMessage, ProductApi, ProductClassDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ClassForm from './components/ClassForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditClassPageProps {
  params: {
    id: string;
  };
}

export default function EditClassPage({ params }: EditClassPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ProductClassDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch class details on component mount
  useEffect(() => {
    const fetchClass = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const productClass = await ProductApi.getProductClassById(params.id, userRole);
        setSelectedClass(productClass);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((productClass.status === StatusEnum.FOR_APPROVAL || productClass.status === StatusEnum.NEW_RECORD || productClass.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching class:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load class details. Please try again.');
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
      fetchClass();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (productClass: ProductClassDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing class
      const updatedRecord = await ProductApi.updateProductClass(productClass.productClassId, {
        productClassId: productClass.productClassId,
        productClassName: productClass.productClassName,
        status: productClass.status
      }, userRole);
      
      setSelectedClass(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Class updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to class list after a short delay
      setTimeout(() => {
        router.push('/products/classes');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating class:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update class. Please try again.');
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
    if (!selectedClass) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductClass(selectedClass, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Class deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to class list after a short delay
      setTimeout(() => {
        router.push('/products/classes');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting class:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete class. Please try again.');
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
    if (!selectedClass) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProductClass(selectedClass.productClassId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Class approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to class list after a short delay
      setTimeout(() => {
        router.push('/products/classes');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving class:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve class. Please try again.');
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
    if (!selectedClass) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProductClass(selectedClass.productClassId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Class changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to class list after a short delay
      setTimeout(() => {
        router.push('/products/classes');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying class:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny class. Please try again.');
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
    router.push('/products/classes');
  };

  if (!selectedClass && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Class not found</span>
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
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products/classes" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Classes
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedClass && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading class details...</div>
        </div>
      )}

      {/* Class Form */}
      {selectedClass && (
        <ClassForm
          isCreateMode={false}
          selectedClass={selectedClass}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteConfirm}
        productClass={selectedClass}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

