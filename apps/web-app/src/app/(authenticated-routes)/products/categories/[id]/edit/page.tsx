'use client';

import { ConfirmationModal, DeleteConfirmationModal } from '@components-web';
import {
    extractErrorMessage,
    ProductApi,
    ProductCategoryDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import CategoryForm from './components/CategoryForm';

interface EditCategoryPageProps {
    params: {
        id: string;
    };
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ProductCategoryDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
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
            } catch (err) {
                console.error('Error fetching category:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load category details. Please try again.');
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
            fetchCategory();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (category: ProductCategoryDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing category
            const updatedCategory = await ProductApi.updateProductCategory(
                params.id,
                {
                    productCategoryId: category.productCategoryId,
                    productCategoryName: category.productCategoryName,
                    status: category.status,
                    changeReason: category.changeReason,
                },
                userRole
            );

            setSelectedCategory(updatedCategory);
            setFlashNotification({
                title: 'Success!',
                message: 'Product Category updated successfully!',
                alertType: 'success',
            });

            // Navigate back to category list immediately - notification will persist
            router.push('/products/categories');
        } catch (error) {
            console.error('Error updating category:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update category. Please try again.');
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
        if (!selectedCategory) {
            return;
        }

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage in production
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            await ProductApi.deleteProductCategory(selectedCategory, deletionReason, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product Category deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to category list immediately - notification will persist
            router.push('/products/categories');
        } catch (error) {
            console.error('Error deleting category:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete category. Please try again.');
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
        if (!selectedCategory) return;

        try {
            setIsLoading(true);
            setShowReactivateConfirm(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const reactivatedCategory = await ProductApi.reactivateProductCategory(
                selectedCategory.productCategoryId,
                userRole
            );
            setSelectedCategory(reactivatedCategory);
            setFlashNotification({
                title: 'Success!',
                message: 'Product Category reactivated successfully!',
                alertType: 'success',
            });

            router.push('/products/categories');
        } catch (err) {
            console.error('Error reactivating category:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to reactivate category. Please try again.');
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
        if (!selectedCategory) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            await ProductApi.approveProductCategory(selectedCategory.productCategoryId, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product Category approved successfully!',
                alertType: 'success',
            });

            // Navigate back to category list immediately - notification will persist
            router.push('/products/categories');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to approve category';
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
        if (!selectedCategory) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            await ProductApi.denyProductCategory(selectedCategory.productCategoryId, approverMessage, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product Category changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to category list immediately - notification will persist
            router.push('/products/categories');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to deny category';
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
        router.push('/products/categories');
    };

    if (!selectedCategory && !isLoading) {
        return (
            <div className="min-h-screen bg-white p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>Category not found</span>
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
                    <a href="/products/categories" className="text-blue-600 hover:text-blue-700">
                        Categories
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !selectedCategory ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="text-gray-600 text-sm">Loading category details...</div>
                </div>
            ) : null}

            {selectedCategory && (
                <CategoryForm
                    isCreateMode={false}
                    selectedCategory={selectedCategory}
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
                record={selectedCategory}
                recordDisplayName={selectedCategory?.productCategoryName}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                category={selectedCategory}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <ConfirmationModal
                show={showReactivateConfirm}
                record={selectedCategory}
                variant="reactivate"
                recordDisplayName={selectedCategory?.productCategoryName}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={handleReactivateCancel}
            />
        </div>
    );
}
