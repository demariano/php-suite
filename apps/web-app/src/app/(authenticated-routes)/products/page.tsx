'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ProductsPage() {
  useEffect(() => {
    // Redirect to the main products page
    redirect('/products/product');
  }, []);

  return null;
}
