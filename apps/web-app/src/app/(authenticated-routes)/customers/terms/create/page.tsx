'use client';

import { extractErrorMessage, TermsApi, TermsDto, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TermsForm from '../components/TermsForm';

export default function CreateTermsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();

  const handleSave = async (terms: TermsDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Create new terms
      await TermsApi.createTerms({
        termsName: terms.termsName,
        days: terms.days,
        status: terms.status
      }, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Terms created successfully!',
        alertType: 'success'
      });
      
      // Navigate back to terms list after a short delay
      setTimeout(() => {
        router.push('/customers/terms');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating terms:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create terms. Please try again.');
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
    router.push('/customers/terms');
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
          <a href="/customers/terms" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Terms
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Create</span>
        </nav>
      </div>

      {/* Terms Form */}
      <TermsForm
        isCreateMode={true}
        selectedTerms={null}
        successMessage={null}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </div>
  );
}

