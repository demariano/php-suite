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
    if (!selectedCustomer) return null;
    
    return (
      <div>
        <div className="mb-5">
          {(selectedCustomer.status === StatusEnum.FOR_APPROVAL || selectedCustomer.status === StatusEnum.NEW_RECORD) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
              <span className="text-yellow-600 text-base">ℹ️</span>
              <span className="text-yellow-800 text-sm">
                These are the proposed changes awaiting approval
              </span>
            </div>
          )}

          {/* Change Reason */}
          {selectedCustomer?.changeReason && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px 0 rgba(245, 158, 11, 0.1)'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#92400e',
                margin: '0 0 12px 0'
              }}>
                Change Reason
              </h4>
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'white',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#92400e',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedCustomer.changeReason}
              </div>
            </div>
          )}
          
          {selectedCustomer?.forApprovalVersion ? (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 16px 0'
              }}>
                Pending Approval Details
              </h3>
              <p className="text-gray-600 text-sm">
                Review the pending changes above. Use the buttons below to approve or deny.
              </p>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No pending approval changes
            </p>
          )}
        </div>
        
        <div className="flex justify-between mt-6">
          {isAdminUser && (selectedCustomer?.status === StatusEnum.FOR_APPROVAL || selectedCustomer?.status === StatusEnum.NEW_RECORD || selectedCustomer?.status === StatusEnum.FOR_DELETION) ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleDeny}
                disabled={isLoading}
                className="px-5 py-2.5 bg-red-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Deny Changes'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          ) : (
            <div></div>
          )}
          
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
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
      <div>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Recent Activity
          </h3>
          {selectedCustomer?.activityLogs && selectedCustomer.activityLogs.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
              {selectedCustomer.activityLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-2 ${
                    index < selectedCustomer.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No activity logs available
            </p>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
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
        <div>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e5e7eb',
            marginBottom: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px 8px 0 0',
            padding: '4px'
          }}>
            <button
              onClick={() => setActiveTab('details')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'details' ? 'white' : 'transparent',
                color: activeTab === 'details' ? '#1f2937' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'details' ? '600' : '500',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'details' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                marginRight: '4px'
              }}
            >
              Details
            </button>
            
            {selectedCustomer.status !== StatusEnum.ACTIVE && (
              <button
                onClick={() => setActiveTab('approval')}
                style={{
                  padding: '12px 20px',
                  backgroundColor: activeTab === 'approval' ? 'white' : 'transparent',
                  color: activeTab === 'approval' ? '#1f2937' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === 'approval' ? '600' : '500',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === 'approval' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                  marginRight: '4px'
                }}
              >
                Approval Version
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'logs' ? 'white' : 'transparent',
                color: activeTab === 'logs' ? '#1f2937' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'logs' ? '600' : '500',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'logs' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              Activity Logs
            </button>
          </div>
          
          {/* Tab Content */}
          <div>
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
      )}
    </div>
  );
}

