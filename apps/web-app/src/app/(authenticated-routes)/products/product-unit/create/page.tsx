'use client';

import {
    ProductUnitApi,
    ProductUnitDto,
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProductUnitForm from '../components/ProductUnitForm';

export default function CreateProductUnitPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    const handleSave = async (productUnit: ProductUnitDto) => {
        try {
            setIsLoading(true);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await ProductUnitApi.createProductUnit(
                {
                    productUnitName: productUnit.productUnitName,
                    status: productUnit.status,
                },
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Product Unit created successfully!',
                alertType: 'success',
            });

            router.push('/products/product-unit');
        } catch (error) {
            console.error('Error creating product unit:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to create product unit. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/products/product-unit');
    };

    const handleDelete = () => {
        // Not applicable for create mode
    };

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    return (
        <div className="p-4 sm:p-6 space-y-6">
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
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="overflow-x-auto rounded-t-xl border-b-2 border-blue-200 bg-gray-50 p-2">
                        <div className="flex flex-nowrap gap-2">
                            <button className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm">
                                <span className="flex items-center gap-2">
                                    <svg
                                        className="h-4 w-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    Product Unit Information
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-6">
                        <ProductUnitForm
                            isCreateMode={true}
                            selectedProductUnit={null}
                            successMessage={null}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onCancel={handleCancel}
                            isAdminUser={isAdminUser}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
