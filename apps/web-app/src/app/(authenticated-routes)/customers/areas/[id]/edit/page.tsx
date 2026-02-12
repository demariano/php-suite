'use client';

import { ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog } from '@components-web';
import {
    AreaApi,
    AreaDto,
    extractErrorMessage,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AreaForm from './components/AreaForm';

interface EditAreaPageProps {
    params: {
        id: string;
    };
}

export default function EditAreaPage({ params }: EditAreaPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch area details on component mount
    useEffect(() => {
        const fetchArea = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const area = await (AreaApi as any).getAreaById(params.id, userRole);
                setSelectedArea(area);
            } catch (err) {
                console.error('Error fetching area:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load area details. Please try again.');
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
            fetchArea();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (area: AreaDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing area
            const updatedArea = await AreaApi.updateArea(
                params.id,
                {
                    areaId: area.areaId,
                    areaName: area.areaName,
                    territoryManagerId: area.territoryManagerId,
                    territoryManagerName: area.territoryManagerName,
                    status: area.status,
                    changeReason: area.changeReason,
                    towns: area.towns,
                    idPrefix: area.idPrefix,
                },
                userRole
            );

            setSelectedArea(updatedArea);
            setFlashNotification({
                title: 'Success!',
                message: 'Area updated successfully!',
                alertType: 'success',
            });
            router.push('/customers/areas');
        } catch (error) {
            console.error('Error updating area:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update area. Please try again.');
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
        if (!selectedArea) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedArea) {
            return;
        }

        setShowDeleteModal(false);

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await (AreaApi as any).deleteArea(selectedArea, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Area deleted successfully!',
                alertType: 'success',
            });
            router.push('/customers/areas');
        } catch (error) {
            console.error('Error deleting area:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete area. Please try again.');
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
        if (!selectedArea) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            await (AreaApi as any).approveArea(selectedArea.areaId, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Area approved successfully!',
                alertType: 'success',
            });
            router.push('/customers/areas');
        } catch (err) {
            console.error('Error approving area:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve area. Please try again.');
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
        if (!selectedArea) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            await (AreaApi as any).denyArea(selectedArea.areaId, approverMessage, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Area changes denied successfully!',
                alertType: 'success',
            });
            router.push('/customers/areas');
        } catch (err) {
            console.error('Error denying area:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny area. Please try again.');
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

    const handleReactivate = () => {
        setShowReactivateModal(true);
    };

    const handleReactivateConfirm = async () => {
        if (!selectedArea) return;

        try {
            setIsLoading(true);
            setShowReactivateModal(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Update the area to ACTIVE status
            const reactivatedArea = await AreaApi.updateArea(
                selectedArea.areaId,
                {
                    ...selectedArea,
                    status: StatusEnum.ACTIVE,
                },
                userRole
            );

            setSelectedArea(reactivatedArea);
            setFlashNotification({
                title: 'Success!',
                message: 'Area reactivated successfully!',
                alertType: 'success',
            });
            router.push('/customers/areas');
        } catch (err) {
            console.error('Error reactivating area:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to reactivate area. Please try again.');
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
        router.push('/customers/areas');
    };

    if (!selectedArea && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>Area not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500">
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Home
                    </a>
                    <span>/</span>
                    <a href="/customers" className="text-blue-600 hover:text-blue-700">
                        Customers
                    </a>
                    <span>/</span>
                    <a href="/customers/areas" className="text-blue-600 hover:text-blue-700">
                        Areas
                    </a>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedArea ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="text-gray-600 text-sm">Loading area details...</div>
                </div>
            ) : null}

            {/* Area Form */}
            {selectedArea && (
                <AreaForm
                    isCreateMode={false}
                    selectedArea={selectedArea}
                    successMessage={null}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onReactivate={handleReactivate}
                    onCancel={handleCancel}
                    isAdminUser={isAdminUser}
                    areaId={selectedArea.areaId}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isLoading={isLoading}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                />
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedArea}
                recordDisplayName={selectedArea?.areaName}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedArea}
                recordDisplayName={selectedArea?.areaName}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
            />

            <ConfirmationModal
                show={showReactivateModal}
                record={selectedArea}
                variant="reactivate"
                recordDisplayName={selectedArea?.areaName}
                onConfirm={handleReactivateConfirm}
                onCancel={() => setShowReactivateModal(false)}
            />
        </div>
    );
}
