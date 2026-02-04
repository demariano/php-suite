'use client';

import { ConfirmationModal, DeleteConfirmationModal } from '@components-web';
import {
    extractErrorMessage,
    ProductApi,
    ProductDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import ProductForm from './components/ProductForm';

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
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
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
                if (
                    (product.status === StatusEnum.FOR_APPROVAL ||
                        product.status === StatusEnum.NEW_RECORD ||
                        product.status === StatusEnum.FOR_DEACTIVATION ||
                        product.status === StatusEnum.FOR_DELETION) &&
                    isAdminUser
                ) {
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
                    alertType: 'error',
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
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing product
            const updatedRecord = await ProductApi.updateProduct(
                product.productId,
                {
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
                    changeReason: product.changeReason,
                },
                userRole
            );

            setSelectedProduct(updatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Product updated successfully!',
                alertType: 'success',
            });

            // Navigate back to product list immediately - notification will persist
            router.push('/products/product');
        } catch (error) {
            console.error('Error updating product:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update product. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async (deletionReason: string) => {
        if (!selectedProduct) {
            return;
        }

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await ProductApi.deleteProduct(selectedProduct, deletionReason, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to product list immediately - notification will persist
            router.push('/products/product');
        } catch (error) {
            console.error('Error deleting product:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete product. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
    };

    const handleReactivateClick = () => {
        setShowReactivateConfirm(true);
    };

    const handleReactivateConfirm = async () => {
        if (!selectedProduct) return;

        try {
            setIsLoading(true);
            setShowReactivateConfirm(false);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const reactivatedRecord = await ProductApi.updateProduct(
                selectedProduct.productId,
                {
                    ...selectedProduct,
                    status: StatusEnum.ACTIVE,
                },
                userRole
            );

            setSelectedProduct(reactivatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Product reactivated successfully!',
                alertType: 'success',
            });
            router.push('/products/product');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate product';
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivateCancel = () => {
        setShowReactivateConfirm(false);
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
                alertType: 'success',
            });

            // Navigate back to product list immediately - notification will persist
            router.push('/products/product');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to approve product';
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeny = () => {
        setShowDenyDialog(true);
    };

    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selectedProduct) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            await ProductApi.denyProduct(selectedProduct.productId, approverMessage, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to product list immediately - notification will persist
            router.push('/products/product');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to deny product';
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDenyCancel = () => {
        setShowDenyDialog(false);
    };

    const handleCancel = () => {
        router.push('/products/product');
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

    if (!selectedProduct && !isLoading) {
        return (
            <div className="min-h-screen bg-white p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>Product not found</span>
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
                    <a href="/products/product" className="text-blue-600 hover:text-blue-700">
                        Product
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !selectedProduct ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="text-gray-600 text-sm">Loading product details...</div>
                </div>
            ) : null}

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
                    onReactivate={handleReactivateClick}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onCancel={handleCancel}
                />
            )}

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                record={selectedProduct}
                recordDisplayName={selectedProduct?.productName}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                product={selectedProduct}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <ConfirmationModal
                show={showReactivateConfirm}
                record={selectedProduct}
                variant="reactivate"
                recordDisplayName={selectedProduct?.productName}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={handleReactivateCancel}
            />
        </div>
    );
}
