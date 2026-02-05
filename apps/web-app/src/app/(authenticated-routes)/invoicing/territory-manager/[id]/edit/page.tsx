'use client';

import { ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog } from '@components-web';
import {
    AreaApi,
    AreaDto,
    StatusEnum,
    TerritoryManagerApi,
    TerritoryManagerDto,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TerritoryManagerForm from '../../components/TerritoryManagerForm';

interface EditTerritoryManagerPageProps {
    params: {
        id: string;
    };
}

export default function EditTerritoryManagerPage({ params }: EditTerritoryManagerPageProps) {
    const router = useRouter();
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const [selectedTerritoryManager, setSelectedTerritoryManager] = useState<TerritoryManagerDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [areas, setAreas] = useState<AreaDto[]>([]);
    const [areasLoading, setAreasLoading] = useState(false);
    const [areasError, setAreasError] = useState<string | null>(null);

    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchTerritoryManager = async () => {
            if (!params.id) return;

            try {
                setIsLoading(true);
                setError(null);

                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
                const territoryManager = await TerritoryManagerApi.getTerritoryManagerById(params.id, userRole);
                setSelectedTerritoryManager(territoryManager);
                setActiveTab('details');
            } catch (err: any) {
                console.error('Failed to fetch territory manager:', err);
                setError(err.message || 'Failed to load territory manager details. Please try again.');
                setFlashNotification({
                    title: 'Error!',
                    message: err.message || 'Failed to load territory manager details. Please try again.',
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTerritoryManager();
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser, setFlashNotification]);

    // Fetch areas when areas tab becomes active
    useEffect(() => {
        const fetchAreas = async () => {
            if (activeTab === 'areas' && selectedTerritoryManager?.territoryManagerId) {
                try {
                    setAreasLoading(true);
                    setAreasError(null);

                    const userRole = env.BYPASS_AUTH === 'ENABLED' ? undefined : undefined;

                    const response = await AreaApi.getAreasByTerritoryManagerId(
                        selectedTerritoryManager.territoryManagerId,
                        userRole
                    );

                    const areasData =
                        response && typeof response === 'object' && 'data' in response
                            ? response.data
                            : Array.isArray(response)
                            ? response
                            : [];

                    setAreas(areasData || []);
                } catch (error) {
                    console.error('Error fetching areas:', error);
                    setAreasError('Failed to load areas. Please try again.');
                    setAreas([]);
                } finally {
                    setAreasLoading(false);
                }
            }
        };

        fetchAreas();
    }, [activeTab, selectedTerritoryManager?.territoryManagerId, env.BYPASS_AUTH]);

    const handleSave = async (territoryManager: TerritoryManagerDto) => {
        if (!selectedTerritoryManager) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const updatedRecord = await TerritoryManagerApi.updateTerritoryManager(
                territoryManager.territoryManagerId,
                {
                    ...territoryManager,
                    status: territoryManager.status,
                },
                userRole
            );

            setSelectedTerritoryManager(updatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Territory Manager updated successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/territory-manager');
        } catch (err: any) {
            console.error('Failed to save territory manager:', err);
            setError(err.message || 'Failed to save territory manager. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to save territory manager. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async (deletionReason: string) => {
        if (!selectedTerritoryManager) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            await TerritoryManagerApi.deleteTerritoryManager(selectedTerritoryManager, deletionReason, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Territory Manager deleted successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/territory-manager');
        } catch (err: any) {
            console.error('Failed to delete territory manager:', err);
            setError(err.message || 'Failed to delete territory manager. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to delete territory manager. Please try again.',
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
        if (!selectedTerritoryManager) return;

        try {
            setIsLoading(true);
            setError(null);
            setShowReactivateConfirm(false);

            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            const reactivatedRecord = await TerritoryManagerApi.updateTerritoryManager(
                selectedTerritoryManager.territoryManagerId,
                {
                    ...selectedTerritoryManager,
                    status: StatusEnum.ACTIVE,
                },
                userRole
            );

            setSelectedTerritoryManager(reactivatedRecord);
            setFlashNotification({
                title: 'Success!',
                message: 'Territory Manager reactivated successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/territory-manager');
        } catch (err: any) {
            console.error('Failed to reactivate territory manager:', err);
            setError(err.message || 'Failed to reactivate territory manager. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to reactivate territory manager. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivateCancel = () => {
        setShowReactivateConfirm(false);
    };

    const handleApproveRecord = async () => {
        if (!selectedTerritoryManager) return;

        try {
            setIsLoading(true);
            setError(null);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await TerritoryManagerApi.approveTerritoryManager(selectedTerritoryManager.territoryManagerId, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Territory Manager approved successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/territory-manager');
        } catch (err: any) {
            console.error('Failed to approve territory manager:', err);
            setError(err.message || 'Failed to approve territory manager. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to approve territory manager. Please try again.',
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDenyRecord = () => {
        setShowDenyDialog(true);
    };

    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selectedTerritoryManager) return;

        try {
            setIsLoading(true);
            setError(null);
            setShowDenyDialog(false);

            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;
            await TerritoryManagerApi.denyTerritoryManager(
                selectedTerritoryManager.territoryManagerId,
                approverMessage,
                userRole
            );

            setFlashNotification({
                title: 'Success!',
                message: 'Territory Manager denied successfully!',
                alertType: 'success',
            });
            router.replace('/invoicing/territory-manager');
        } catch (err: any) {
            console.error('Failed to deny territory manager:', err);
            setError(err.message || 'Failed to deny territory manager. Please try again.');
            setFlashNotification({
                title: 'Error!',
                message: err.message || 'Failed to deny territory manager. Please try again.',
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
        router.replace('/invoicing/territory-manager');
    };

    if (isLoading && !selectedTerritoryManager) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

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

    if (error && !selectedTerritoryManager) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="bg-transparent border-none text-red-600 cursor-pointer text-lg font-bold hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
                <button
                    onClick={() => router.replace('/invoicing/territory-manager')}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
                >
                    Back to Territory Managers
                </button>
            </div>
        );
    }

    if (!selectedTerritoryManager && !isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="text-center text-gray-600">
                    Territory Manager not found or could not be loaded.
                    <button
                        onClick={() => router.replace('/invoicing/territory-manager')}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
                    >
                        Back to Territory Managers
                    </button>
                </div>
            </div>
        );
    }

    // Render logs tab
    const renderLogsTab = () => {
        if (!selectedTerritoryManager) return null;

        return (
            <div className="p-4 sm:p-6 bg-white">
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
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
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Logs</h3>
                    </div>
                    {renderActivityLogsTable(selectedTerritoryManager?.activityLogs, 'No activity logs available')}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
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
                        href="/invoicing/territory-manager"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Territory Manager
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Customer Form with Tabs */}
            {selectedTerritoryManager && (
                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                                        selectedTerritoryManager.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Territory Manager Information
                                        {selectedTerritoryManager && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>
                                                    {getStatusText(
                                                        selectedTerritoryManager.status || StatusEnum.ACTIVE
                                                    )}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                        {/* Tab Content */}
                        <div className="p-4 sm:p-6 bg-white">
                            {activeTab === 'details' && (
                                <TerritoryManagerForm
                                    isCreateMode={false}
                                    selectedTerritoryManager={selectedTerritoryManager}
                                    successMessage={null}
                                    isAdminUser={isAdminUser}
                                    onSave={handleSave}
                                    onDelete={handleDeleteClick}
                                    onReactivate={handleReactivateClick}
                                    onCancel={handleCancel}
                                    onApprove={handleApproveRecord}
                                    onDeny={handleDenyRecord}
                                />
                            )}

                            {activeTab === 'logs' && selectedTerritoryManager && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedTerritoryManager}
                recordDisplayName={selectedTerritoryManager?.territoryManagerName}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                record={selectedTerritoryManager}
                recordDisplayName={selectedTerritoryManager?.territoryManagerName}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />

            <ConfirmationModal
                show={showReactivateConfirm}
                record={selectedTerritoryManager}
                variant="reactivate"
                recordDisplayName={selectedTerritoryManager?.territoryManagerName}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={handleReactivateCancel}
            />
        </div>
    );
}
