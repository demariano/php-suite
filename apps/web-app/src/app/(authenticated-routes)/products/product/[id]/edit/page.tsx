'use client';

import { extractErrorMessage, ProductApi, ProductDto, StatusEnum, useEnv, useLocalStore, useSessionStore } from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductForm from './components/ProductForm';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();
  const { setFlashNotification } = useSessionStore();
  const router = useRouter();
  
  // Check if user is admin or super admin
  const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

  // Fetch product details on component mount
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        
        // SECURITY: Only get user role if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
        
        const product = await ProductApi.getProductById(params.id, userRole);
        setSelectedProduct(product);
        
        // If the record is in FOR_APPROVAL or NEW_RECORD status and user is admin, open the approval tab
        if ((product.status === StatusEnum.FOR_APPROVAL || product.status === StatusEnum.NEW_RECORD || product.status === StatusEnum.FOR_DELETION) && isAdminUser) {
          setActiveTab('approval');
        } else {
          // Default to details tab
          setActiveTab('details');
        }
        
      } catch (err) {
        console.error('Error fetching product:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to load product details. Please try again.');
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
      fetchProduct();
    }
  }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

  const handleSave = async (product: ProductDto) => {
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      // Update existing product
      const updatedRecord = await ProductApi.updateProduct(product.productId, {
        productId: product.productId,
        productName: product.productName,
        productCategoryId: product.productCategoryId,
        productCategoryName: product.productCategoryName,
        productClassId: product.productClassId,
        productClassName: product.productClassName,
        criticalLevel: product.criticalLevel,
        productDeals: product.productDeals,
        productUnitPrice: product.productUnitPrice,
        status: product.status,
        changeReason: product.changeReason
      }, userRole);
      
      setSelectedProduct(updatedRecord);
      setFlashNotification({
        title: 'Success!',
        message: 'Product updated successfully!',
        alertType: 'success'
      });
      
      // Navigate back to product list after a short delay
      setTimeout(() => {
        router.push('/products/product');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update product. Please try again.');
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
    if (!selectedProduct) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
      // This prevents role parameter leakage in production
      const userRole = (env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development') 
          ? authedUser?.userRole 
          : undefined;
      
      await ProductApi.deleteProduct(selectedProduct, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product deleted successfully!',
        alertType: 'success'
      });
      
      // Navigate back to product list after a short delay
      setTimeout(() => {
        router.push('/products/product');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete product. Please try again.');
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
    if (!selectedProduct) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to approve the record
      await ProductApi.approveProduct(selectedProduct.productId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product approved successfully!',
        alertType: 'success'
      });
      
      // Navigate back to product list after a short delay
      setTimeout(() => {
        router.push('/products/product');
      }, 1500);
      
    } catch (err) {
      console.error('Error approving product:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to approve product. Please try again.');
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
    if (!selectedProduct) return;
    
    try {
      setIsLoading(true);
      
      // SECURITY: Only get user role if BYPASS_AUTH is enabled
      // This prevents role parameter leakage when bypass auth is disabled
      const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
      
      // Call the API to deny the record
      await ProductApi.denyProduct(selectedProduct.productId, userRole);
      
      setFlashNotification({
        title: 'Success!',
        message: 'Product changes denied successfully!',
        alertType: 'success'
      });
      
      // Navigate back to product list after a short delay
      setTimeout(() => {
        router.push('/products/product');
      }, 1500);
      
    } catch (err) {
      console.error('Error denying product:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to deny product. Please try again.');
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
    router.push('/products/product');
  };

  if (!selectedProduct && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
          <span>Product not found</span>
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
          <a href="/products/product" className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200">
            Product
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 text-sm font-medium">Edit</span>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !selectedProduct && (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-gray-600">Loading product details...</div>
        </div>
      )}

      {/* Product Form */}
      {selectedProduct && (
        <ProductForm
          isCreateMode={false}
          selectedProduct={selectedProduct}
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
        product={selectedProduct}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

