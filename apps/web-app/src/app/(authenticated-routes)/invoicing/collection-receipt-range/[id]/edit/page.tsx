'use client';

import {
    CollectionReceiptRangeApi,
    CollectionReceiptRangeDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CollectionReceiptRangeModal from '../../components/CollectionReceiptRangeModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface EditCollectionReceiptRangePageProps {
    params: {
        id: string;
    };
}

export default function EditCollectionReceiptRangePage({ params }: EditCollectionReceiptRangePageProps) {
    const router = useRouter();
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const [selectedRange, setSelectedRange] = useState<CollectionReceiptRangeDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'cancelled'>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchRange = async () => {
            if (!params.id) return;

            try {
                setIsLoading(true);
                setError(null);

                const range = await CollectionReceiptRangeApi.getCollectionReceiptRangeById(params.id);
                setSelectedRange(range);
                setActiveTab('details');
            } catch (err: any) {
                console.error('Failed to fetch collection receipt range:', err);
                setError(err.message || 'Failed to load collection receipt range details. Please try again.');
                setFlashNotification({
                    title: 'Error!',
                    message: err.message || 'Failed to load collection receipt range details. Please try again.',
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRange();
    }, [params.id, setFlashNotification]);

    const handleSave = async (range: CollectionReceiptRangeDto) => {
        if (!selectedRange) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const updatedRecord = await CollectionReceiptRangeApi.updateCollectionReceiptRange(
                selectedRange.collectionReceiptRangeId,
                {
                    ...range,
                },
                userRole
            );

            setSelectedRange(updatedRecord);
            setSuccessMessage('Collection Receipt Range updated successfully!');
            setFlashNotification({
                title: 'Success!',
                message: 'Collection Receipt Range updated successfully!',
                alertType: 'success',
            });
            
            // Refresh the range data
            const refreshedRange = await CollectionReceiptRangeApi.getCollectionReceiptRangeById(params.id);
            setSelectedRange(refreshedRange);
        } catch (err: any) {
            console.error('Failed to save collection receipt range:', err);
            setError(err.message || 'Failed to save collection receipt range. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to save collection receipt range. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedRange) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await CollectionReceiptRangeApi.deleteCollectionReceiptRange(
                selectedRange.collectionReceiptRangeId,
                selectedRange,
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Collection Receipt Range deleted successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/collection-receipt-range');
        } catch (err: any) {
            console.error('Failed to delete collection receipt range:', err);
            setError(err.message || 'Failed to delete collection receipt range. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to delete collection receipt range. Please try again.',
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

    const handleCancelReceipt = async (receiptNumber: number, cancellationReason: string) => {
        if (!selectedRange) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await CollectionReceiptRangeApi.cancelReceiptNumber(
                {
                    collectionReceiptRangeId: selectedRange.collectionReceiptRangeId,
                    receiptNumber,
                    cancellationReason,
                },
                userRole
            );

            setSuccessMessage(`Receipt number ${receiptNumber} cancelled successfully!`);
            setFlashNotification({
                title: 'Success!',
                message: `Receipt number ${receiptNumber} cancelled successfully!`,
                alertType: 'success',
            });

            // Refresh the range data
            const refreshedRange = await CollectionReceiptRangeApi.getCollectionReceiptRangeById(params.id);
            setSelectedRange(refreshedRange);
        } catch (err: any) {
            console.error('Failed to cancel receipt number:', err);
            setError(err.message || 'Failed to cancel receipt number. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to cancel receipt number. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        router.replace('/invoicing/collection-receipt-range');
    };

    if (!selectedRange && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Collection Receipt Range not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="mb-6">
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Invoicing
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/invoicing/collection-receipt-range"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Collection Receipt Range
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Modal */}
            <CollectionReceiptRangeModal
                show={true}
                isCreateMode={false}
                selectedRange={selectedRange}
                activeTab={activeTab}
                successMessage={successMessage}
                isAdminUser={isAdminUser}
                isLoading={isLoading}
                onClose={handleClose}
                onTabChange={setActiveTab}
                onSave={handleSave}
                onDelete={handleDeleteClick}
                onCancelReceipt={handleCancelReceipt}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={showDeleteConfirm}
                range={selectedRange}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
}

