'use client';

import {
    extractErrorMessage,
    ProductUnitApi,
    ProductUnitDto,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DenyReasonDialog from '../../components/DenyReasonDialog';
import ProductUnitForm from '../../components/ProductUnitForm';

interface EditProductUnitPageProps {
    params: {
        id: string;
    };
}

export default function EditProductUnitPage({ params }: EditProductUnitPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProductUnit, setSelectedProductUnit] = useState<ProductUnitDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchProductUnit = async () => {
            try {
                setIsLoading(true);

                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const productUnit = await (ProductUnitApi as any).getProductUnitById(params.id, userRole);
                setSelectedProductUnit(productUnit);
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching product unit:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load product unit details. Please try again.');
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
            fetchProductUnit();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (productUnit: ProductUnitDto) => {
        try {
            setIsLoading(true);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const updatedProductUnit = await ProductUnitApi.updateProductUnit(
                params.id,
                {
                    productUnitId: productUnit.productUnitId,
                    productUnitName: productUnit.productUnitName,
                    status: productUnit.status,
                    changeReason: productUnit.changeReason,
                },
                userRole
            );

            setSelectedProductUnit(updatedProductUnit);
            setFlashNotification({
                title: 'Success!',
                message: 'Product Unit updated successfully!',
                alertType: 'success',
            });

            setTimeout(() => {
                router.push('/products/product-unit');
            }, 1500);
        } catch (error) {
            console.error('Error updating product unit:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update product unit. Please try again.');
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
        if (!selectedProductUnit) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedProductUnit) {
            return;
        }

        try {
            setIsLoading(true);
            setShowDeleteModal(false);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (ProductUnitApi as any).deleteProductUnit(selectedProductUnit, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Product Unit deleted successfully!',
                alertType: 'success',
            });

            router.push('/products/product-unit');
        } catch (error) {
            console.error('Error deleting product unit:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete product unit. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedProductUnit) return;

        try {
            setIsLoading(true);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const approvedProductUnit = await ProductUnitApi.approveProductUnit(
                selectedProductUnit.productUnitId,
                userRole
            );
            setSelectedProductUnit(approvedProductUnit);
            setFlashNotification({
                title: 'Success!',
                message: 'Product Unit approved successfully!',
                alertType: 'success',
            });

            router.push('/products/product-unit');
        } catch (err) {
            console.error('Error approving product unit:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve product unit. Please try again.');
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
        if (!selectedProductUnit) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            const deniedProductUnit = await ProductUnitApi.denyProductUnit(
                selectedProductUnit.productUnitId,
                approverMessage,
                userRole
            );
            setSelectedProductUnit(deniedProductUnit);
            setFlashNotification({
                title: 'Success!',
                message: 'Product Unit changes denied successfully!',
                alertType: 'success',
            });

            router.push('/products/product-unit');
        } catch (err) {
            console.error('Error denying product unit:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny product unit. Please try again.');
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
        router.push('/products/product-unit');
    };

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

    if (!selectedProductUnit && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Product Unit not found</span>
                </div>
            </div>
        );
    }

    const renderLogsTab = () => {
        if (!selectedProductUnit) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-700">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedProductUnit?.activityLogs)}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block" />
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {isAdminUser &&
                            selectedProductUnit &&
                            [StatusEnum.FOR_APPROVAL, StatusEnum.NEW_RECORD, StatusEnum.FOR_DELETION].includes(
                                selectedProductUnit.status as StatusEnum
                            ) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDeny}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        Approve
                                    </button>
                                </>
                            )}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <DenyReasonDialog
                show={showDenyDialog}
                productUnit={selectedProductUnit}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                productUnit={selectedProductUnit}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/products"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Products
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/products/product-unit"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Product Unit
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {isLoading && !selectedProductUnit && (
                <div className="flex min-h-96 items-center justify-center">
                    <div className="text-gray-600">Loading product unit details...</div>
                </div>
            )}

            {selectedProductUnit && (
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                            <div className="flex flex-nowrap gap-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${getTabColorClasses(
                                        selectedProductUnit.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Product Unit Information
                                        {selectedProductUnit && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>
                                                    {getStatusText(selectedProductUnit.status || StatusEnum.ACTIVE)}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6">
                            {activeTab === 'details' && (
                                <ProductUnitForm
                                    isCreateMode={false}
                                    selectedProductUnit={selectedProductUnit}
                                    successMessage={null}
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onCancel={handleCancel}
                                    isAdminUser={isAdminUser}
                                    onApprove={handleApprove}
                                    onDeny={handleDeny}
                                    isLoading={isLoading}
                                />
                            )}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
