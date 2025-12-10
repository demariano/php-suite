'use client';

import { extractErrorMessage, ProductApi, ProductCategoryDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createFieldChangeDetector } from '../../../../utils/fieldChangeDetection';
import CategoryForm from '../../components/CategoryForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';

interface EditCategoryPageProps {
  params: {
    id: string;
  };
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch category details on component mount
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const category = await ProductApi.getProductCategoryById(params.id, userRole);
        setSelectedCategory(category);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((category.status === StatusEnum.FOR_APPROVAL || category.status === StatusEnum.NEW_RECORD || category.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching category:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load category details. Please try again.');
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
      fetchCategory();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (category: ProductCategoryDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing category
      const updatedCategory = await ProductApi.updateProductCategory(params.id, {
        productCategoryId: category.productCategoryId,
        productCategoryName: category.productCategoryName,
        status: category.status,
        changeReason: category.changeReason
      }, userRole);
      
      setSelectedCategory(updatedCategory);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update category. Please try again.');
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
    if (!selectedCategory) {
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) {
      return;
    }
    
    try {
      setIsLoading(true);
      setShowDeleteModal(false);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProductCategory(selectedCategory, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete category. Please try again.');
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
    if (!selectedCategory) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedCategory = await ProductApi.approveProductCategory(selectedCategory.productCategoryId, userRole);
      setSelectedCategory(approvedCategory);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving category:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve category. Please try again.');
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
    if (!selectedCategory) return;
    
    try {
      setIsLoading(true);
      setShowDenyDialog(false);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record with approverMessage
      const deniedCategory = await ProductApi.denyProductCategory(selectedCategory.productCategoryId, approverMessage, userRole);
      setSelectedCategory(deniedCategory);
      setFlashNotification({
        title: 'Success!',
        message: 'Product Category changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to category list after a short delay
      setTimeout(() => {
        router.push('/products/categories');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying category:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny category. Please try again.');
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
    router.push('/products/categories');
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

  if (!selectedCategory && !isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
          <span>Category not found</span>
        </div>
      </div>
    );
  }

  // Render approval tab content
  const renderApprovalTab = () => {
    if (!selectedCategory) return null;
    
    // If status is FOR_DELETION, show deletion message instead of approval version
    if (selectedCategory.status === StatusEnum.FOR_DELETION) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Record Marked for Deletion</h3>
                <p className="mt-1 text-sm text-red-700">This record has been marked for deletion and is awaiting approval.</p>
              </div>
            </div>
            {selectedCategory.changeReason && (
              <div className="mt-6 rounded-lg border-2 border-red-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Deletion Reason:</p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">{selectedCategory.changeReason}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isAdminUser ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isLoading ? 'Processing...' : 'Deny Deletion'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isLoading ? 'Processing...' : 'Approve Deletion'}
                </button>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
            
            <button
              type="button"
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // For FOR_APPROVAL and NEW_RECORD, show approval version
    if (!selectedCategory.forApprovalVersion) return null;
    
    const approvalData = selectedCategory.forApprovalVersion;
    
    // Use shared field change detection utility
    const isFieldChanged = createFieldChangeDetector(
      selectedCategory as Record<string, unknown>,
      selectedCategory.forApprovalVersion as Record<string, unknown> | undefined
    );
    
    // Helper function to format display value
    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Helper function to render read-only field with highlighting
    const renderReadOnlyField = (label: string, value: unknown, colorClass: string, fieldName?: string) => {
      const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;
      
      return (
        <div className="group">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
            {label}
          </label>
          <div className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
            fieldChanged 
              ? 'border-blue-500 bg-blue-50 text-gray-700' 
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}>
            {formatValue(value)}
          </div>
        </div>
      );
    };
    
    return (
      <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-green-400 bg-white p-4 shadow-sm sm:p-6">
        {/* Change Reason and Modification Made */}
        {selectedCategory?.changeReason && (
          <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="m-0 text-base font-bold text-blue-600">
                Change Reason and Modification Made
              </h4>
            </div>
            <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm whitespace-pre-wrap">
              {selectedCategory.changeReason}
            </div>
          </div>
        )}
        
        {/* Category Information Section */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-600 m-0">
                Category Information
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderReadOnlyField('Category Name', approvalData.productCategoryName, 'bg-blue-500', 'productCategoryName')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isAdminUser && selectedCategory && ([StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(selectedCategory.status as StatusEnum)) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {isLoading ? 'Processing...' : 'Deny Changes'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          
          <button
            type="button"
            onClick={handleCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Render logs tab content
  const renderLogsTab = () => {
    if (!selectedCategory) return null;
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="m-0 text-base font-bold text-blue-600">
              Activity Logs
            </h3>
          </div>
          
          {renderActivityLogsTable(selectedCategory?.activityLogs)}
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <DenyReasonDialog
        show={showDenyDialog}
        category={selectedCategory}
        onConfirm={handleDenyConfirm}
        onCancel={handleDenyCancel}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        category={selectedCategory}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      {/* Breadcrumbs */}
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Products
          </a>
          <span className="text-gray-400">/</span>
          <a href="/products/categories" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Categories
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedCategory && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading category details...</div>
        </div>
      )}

      {/* Category Form with Tabs */}
      {selectedCategory && (
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
              <div className="flex gap-2 flex-nowrap">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    getTabColorClasses(selectedCategory.status || StatusEnum.ACTIVE, activeTab === 'details')
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Category Information
                    {selectedCategory && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{getStatusText(selectedCategory.status || StatusEnum.ACTIVE)}</span>
                      </>
                    )}
                  </span>
                </button>
                
                {selectedCategory.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                      activeTab === 'approval'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Changes
                    </span>
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity Logs
                  </span>
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="bg-white p-4 sm:p-6">
            {activeTab === 'details' && (
              <CategoryForm
                isCreateMode={false}
                selectedCategory={selectedCategory}
                successMessage={null}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={handleCancel}
                isAdminUser={isAdminUser}
              />
            )}
            
              {activeTab === 'approval' && renderApprovalTab()}
              
              {activeTab === 'logs' && renderLogsTab()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
