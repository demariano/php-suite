'use client';

import { ProductDto } from '@data-access/index';
import { useEffect } from 'react';
import ProductForm from '../[id]/edit/components/ProductForm';

interface ProductModalProps {
    show: boolean;
    isCreateMode: boolean;
    selectedProduct: ProductDto | null;
    activeTab: 'details' | 'approval' | 'logs';
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    onClose: () => void;
    onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
    onSave: (product: ProductDto) => void;
    onDelete: () => void;
    onApprove: () => void;
    onDeny: () => void;
}

export default function ProductModal({
    show,
    isCreateMode,
    selectedProduct,
    activeTab,
    successMessage,
    isAdminUser,
    isLoading,
    onClose,
    onTabChange,
    onSave,
    onDelete,
    onApprove,
    onDeny,
}: ProductModalProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onClose();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    if (!show) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-6">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6">
                <div className="flex items-center justify-between px-6 pt-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isCreateMode ? 'Create Product' : 'Edit Product'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <ProductForm
                        isCreateMode={isCreateMode}
                        selectedProduct={selectedProduct}
                        successMessage={successMessage}
                        isAdminUser={isAdminUser}
                        isLoading={isLoading}
                        activeTab={activeTab}
                        onTabChange={onTabChange}
                        onSave={onSave}
                        onDelete={onDelete}
                        onApprove={onApprove}
                        onDeny={onDeny}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>
    );
}

