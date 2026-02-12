'use client';

import { DeleteConfirmationModal, DenyReasonDialog } from '@components-web';
import {
    extractErrorMessage,
    useEnv,
    useLocalStore,
    useSessionStore,
    VoucherApi,
    VoucherDto
} from '@data-access/index';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VoucherForm from './components/VoucherForm';

interface EditVoucherPageProps {
    params: {
        id: string;
    };
}

export default function EditVoucherPage({ params }: EditVoucherPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch voucher details on component mount
    useEffect(() => {
        const fetchVoucher = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                // This prevents role parameter leakage when bypass auth is disabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const voucher = await VoucherApi.getVoucherById(params.id);
                setSelectedVoucher(voucher);
                setActiveTab('details');
            } catch (err) {
                console.error('Error fetching voucher:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load voucher details. Please try again.');
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
            fetchVoucher();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (voucher: VoucherDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing voucher
            const updatedVoucher = await VoucherApi.updateVoucher(
                params.id,
                {
                    voucherNo: voucher.voucherNo,
                    voucherDate: voucher.voucherDate,
                    voucherAmount: voucher.voucherAmount,
                    remarks: voucher.remarks,
                    voucherDetails: voucher.voucherDetails,
                    paymentType: voucher.paymentType,
                    bankName: voucher.bankName,
                    chequeNo: voucher.chequeNo,
                    chequeDate: voucher.chequeDate,
                    totalAmount: voucher.totalAmount,
                    accountId: voucher.accountId,
                    accountName: voucher.accountName,
                    accountType: voucher.accountType,
                    customerId: voucher.customerId,
                    customerName: voucher.customerName,
                    areaId: voucher.areaId,
                    areaName: voucher.areaName,
                    status: voucher.status,
                    changeReason: voucher.changeReason,
                },
                userRole
            );

            setSelectedVoucher(updatedVoucher);
            setFlashNotification({
                title: 'Success!',
                message: 'Voucher updated successfully!',
                alertType: 'success',
            });

            // Navigate back to voucher list immediately - notification will persist
            router.push('/accounting/voucher');
        } catch (error) {
            console.error('Error updating voucher:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update voucher. Please try again.');
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
        if (!selectedVoucher) {
            return;
        }
        // Show delete confirmation modal
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (deleteReason: string) => {
        if (!selectedVoucher) {
            return;
        }

        try {
            setIsLoading(true);
            setShowDeleteModal(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Pass delete reason to the API
            const voucherWithReason = {
                ...selectedVoucher,
                deletionReason: deleteReason,
            };

            await (VoucherApi as any).deleteVoucher(voucherWithReason, userRole);

            setFlashNotification({
                title: 'Success!',
                message: 'Voucher deleted successfully!',
                alertType: 'success',
            });

            // Navigate back to voucher list immediately - notification will persist
            router.push('/accounting/voucher');
        } catch (error) {
            console.error('Error deleting voucher:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete voucher. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
    };

    const handleApprove = async () => {
        if (!selectedVoucher) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedVoucher = await (VoucherApi as any).approveVoucher(selectedVoucher.voucherId, userRole);
            setSelectedVoucher(approvedVoucher);
            setFlashNotification({
                title: 'Success!',
                message: 'Voucher approved successfully!',
                alertType: 'success',
            });

            // Navigate back to voucher list immediately - notification will persist
            router.push('/accounting/voucher');
        } catch (err) {
            console.error('Error approving voucher:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve voucher. Please try again.');
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
        if (!selectedVoucher) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedVoucher = await (VoucherApi as any).denyVoucher(
                selectedVoucher.voucherId,
                approverMessage,
                userRole
            );
            setSelectedVoucher(deniedVoucher);
            setFlashNotification({
                title: 'Success!',
                message: 'Voucher changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to voucher list immediately - notification will persist
            router.push('/accounting/voucher');
        } catch (err) {
            console.error('Error denying voucher:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny voucher. Please try again.');
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
        router.push('/accounting/voucher');
    };

    if (!selectedVoucher && !isLoading) {
        return (
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>Voucher not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
                        href="/accounting"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Accounting
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/accounting/voucher"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Voucher
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedVoucher && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading voucher details...</div>
                </div>
            )}

            {/* Voucher Form */}
            {selectedVoucher && (
                <VoucherForm
                    isCreateMode={false}
                    selectedVoucher={selectedVoucher}
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

            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedVoucher}
                recordDisplayName={selectedVoucher?.voucherNo}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedVoucher}
                recordDisplayName={selectedVoucher?.voucherNo}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />
        </div>
    );
}
