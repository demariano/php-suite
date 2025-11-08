'use client';

import { extractErrorMessage, CustomerApi, CustomerDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CustomerForm from '../components/CustomerForm';

export default function CreateCustomerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  const handleSave = async (customer: CustomerDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new customer
      const newCustomer = await CustomerApi.createCustomer({
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
        changeReason: customer.changeReason,
        customerTerms: customer.customerTerms,
        customerProductDeals: customer.customerProductDeals
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Customer created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to customer list after a short delay
      setTimeout(() => {
        router.push('/customers/customer');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating customer:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create customer. Please try again.');
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

  const handleDelete = () => {
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
          <a href="/customers" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customers
          </a>
          <span className="text-gray-400">/</span>
          <a href="/customers/customer" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Customer
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Customer Form */}
      <CustomerForm
        isCreateMode={true}
        selectedCustomer={null}
        successMessage={null}
        isAdminUser={isAdminUser}
        activeTab="details"
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </div>
  );
}

