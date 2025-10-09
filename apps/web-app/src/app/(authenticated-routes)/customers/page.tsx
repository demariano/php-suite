'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to the customer management page
    router.replace('/customers/customer');
  }, [router]);

  return (
    <div style={{ 
      padding: '24px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '200px' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '24px', 
          marginBottom: '16px',
          color: '#6b7280'
        }}>
          🔄
        </div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Redirecting to customer management...
        </p>
      </div>
    </div>
  );
}
