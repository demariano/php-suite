'use client';

import {
    extractErrorMessage,
    RawMaterialsStockApi,
    RawMaterialsStockDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RawMaterialsStockForm } from '../components';

export default function CreateRawMaterialsStockPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    const handleSave = async (stock: RawMaterialsStockDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Create new raw materials stock
            const newStock = await RawMaterialsStockApi.createRawMaterialsStock(
                {
                    lotNo: stock.lotNo,
                    rawMaterialId: stock.rawMaterialId,
                    rawMaterialName: stock.rawMaterialName,
                    rawMaterialSupplierId: stock.rawMaterialSupplierId,
                    rawMaterialSupplierName: stock.rawMaterialSupplierName,
                    rawMaterialsLocationId: stock.rawMaterialsLocationId,
                    rawMaterialsLocationName: stock.rawMaterialsLocationName,
                    qty: stock.qty,
                    changeReason: stock.changeReason,
                },
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Raw materials stock created successfully!',
                alertType: 'success',
            });

            // Navigate immediately - notification will persist
            router.push('/inventory/raw-materials-stock');
        } catch (error) {
            console.error('Error creating raw materials stock:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to create raw materials stock. Please try again.');
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
        router.push('/inventory/raw-materials-stock');
    };

    const handleDelete = () => {
        // Not applicable for create mode
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
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
                        href="/inventory"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Inventory
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/inventory/raw-materials-stock"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Raw Materials Stock
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Create</span>
                </nav>
            </div>

            {/* Stock Form */}
            <div className="flex justify-center">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                    {/* Tab Navigation */}
                    <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                        <div className="flex gap-2 flex-nowrap">
                            <button className="flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow-sm">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                        />
                                    </svg>
                                    Raw Materials Stock Information
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white p-4 sm:p-6">
                        <RawMaterialsStockForm
                            isCreateMode={true}
                            selectedStock={null}
                            successMessage={null}
                            isAdminUser={isAdminUser}
                            activeTab="details"
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
