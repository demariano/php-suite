'use client';

import { CustomerApi, CustomerDto, extractErrorMessage, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CustomerForm from '../../components/CustomerForm';

interface EditCustomerPageProps {
  params: {
    id: string;
  };
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch customer details on component mount
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const customer = await CustomerApi.getCustomerById(params.id, userRole);
        setSelectedCustomer(customer);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((customer.status === StatusEnum.FOR_APPROVAL || customer.status === StatusEnum.NEW_RECORD || customer.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching customer:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load customer details. Please try again.');
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
      fetchCustomer();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (customer: CustomerDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing customer
      const updatedCustomer = await CustomerApi.updateCustomer(params.id, {
        customerId: customer.customerId,
        customerName: customer.customerName,
        email: customer.email,
        address1: customer.address1,
        address2: customer.address2,
        balance: customer.balance,
        contactNo: customer.contactNo,
        contactPerson: customer.contactPerson,
        townId: customer.townId,
        townName: customer.townName,
        creditLimit: customer.creditLimit,
        customerCredit: customer.customerCredit,
        tinNumber: customer.tinNumber,
        areaId: customer.areaId,
        areaName: customer.areaName,
        customerClassificationId: customer.customerClassificationId,
        customerClassificationName: customer.customerClassificationName,
        customerTypeId: customer.customerTypeId,
        customerTypeName: customer.customerTypeName,
        status: customer.status,
        changeReason: customer.changeReason,
        customerTerms: customer.customerTerms,
        customerProductDeals: customer.customerProductDeals
      }, userRole);
      
      setSelectedCustomer(updatedCustomer);
      setFlashNotification({
        title: 'Success!',
        message: 'Customer updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to customer list after a short delay
      setTimeout(() => {
        router.push('/customers/customer');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating customer:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update customer. Please try again.');
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
    if (!selectedCustomer) {
      return;
    }
    
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await CustomerApi.deleteCustomer(selectedCustomer, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Customer deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to customer list after a short delay
      setTimeout(() => {
        router.push('/customers/customer');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting customer:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete customer. Please try again.');
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
    if (!selectedCustomer) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      const approvedCustomer = await CustomerApi.approveCustomer(selectedCustomer.customerId, userRole);
      setSelectedCustomer(approvedCustomer);
      setFlashNotification({
        title: 'Success!',
        message: 'Customer approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to customer list after a short delay
      setTimeout(() => {
        router.push('/customers/customer');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving customer:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve customer. Please try again.');
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
    if (!selectedCustomer) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      const deniedCustomer = await CustomerApi.denyCustomer(selectedCustomer.customerId, userRole);
      setSelectedCustomer(deniedCustomer);
      setFlashNotification({
        title: 'Success!',
        message: 'Customer changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to customer list after a short delay
      setTimeout(() => {
        router.push('/customers/customer');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying customer:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny customer. Please try again.');
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
    router.push('/customers/customer');
  };

  if (!selectedCustomer && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Customer not found</span>
        </div>
      </div>
    );
  }

  // Render approval tab content (similar to CustomerModal)
  const renderApprovalTab = () => {
    if (!selectedCustomer || !selectedCustomer.forApprovalVersion) return null;
    
    const approvalData = selectedCustomer.forApprovalVersion;
    
    // Helper function to format display value
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Helper function to render read-only field
    const renderReadOnlyField = (label: string, value: any, colorClass: string) => (
      <div className="group">
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
          {label}
        </label>
        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed">
          {formatValue(value)}
        </div>
      </div>
    );
    
    return (
      <div className="space-y-6 animate-fadeIn border-2 border-green-400 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg">
        {/* Change Reason and Modification Made */}
        {selectedCustomer?.changeReason && (
          <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-700">
                Change Reason and Modification Made
              </h4>
            </div>
            <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed whitespace-pre-wrap font-mono leading-relaxed">
              {selectedCustomer.changeReason}
            </div>
          </div>
        )}
        
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Basic Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderReadOnlyField('Customer Name', approvalData.customerName, 'bg-blue-500')}
            {renderReadOnlyField('Email', approvalData.email, 'bg-indigo-500')}
            {renderReadOnlyField('Contact Number', approvalData.contactNo, 'bg-purple-500')}
            {renderReadOnlyField('Contact Person', approvalData.contactPerson, 'bg-green-500')}
          </div>
        </div>

        {/* Address Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Address Information
            </h3>
          </div>
          <div className="space-y-4">
            {renderReadOnlyField('Address 1', approvalData.address1, 'bg-pink-500')}
            {renderReadOnlyField('Address 2', approvalData.address2, 'bg-rose-500')}
            {renderReadOnlyField('TIN Number', approvalData.tinNumber, 'bg-teal-500')}
          </div>
        </div>

        {/* Location & Classification Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Location & Classification
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderReadOnlyField('Area', approvalData.areaName, 'bg-emerald-500')}
            {renderReadOnlyField('Town', approvalData.townName, 'bg-teal-500')}
            {renderReadOnlyField('Customer Classification', approvalData.customerClassificationName, 'bg-green-500')}
            {renderReadOnlyField('Customer Type', approvalData.customerTypeName, 'bg-cyan-500')}
          </div>
        </div>

        {/* Financial Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Financial Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderReadOnlyField('Balance', approvalData.balance, 'bg-emerald-500')}
            {renderReadOnlyField('Credit Limit', approvalData.creditLimit, 'bg-cyan-500')}
            {renderReadOnlyField('Customer Credit', approvalData.customerCredit, 'bg-sky-500')}
          </div>
        </div>
            
            {/* Customer Terms */}
            {selectedCustomer.forApprovalVersion.customerTerms && Array.isArray(selectedCustomer.forApprovalVersion.customerTerms) && selectedCustomer.forApprovalVersion.customerTerms.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-gray-700">
                    Customer Terms
                  </h4>
                </div>
                <div className="space-y-4">
                  {(selectedCustomer.forApprovalVersion.customerTerms as any[]).map((term: any, index: number) => (
                    <div key={index} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="mb-3">
                        <h5 className="text-sm font-bold text-gray-900 mb-2">
                          {term.termsName || 'Unnamed Terms'}
                        </h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-2">
                            <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                            Days
                          </label>
                          <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-xs bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed">
                            {term.days || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Product Deals */}
            {selectedCustomer.forApprovalVersion.customerProductDeals && Array.isArray(selectedCustomer.forApprovalVersion.customerProductDeals) && selectedCustomer.forApprovalVersion.customerProductDeals.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-gray-700">
                    Product Deals
                  </h4>
                </div>
                <div className="space-y-4">
                  {(selectedCustomer.forApprovalVersion.customerProductDeals as any[]).map((deal: any, index: number) => (
                    <div key={index} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="mb-3">
                        <h5 className="text-sm font-bold text-gray-900 mb-2">
                          {deal.productName && deal.productName !== deal.productDealName ? `${deal.productName} - ${deal.productDealName || 'Unnamed Deal'}` : (deal.productDealName || 'Unnamed Deal')}
                        </h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-2">
                            <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                            Minimum Quantity
                          </label>
                          <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-xs bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed">
                            {deal.minQty || 0}
                          </div>
                        </div>
                        <div className="group">
                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-2">
                            <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                            Additional Quantity
                          </label>
                          <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-xs bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium shadow-sm cursor-not-allowed">
                            {deal.additionalQty || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
          {isAdminUser && (selectedCustomer?.status === StatusEnum.FOR_APPROVAL || selectedCustomer?.status === StatusEnum.NEW_RECORD || selectedCustomer?.status === StatusEnum.FOR_DELETION) ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div></div>
          )}
          
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
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
    if (!selectedCustomer) return null;
    
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-green-200 to-emerald-200">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Activity Logs
          </h3>
        </div>
        
        {selectedCustomer?.activityLogs && selectedCustomer.activityLogs.length > 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 shadow-lg max-h-96 overflow-y-auto">
            {selectedCustomer.activityLogs.map((log, index) => (
              <div 
                key={index} 
                className={`py-3 ${
                  index < selectedCustomer.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                }`}
              >
                <p className="text-sm text-gray-700">{log}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">
            No activity logs available
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end items-center mt-8 pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-100">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
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
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <div>
        <nav className="flex items-center gap-2">
          <a href="/dashboard" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Home
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/customer" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customer
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedCustomer && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading customer details...</div>
        </div>
      )}

      {/* Customer Form with Tabs */}
      {selectedCustomer && (
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full max-w-4xl">
            {/* Tab Navigation */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b-2 border-blue-200 rounded-t-xl p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'details'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50 transform scale-105'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-blue-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Customer Information
                  </span>
                </button>
                
                {selectedCustomer.status !== StatusEnum.ACTIVE && (
                  <button
                    onClick={() => setActiveTab('approval')}
                    className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      activeTab === 'approval'
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/50 transform scale-105'
                        : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-teal-600'
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
                  className={`px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'logs'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-105'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-green-600'
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
            <div className="p-6 bg-white">
              {activeTab === 'details' && (
                <CustomerForm
                  isCreateMode={false}
                  selectedCustomer={selectedCustomer}
                  successMessage={null}
                  isAdminUser={isAdminUser}
                  activeTab="details"
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
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

